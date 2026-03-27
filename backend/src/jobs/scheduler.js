const cron = require('node-cron');
const MLBDataService = require('../services/mlbDataService');
const OddsService = require('../services/oddsService');
const ScoringService = require('../services/scoringService');
const { Game, User } = require('../models');
const CacheService = require('../services/cacheService');
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

    // Grade results at midnight ET (5 AM UTC)
    cron.schedule('0 5 * * *', async () => {
        logger.info('Running: Grade results');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];

            await ScoringService.gradeAllGamesForDate(dateStr);
        } catch (error) {
            logger.error('Grade results error:', { message: error.message });
        }
    });

    // Update leaderboard at 12:30 AM ET (5:30 AM UTC)
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
