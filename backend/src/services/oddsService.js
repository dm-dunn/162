/**
 * OddsService — fetches real MLB run lines and moneyline odds from The Odds API.
 *
 * Setup:
 *   1. Sign up for a free key at https://the-odds-api.com  (500 credits/month free)
 *   2. Add ODDS_API_KEY=<your_key> to backend/.env
 *   3. In production (Render), add the same env var in the dashboard
 *
 * The daily fetch job runs automatically at 6:30 AM ET via the cron scheduler,
 * but can also be triggered manually via POST /api/admin/jobs/fetch-odds.
 *
 * Credit cost: each call to /odds with markets=spreads,h2h costs 2 credits.
 * At one call per day × 180-game MLB season ≈ 360 credits — well within the
 * 500/month free tier.
 */

const https = require('https');
const { Game } = require('../models');
const logger = require('../config/logger');

const ODDS_API_KEY  = process.env.ODDS_API_KEY;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Bookmakers tried in priority order. Pinnacle has the sharpest lines;
// DraftKings / FanDuel are the most liquid US books and are always available.
const PREFERRED_BOOKS = ['pinnacle', 'draftkings', 'fanduel', 'betmgm', 'pointsbetus', 'williamhill_us'];

class OddsService {

    // ─── Public entry point ─────────────────────────────────────────────────

