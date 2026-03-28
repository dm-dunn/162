const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
    try {
        const { leagueId } = req.query;

        let query;
        let params = [];

        if (leagueId) {
            // Verify the user is a member of this league
            const { League } = require('../models');
            const isMember = await League.isMember(leagueId, req.user.id);
            if (!isMember) {
                return res.status(403).json({ error: 'You are not a member of this league' });
            }

            query = `SELECT l.*, u.username, u.color
                     FROM leaderboard l
                     JOIN users u ON l.user_id = u.id
                     JOIN league_members lm ON lm.user_id = u.id
                     WHERE lm.league_id = $1
                     ORDER BY l.total_points DESC
                     LIMIT 100`;
            params = [leagueId];
        } else {
            query = `SELECT l.*, u.username, u.color
                     FROM leaderboard l
                     JOIN users u ON l.user_id = u.id
                     ORDER BY l.rank ASC
                     LIMIT 100`;
        }

        const result = await pool.query(query, params);

        // Re-rank within the league context
        if (leagueId) {
            result.rows.forEach((row, index) => {
                row.rank = index + 1;
            });
        }

        res.json({ leaderboard: result.rows });
    } catch (error) {
        next(error);
    }
});

router.get('/progress', authenticate, async (req, res, next) => {
    try {
        // Get all users with their colors
        const users = await pool.query(
            `SELECT id, username, color FROM users WHERE is_active = true`
        );

        // Get all unique game dates with picks
        const dates = await pool.query(
            `SELECT DISTINCT g.game_date
             FROM games g
             JOIN picks p ON g.id = p.game_id
             WHERE p.result IS NOT NULL
             ORDER BY g.game_date ASC`
        );

        // For each user, calculate cumulative points by date
        const progressData = [];

        for (const user of users.rows) {
            let cumulativePoints = 0;
            const userProgress = {
                userId: user.id,
                username: user.username,
                color: user.color,
                points: []
            };

            for (const dateRow of dates.rows) {
                // Get points earned on this date
                const dailyPoints = await pool.query(
                    `SELECT COALESCE(SUM(p.points_earned), 0) as points
                     FROM picks p
                     JOIN games g ON p.game_id = g.id
                     WHERE p.user_id = $1
                     AND g.game_date = $2
                     AND p.result IS NOT NULL`,
                    [user.id, dateRow.game_date]
                );

                cumulativePoints += parseInt(dailyPoints.rows[0].points);
                userProgress.points.push({
                    date: dateRow.game_date,
                    points: cumulativePoints
                });
            }

            if (userProgress.points.length > 0) {
                progressData.push(userProgress);
            }
        }

        res.json({
            dates: dates.rows.map(d => d.game_date),
            users: progressData
        });
    } catch (error) {
        next(error);
    }
});

router.get('/user/:userId', authenticate, async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT l.*, u.username
             FROM leaderboard l
             JOIN users u ON l.user_id = u.id
             WHERE l.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in leaderboard' });
        }

        res.json({ entry: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

module.exports = router;