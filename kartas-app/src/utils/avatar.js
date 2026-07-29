const AVATAR_PALETTE = [
    '#7B00FF', // --color-primary
    '#00C3FF', // --color-secondary
    '#00875A', // --color-success
    '#FF8B00', // --color-warning
    '#DE350B', // --color-danger
    '#0065FF', // --color-info
    '#9D4EFF', // --color-primary-light
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
    return AVATAR_PALETTE[hashString(key) % AVATAR_PALETTE.length];
};
