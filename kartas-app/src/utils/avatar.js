const AVATAR_PALETTE = [
    '#7B00FF', // --color-primary
    '#00C3FF', // --color-secondary
    '#00875A', // --color-success
    '#FF8B00', // --color-warning
    '#DE350B', // --color-danger
    '#0065FF', // --color-info
    '#9D4EFF', // --color-primary-light
];

// DM-01: dark-mode-appropriate equivalents (same order/indices as
// AVATAR_PALETTE above, mirroring index.css's [data-theme="dark"] values) —
// these are hardcoded hex, not CSS variables, so they can't follow a
// :root swap automatically and need their own theme-aware lookup.
const AVATAR_PALETTE_DARK = [
    '#9D4EFF', // --color-primary (dark)
    '#33D6FF', // --color-secondary (dark)
    '#57D9A3', // --color-success (dark)
    '#FFAB40', // --color-warning (dark)
    '#FF6B4A', // --color-danger (dark)
    '#4C9AFF', // --color-info (dark)
    '#C299FF', // --color-primary-light (dark)
];

export const getInitials = (firstName, lastName) => {
    const first = firstName?.trim()?.[0] || '';
    const last = lastName?.trim()?.[0] || '';
    return (first + last).toUpperCase() || '?';
};

export const getInitialsFromFullName = (fullName) => {
    if (!fullName) return '?';
    const [first, ...rest] = fullName.trim().split(' ');
    return getInitials(first, rest.join(' '));
};

export const getProjectInitials = (name) => {
    const trimmed = name?.trim() || '';
    return trimmed.slice(0, 2).toUpperCase() || '?';
};

// djb2-derived hash — pure/deterministic, no Math.random, stable across sessions.
const hashString = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
};

export const getAvatarColor = (seed) => {
    const key = seed === null || seed === undefined ? '' : String(seed);
    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
    const palette = isDark ? AVATAR_PALETTE_DARK : AVATAR_PALETTE;
    return palette[hashString(key) % palette.length];
};
