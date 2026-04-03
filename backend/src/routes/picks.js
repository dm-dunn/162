const express = require('express');
const { Pick } = require('../models');
const { authenticate, requireEmailVerified } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.get('/today', authenticate, async (req, res, next) => {
    try {
        // Prefer the client-supplied local date (YYYY-MM-DD) so users in
        // time zones behind UTC don't get tomorrow's picks after UTC midnight.
        const clientDate = req.query.date;
        const today = (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
            ? clientDate
            : new Date().toISOString().split('T')[0];
        const picks = await Pick.findByUserAndDate(req.user.id, today);
        res.json({ picks });
    } catch (error) {
        next(error);
    }
});

router.get('/date/:date', authenticate, async (req, res, next) => {
    try {
        const { date } = req.params;
        const picks = await Pick.findByUserAndDate(req.user.id, date);
        res.json({ picks });
    } catch (error) {
        next(error);
    }
});

router.post('/', authenticate, requireEmailVerified, validate(schemas.createPick), async (req, res, next) => {
    try {
        const pick = await Pick.create({
            userId: req.user.id,
            ...req.body
        });

        res.status(201).json({ pick });
    } catch (error) {
        next(error);
    }
});

router.post('/submit-all', authenticate, requireEmailVerified, validate(schemas.submitAllPicks), async (req, res, next) => {
    try {
        const { picks } = req.body;
        const results = [];
        const skipped = [];

        for (const pickData of picks) {
            try {
                const pick = await Pick.create({
                    userId: req.user.id,
                    gameId: pickData.gameId,
                    pickType: pickData.pickType,
                    pickedTeam: pickData.pickedTeam
                });
                results.push(pick);
            } catch (pickError) {
                // Game is locked or too close to start — skip it, don't fail the whole batch
                const isLockError = pickError.message === 'Game is locked' ||
                    pickError.message === 'Too close to game time' ||
                    pickError.message === 'Game not found';

                if (isLockError) {
                    skipped.push({ gameId: pickData.gameId, reason: pickError.message });
                } else {
                    throw pickError; // Unexpected error — bubble up normally
                }
            }
        }

        res.status(201).json({ picks: results, skipped, submitted: true });
    } catch (error) {
        next(error);
    }
});

router.get('/stats', authenticate, async (req, res, next) => {
    try {
        const stats = await Pick.getUserStats(req.user.id);
        res.json({ stats });
    } catch (error) {
        next(error);
    }
});

module.exports = router;