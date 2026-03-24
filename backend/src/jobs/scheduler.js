const cron = require('node-cron');
const MLBDataService = require('../services/mlbDataService');
const ScoringService = require('../services/scoringService');
const { Game } = require('../models');
const CacheService = require('../services/cacheService');

function initializeJobs() {
    console.log('🕐 Initializing scheduled jobs...');

    // Fetch daily games at 6 AM ET (11 AM UTC during DST, 10 AM EST)
    cron.schedule('0 10 * * *', async () => {
        console.log('Running: Fetch daily games');
        try {
            await MLBDataService.fetchDailyGames(new Date());
        } catch (error) {
            console.error('Fetch daily games error:', error);
        }
    });

    // Update lineups every 30 minutes during game hours (12 PM - 11 PM ET)
    cron.schedule('*/30 16-3 * * *', async () => {
        console.log('Running: Update lineups');
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
            console.error('Update lineups error:', error);
        }
    });

    // Lock games 5 minutes before start time (runs every minute)
    cron.schedule('* * * * *', async () => {
        try {
            const gamesToLock = await Game.getGamesToLock();
            
            for (const game of gamesToLock) {
                await Game.lockGame(game.id);
                console.log(`Locked game: ${game.away_team_abbr} @ ${game.home_team_abbr}`);
            }
        } catch (error) {
            console.error('Lock games error:', error);
        }
    });

    // Grade results at midnight ET (5 AM UTC)
    cron.schedule('0 5 * * *', async () => {
        console.log('Running: Grade results');
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            
            await ScoringService.gradeAllGamesForDate(dateStr);
        } catch (error) {
            console.error('Grade results error:', error);
        }
    });

    // Update leaderboard at 12:30 AM ET (5:30 AM UTC)
    cron.schedule('30 5 * * *', async () => {
        console.log('Running: Update leaderboard');
        try {
            await ScoringService.updateLeaderboard();
        } catch (error) {
            console.error('Update leaderboard error:', error);
        }
    });

    // Clear expired cache every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running: Clear expired cache');
        try {
            await CacheService.clearExpired();
        } catch (error) {
            console.error('Clear cache error:', error);
        }
    });

    console.log('✅ Scheduled jobs initialized');
}

module.exports = { initializeJobs };