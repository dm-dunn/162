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
            'SELECT id, username, email, email_verified, color, is_admin, created_at FROM users WHERE id = $1 AND is_active = true',
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
            `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 RETURNING id`,
            [passwordHash, userId]
        );
        return result.rows[0];
    }
}

module.exports = User;
