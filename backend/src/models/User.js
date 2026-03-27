const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create({ username, email, password, color }) {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, color)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, color, email_verified, created_at`,
            [username, email, passwordHash, color || '#1e40af']
        );
        return result.rows[0];
    }

    static async findByUsername(username) {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND is_active = true',
            [username]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query(
            'SELECT id, username, email, email_verified, color, is_admin, must_change_password, created_at FROM users WHERE id = $1 AND is_active = true',
            [id]
        );
        return result.rows[0];
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async getAll() {
        const result = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE is_active = true ORDER BY username'
        );
        return result.rows;
    }

    static async setEmailVerified(userId) {
        const result = await pool.query(
            `UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING id, email_verified`,
            [userId]
        );
        return result.rows[0];
    }

    static async createVerificationToken(userId, tokenHash, expiresAt) {
        const result = await pool.query(
            `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3) RETURNING id`,
            [userId, tokenHash, expiresAt]
        );
        return result.rows[0];
    }

    static async findVerificationToken(tokenHash) {
        const result = await pool.query(
            `SELECT evt.*, u.email, u.email_verified
             FROM email_verification_tokens evt
             JOIN users u ON evt.user_id = u.id
             WHERE evt.token_hash = $1
             AND evt.used_at IS NULL
             AND evt.expires_at > NOW()`,
            [tokenHash]
        );
        return result.rows[0];
    }

    static async markTokenUsed(tokenId) {
        await pool.query(
            'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
            [tokenId]
        );
    }

    static async getRecentVerificationTokenCount(userId, minutes = 1) {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM email_verification_tokens
             WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute' * $2`,
            [userId, minutes]
        );
        return parseInt(result.rows[0].count);
    }

    static async updatePassword(userId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        const result = await pool.query(
            `UPDATE users SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING id`,
            [passwordHash, userId]
        );
        return result.rows[0];
    }

    static async setMustChangePassword(userId, value) {
        await pool.query(
            'UPDATE users SET must_change_password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [value, userId]
        );
    }

    // Password reset tokens
    static async createPasswordResetToken(userId, tokenHash, expiresAt) {
        const result = await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3) RETURNING id`,
            [userId, tokenHash, expiresAt]
        );
        return result.rows[0];
    }

    static async findPasswordResetToken(tokenHash) {
        const result = await pool.query(
            `SELECT prt.*, u.email
             FROM password_reset_tokens prt
             JOIN users u ON prt.user_id = u.id
             WHERE prt.token_hash = $1
             AND prt.used_at IS NULL
             AND prt.expires_at > NOW()`,
            [tokenHash]
        );
        return result.rows[0];
    }

    static async markPasswordResetTokenUsed(tokenId) {
        await pool.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
            [tokenId]
        );
    }

    static async getRecentPasswordResetCount(email, minutes = 60) {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM password_reset_tokens prt
             JOIN users u ON prt.user_id = u.id
             WHERE u.email = $1 AND prt.created_at > NOW() - INTERVAL '1 minute' * $2`,
            [email, minutes]
        );
        return parseInt(result.rows[0].count);
    }

    // Refresh tokens
    static async createRefreshToken(userId, tokenHash, expiresAt) {
        const result = await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3) RETURNING id`,
            [userId, tokenHash, expiresAt]
        );
        return result.rows[0];
    }

    static async findRefreshToken(tokenHash) {
        const result = await pool.query(
            `SELECT * FROM refresh_tokens
             WHERE token_hash = $1
             AND revoked_at IS NULL
             AND expires_at > NOW()`,
            [tokenHash]
        );
        return result.rows[0];
    }

    static async revokeRefreshToken(tokenHash) {
        await pool.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );
    }

    static async revokeAllRefreshTokens(userId) {
        await pool.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [userId]
        );
    }

    // Push notifications
    static async updatePushToken(userId, pushToken) {
        await pool.query(
            'UPDATE users SET push_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [pushToken, userId]
        );
    }

    static async getPushToken(userId) {
        const result = await pool.query(
            'SELECT push_token FROM users WHERE id = $1 AND is_active = true',
            [userId]
        );
        return result.rows[0]?.push_token || null;
    }

    static async cleanupExpiredTokens() {
        await pool.query(
            'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
        );
        await pool.query(
            'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL'
        );
    }
}

module.exports = User;
