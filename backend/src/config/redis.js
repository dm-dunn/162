const redis = require('redis');

let redisClient = null;

async function initRedis() {
    if (!process.env.REDIS_URL) {
        console.log('Redis not configured, using database cache');
        return null;
    }

    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: false // Don't auto-reconnect if first connection fails
            }
        });

        // Handle errors silently if Redis is optional
        redisClient.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log('Redis not available, using database cache fallback');
            } else {
                console.error('Redis error:', err.message);
            }
        });

        redisClient.on('connect', () => console.log('✓ Redis connected'));

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        console.log('Redis connection failed - using database cache fallback');
        redisClient = null;
        return null;
    }
}

async function getCache(key) {
    if (!redisClient) return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Redis get error:', error);
        return null;
    }
}

async function setCache(key, value, ttlSeconds = 900) {
    if (!redisClient) return false;
    try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Redis set error:', error);
        return false;
    }
}

async function delCache(key) {
    if (!redisClient) return false;
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error('Redis del error:', error);
        return false;
    }
}

module.exports = { initRedis, getCache, setCache, delCache };
