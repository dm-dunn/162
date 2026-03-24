const pool = require('../config/database');
const crypto = require('crypto');

class League {
    static generateInviteCode() {
        return crypto.randomBytes(4).toString('hex');
    }

    static async create({ name, description, ownerId }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const inviteCode = this.generateInviteCode();
            const leagueResult = await client.query(
                `INSERT INTO leagues (name, description, owner_id, invite_code)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [name, description || null, ownerId, inviteCode]
            );
            const league = leagueResult.rows[0];

            await client.query(
                `INSERT INTO league_members (league_id, user_id, role)
                 VALUES ($1, $2, 'owner')`,
                [league.id, ownerId]
            );

            await client.query('COMMIT');
            return league;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT l.*, u.username as owner_username, u.username as owner_username
             FROM leagues l
             JOIN users u ON l.owner_id = u.id
             WHERE l.id = $1 AND l.is_active = true`,
            [id]
        );
        return result.rows[0];
    }

    static async findByUserId(userId) {
        const result = await pool.query(
            `SELECT l.*, lm.role, u.username as owner_username
             FROM leagues l
             JOIN league_members lm ON l.id = lm.league_id
             JOIN users u ON l.owner_id = u.id
             WHERE lm.user_id = $1 AND l.is_active = true
             ORDER BY l.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async getMembers(leagueId) {
        const result = await pool.query(
            `SELECT lm.id, lm.league_id, lm.user_id, lm.role, lm.joined_at,
                    u.username, u.username, u.color
             FROM league_members lm
             JOIN users u ON lm.user_id = u.id
             WHERE lm.league_id = $1
             ORDER BY lm.role DESC, lm.joined_at ASC`,
            [leagueId]
        );
        return result.rows;
    }

    static async addMember(leagueId, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const league = await client.query(
                'SELECT member_count, max_members FROM leagues WHERE id = $1',
                [leagueId]
            );
            if (!league.rows[0]) throw new Error('League not found');
            if (league.rows[0].member_count >= league.rows[0].max_members) {
                throw new Error('League is full');
            }

            const userLeagues = await client.query(
                'SELECT COUNT(*) as count FROM league_members WHERE user_id = $1',
                [userId]
            );
            if (parseInt(userLeagues.rows[0].count) >= 10) {
                throw new Error('You have reached the maximum number of leagues (10)');
            }

            await client.query(
                `INSERT INTO league_members (league_id, user_id, role)
                 VALUES ($1, $2, 'member')`,
                [leagueId, userId]
            );

            await client.query(
                `UPDATE leagues SET member_count = member_count + 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [leagueId]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async removeMember(leagueId, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `DELETE FROM league_members WHERE league_id = $1 AND user_id = $2 AND role != 'owner'
                 RETURNING *`,
                [leagueId, userId]
            );
            if (result.rows.length === 0) {
                throw new Error('Member not found or cannot remove owner');
            }

            await client.query(
                `UPDATE leagues SET member_count = member_count - 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [leagueId]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async isMember(leagueId, userId) {
        const result = await pool.query(
            'SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2',
            [leagueId, userId]
        );
        return result.rows.length > 0;
    }

    static async isOwner(leagueId, userId) {
        const result = await pool.query(
            'SELECT id FROM leagues WHERE id = $1 AND owner_id = $2',
            [leagueId, userId]
        );
        return result.rows.length > 0;
    }

    static async getCreatedCount(userId) {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM leagues WHERE owner_id = $1 AND is_active = true',
            [userId]
        );
        return parseInt(result.rows[0].count);
    }

    static async createInvitation(leagueId, email, invitedBy, tokenHash, expiresAt) {
        const result = await pool.query(
            `INSERT INTO league_invitations (league_id, email, token_hash, invited_by, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [leagueId, email.toLowerCase(), tokenHash, invitedBy, expiresAt]
        );
        return result.rows[0];
    }

    static async findInvitationByToken(tokenHash) {
        const result = await pool.query(
            `SELECT li.*, l.name as league_name, l.is_active as league_active,
                    l.member_count, l.max_members,
                    u.username as inviter_name
             FROM league_invitations li
             JOIN leagues l ON li.league_id = l.id
             JOIN users u ON li.invited_by = u.id
             WHERE li.token_hash = $1
             AND li.status = 'pending'
             AND li.expires_at > NOW()`,
            [tokenHash]
        );
        return result.rows[0];
    }

    static async acceptInvitation(invitationId) {
        await pool.query(
            `UPDATE league_invitations SET status = 'accepted', accepted_at = NOW()
             WHERE id = $1`,
            [invitationId]
        );
    }

    static async getPendingInvitations(leagueId) {
        const result = await pool.query(
            `SELECT li.*, u.username as inviter_name
             FROM league_invitations li
             JOIN users u ON li.invited_by = u.id
             WHERE li.league_id = $1 AND li.status = 'pending' AND li.expires_at > NOW()
             ORDER BY li.created_at DESC`,
            [leagueId]
        );
        return result.rows;
    }

    static async findByInviteCode(inviteCode) {
        const result = await pool.query(
            `SELECT * FROM leagues WHERE invite_code = $1 AND is_active = true`,
            [inviteCode.toLowerCase()]
        );
        return result.rows[0];
    }

    static async getStandings(leagueId) {
        const result = await pool.query(
            `SELECT lm.user_id, lm.role, u.username, u.username, u.color,
                    COALESCE(lb.total_points, 0) as total_points,
                    COALESCE(lb.total_games, 0) as total_games,
                    COALESCE(lb.moneyline_wins, 0) as ml_wins,
                    COALESCE(lb.moneyline_losses, 0) as ml_losses,
                    COALESCE(lb.moneyline_win_pct, 0) as ml_pct,
                    COALESCE(lb.spread_wins, 0) as spread_wins,
                    COALESCE(lb.spread_losses, 0) as spread_losses,
                    COALESCE(lb.spread_win_pct, 0) as spread_pct
             FROM league_members lm
             JOIN users u ON lm.user_id = u.id
             LEFT JOIN leaderboard lb ON lb.user_id = lm.user_id
             WHERE lm.league_id = $1
             ORDER BY COALESCE(lb.total_points, 0) DESC`,
            [leagueId]
        );
        return result.rows;
    }

    static async getProgression(leagueId) {
        const result = await pool.query(
            `WITH daily AS (
                SELECT p.user_id, g.game_date::date AS day, SUM(p.points_earned) AS pts
                FROM picks p
                JOIN games g ON g.id = p.game_id
                JOIN league_members lm ON lm.user_id = p.user_id AND lm.league_id = $1
                GROUP BY p.user_id, g.game_date::date
            )
            SELECT user_id, day,
                   SUM(pts) OVER (PARTITION BY user_id ORDER BY day) AS cumulative
            FROM daily
            ORDER BY day, user_id`,
            [leagueId]
        );
        return result.rows;
    }

    static async getRecentForm(leagueId, limit = 10) {
        const result = await pool.query(
            `WITH ranked AS (
                SELECT p.user_id, p.result, g.game_date,
                       ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY g.game_date DESC, g.game_time DESC) AS rn
                FROM picks p
                JOIN games g ON g.id = p.game_id
                JOIN league_members lm ON lm.user_id = p.user_id AND lm.league_id = $1
            )
            SELECT user_id, result FROM ranked WHERE rn <= $2 ORDER BY user_id, rn DESC`,
            [leagueId, limit]
        );
        return result.rows;
    }

    static async delete(leagueId) {
        await pool.query(
            `UPDATE leagues SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [leagueId]
        );
    }

    static async getPendingInvitationsForEmail(email) {
        const result = await pool.query(
            `SELECT li.*, l.name as league_name
             FROM league_invitations li
             JOIN leagues l ON li.league_id = l.id
             WHERE li.email = $1 AND li.status = 'pending' AND li.expires_at > NOW()`,
            [email.toLowerCase()]
        );
        return result.rows;
    }
}

module.exports = League;
