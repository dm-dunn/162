const express = require('express');
const { Pick } = require('../models');
const { authenticate, requireEmailVerified } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.get('/today', authenticate, async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
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

        for (const pickData of picks) {
            const pick = await Pick.create({
                userId: req.user.id,
                gameId: pickData.gameId,
                pickType: pickData.pickType,
                pickedTeam: pickData.pickedTeam
            });
            results.push(pick);
        }

        res.status(201).json({ picks: results, submitted: true });
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