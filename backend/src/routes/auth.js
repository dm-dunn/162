const express = require('express');
const AuthService = require('../services/authService');
const { User } = require('../models');
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

router.post('/logout', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        await AuthService.logout(refreshToken);
        res.json({ message: 'Logged out successfully' });
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

router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const result = await AuthService.forgotPassword(email);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const result = await AuthService.resetPassword(token, newPassword);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/change-password', authenticate, async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }
        const result = await AuthService.changePassword(req.user.id, newPassword);
        res.json(result);
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
            isAdmin: req.user.is_admin,
            mustChangePassword: req.user.must_change_password || false
        }
    });
});

router.put('/push-token', authenticate, async (req, res, next) => {
    try {
        const { pushToken } = req.body;
        if (!pushToken) {
            return res.status(400).json({ error: 'Push token is required' });
        }
        await User.updatePushToken(req.user.id, pushToken);
        res.json({ message: 'Push token saved' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
