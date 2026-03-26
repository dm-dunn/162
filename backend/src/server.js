require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initRedis } = require('./config/redis');
const { initializeJobs } = require('./jobs/scheduler');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Import routes
const webRoutes = require('./routes/web');
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const picksRoutes = require('./routes/picks');
const leaderboardRoutes = require('./routes/leaderboard');
const leaguesRoutes = require('./routes/leagues');
const adminRoutes = require('./routes/admin');

const app = express();

// Trust Render's proxy (required for express-rate-limit and accurate IP logging)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS with origin whitelist
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Request logging (runs before validation so all requests are captured)
app.use((req, res, next) => {
    logger.warn(`${req.method} ${req.path}`, { ip: req.ip });
    next();
});

// General rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Too many authentication attempts. Please try again later.'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Web routes (invite landing pages — no /api prefix, no rate limiting)
app.use('/', webRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/picks', picksRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use(errorHandler);

// Initialize
async function start() {
    try {
        // Initialize Redis
        await initRedis();

        // Start scheduled jobs
        initializeJobs();

        // Start server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`
╔════════════════════════════════════════╗
║     MLB162 Backend Server Running      ║
║                                        ║
║     Port: ${PORT}                        ║
║     Environment: ${process.env.NODE_ENV || 'development'}           ║
║                                        ║
╚════════════════════════════════════════╝
                `);
            } else {
                logger.info(`MLB162 server started on port ${PORT}`);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
