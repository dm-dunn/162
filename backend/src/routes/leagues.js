const express = require('express');
const crypto = require('crypto');
const { League, User } = require('../models');
const { authenticate, requireEmailVerified } = require('../middleware/auth');
const { validate, schemas, validateIdParam } = require('../middleware/validation');
const EmailService = require('../services/emailService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// List user's leagues
router.get('/', authenticate, async (req, res, next) => {
    try {
        const leagues = await League.findByUserId(req.user.id);
        res.json({ leagues });
    } catch (error) {
        next(error);
    }
});

// Get invite info (public-ish, no auth required for viewing invite details)
router.get('/invite/info', async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const invitation = await League.findInvitationByToken(tokenHash);

        if (!invitation) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        res.json({
            leagueName: invitation.league_name,
            inviterName: invitation.inviter_name,
            memberCount: invitation.member_count
        });
    } catch (error) {
        next(error);
    }
});

// Join a league via invite token
router.post('/join', authenticate, async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const invitation = await League.findInvitationByToken(tokenHash);

        if (!invitation) {
            return res.status(404).json({ error: 'Invalid or expired invitation' });
        }

        if (!invitation.league_active) {
            return res.status(400).json({ error: 'This league is no longer active' });
        }

        const alreadyMember = await League.isMember(invitation.league_id, req.user.id);
        if (alreadyMember) {
            return res.status(400).json({ error: 'You are already a member of this league' });
        }

        await League.addMember(invitation.league_id, req.user.id);
        await League.acceptInvitation(invitation.id);

        // Notify league owner
        try {
            const league = await League.findById(invitation.league_id);
            if (league && league.owner_id !== req.user.id) {
                const ownerPushToken = await User.getPushToken(league.owner_id);
                await notificationService.notifyLeagueJoin({
                    ownerPushToken,
                    joinerUsername: req.user.username,
                    leagueName: league.name,
                    leagueId: league.id,
                });
            }
        } catch (notifErr) {
            // Non-fatal
        }

        res.json({ message: 'Successfully joined the league', leagueId: invitation.league_id });
    } catch (error) {
        next(error);
    }
});

// Join a league via short invite code
router.post('/join-code', authenticate, async (req, res, next) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        const league = await League.findByInviteCode(inviteCode);
        if (!league) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        const alreadyMember = await League.isMember(league.id, req.user.id);
        if (alreadyMember) {
            return res.status(400).json({ error: 'You are already a member of this league' });
        }

        await League.addMember(league.id, req.user.id);

        // Notify league owner
        try {
            if (league.owner_id !== req.user.id) {
                const ownerPushToken = await User.getPushToken(league.owner_id);
                await notificationService.notifyLeagueJoin({
                    ownerPushToken,
                    joinerUsername: req.user.username,
                    leagueName: league.name,
                    leagueId: league.id,
                });
            }
        } catch (notifErr) {
            // Non-fatal — log and continue
        }

        res.json({ message: 'Successfully joined the league', leagueId: league.id });
    } catch (error) {
        next(error);
    }
});

// Create a league
router.post('/', authenticate, requireEmailVerified, validate(schemas.createLeague), async (req, res, next) => {
    try {
        const createdCount = await League.getCreatedCount(req.user.id);
        if (createdCount >= 5) {
            return res.status(400).json({ error: 'You can only create up to 5 leagues' });
        }

        const league = await League.create({
            name: req.body.name,
            description: req.body.description,
            ownerId: req.user.id
        });

        res.status(201).json({ league });
    } catch (error) {
        next(error);
    }
});

// Get league details
router.get('/:id', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const league = await League.findById(req.params.id);
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        const isMember = await League.isMember(league.id, req.user.id);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this league' });
        }

        const members = await League.getMembers(league.id);
        const isOwner = league.owner_id === req.user.id;

        let pendingInvitations = [];
        if (isOwner) {
            pendingInvitations = await League.getPendingInvitations(league.id);
        }

        res.json({ league, members, isOwner, pendingInvitations });
    } catch (error) {
        next(error);
    }
});

