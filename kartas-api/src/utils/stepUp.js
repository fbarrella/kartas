import { query } from '../config/database.js';

// STEPUP-01: shared by requireStepUp (route middleware, middleware/auth.js)
// and every controller that gates inline rather than via route middleware
// (deleteUser, deleteProject, removeMember — matching those controllers'
// existing inline role/ownership-check style from Phase 8's TFA-08). Not
// consumed on match — a grant is reusable for its full window, not single-use.
export async function hasValidStepUpGrant(req) {
    const token = req.headers['x-step-up-token'];

    if (!token) {
        return false;
    }

    const result = await query(
        'SELECT id FROM step_up_grants WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
        [token, req.user.userId]
    );

    return result.rows.length > 0;
}
