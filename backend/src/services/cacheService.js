const { getCache, setCache, delCache } = require('../config/redis');
const pool = require('../config/database');

class CacheService {
    // Try Redis first, fallback to PostgreSQL
    static async get(key) {
        // Try Redis
        const redisData = await getCache(key);
        if (redisData) return redisData;

        // Fallback to DB
        try {
            const result = await pool.query(
                'SELECT cache_data FROM api_cache WHERE cache_key = $1 AND expires_at > NOW()',
                [key]
            );

            if (result.rows[0]) {
                return result.rows[0].cache_data;
            }
        } catch (error) {
            console.error('DB cache get error:', error);
        }

        return null;
    }

    static async set(key, value, ttlSeconds = 900) {
        // Set in Redis
        await setCache(key, value, ttlSeconds);

        // Also set in DB as backup
        try {
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            await pool.query(
                `INSERT INTO api_cache (cache_key, cache_data, expires_at)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (cache_key)
                 DO UPDATE SET cache_data = EXCLUDED.cache_data, expires_at = EXCLUDED.expires_at`,
                [key, JSON.stringify(value), expiresAt]
            );
        } catch (error) {
            console.error('DB cache set error:', error);
        }
    }

    static async delete(key) {
        await delCache(key);

        try {
            await pool.query('DELETE FROM api_cache WHERE cache_key = $1', [key]);
        } catch (error) {
            console.error('DB cache delete error:', error);
        }
    }

    static async clearExpired() {
        try {
            await pool.query('DELETE FROM api_cache WHERE expires_at <= NOW()');
        } catch (error) {
            console.error('Clear expired cache error:', error);
        }
    }
}

module.exports = CacheService;