import React from 'react';
import { Link } from 'react-router-dom';

// Turns a plain-text comment into text + link segments, using the mention
// metadata the backend already resolved (GET /stories/:storyId) — no client-side
// guessing about who/what is a valid mention target.
export const renderCommentContent = (content, mentionedUsers = [], mentionedTickets = [], projectId) => {
    const markers = [];

    mentionedUsers.forEach(u => {
        const needle = `@${u.firstName} ${u.lastName}`;
        let idx = content.indexOf(needle);
        while (idx !== -1) {
            markers.push({ start: idx, end: idx + needle.length, label: needle, to: `/project/${projectId}/user/${u.id}` });
            idx = content.indexOf(needle, idx + needle.length);
        }
    });

    mentionedTickets.forEach(t => {
        let idx = content.indexOf(t.code);
        while (idx !== -1) {
            const to = t.type === 'epic'
                ? `/project/${projectId}/backlog?epic=${t.id}`
                : `/project/${projectId}/story/${t.id}`;
            markers.push({ start: idx, end: idx + t.code.length, label: t.code, to });
            idx = content.indexOf(t.code, idx + t.code.length);
        }
    });

    markers.sort((a, b) => a.start - b.start);

    const nonOverlapping = [];
    let lastEnd = -1;
    for (const m of markers) {
        if (m.start >= lastEnd) {
            nonOverlapping.push(m);
            lastEnd = m.end;
        }
    }

    const nodes = [];
    let cursor = 0;
    nonOverlapping.forEach((m, i) => {
        if (m.start > cursor) nodes.push(content.slice(cursor, m.start));
        nodes.push(
            <Link key={`mention-${i}`} to={m.to} style={{ fontWeight: 600 }}>
                {m.label}
            </Link>
        );
        cursor = m.end;
    });
    if (cursor < content.length) nodes.push(content.slice(cursor));

    return nodes;
};