    /**
     * Fetch today's MLB run lines + moneylines from The Odds API and write
     * them into the games table for the given date.
     *
     * @param {Date} date
     * @returns {{ updated, skipped, errors, remainingCredits }}
     */
    static async fetchDailyOdds(date = new Date()) {
        if (!ODDS_API_KEY) {
            throw new Error(
                'ODDS_API_KEY is not set. ' +
                'Sign up at https://the-odds-api.com and add it to your .env file.'
            );
        }

        const dateStr = date.toISOString().split('T')[0];

        // Load today's games from DB so we can match by team name
        const dbGames = await Game.findByDate(dateStr);
        if (dbGames.length === 0) {
            logger.info('[OddsService] No games in DB for today — skipping odds update', { date: dateStr });
            return { updated: 0, skipped: 0, errors: 0, remainingCredits: null };
        }

        logger.info(`[OddsService] Fetching odds for ${dbGames.length} games on ${dateStr}`);

        // Call The Odds API
        const { games: oddsGames, remainingCredits } = await this._callOddsAPI();

        if (!oddsGames || oddsGames.length === 0) {
            logger.info('[OddsService] Odds API returned no MLB games');
            return { updated: 0, skipped: dbGames.length, errors: 0, remainingCredits };
        }

        let updated = 0, skipped = 0, errors = 0;

        for (const oddsGame of oddsGames) {
            try {
                const dbGame = this._matchGame(oddsGame, dbGames);
                if (!dbGame) {
                    logger.warn(`[OddsService] No DB match: ${oddsGame.away_team} @ ${oddsGame.home_team}`);
                    skipped++;
                    continue;
                }

                const odds = this._extractOdds(oddsGame);
                if (!odds) {
                    logger.warn(`[OddsService] No usable odds found: ${oddsGame.away_team} @ ${oddsGame.home_team}`);
                    skipped++;
                    continue;
                }

                await Game.updateOdds(dbGame.id, odds.homeSpread, odds.homeMoneyline, odds.awayMoneyline);

                logger.info(
                    `[OddsService] Updated: ${dbGame.away_team_abbr} @ ${dbGame.home_team_abbr}` +
                    ` | spread=${odds.homeSpread}` +
                    ` | ML: home=${odds.homeMoneyline} away=${odds.awayMoneyline}`
                );
                updated++;

            } catch (err) {
                logger.error('[OddsService] Error updating game', {
                    game: `${oddsGame.away_team} @ ${oddsGame.home_team}`,
                    error: err.message
                });
                errors++;
            }
        }

        logger.info(`[OddsService] Done — updated=${updated} skipped=${skipped} errors=${errors} creditsLeft=${remainingCredits}`);
        return { updated, skipped, errors, remainingCredits };
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Hit The Odds API and return the raw game array + remaining-credits header.
     */
    static async _callOddsAPI() {
        const url =
            `${ODDS_API_BASE}/sports/baseball_mlb/odds/` +
            `?apiKey=${ODDS_API_KEY}` +
            `&regions=us` +
            `&markets=spreads,h2h` +
            `&oddsFormat=american` +
            `&dateFormat=iso`;

        return new Promise((resolve, reject) => {
            const req = https.get(url, (res) => {
                let body = '';
                const remaining = res.headers['x-requests-remaining'] ?? null;

                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);

                        // API returns { message } on errors (bad key, quota exceeded, etc.)
                        if (!Array.isArray(parsed)) {
                            const msg = parsed?.message || 'Unexpected response shape';
                            return reject(new Error(`Odds API error: ${msg}`));
                        }

                        resolve({ games: parsed, remainingCredits: remaining });
                    } catch (e) {
                        reject(new Error(`Failed to parse Odds API response: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Odds API request timed out after 10s'));
            });
        });
    }

    /**
     * Find the DB game that corresponds to a given Odds API game object.
     * Matches on normalized home + away team names.
     */
    static _matchGame(oddsGame, dbGames) {
        const oddsHome = this._normalizeName(oddsGame.home_team);
        const oddsAway = this._normalizeName(oddsGame.away_team);

        return dbGames.find(g => {
            return (
                this._normalizeName(g.home_team) === oddsHome &&
                this._normalizeName(g.away_team) === oddsAway
            );
        }) ?? null;
    }

    /**
     * Normalize a team name for fuzzy matching.
     * Strips leading articles, punctuation, and lowercases everything.
     * e.g. "St. Louis Cardinals" → "stlouiscardinals"
     *      "Athletics"           → "athletics"
     *      "Oakland Athletics"   → "athletics"
     */
    static _normalizeName(name) {
        return (name || '')
            .toLowerCase()
            .replace(/^(the|los|las|san|st\.?|new)\s+/i, '') // strip common prefixes
            .replace(/\boakland\b/i, '')                      // A's transition: Oakland → drop
            .replace(/\blas vegas\b/i, '')                    // A's relocation label
            .replace(/[^a-z]/g, '');                          // keep only letters
    }

    /**
     * Pull the home spread and both moneylines out of an Odds API game object.
     * Tries bookmakers in PREFERRED_BOOKS order, falls back to first available.
     *
     * Returns null if no usable odds are found.
     */
    static _extractOdds(oddsGame) {
        const bookmakers = oddsGame.bookmakers ?? [];
        if (bookmakers.length === 0) return null;

        // Pick best available bookmaker
        let book = null;
        for (const key of PREFERRED_BOOKS) {
            book = bookmakers.find(b => b.key === key);
            if (book) break;
        }
        if (!book) book = bookmakers[0];

        const spreadsMarket = book.markets?.find(m => m.key === 'spreads') ?? null;
        const h2hMarket     = book.markets?.find(m => m.key === 'h2h')     ?? null;

        // ── Run line ──────────────────────────────────────────────────────────
        let homeSpread = null;
        if (spreadsMarket) {
            const homeOutcome = spreadsMarket.outcomes?.find(o => o.name === oddsGame.home_team);
            if (homeOutcome?.point !== undefined && homeOutcome.point !== null) {
                homeSpread = homeOutcome.point; // e.g. -1.5 (home favored) or 1.5 (underdog)
            }
        }

        // ── Moneylines ────────────────────────────────────────────────────────
        let homeMoneyline = null;
        let awayMoneyline = null;
        if (h2hMarket) {
            const homeML = h2hMarket.outcomes?.find(o => o.name === oddsGame.home_team);
            const awayML = h2hMarket.outcomes?.find(o => o.name === oddsGame.away_team);
            if (homeML?.price !== undefined) homeMoneyline = homeML.price;
            if (awayML?.price !== undefined) awayMoneyline = awayML.price;
        }

        // Need at least a spread OR a moneyline to be worth writing
        if (homeSpread === null && homeMoneyline === null) return null;

        return { homeSpread, homeMoneyline, awayMoneyline };
    }
}

module.exports = OddsService;
