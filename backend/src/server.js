require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initRedis } = require('./config/redis');
const { initializeJobs } = require('./jobs/scheduler');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const webRoutes = require('./routes/web');
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const picksRoutes = require('./routes/picks');
const leaderboardRoutes = require('./routes/leaderboard');
const leaguesRoutes = require('./routes/leagues');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

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
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
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
            console.log(`
╔════════════════════════════════════════╗
║     MLB162 Backend Server Running      ║
║                                        ║
║     Port: ${PORT}                        ║
║     Environment: ${process.env.NODE_ENV || 'development'}           ║
║                                        ║
╚════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();