const express = require('express');
const AuthService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

router.post('/register', validate(schemas.register), async (req, res, next) => {
    try {
        const result = await AuthService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/login', validate(schemas.login), async (req, res, next) => {
    try {
        const result = await AuthService.login(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const result = await AuthService.refreshAccessToken(refreshToken);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/verify-email', async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        const result = await AuthService.verifyEmail(token);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/resend-verification', authenticate, async (req, res, next) => {
    try {
        const result = await AuthService.resendVerification(req.user.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        const { usernameOrEmail, newPassword } = req.body;
        if (!usernameOrEmail || !newPassword) {
            return res.status(400).json({ error: 'Username/email and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const User = require('../models/User');
        const user = await User.findByUsername(usernameOrEmail) || await User.findByEmail(usernameOrEmail);
        if (!user) {
            return res.status(404).json({ error: 'No account found with that username or email' });
        }

        await User.updatePassword(user.id, newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
});

router.get('/me', authenticate, async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            color: req.user.color,
            emailVerified: req.user.email_verified,
            isAdmin: req.user.is_admin
        }
    });
});

module.exports = router;