import { query } from '../config/database.js';

/**
 * Generates a unique ticket prefix from a project name
 * Examples:
 *   "Good Guys" -> "GGY" (or "GGY-1", "GGY-2" if duplicates exist)
 *   "Guardians of Code" -> "GOC"
 *   "Phoenix" -> "PHO"
 */
export async function generateUniqueTicketPrefix(projectName) {
    // Generate base prefix
    const basePrefix = generateBasePrefix(projectName);

    // Check if prefix exists in database
    const existingPrefixes = await query(
        'SELECT ticket_prefix FROM projects WHERE ticket_prefix LIKE $1',
        [`${basePrefix}%`]
    );

    if (existingPrefixes.rows.length === 0) {
        // Base prefix is available
        return basePrefix;
    }

    // Find the next available suffix number
    const usedPrefixes = existingPrefixes.rows.map(row => row.ticket_prefix);

    // If base prefix itself is not used, return it
    if (!usedPrefixes.includes(basePrefix)) {
        return basePrefix;
    }

    // Find the next available number
    let suffix = 1;
    let newPrefix = `${basePrefix}-${suffix}`;

    while (usedPrefixes.includes(newPrefix)) {
        suffix++;
        newPrefix = `${basePrefix}-${suffix}`;
    }

    return newPrefix;
}

/**
 * Generates the base prefix from a project name
 */
function generateBasePrefix(projectName) {
    // Remove special characters and extra spaces
    const cleaned = projectName
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ');

    const words = cleaned.split(' ');

    if (words.length === 1) {
        // Single word: take first 3 letters
        return words[0].substring(0, 3).toUpperCase();
    } else {
        // Multiple words: take first letter of each word (up to 4 words)
        return words
            .slice(0, 4)
            .map(word => word[0])
            .join('')
            .toUpperCase();
    }
}

/**
 * Generates the next story ID for a project
 * Example: "GGY-0001", "GGY-0002", etc.
 */
export async function generateNextStoryId(projectId) {
    // Get project ticket prefix
    const projectResult = await query(
        'SELECT ticket_prefix FROM projects WHERE id = $1',
        [projectId]
    );

    if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
    }

    const ticketPrefix = projectResult.rows[0].ticket_prefix;

    // Get every story number currently used in this project. MIG-01 broke the
    // assumption "highest internal id == highest sequence number": a migrated
    // story keeps its original (possibly old/low) id while getting a fresh
    // sequence number in its new project, so `ORDER BY id DESC LIMIT 1` can
    // return a row whose number is NOT actually the highest one in use here —
    // must scan every row's parsed number and take the true max.
    const storyResult = await query(
        `SELECT story_id FROM stories WHERE project_id = $1`,
        [projectId]
    );

    let nextNumber = 1;

    if (storyResult.rows.length > 0) {
        const highestNumber = storyResult.rows.reduce((max, row) => {
            const n = parseInt(row.story_id.split('-').pop(), 10);
            return Number.isNaN(n) ? max : Math.max(max, n);
        }, 0);
        nextNumber = highestNumber + 1;
    }

    // Format with leading zeros (4 digits)
    const formattedNumber = String(nextNumber).padStart(4, '0');

    return `${ticketPrefix}-${formattedNumber}`;
}

/**
 * Generates the next epic ID
 * Example: "EPIC-0001", "EPIC-0002", etc.
 */
export async function generateNextEpicId() {
    const result = await query(
        `SELECT epic_id FROM epics 
     ORDER BY id DESC 
     LIMIT 1`
    );

    let nextNumber = 1;

    if (result.rows.length > 0) {
        const lastEpicId = result.rows[0].epic_id;
        const lastNumber = parseInt(lastEpicId.split('-').pop());
        nextNumber = lastNumber + 1;
    }

    const formattedNumber = String(nextNumber).padStart(4, '0');

    return `EPIC-${formattedNumber}`;
}
