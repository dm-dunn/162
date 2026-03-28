const pool = require('../config/database');
const logger = require('../config/logger');
const { Game } = require('../models');
const ScoringService = require('./scoringService');
const { sendPushNotification } = require('./notificationService');
const ESPNService = require('./espnService');

/**
 * LivePollingService
 *
 * Runs every 15 minutes during game hours to:
 * 1. Fetch today's game statuses from ESPN
 * 2. Find games that just became "final" in ESPN but are still "not final" in our DB
 * 3. Update scores, grade picks, and send push notifications
 * 4. Trigger leaderboard update if any games were graded
 */
class LivePollingService {
    /**
     * Poll ESPN for today's games and grade any newly-finalized games.
     *
     * @returns {Promise<Object>} Summary of the polling cycle:
     *   { date, gamesChecked, gamesFinalized, picksGraded, notificationsSent, errors }
     */
    static async pollAndGrade() {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

        const summary = {
            date: dateStr,
            gamesChecked: 0,
            gamesFinalized: 0,
            picksGraded: 0,
            notificationsSent: 0,
            errors: []
        };

        try {
            // 1. Fetch today's games from DB (non-final only)
            const dbGames = await Game.findByDate(dateStr);
            const nonFinalGames = dbGames.filter(g =>
                g.status !== 'final' &&
                g.status !== 'postponed' &&
                g.status !== 'suspended' &&
                g.status !== 'cancelled'
            );

            if (nonFinalGames.length === 0) {
                logger.debug(`[livePollingService] No non-final games for ${dateStr}`);
                return summary;
            }

            summary.gamesChecked = nonFinalGames.length;

            // 2. Fetch ESPN scoreboard for today
            const espnGames = await ESPNService.getScoreboardForDate(new Date(dateStr));

            if (!espnGames || espnGames.length === 0) {
                logger.warn(`[livePollingService] ESPN returned no games for ${dateStr}`);
                return summary;
            }

            // 3. Build lookup map for matching: "${homeAbbr}:${awayAbbr}" → DB game
            const gameMap = {};
            for (const dbGame of nonFinalGames) {
                const key = `${dbGame.home_team_abbr}:${dbGame.away_team_abbr}`;
                gameMap[key] = dbGame;
            }

            // 4. Process each ESPN game
            for (const espnGame of espnGames) {
                const key = `${espnGame.homeTeamAbbr}:${espnGame.awayTeamAbbr}`;
                const dbGame = gameMap[key];

                if (!dbGame) {
                    logger.debug(`[livePollingService] No DB match for ESPN game ${key}`);
                    continue;
                }

                // Handle status changes (postponed, suspended, cancelled)
                if (['postponed', 'suspended', 'cancelled'].includes(espnGame.status)) {
                    if (dbGame.status !== espnGame.status) {
                        try {
                            await Game.updateScore(dbGame.id, null, null, espnGame.status);
                            logger.info(`[livePollingService] Updated game ${dbGame.id} to ${espnGame.status}`);
                        } catch (err) {
                            const errMsg = `Failed to update game ${dbGame.id} to ${espnGame.status}: ${err.message}`;
                            logger.error(errMsg);
                            summary.errors.push(errMsg);
                        }
                    }
                    continue;
                }

                // Handle newly-finalized games
                if (espnGame.status === 'final' && dbGame.status !== 'final') {
                    try {
                        // Update score
                        await Game.updateScore(dbGame.id, espnGame.homeScore, espnGame.awayScore, 'final');
                        logger.info(`[livePollingService] Finalized game ${dbGame.id} (${espnGame.homeTeamAbbr} ${espnGame.homeScore}, ${espnGame.awayTeamAbbr} ${espnGame.awayScore})`);

                        // Grade picks
                        const gradedPicks = await ScoringService.gradePicksForGame(dbGame.id);
                        summary.picksGraded += gradedPicks.length;

                        // Send push notifications
                        const notificationsSent = await this._sendPickGradingNotifications(dbGame, gradedPicks);
                        summary.notificationsSent += notificationsSent;

                        summary.gamesFinalized += 1;
                    } catch (err) {
                        const errMsg = `Failed to grade game ${dbGame.id}: ${err.message}`;
                        logger.error(errMsg);
                        summary.errors.push(errMsg);
                        // Continue to next game — don't let one failure stop others
                    }
                }
            }

            // 5. Update leaderboard if any games were graded
            if (summary.gamesFinalized > 0) {
                try {
                    await ScoringService.updateLeaderboard();
                    logger.info(`[livePollingService] Updated leaderboard after ${summary.gamesFinalized} games finalized`);
                } catch (err) {
                    const errMsg = `Failed to update leaderboard: ${err.message}`;
                    logger.error(errMsg);
                    summary.errors.push(errMsg);
                }
            }

            logger.info(`[livePollingService] Poll complete`, summary);
            return summary;

        } catch (err) {
            const errMsg = `[livePollingService] Unhandled error in pollAndGrade: ${err.message}`;
            logger.error(errMsg);
            summary.errors.push(errMsg);
            return summary;
        }
    }

