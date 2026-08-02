import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.js';
import { query } from '../config/database.js';
import { hasValidStepUpGrant } from '../utils/stepUp.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, jwtConfig.secret);

        // Verify user still exists
        const result = await query(
            'SELECT id, email, role, first_name, last_name, two_factor_enabled FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            ...result.rows[0],
            twoFactorEnabled: result.rows[0].two_factor_enabled
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

export const requireAdmin = requireRole('admin');
export const requireProjectOwner = requireRole('admin', 'project_owner');

// TFA-01: gates an action behind the requester's own 2FA being enabled — used
// alongside requireAdmin/requireProjectOwner wherever the PRD requires 2FA as
// a precondition (destructive deletions, admin settings saves), not as a
// replacement for those role checks.
export const requireTwoFactor = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.twoFactorEnabled) {
        return res.status(403).json({
            error: 'Two-factor authentication is required for this action',
            code: 'TWO_FACTOR_REQUIRED'
        });
    }

    next();
};

// STEPUP-01: a fresh, short-lived re-verification (an "X-Step-Up-Token"
// header, granted by POST /auth/2fa/step-up/verify) — layered on top of
// requireTwoFactor, never a replacement for it. Chained after requireAdmin/
// requireTwoFactor on route-gated endpoints; controllers that gate inline
// (deleteUser, deleteProject, removeMember) call hasValidStepUpGrant directly
// instead, matching their existing inline-check style.
export const requireStepUp = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const valid = await hasValidStepUpGrant(req);

    if (!valid) {
        return res.status(403).json({
            error: 'A fresh two-factor re-verification is required for this action',
            code: 'STEP_UP_REQUIRED'
        });
    }

    next();
};
