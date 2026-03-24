const AuthService = require('../services/authService');
const { User } = require('../models');

async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = AuthService.verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

function requireEmailVerified(req, res, next) {
    if (!req.user.email_verified) {
        return res.status(403).json({
            error: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }
    next();
}

module.exports = {
    authenticate,
    requireAdmin,
    requireEmailVerified
};