const axios = require('axios');

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
let requestCount = 0;
const MAX_REQUESTS_PER_MINUTE = 10;

async function rateLimitedRequest(url) {
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
        await new Promise(resolve => setTimeout(resolve, 60000));
        requestCount = 0;
    }
    requestCount++;
    try {
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('MLB API error:', error.message);
        throw error;
    }
}

async function getSchedule(date) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `${MLB_API_BASE}/schedule?sportId=1&date=${dateStr}&hydrate=probablePitcher,lineup`;
    return await rateLimitedRequest(url);
}

async function getGameDetails(gameId) {
    const url = `${MLB_API_BASE}/game/${gameId}/feed/live`;
    return await rateLimitedRequest(url);
}

async function batchGetGames(gameIds) {
    const results = [];
    for (const gameId of gameIds) {
        try {
            const data = await getGameDetails(gameId);
            results.push({ gameId, data, success: true });
        } catch (error) {
            results.push({ gameId, error: error.message, success: false });
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return results;
}

module.exports = { getSchedule, getGameDetails, batchGetGames };
