const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
    // Log error with sanitized info (no request body which may contain passwords)
    logger.error('Request error', {
        message: err.message,
        path: req.path,
        method: req.method,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            message: err.message
        });
    }

    if (err.message === 'Invalid credentials') {
        return res.status(401).json({ error: err.message });
    }

    if (err.message.includes('already exists')) {
        return res.status(409).json({ error: err.message });
    }

    if (err.message === 'Invalid or expired verification token' || err.message === 'Email already verified') {
        return res.status(400).json({ error: err.message });
    }

    if (err.message === 'Invalid or expired reset token') {
        return res.status(400).json({ error: err.message });
    }

    if (err.message === 'Refresh token revoked or expired') {
        return res.status(401).json({ error: err.message });
    }

    if (err.message === 'Please wait before requesting another verification email' ||
        err.message === 'Too many password reset requests. Please try again later.') {
        return res.status(429).json({ error: err.message });
    }

    if (err.message === 'League is full' || err.message.includes('maximum number of leagues')) {
        return res.status(400).json({ error: err.message });
    }

    if (err.message === 'Member not found or cannot remove owner') {
        return res.status(400).json({ error: err.message });
    }

    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
}

module.exports = errorHandler;
