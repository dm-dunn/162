const pool = require('../config/database');

class Game {
    static async create(gameData) {
        const {
            externalGameId, gameDate, gameTime, homeTeam, awayTeam,
            homeTeamAbbr, awayTeamAbbr, venue, spread
        } = gameData;

        const result = await pool.query(
            `INSERT INTO games 
             (external_game_id, game_date, game_time, home_team, away_team, 
              home_team_abbr, away_team_abbr, venue, spread) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             ON CONFLICT (external_game_id) DO UPDATE SET
                game_time = EXCLUDED.game_time,
                spread = EXCLUDED.spread,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [externalGameId, gameDate, gameTime, homeTeam, awayTeam, 
             homeTeamAbbr, awayTeamAbbr, venue, spread || 1.5]
        );
        return result.rows[0];
    }

    static async findByDate(date) {
        const result = await pool.query(
            `SELECT * FROM games WHERE game_date = $1 ORDER BY game_time ASC`,
            [date]
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async updateLineup(gameId, lineupData) {
        const { homePitcher, awayPitcher, homeLineup, awayLineup } = lineupData;
        const result = await pool.query(
            `UPDATE games SET
                home_pitcher = $1, away_pitcher = $2,
                home_lineup = $3, away_lineup = $4,
                lineup_last_updated = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING *`,
            [JSON.stringify(homePitcher), JSON.stringify(awayPitcher),
             JSON.stringify(homeLineup), JSON.stringify(awayLineup), gameId]
        );
        return result.rows[0];
    }

    static async lockGame(gameId) {
        const result = await pool.query(
            `UPDATE games SET data_locked = true, locked_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND data_locked = false RETURNING *`,
            [gameId]
        );
        return result.rows[0];
    }

    static async updateScore(gameId, homeScore, awayScore, status) {
        const result = await pool.query(
            `UPDATE games SET home_score = $1, away_score = $2, status = $3,
             updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
            [homeScore, awayScore, status, gameId]
        );
        return result.rows[0];
    }

    static async getGamesToLock() {
        const result = await pool.query(
            `SELECT * FROM games 
             WHERE data_locked = false 
             AND game_time <= NOW() + INTERVAL '5 minutes'
             AND game_time > NOW() - INTERVAL '1 hour'`
        );
        return result.rows;
    }

    static async getFinalizedGames(date) {
        const result = await pool.query(
            `SELECT * FROM games
             WHERE game_date = $1 AND status = 'final' AND home_score IS NOT NULL`,
            [date]
        );
        return result.rows;
    }

    /**
     * Write real run-line and moneyline odds fetched from The Odds API.
     * COALESCE ensures we never overwrite an existing value with null —
     * so if the API only returns a spread (no h2h), moneylines are left alone.
     *
     * @param {number} gameId
     * @param {number|null} spread       Home team's run line, e.g. -1.5 or 1.5
     * @param {number|null} homeMoneyline American odds, e.g. -150
     * @param {number|null} awayMoneyline American odds, e.g. +130
     */
    static async updateOdds(gameId, spread, homeMoneyline, awayMoneyline) {
        const result = await pool.query(
            `UPDATE games
             SET spread          = COALESCE($2, spread),
                 home_moneyline  = COALESCE($3, home_moneyline),
                 away_moneyline  = COALESCE($4, away_moneyline),
                 updated_at      = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id, spread, home_moneyline, away_moneyline`,
            [gameId, spread, homeMoneyline, awayMoneyline]
        );
        return result.rows[0];
    }
}

module.exports = Game;