// Get league standings
router.get('/:id/standings', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const league = await League.findById(req.params.id);
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        const isMember = await League.isMember(league.id, req.user.id);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this league' });
        }

        const standings = await League.getStandings(league.id);
        res.json({ standings });
    } catch (error) {
        next(error);
    }
});

// Get league points progression (for line chart)
router.get('/:id/progression', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const league = await League.findById(req.params.id);
        if (!league) return res.status(404).json({ error: 'League not found' });

        const isMember = await League.isMember(league.id, req.user.id);
        if (!isMember) return res.status(403).json({ error: 'Not a member' });

        const [rows, form] = await Promise.all([
            League.getProgression(league.id),
            League.getRecentForm(league.id)
        ]);
        res.json({ progression: rows, recentForm: form });
    } catch (error) {
        next(error);
    }
});

// Invite users by email
router.post('/:id/invite', authenticate, validateIdParam('id'), requireEmailVerified, validate(schemas.inviteToLeague), async (req, res, next) => {
    try {
        const league = await League.findById(req.params.id);
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        const isOwner = await League.isOwner(league.id, req.user.id);
        if (!isOwner) {
            return res.status(403).json({ error: 'Only the league owner can invite members' });
        }

        const { emails } = req.body;
        const results = [];

        for (const email of emails) {
            try {
                const rawToken = crypto.randomBytes(32).toString('hex');
                const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

                await League.createInvitation(league.id, email, req.user.id, tokenHash, expiresAt);
                await EmailService.sendLeagueInvitation(
                    email,
                    league.name,
                    req.user.username,
                    rawToken
                );

                results.push({ email, status: 'sent' });
            } catch (err) {
                results.push({ email, status: 'failed', error: err.message });
            }
        }

        res.json({ results });
    } catch (error) {
        next(error);
    }
});

// Leave a league
router.post('/:id/leave', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const isOwner = await League.isOwner(req.params.id, req.user.id);
        if (isOwner) {
            return res.status(400).json({ error: 'Owners cannot leave their own league. Transfer ownership or delete the league.' });
        }

        await League.removeMember(req.params.id, req.user.id);
        res.json({ message: 'Left the league successfully' });
    } catch (error) {
        next(error);
    }
});

// Delete a league (owner only)
router.delete('/:id', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const isOwner = await League.isOwner(req.params.id, req.user.id);
        if (!isOwner) {
            return res.status(403).json({ error: 'Only the league owner can delete this league' });
        }

        await League.delete(req.params.id);
        res.json({ message: 'League deleted' });
    } catch (error) {
        next(error);
    }
});

// Remove a member (owner only)
router.delete('/:id/members/:userId', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const isOwner = await League.isOwner(req.params.id, req.user.id);
        if (!isOwner) {
            return res.status(403).json({ error: 'Only the league owner can remove members' });
        }

        if (parseInt(req.params.userId) === req.user.id) {
            return res.status(400).json({ error: 'Cannot remove yourself as owner' });
        }

        await League.removeMember(req.params.id, parseInt(req.params.userId));
        res.json({ message: 'Member removed' });
    } catch (error) {
        next(error);
    }
});

// Simulate a member joining (dev/test helper) — sends a test push notification to owner
router.post('/:id/simulate-join', authenticate, validateIdParam('id'), async (req, res, next) => {
    try {
        const isOwner = await League.isOwner(req.params.id, req.user.id);
        if (!isOwner) {
            return res.status(403).json({ error: 'Only the league owner can trigger a simulation' });
        }

        const league = await League.findById(req.params.id);
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        const ownerPushToken = await User.getPushToken(req.user.id);
        await notificationService.notifyLeagueJoin({
            ownerPushToken,
            joinerUsername: 'TestUser_Demo',
            leagueName: league.name,
            leagueId: league.id,
        });

        res.json({ message: 'Simulation notification dispatched', hadToken: !!ownerPushToken });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
