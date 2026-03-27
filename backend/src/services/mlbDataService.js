const { getSchedule, getGameDetails, batchGetGames } = require('../config/mlb-api');
const { Game } = require('../models');
const CacheService = require('./cacheService');

// Authoritative team name → MLB abbreviation lookup.
// Used as a fallback when the MLB Stats API doesn't return an abbreviation field.
const TEAM_NAME_TO_ABBR = {
    'Baltimore Orioles':      'BAL',
    'Boston Red Sox':         'BOS',
    'New York Yankees':       'NYY',
    'Tampa Bay Rays':         'TB',
    'Toronto Blue Jays':      'TOR',
    'Chicago White Sox':      'CWS',
    'Cleveland Guardians':    'CLE',
    'Detroit Tigers':         'DET',
    'Kansas City Royals':     'KC',
    'Minnesota Twins':        'MIN',
    'Houston Astros':         'HOU',
    'Los Angeles Angels':     'LAA',
    'Athletics':              'ATH',   // 2025+ Las Vegas / Sacramento era
    'Oakland Athletics':      'ATH',   // legacy name still seen in some API responses
    'Seattle Mariners':       'SEA',
    'Texas Rangers':          'TEX',
    'Atlanta Braves':         'ATL',
    'Miami Marlins':          'MIA',
    'New York Mets':          'NYM',
    'Philadelphia Phillies':  'PHI',
    'Washington Nationals':   'WSH',
    'Chicago Cubs':           'CHC',
    'Cincinnati Reds':        'CIN',
    'Milwaukee Brewers':      'MIL',
    'Pittsburgh Pirates':     'PIT',
    'St. Louis Cardinals':    'STL',
    'Arizona Diamondbacks':   'ARI',
    'Colorado Rockies':       'COL',
    'Los Angeles Dodgers':    'LAD',
    'San Diego Padres':       'SD',
    'San Francisco Giants':   'SF',
};

/**
 * Resolves a team abbreviation from the MLB Stats API game object.
 * Prefers the API's own `abbreviation` field; falls back to the full
 * team name lookup; last-resort is the first 3 chars (better than nothing).
 */
function resolveAbbr(teamObj) {
    const abbr = teamObj?.abbreviation;
    if (abbr && abbr.trim()) return abbr.trim().toUpperCase();
    const name = teamObj?.name || '';
    if (TEAM_NAME_TO_ABBR[name]) return TEAM_NAME_TO_ABBR[name];
    return name.substring(0, 3).toUpperCase();
}

class MLBDataService {
    static async fetchDailyGames(date) {
        const dateStr = date.toISOString().split('T')[0];
        const cacheKey = `schedule:${dateStr}`;

        // Check cache — a cache hit means we already wrote to the DB today;
        // return the cached list rather than hitting the API again.
        const cached = await CacheService.get(cacheKey);
        if (cached) return cached;

        let games = [];

        try {
            // Fetch from MLB Stats API
            const schedule = await getSchedule(date);

            if (schedule.dates && schedule.dates[0] && schedule.dates[0].games) {
                for (const game of schedule.dates[0].games) {
                    const gameData = {
                        externalGameId: game.gamePk.toString(),
                        gameDate: dateStr,
                        gameTime: new Date(game.gameDate),
                        homeTeam: game.teams.home.team.name,
                        awayTeam: game.teams.away.team.name,
                        homeTeamAbbr: resolveAbbr(game.teams.home.team),
                        awayTeamAbbr: resolveAbbr(game.teams.away.team),
                        venue: game.venue ? game.venue.name : 'TBD',
                        spread: 1.5
                    };

                    const savedGame = await Game.create(gameData);
                    games.push(savedGame);
                }
            }

            // Cache for 23 hours — a day's schedule doesn't change, so there's no
            // reason to re-fetch it every hour. The lineup-update job (every 30 min)
            // handles pitcher/lineup changes separately via updateLineups().
            await CacheService.set(cacheKey, games, 82800);

        } catch (apiError) {
            // API call failed (network issue, MLB outage, etc.).
            // Fall back to whatever is already in the DB for this date so the
            // app still has data rather than returning nothing.
            const logger = require('../config/logger');
            logger.error('MLB API fetch failed, falling back to DB', { date: dateStr, message: apiError.message });

            games = await Game.findByDate(dateStr);

            // If DB also has nothing, re-throw so callers know the fetch truly failed.
            if (games.length === 0) throw apiError;
        }

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