function errorHandler(err, req, res, next) {
    console.error('Error:', err);

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

    if (err.message === 'Please wait before requesting another verification email') {
        return res.status(429).json({ error: err.message });
    }

    if (err.message === 'League is full' || err.message.includes('maximum number of leagues')) {
        return res.status(400).json({ error: err.message });
    }

    if (err.message === 'Member not found or cannot remove owner') {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
}

module.exports = errorHandler;