const pool = require('../config/database');

class Pick {
    static async create({ userId, gameId, pickType, pickedTeam }) {
        const gameCheck = await pool.query(
            'SELECT data_locked, game_time FROM games WHERE id = $1',
            [gameId]
        );

        if (!gameCheck.rows[0]) throw new Error('Game not found');
        if (gameCheck.rows[0].data_locked) throw new Error('Game is locked');

        const gameTime = new Date(gameCheck.rows[0].game_time);
        const now = new Date();
        if (now >= new Date(gameTime.getTime() - 5 * 60 * 1000)) {
            throw new Error('Too close to game time');
        }

        const result = await pool.query(
            `INSERT INTO picks (user_id, game_id, pick_type, picked_team)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, game_id) DO UPDATE SET
                pick_type = EXCLUDED.pick_type,
                picked_team = EXCLUDED.picked_team,
                picked_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, gameId, pickType, pickedTeam]
        );
        return result.rows[0];
    }

    static async findByUserAndDate(userId, date) {
        const result = await pool.query(
            `SELECT p.*, g.* FROM picks p
             JOIN games g ON p.game_id = g.id
             WHERE p.user_id = $1 AND g.game_date = $2
             ORDER BY g.game_time ASC`,
            [userId, date]
        );
        return result.rows;
    }

    static async findByGameId(gameId) {
        const result = await pool.query(
            `SELECT p.*, u.username FROM picks p
             JOIN users u ON p.user_id = u.id WHERE p.game_id = $1`,
            [gameId]
        );
        return result.rows;
    }

    static async gradePick(pickId, result, pointsEarned, outcome) {
        const updateResult = await pool.query(
            `UPDATE picks SET result = $1, points_earned = $2, outcome = $3,
             graded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 RETURNING *`,
            [result, pointsEarned, outcome, pickId]
        );
        return updateResult.rows[0];
    }

    static async getPendingPicksForGame(gameId) {
        const result = await pool.query(
            `SELECT * FROM picks WHERE game_id = $1 AND result IS NULL`,
            [gameId]
        );
        return result.rows;
    }

    static async getUserStats(userId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_picks,
                COUNT(*) FILTER (WHERE result = 'win') as total_wins,
                COUNT(*) FILTER (WHERE result = 'loss') as total_losses,
                SUM(points_earned) as total_points,
                COUNT(*) FILTER (WHERE pick_type = 'moneyline' AND result = 'win') as ml_wins,
                COUNT(*) FILTER (WHERE pick_type = 'moneyline' AND result = 'loss') as ml_losses,
                COUNT(*) FILTER (WHERE pick_type = 'spread' AND result = 'win') as spread_wins,
                COUNT(*) FILTER (WHERE pick_type = 'spread' AND result = 'loss') as spread_losses
             FROM picks WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = Pick;
