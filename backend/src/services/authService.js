const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const EmailService = require('./emailService');
const logger = require('../config/logger');

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

    static hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    static async storeRefreshToken(userId, refreshToken) {
        const tokenHash = this.hashToken(refreshToken);
        const decoded = this.verifyToken(refreshToken);
        const expiresAt = new Date(decoded.exp * 1000);
        await User.createRefreshToken(userId, tokenHash, expiresAt);
    }

    static async register({ username, email, password, color }) {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            throw new Error('Email already exists');
        }

        const user = await User.create({ username, email, password, color });

        // Generate verification token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await User.createVerificationToken(user.id, tokenHash, expiresAt);

        if (process.env.NODE_ENV === 'development') {
            console.log(`\n[DEV] Email verification token for ${email}:\n  Token: ${rawToken}\n  URL: ${process.env.APP_URL}/verify-email?token=${rawToken}\n  Direct API: GET http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${rawToken}\n`);
        }
        try {
            await EmailService.sendVerificationEmail(email, rawToken);
        } catch (err) {
            logger.error('Failed to send verification email', { error: err.message });
        }

        const accessToken = this.generateToken(user.id);
        const refreshToken = this.generateRefreshToken(user.id);

        // Store refresh token server-side
        await this.storeRefreshToken(user.id, refreshToken);

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

        // Store refresh token server-side
        await this.storeRefreshToken(user.id, refreshToken);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                color: user.color,
                emailVerified: user.email_verified,
                mustChangePassword: user.must_change_password || false
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

        // Verify token exists server-side and is not revoked
        const tokenHash = this.hashToken(refreshToken);
        const storedToken = await User.findRefreshToken(tokenHash);
        if (!storedToken) {
            throw new Error('Refresh token revoked or expired');
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const newAccessToken = this.generateToken(user.id);
        return { accessToken: newAccessToken };
    }

    static async logout(refreshToken) {
        if (refreshToken) {
            const tokenHash = this.hashToken(refreshToken);
            await User.revokeRefreshToken(tokenHash);
        }
    }

    static async verifyEmail(token) {
        const tokenHash = this.hashToken(token);

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

        const recentCount = await User.getRecentVerificationTokenCount(userId, 1);
        if (recentCount >= 1) {
            throw new Error('Please wait before requesting another verification email');
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await User.createVerificationToken(userId, tokenHash, expiresAt);

        if (process.env.NODE_ENV === 'development') {
            console.log(`\n[DEV] Resent email verification token for ${user.email}:\n  Token: ${rawToken}\n  Direct API: GET http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${rawToken}\n`);
        }
        try {
            await EmailService.sendVerificationEmail(user.email, rawToken);
        } catch (err) {
            logger.error('Failed to send verification email', { error: err.message });
        }

        return { message: 'Verification email sent' };
    }

    static generateTempPassword() {
        // Readable alphanumeric chars, excluding ambiguous characters (0, O, I, l, 1)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        const bytes = crypto.randomBytes(12);
        for (let i = 0; i < 12; i++) {
            password += chars[bytes[i] % chars.length];
        }
        return password;
    }

    static async forgotPassword(email) {
        const user = await User.findByEmail(email);
        // Always return success to prevent email enumeration
        if (!user) {
            return { message: 'If an account with that email exists, a temporary password has been sent.' };
        }

        const tempPassword = this.generateTempPassword();

        // Set the temp password and flag the account for forced password change
        await User.updatePassword(user.id, tempPassword);
        await User.setMustChangePassword(user.id, true);

        if (process.env.NODE_ENV === 'development') {
            console.log(`\n[DEV] Temporary password for ${email}:\n  Temp password: ${tempPassword}\n`);
        }
        try {
            await EmailService.sendTemporaryPasswordEmail(email, tempPassword);
        } catch (err) {
            logger.error('Failed to send temporary password email', { error: err.message });
        }

        return { message: 'If an account with that email exists, a temporary password has been sent.' };
    }

    static async resetPassword(token, newPassword) {
        const tokenHash = this.hashToken(token);

        const tokenRecord = await User.findPasswordResetToken(tokenHash);
        if (!tokenRecord) {
            throw new Error('Invalid or expired reset token');
        }

        await User.updatePassword(tokenRecord.user_id, newPassword);
        await User.markPasswordResetTokenUsed(tokenRecord.id);

        // Revoke all refresh tokens for this user (force re-login)
        await User.revokeAllRefreshTokens(tokenRecord.user_id);

        return { message: 'Password reset successfully. Please log in with your new password.' };
    }

    static async changePassword(userId, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        await User.updatePassword(userId, newPassword);
        return { message: 'Password changed successfully.' };
    }
}

module.exports = AuthService;
