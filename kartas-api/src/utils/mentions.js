import { query } from '../config/database.js';

// @mentions are matched by plain display text (not a hidden ID token, per CMT-03's
// design decision), so a person is "mentioned" when "@First Last" appears verbatim
// in the comment and that name belongs to an actual project member.
export async function resolveMentionedUsers(content, projectId) {
    const result = await query(
        `SELECT u.id, u.first_name, u.last_name
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1`,
        [projectId]
    );

    return result.rows
        .filter(u => content.includes(`@${u.first_name} ${u.last_name}`))
        .map(u => ({ id: u.id, firstName: u.first_name, lastName: u.last_name }));
}

// Ticket mentions cover stories and epics only — both have a stable, unique,
// user-facing short code (story_id/epic_id). Sub-tasks have no equivalent code
// in the schema, so they're not linkable via this mechanism.
export async function resolveMentionedTickets(content, projectId) {
    const result = await query(
        `SELECT id, story_id as code, title, 'story' as type FROM stories WHERE project_id = $1
         UNION ALL
         SELECT id, epic_id as code, title, 'epic' as type FROM epics WHERE project_id = $1`,
        [projectId]
    );

    return result.rows.filter(t => content.includes(t.code));
}
