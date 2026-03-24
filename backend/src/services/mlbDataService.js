const { getSchedule, getGameDetails, batchGetGames } = require('../config/mlb-api');
const { Game } = require('../models');
const CacheService = require('./cacheService');

class MLBDataService {
    static async fetchDailyGames(date) {
        const cacheKey = `schedule:${date.toISOString().split('T')[0]}`;
        
        // Check cache
        const cached = await CacheService.get(cacheKey);
        if (cached) return cached;

        // Fetch from API
        const schedule = await getSchedule(date);
        const games = [];

        if (schedule.dates && schedule.dates[0] && schedule.dates[0].games) {
            for (const game of schedule.dates[0].games) {
                const gameData = {
                    externalGameId: game.gamePk.toString(),
                    gameDate: date.toISOString().split('T')[0],
                    gameTime: new Date(game.gameDate),
                    homeTeam: game.teams.home.team.name,
                    awayTeam: game.teams.away.team.name,
                    homeTeamAbbr: game.teams.home.team.abbreviation || game.teams.home.team.name.substring(0, 3).toUpperCase(),
                    awayTeamAbbr: game.teams.away.team.abbreviation || game.teams.away.team.name.substring(0, 3).toUpperCase(),
                    venue: game.venue ? game.venue.name : 'TBD',
                    spread: 1.5 // Default spread, could be enhanced
                };

                // Save to database
                const savedGame = await Game.create(gameData);
                games.push(savedGame);
            }
        }

        // Cache for 1 hour
        await CacheService.set(cacheKey, games, 3600);

        return games;
    }

    static async updateLineups(gameIds) {
        const results = [];

        // Group games by time windows (30-min batches)
        const gameGroups = this.groupByTimeWindow(gameIds, 30);

        for (const group of gameGroups) {
            const batchResults = await batchGetGames(group.map(g => g.externalGameId));

            for (const result of batchResults) {
                if (!result.success) {
                    results.push({ gameId: result.gameId, success: false, error: result.error });
                    continue;
                }

                try {
                    const gameData = result.data;
                    const lineupData = this.extractLineupData(gameData);

                    const game = await Game.findById(result.gameId);
                    if (game) {
                        await Game.updateLineup(game.id, lineupData);
                        results.push({ gameId: game.id, success: true });
                    }
                } catch (error) {
                    results.push({ gameId: result.gameId, success: false, error: error.message });
                }
            }
        }

        return results;
    }

    static extractLineupData(gameData) {
        const liveData = gameData.liveData || {};
        const boxscore = liveData.boxscore || {};

        return {
            homePitcher: boxscore.teams?.home?.pitchers?.[0] || { name: 'TBD' },
            awayPitcher: boxscore.teams?.away?.pitchers?.[0] || { name: 'TBD' },
            homeLineup: boxscore.teams?.home?.battingOrder || [],
            awayLineup: boxscore.teams?.away?.battingOrder || []
        };
    }

    static groupByTimeWindow(games, windowMinutes) {
        // Simple grouping - could be enhanced
        return [games]; // For now, treat as single batch
    }

    static async updateGameScores(gameIds) {
        const results = [];

        for (const gameId of gameIds) {
            try {
                const game = await Game.findById(gameId);
                if (!game || game.status === 'final') continue;

                const gameData = await getGameDetails(game.external_game_id);
                const liveData = gameData.liveData || {};
                const linescore = liveData.linescore || {};

                if (gameData.gameData.status.abstractGameState === 'Final') {
                    await Game.updateScore(
                        gameId,
                        linescore.teams?.home?.runs || 0,
                        linescore.teams?.away?.runs || 0,
                        'final'
                    );

                    results.push({ gameId, success: true, status: 'final' });
                }
            } catch (error) {
                results.push({ gameId, success: false, error: error.message });
            }
        }

        return results;
    }
}

module.exports = MLBDataService;