const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const EmailService = require('./emailService');

class AuthService {
    static generateToken(userId) {
        return jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '15m' }
        );
    }

    static generateRefreshToken(userId) {
        return jwt.sign(
            { userId, type: 'refresh' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    static async register({ username, email, password, color }) {
        // Check if user exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }

        // Create user
        const user = await User.create({ username, email, password, color });

        // Generate verification token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await User.createVerificationToken(user.id, tokenHash, expiresAt);

        // Send verification email (don't block registration if email fails)
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n[DEV] Email verification token for ${email}:\n  Token: ${rawToken}\n  URL: ${process.env.APP_URL}/verify-email?token=${rawToken}\n  Direct API: GET http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${rawToken}\n`);
        }
        try {
            await EmailService.sendVerificationEmail(email, rawToken);
        } catch (err) {
            console.error('Failed to send verification email:', err.message);
        }

        // Generate auth tokens
        const accessToken = this.generateToken(user.id);
        const refreshToken = this.generateRefreshToken(user.id);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                color: user.color,
                emailVerified: false
            },
            accessToken,
            refreshToken
        };
    }

    static async login({ email, password }) {
        const user = await User.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValidPassword = await User.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        const accessToken = this.generateToken(user.id);
        const refreshToken = this.generateRefreshToken(user.id);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                color: user.color,
                emailVerified: user.email_verified
            },
            accessToken,
            refreshToken
        };
    }

    static async refreshAccessToken(refreshToken) {
        const decoded = this.verifyToken(refreshToken);
        if (!decoded || decoded.type !== 'refresh') {
            throw new Error('Invalid refresh token');
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const newAccessToken = this.generateToken(user.id);
        return { accessToken: newAccessToken };
    }

    static async verifyEmail(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const tokenRecord = await User.findVerificationToken(tokenHash);
        if (!tokenRecord) {
            throw new Error('Invalid or expired verification token');
        }

        if (tokenRecord.email_verified) {
            throw new Error('Email already verified');
        }

        await User.setEmailVerified(tokenRecord.user_id);
        await User.markTokenUsed(tokenRecord.id);

        return { message: 'Email verified successfully' };
    }

    static async resendVerification(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.email_verified) {
            throw new Error('Email already verified');
        }

        // Rate limit: 1 per minute
        const recentCount = await User.getRecentVerificationTokenCount(userId, 1);
        if (recentCount >= 1) {
            throw new Error('Please wait before requesting another verification email');
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await User.createVerificationToken(userId, tokenHash, expiresAt);

        if (process.env.NODE_ENV === 'development') {
            console.log(`\n[DEV] Resent email verification token for ${user.email}:\n  Token: ${rawToken}\n  Direct API: GET http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${rawToken}\n`);
        }
        try {
            await EmailService.sendVerificationEmail(user.email, rawToken);
        } catch (err) {
            console.error('Failed to send verification email:', err.message);
        }

        return { message: 'Verification email sent' };
    }
}

module.exports = AuthService;
