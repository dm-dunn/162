const axios = require('axios');
const logger = require('../config/logger');

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const MLB_API_BASE_V11 = 'https://statsapi.mlb.com/api/v1.1';

// Sliding-window rate limiter: max 10 requests per 60-second window.
const MAX_REQUESTS_PER_MINUTE = 10;
let requestCount = 0;
let windowStart = Date.now();

async function rateLimitedRequest(url) {
    const now = Date.now();

    // Reset count when the 60-second window has passed
    if (now - windowStart >= 60000) {
        requestCount = 0;
        windowStart = now;
    }

    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
        const waitMs = 60000 - (now - windowStart);
        logger.warn(`MLB API rate limit reached — waiting ${Math.ceil(waitMs / 1000)}s`, { url });
        await new Promise(resolve => setTimeout(resolve, waitMs + 100));
        requestCount = 0;
        windowStart = Date.now();
    }

    requestCount++;
    try {
        const response = await axios.get(url, { timeout: 10000 });
        return response.data;
    } catch (error) {
        logger.error('MLB API error', { url, message: error.message });
        throw error;
    }
}

async function getSchedule(date) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `${MLB_API_BASE}/schedule?sportId=1&date=${dateStr}&hydrate=probablePitcher,lineup`;
    return await rateLimitedRequest(url);
}

async function getGameDetails(gameId) {
    const url = `${MLB_API_BASE_V11}/game/${gameId}/feed/live`;
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
