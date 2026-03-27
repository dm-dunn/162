const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const MLBDataService = require('../services/mlbDataService');
const OddsService = require('../services/oddsService');
const ScoringService = require('../services/scoringService');
const CacheService = require('../services/cacheService');
const { Game } = require('../models');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.post('/jobs/fetch-games', async (req, res, next) => {
    try {
        const date = req.body.date ? new Date(req.body.date) : new Date();
        const games = await MLBDataService.fetchDailyGames(date);
        
        res.json({
            success: true,
            count: games.length,
            games
        });
    } catch (error) {
        next(error);
    }
});

router.post('/jobs/update-lineups', async (req, res, next) => {
    try {
        const date = req.body.date ? new Date(req.body.date) : new Date();
        const games = await Game.findByDate(date.toISOString().split('T')[0]);
        
        const gameIds = games
            .filter(g => !g.data_locked)
            .map(g => ({ id: g.id, externalGameId: g.external_game_id }));

        const results = await MLBDataService.updateLineups(gameIds);
        
        res.json({
            success: true,
            updated: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });
    } catch (error) {
        next(error);
    }
});

router.post('/jobs/lock-games', async (req, res, next) => {
    try {
        const gamesToLock = await Game.getGamesToLock();
        
        for (const game of gamesToLock) {
            await Game.lockGame(game.id);
        }

        res.json({
            success: true,
            locked: gamesToLock.length,
            games: gamesToLock
        });
    } catch (error) {
        next(error);
    }
});

router.post('/jobs/grade-results', async (req, res, next) => {
    try {
        const date = req.body.date || new Date().toISOString().split('T')[0];
        const results = await ScoringService.gradeAllGamesForDate(date);
        
        res.json({
            success: true,
            date,
            results
        });
    } catch (error) {
        next(error);
    }
});

router.post('/jobs/update-leaderboard', async (req, res, next) => {
    try {
        await ScoringService.updateLeaderboard();
        
        res.json({
            success: true,
            message: 'Leaderboard updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Fetch real run lines + moneylines from The Odds API and write them to the DB.
// Requires ODDS_API_KEY to be set. Safe to re-run (COALESCE prevents null overwrites).
router.post('/jobs/fetch-odds', async (req, res, next) => {
    try {
        const date = req.body.date ? new Date(req.body.date) : new Date();
        const results = await OddsService.fetchDailyOdds(date);

        res.json({
            success: true,
            date: date.toISOString().split('T')[0],
            ...results
        });
    } catch (error) {
        next(error);
    }
});

// Force a fresh game fetch for a specific date, bypassing both the schedule
// cache and the auto-fetch lock. Useful when the cron job missed a day or
// when you need to pull an updated schedule mid-day.
router.post('/jobs/force-fetch-games', async (req, res, next) => {
    try {
        const date = req.body.date ? new Date(req.body.date) : new Date();
        const dateStr = date.toISOString().split('T')[0];

        // Clear both cache keys so fetchDailyGames hits the API fresh.
        await CacheService.delete(`schedule:${dateStr}`);
        await CacheService.delete(`auto_fetch_lock:${dateStr}`);

        const games = await MLBDataService.fetchDailyGames(date);

        res.json({
            success: true,
            date: dateStr,
            count: games.length,
            games
        });
    } catch (error) {
        next(error);
    }
});

router.get('/system/health', async (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;