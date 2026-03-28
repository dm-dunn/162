const axios = require('axios');
const logger = require('../config/logger');

/**
 * Maps ESPN team abbreviations to standard MLB abbreviations.
 * ESPN uses slightly different codes for some teams (e.g., TBR vs TB, KCR vs KC).
 * All other abbreviations pass through unchanged.
 */
const ESPN_TO_MLB_ABBR = {
    'TBR': 'TB',    // Tampa Bay Rays
    'KCR': 'KC',    // Kansas City Royals
    'SFG': 'SF',    // San Francisco Giants
    'SDG': 'SD',    // San Diego Padres
    'OAK': 'ATH',   // Oakland Athletics → Las Vegas Athletics
};

/**
 * Normalizes an ESPN team abbreviation to the standard MLB abbreviation.
 * If no mapping exists, returns the ESPN abbr as-is.
 *
 * @param {string} espnAbbr - The ESPN team abbreviation
 * @returns {string} - The normalized MLB abbreviation
 */
function normalizeTeamAbbr(espnAbbr) {
    if (!espnAbbr) return null;
    return ESPN_TO_MLB_ABBR[espnAbbr] || espnAbbr;
}

/**
 * Safely parses a score string to an integer.
 * Returns null if the score is not a valid number.
 *
 * @param {string|number|null|undefined} score - The score to parse
 * @returns {number|null} - Parsed integer or null
 */
function parseScore(score) {
    if (score === null || score === undefined) return null;
    const parsed = parseInt(score, 10);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Converts ESPN status type name to a normalized status string.
 *
 * @param {string} statusName - ESPN status name (e.g., 'STATUS_FINAL')
 * @returns {string} - Normalized status: 'scheduled', 'live', 'final', 'postponed', 'suspended', 'cancelled'
 */
function normalizeStatus(statusName) {
    if (!statusName) return 'scheduled';

    const normalized = statusName.toLowerCase();

    if (normalized.includes('final')) return 'final';
    if (normalized.includes('in_progress') || normalized.includes('delayed')) return 'live';
    if (normalized.includes('postponed')) return 'postponed';
    if (normalized.includes('suspended')) return 'suspended';
    if (normalized.includes('cancelled')) return 'cancelled';

    return 'scheduled';
}

class ESPNService {
    /**
     * Fetches all MLB games for a given date from ESPN's scoreboard API.
     *
     * @param {Date|string} date - A Date object or 'YYYY-MM-DD' string
     * @returns {Promise<Array>} - Array of normalized game objects with structure:
     *   {
     *     espnId: string,
     *     homeTeamAbbr: string,
     *     awayTeamAbbr: string,
     *     homeScore: number|null,
     *     awayScore: number|null,
     *     status: string ('scheduled'|'live'|'final'|'postponed'|'suspended'|'cancelled')
     *   }
     *   On error, logs and returns empty array (never throws).
     */
    static async getScoreboardForDate(date) {
        try {
            // Convert date to YYYYMMDD format
            let dateObj = date;
            if (typeof date === 'string') {
                dateObj = new Date(date);
            }

            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
                logger.error('Invalid date provided to getScoreboardForDate', { date });
                return [];
            }

            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const dateStr = `${year}${month}${day}`;

            const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateStr}`;

            logger.info(`Fetching ESPN scoreboard for date: ${dateStr}`);

            const response = await axios.get(url, {
                timeout: 10000
            });

            const games = [];
            const events = response.data?.events || [];

            for (const event of events) {
                try {
                    // Extract ESPN game ID
                    const espnId = event.id;
                    if (!espnId) continue;

                    // Extract status
                    const statusType = event.status?.type?.name || 'STATUS_SCHEDULED';
                    const status = normalizeStatus(statusType);

                    // Extract competitors (home and away)
                    const competitors = event.competitions?.[0]?.competitors || [];
                    let homeCompetitor = null;
                    let awayCompetitor = null;

                    for (const competitor of competitors) {
                        if (competitor.homeAway === 'home') {
                            homeCompetitor = competitor;
                        } else if (competitor.homeAway === 'away') {
                            awayCompetitor = competitor;
                        }
                    }

                    if (!homeCompetitor || !awayCompetitor) continue;

                    // Extract team abbreviations and normalize them
                    const homeTeamAbbr = normalizeTeamAbbr(homeCompetitor.team?.abbreviation);
                    const awayTeamAbbr = normalizeTeamAbbr(awayCompetitor.team?.abbreviation);

                    if (!homeTeamAbbr || !awayTeamAbbr) continue;

                    // Extract scores
                    const homeScore = parseScore(homeCompetitor.score);
                    const awayScore = parseScore(awayCompetitor.score);

                    // Build normalized game object
                    const gameData = {
                        espnId,
                        homeTeamAbbr,
                        awayTeamAbbr,
                        homeScore,
                        awayScore,
                        status
                    };

                    games.push(gameData);

                } catch (eventError) {
                    logger.warn('Failed to parse ESPN event', { eventId: event.id, error: eventError.message });
                    continue;
                }
            }

            logger.info(`ESPN scoreboard fetch succeeded: ${games.length} games for ${dateStr}`);
            return games;

        } catch (error) {
            logger.error('ESPN scoreboard API call failed', {
                date: typeof date === 'string' ? date : date.toISOString().split('T')[0],
                error: error.message,
                code: error.code
            });

            // Return empty array on network/parse error; never throw
            return [];
        }
    }
}

module.exports = ESPNService;
