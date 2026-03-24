const express = require('express');
const { Game } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/today', authenticate, async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const games = await Game.findByDate(today);
        res.json({ games });
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