const { Pool } = require('pg');
const logger = require('./logger');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
});

pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
        logger.info('Database connected');
    }
});

pool.on('error', (err) => {
    logger.error('Database pool error', { message: err.message });
    process.exit(-1);
});

module.exports = pool;
