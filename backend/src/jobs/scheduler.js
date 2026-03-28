const cron = require('node-cron');
const MLBDataService = require('../services/mlbDataService');
const OddsService = require('../services/oddsService');
const ScoringService = require('../services/scoringService');
const { Game, User } = require('../models');
const CacheService = require('../services/cacheService');
const LivePollingService = require('../services/livePollingService');
const logger = require('../config/logger');

function initializeJobs() {
    logger.info('Initializing scheduled jobs...');

    // Fetch daily games at 6 AM ET (11 AM UTC during DST, 10 AM EST)
    cron.schedule('0 10 * * *', async () => {
        logger.info('Running: Fetch daily games');
        try {
            await MLBDataService.fetchDailyGames(new Date());
        } catch (error) {
            logger.error('Fetch daily games error:', { message: error.message });
        }
    });

    // Fetch real run lines + moneylines at 6:30 AM ET (10:30 AM UTC during DST).
    // Runs 30 min after the game fetch so today's games are already in the DB.
    // Requires ODDS_API_KEY — silently skips if the key isn't configured.
    cron.schedule('30 10 * * *', async () => {
        if (!process.env.ODDS_API_KEY) return; // key not set, skip silently
        logger.info('Running: Fetch odds');
        try {
            const results = await OddsService.fetchDailyOdds(new Date());
            logger.info('Fetch odds complete', results);
        } catch (error) {
            logger.error('Fetch odds error:', { message: error.message });
        }
    });

    // Update lineups every 30 minutes during game hours (12 PM - 11 PM ET)
    cron.schedule('*/30 16-3 * * *', async () => {
        logger.info('Running: Update lineups');
        try {
            const today = new Date().toISOString().split('T')[0];
            const games = await Game.findByDate(today);

            const gameIds = games
                .filter(g => !g.data_locked)
                .map(g => ({ id: g.id, externalGameId: g.external_game_id }));

            if (gameIds.length > 0) {
                await MLBDataService.updateLineups(gameIds);
            }
        } catch (error) {
            logger.error('Update lineups error:', { message: error.message });
        }
    });

    // Lock games 5 minutes before start time (runs every minute)
    cron.schedule('* * * * *', async () => {
        try {
            const gamesToLock = await Game.getGamesToLock();

            for (const game of gamesToLock) {
                await Game.lockGame(game.id);
                logger.info(`Locked game: ${game.away_team_abbr} @ ${game.home_team_abbr}`);
            }
        } catch (error) {
            logger.error('Lock games error:', { message: error.message });
        }
    });

    // Live score polling every 15 minutes during game hours (12 PM – 1 AM ET).
    // UTC equivalent: 4 PM–5 AM UTC (covers DST and EST).
    // Polls ESPN for all game statuses, grades picks the moment a game goes final,
    // and sends push notifications to users. The 4 AM/5 AM safety-net jobs below
    // handle anything this job misses (e.g. server restart during game hours).
    cron.schedule('*/15 16-23,0-5 * * *', async () => {
        try {
            const summary = await LivePollingService.pollAndGrade();
            if (summary.gamesFinalized > 0 || summary.errors.length > 0) {
                logger.info('Live poll cycle complete', summary);
            }
            // Quiet no-op log when nothing changed (avoid log spam every 15 min)
        } catch (error) {
            logger.error('Live poll error (unexpected):', { message: error.message });
        }
    });

    // SAFETY NET: Finalize any remaining unfinalized games at 4 AM UTC.
    // Under normal operation the 15-min live polling job above handles this in real time.
    // This job is a fallback for nights when the server was down or the poll missed games.
    // Fetches final scores from the MLB API and marks games as 'final' (or
    // 'postponed' / 'suspended') so the grading job has data to work with.
    cron.schedule('0 4 * * *', async () => {
        logger.info('Running: Finalize game scores');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            const results = await MLBDataService.finalizeGamesForDate(dateStr);
            const finalized = results.filter(r => r.success && r.status === 'final').length;
            logger.info('Finalize game scores complete', { date: dateStr, finalized, total: results.length });
        } catch (error) {
            logger.error('Finalize game scores error:', { message: error.message });
        }
    });

    // SAFETY NET: Grade any remaining ungraded picks at 5 AM UTC.
    // Under normal operation picks are graded immediately by the live polling job.
    // This job catches anything the polling job missed.
    cron.schedule('0 5 * * *', async () => {
        logger.info('Running: Grade results');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            const results = await ScoringService.gradeAllGamesForDate(dateStr);
            const graded   = results.filter(r => r.success).length;
            const failed   = results.filter(r => !r.success).length;

            if (results.length === 0) {
                logger.warn('Grade results: zero games found to grade — scores may not be finalized yet', { date: dateStr });
            } else {
                logger.info('Grade results complete', { date: dateStr, graded, failed, total: results.length });
            }
        } catch (error) {
            logger.error('Grade results error:', { message: error.message });
        }
    });

    // SAFETY NET: Full leaderboard recalculation at 5:30 AM UTC.
    // The live polling job does incremental leaderboard updates after each game.
    // This job ensures the leaderboard is fully correct after all nightly processing.
    cron.schedule('30 5 * * *', async () => {
        logger.info('Running: Update leaderboard');
        try {
            await ScoringService.updateLeaderboard();
        } catch (error) {
            logger.error('Update leaderboard error:', { message: error.message });
        }
    });

    // Clear expired cache every hour
    cron.schedule('0 * * * *', async () => {
        try {
            await CacheService.clearExpired();
        } catch (error) {
            logger.error('Clear cache error:', { message: error.message });
        }
    });

    // Clean up expired tokens daily at 3 AM UTC
    cron.schedule('0 3 * * *', async () => {
        try {
            await User.cleanupExpiredTokens();
            logger.info('Cleaned up expired tokens');
        } catch (error) {
            logger.error('Token cleanup error:', { message: error.message });
        }
    });

    logger.info('Scheduled jobs initialized');
}

module.exports = { initializeJobs };