    /**
     * Send push notifications for graded picks on a game.
     * Groups picks by user and sends one notification per user per game.
     *
     * @param {Object} dbGame - Game object from DB
     * @param {Array} gradedPicks - Array of { pickId, result, points, outcome }
     * @returns {Promise<number>} Count of notifications successfully sent
     * @private
     */
    static async _sendPickGradingNotifications(dbGame, gradedPicks) {
        if (!gradedPicks || gradedPicks.length === 0) return 0;

        let notificationsSent = 0;

        try {
            // Fetch user info and push tokens for all picks on this game
            const pickIds = gradedPicks.map(p => p.pickId);
            const result = await pool.query(
                `SELECT p.id as pick_id, p.user_id, p.result, p.points_earned, p.pick_type,
                        u.push_token, u.username
                 FROM picks p
                 JOIN users u ON u.id = p.user_id
                 WHERE p.id = ANY($1)`,
                [pickIds]
            );

            const picksByUser = {};

            // Group picks by user
            for (const pick of result.rows) {
                if (!pick.push_token) {
                    logger.debug(`[livePollingService] Skipping notification — no push token for user ${pick.user_id}`);
                    continue;
                }

                if (!picksByUser[pick.user_id]) {
                    picksByUser[pick.user_id] = {
                        pushToken: pick.push_token,
                        username: pick.username,
                        picks: []
                    };
                }
                picksByUser[pick.user_id].picks.push(pick);
            }

            // Send one notification per user
            for (const userId in picksByUser) {
                const userInfo = picksByUser[userId];
                const picks = userInfo.picks;

                try {
                    const { title, body, totalPoints } = this._buildNotificationMessage(dbGame, picks);

                    const ticket = await sendPushNotification({
                        to: userInfo.pushToken,
                        title,
                        body,
                        data: {
                            type: 'pick_graded',
                            gameId: dbGame.id,
                            totalPoints
                        }
                    });

                    if (ticket) {
                        notificationsSent += 1;
                        logger.debug(`[livePollingService] Sent notification to user ${userId} for game ${dbGame.id}`);
                    }
                } catch (err) {
                    logger.debug(`[livePollingService] Failed to notify user ${userId}: ${err.message}`);
                    // Continue to next user — notification failure must not crash polling
                }
            }

            return notificationsSent;

        } catch (err) {
            logger.error(`[livePollingService] Error sending pick grading notifications for game ${dbGame.id}`, { error: err.message });
            return 0;
        }
    }

    /**
     * Build title and body for a pick grading notification.
     *
     * @param {Object} dbGame - Game object from DB
     * @param {Array} picks - User's picks on this game (DB rows)
     * @returns {Object} { title, body, totalPoints }
     * @private
     */
    static _buildNotificationMessage(dbGame, picks) {
        const title = `⚾ ${dbGame.away_team_abbr} @ ${dbGame.home_team_abbr} — Final`;

        let body = '';
        let totalPoints = 0;

        if (picks.length === 1) {
            // Single pick
            const pick = picks[0];
            const points = pick.points_earned || 0;
            totalPoints = points;

            if (pick.result === 'win') {
                body = pick.pick_type === 'moneyline'
                    ? `Your moneyline pick won! +${points} pt 🎉`
                    : `Your spread pick won! +${points} pts 🎉`;
            } else if (pick.result === 'loss') {
                body = pick.pick_type === 'moneyline'
                    ? `Your moneyline pick lost. ${points} pt`
                    : `Your spread pick lost. ${points} pts`;
            } else if (pick.result === 'push') {
                body = `Your spread pick pushed. ${points} pts`;
            }
        } else {
            // Multiple picks (moneyline + spread)
            const parts = [];

            for (const pick of picks) {
                const points = pick.points_earned || 0;
                totalPoints += points;

                let pickStr = '';
                if (pick.pick_type === 'moneyline') {
                    if (pick.result === 'win') {
                        pickStr = `Moneyline: +${points} pt`;
                    } else {
                        pickStr = `Moneyline: ${points} pt`;
                    }
                } else if (pick.pick_type === 'spread') {
                    if (pick.result === 'win') {
                        pickStr = `Spread: +${points} pts`;
                    } else if (pick.result === 'push') {
                        pickStr = `Spread: ${points} pts (push)`;
                    } else {
                        pickStr = `Spread: ${points} pts`;
                    }
                }

                if (pickStr) parts.push(pickStr);
            }

            const hasWin = picks.some(p => p.result === 'win');
            body = parts.join(' · ') + (hasWin ? ' 🎉' : '');
        }

        return { title, body, totalPoints };
    }
}

module.exports = LivePollingService;
