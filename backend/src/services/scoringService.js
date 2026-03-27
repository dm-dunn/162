const { Pick, Game } = require('../models');
const pool = require('../config/database');

class ScoringService {
    static async gradePicksForGame(gameId) {
        const game = await Game.findById(gameId);
        if (!game || game.status !== 'final' || game.home_score === null) {
            throw new Error('Game not ready for grading');
        }

        const picks = await Pick.getPendingPicksForGame(gameId);
        const results = [];

        for (const pick of picks) {
            const { result, points, outcome } = this.calculatePickResult(pick, game);
            await Pick.gradePick(pick.id, result, points, outcome);
            results.push({ pickId: pick.id, result, points, outcome });
        }

        return results;
    }

    static calculatePickResult(pick, game) {
        const homeWon = game.home_score > game.away_score;
        const awayWon = game.away_score > game.home_score;
        const userPickedHome = pick.picked_team === 'home';
        const userPickedAway = pick.picked_team === 'away';

        if (pick.pick_type === 'moneyline') {
            // Simple win/loss
            if ((userPickedHome && homeWon) || (userPickedAway && awayWon)) {
                return { result: 'win', points: 1, outcome: 'MW' };
            } else {
                return { result: 'loss', points: 0, outcome: 'ML' };
            }
        } else if (pick.pick_type === 'spread') {
            // game.spread is the home team's run line (e.g. -1.5 = home favored, +1.5 = underdog).
            // Standard run-line math: a team covers if (their score + their spread) > opponent's score.
            //
            //   home covers  →  home_score + spread > away_score  →  runDiff + spread > 0
            //   away covers  →  away_score + (-spread) > home_score  →  runDiff + spread < 0
            //   push         →  runDiff + spread === 0 (impossible with ±1.5, possible with ±2)
            //
            // Falls back to straight win/loss if no spread is recorded (legacy rows / edge case).

            const spread = parseFloat(game.spread);

            if (isNaN(spread)) {
                // No spread on record — fall back to moneyline-style grading
                const userCorrect = (userPickedHome && homeWon) || (userPickedAway && awayWon);
                return userCorrect
                    ? { result: 'win', points: 2, outcome: 'SW' }
                    : { result: 'loss', points: -1, outcome: 'SL' };
            }

            const runDiff     = game.home_score - game.away_score; // positive = home winning
            const adjustedDiff = runDiff + spread;                 // positive = home covered

            if (adjustedDiff === 0) {
                // Push — no points awarded, no loss either
                return { result: 'push', points: 0, outcome: 'SP' };
            }

            const homeCovered = adjustedDiff > 0;
            const userCovered = (userPickedHome && homeCovered) || (userPickedAway && !homeCovered);

            return userCovered
                ? { result: 'win', points: 2, outcome: 'SW' }
                : { result: 'loss', points: -1, outcome: 'SL' };
        }

        return { result: 'error', points: 0, outcome: null };
    }

    static async gradeAllGamesForDate(date) {
        const games = await Game.getFinalizedGames(date);
        const results = [];

        for (const game of games) {
            try {
                const gameResults = await this.gradePicksForGame(game.id);
                results.push({ gameId: game.id, success: true, picks: gameResults.length });
            } catch (error) {
                results.push({ gameId: game.id, success: false, error: error.message });
            }
        }

        return results;
    }

    static async updateLeaderboard() {
        // Recalculate all user stats
        const users = await pool.query('SELECT id FROM users WHERE is_active = true');

        for (const user of users.rows) {
            const stats = await Pick.getUserStats(user.id);

            const totalGames = parseInt(stats.total_picks) || 0;
            const totalPoints = parseInt(stats.total_points) || 0;
            const mlWins = parseInt(stats.ml_wins) || 0;
            const mlLosses = parseInt(stats.ml_losses) || 0;
            const spreadWins = parseInt(stats.spread_wins) || 0;
            const spreadLosses = parseInt(stats.spread_losses) || 0;

            const mlWinPct = mlWins + mlLosses > 0 
                ? (mlWins / (mlWins + mlLosses) * 100).toFixed(2)
                : 0;

            const spreadWinPct = spreadWins + spreadLosses > 0
                ? (spreadWins / (spreadWins + spreadLosses) * 100).toFixed(2)
                : 0;

            await pool.query(
                `INSERT INTO leaderboard 
                 (user_id, total_points, total_games, moneyline_wins, moneyline_losses, 
                  moneyline_win_pct, spread_wins, spread_losses, spread_win_pct)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (user_id)
                 DO UPDATE SET
                    total_points = EXCLUDED.total_points,
                    total_games = EXCLUDED.total_games,
                    moneyline_wins = EXCLUDED.moneyline_wins,
                    moneyline_losses = EXCLUDED.moneyline_losses,
                    moneyline_win_pct = EXCLUDED.moneyline_win_pct,
                    spread_wins = EXCLUDED.spread_wins,
                    spread_losses = EXCLUDED.spread_losses,
                    spread_win_pct = EXCLUDED.spread_win_pct,
                    last_updated = CURRENT_TIMESTAMP`,
                [user.id, totalPoints, totalGames, mlWins, mlLosses, mlWinPct, spreadWins, spreadLosses, spreadWinPct]
            );
        }

        // Update rankings
        await pool.query(
            `WITH ranked AS (
                SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_points DESC, total_games ASC) as new_rank
                FROM leaderboard
            )
            UPDATE leaderboard l
            SET rank = r.new_rank,
                rank_change = COALESCE(l.rank - r.new_rank, 0)
            FROM ranked r
            WHERE l.user_id = r.user_id`
        );
    }
}

module.exports = ScoringService;