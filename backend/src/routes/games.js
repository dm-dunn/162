const express = require('express');
const { Game } = require('../models');
const { authenticate } = require('../middleware/auth');
const MLBDataService = require('../services/mlbDataService');
const CacheService = require('../services/cacheService');
const logger = require('../config/logger');

const router = express.Router();

router.get('/today', authenticate, async (req, res, next) => {
    try {
        // Prefer the client-supplied local date (YYYY-MM-DD) so users in
        // time zones behind UTC don't get tomorrow's games after UTC midnight.
        const clientDate = req.query.date;
        const today = (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
            ? clientDate
            : new Date().toISOString().split('T')[0];
        let games = await Game.findByDate(today);

        // Self-healing: if the DB has no games for today, try to pull them
        // from the MLB API right now. A per-day lock (1-hour TTL) prevents
        // hammering the API when there genuinely are no games (spring training,
        // off days, etc.). The lock resets hourly so a transient API failure
        // will be retried automatically.
        if (games.length === 0) {
            const fetchLockKey = `auto_fetch_lock:${today}`;
            const alreadyAttempted = await CacheService.get(fetchLockKey);

            if (!alreadyAttempted) {
                // Claim the lock before the async call so parallel requests
                // don't all race to fetch simultaneously.
                await CacheService.set(fetchLockKey, true, 3600); // 1-hour lock

                try {
                    logger.info(`No games in DB for ${today} — attempting auto-fetch from MLB API`);
                    games = await MLBDataService.fetchDailyGames(new Date());
                    logger.info(`Auto-fetch returned ${games.length} game(s) for ${today}`);
                } catch (fetchError) {
                    // API down or no games today — return empty array, don't blow up.
                    logger.warn('Auto-fetch from MLB API failed', { message: fetchError.message });
                }
            }
        }

        // Annotate each game with picks_open so the client can gate pick buttons
        // on real data readiness rather than a hard-coded clock time.
        //
        // Picks are open when:
        //   (a) home_moneyline has been populated (odds job has run), OR
        //   (b) no ODDS_API_KEY is configured (odds are not used in this env —
        //       don't permanently lock games just because the feature isn't set up)
        const oddsEnabled = !!process.env.ODDS_API_KEY;
        const annotated = games.map(g => ({
            ...g,
            picks_open: !oddsEnabled || g.home_moneyline !== null,
        }));

        res.json({ games: annotated });
    } catch (error) {
        next(error);
    }
});

router.get('/date/:date', authenticate, async (req, res, next) => {
    try {
        const { date } = req.params;
        const games = await Game.findByDate(date);
        res.json({ games });
    } catch (error) {
        next(error);
    }
});

router.get('/:gameId', authenticate, async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const game = await Game.findById(gameId);
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({ game });
    } catch (error) {
        next(error);
    }
});

router.get('/:gameId/lineup', authenticate, async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const game = await Game.findById(gameId);
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        res.json({
            homePitcher: game.home_pitcher,
            awayPitcher: game.away_pitcher,
            homeLineup: game.home_lineup,
            awayLineup: game.away_lineup,
            lastUpdated: game.lineup_last_updated
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;