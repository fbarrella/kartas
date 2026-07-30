// PAL-02/PAL-04: the admin-editable curated palette system. An admin picks 9 base
// colors (light + dark variant each); everything else (dark/light brand shades, the
// 11-step neutral scale, tinted status backgrounds, surface, border) is derived from
// those via consistent HSL adjustments — never independently stored or editable.

export const BASE_CATEGORIES = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'success', label: 'Success' },
    { key: 'warning', label: 'Warning' },
    { key: 'danger', label: 'Danger' },
    { key: 'info', label: 'Info' },
    { key: 'neutral', label: 'Neutral' },
    { key: 'background', label: 'Background' },
    { key: 'text', label: 'Text' }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];

    const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`.toUpperCase();
};

const adjustLightness = (hex, delta) => {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s, clamp(l + delta, 0, 100));
};

// A muted, tinted background variant of a status color (e.g. --color-success-light) —
// same hue, desaturated, pushed toward the light or dark end depending on mode.
const tintColor = (hex, isDark) => {
    const { h, s } = hexToHsl(hex);
    const targetS = clamp(s * 0.55, 15, 60);
    return hslToHex(h, targetS, isDark ? 22 : 93);
};

const NEUTRAL_LADDER_LIGHT = { 50: 97, 100: 93, 200: 88, 300: 78, 400: 63, 500: 48, 600: 38, 700: 28, 800: 20 };
const NEUTRAL_LADDER_DARK = { 50: 16, 100: 20, 200: 25, 300: 32, 400: 44, 500: 60, 600: 72, 700: 83, 800: 91 };

// Returns a flat { '--color-x': '#hex', ... } map ready to apply to an element's style.
export const deriveTokens = (base) => {
    const isDark = hexToHsl(base.background).l < 50;
    const ladder = isDark ? NEUTRAL_LADDER_DARK : NEUTRAL_LADDER_LIGHT;
    const { h: nh, s: ns } = hexToHsl(base.neutral);

    const tokens = {
        '--color-primary': base.primary,
        '--color-primary-dark': adjustLightness(base.primary, -12),
        '--color-primary-light': adjustLightness(base.primary, 12),
        '--color-secondary': base.secondary,
        '--color-success': base.success,
        '--color-success-light': tintColor(base.success, isDark),
        '--color-warning': base.warning,
        '--color-danger': base.danger,
        '--color-danger-light': tintColor(base.danger, isDark),
        '--color-info': base.info,
        '--color-info-light': tintColor(base.info, isDark),
        '--color-neutral-0': '#FFFFFF',
        '--color-background': base.background,
        '--color-surface': adjustLightness(base.background, isDark ? 5 : 2),
        '--color-text': base.text,
        // Most headings/body text read --color-neutral-900 directly (not --color-text) —
        // pinning it to the same admin-picked "Text" value keeps the two in sync instead
        // of drifting apart if "Text" and "Neutral"'s own 900-step would otherwise differ.
        '--color-neutral-900': base.text
    };

    Object.entries(ladder).forEach(([step, l]) => {
        tokens[`--color-neutral-${step}`] = hslToHex(nh, ns, l);
    });
    tokens['--color-border'] = tokens['--color-neutral-200'];

    return tokens;
};

// PAL-02: ≥6 presets spanning the spectrum, Purple matching DM-01's existing default
// exactly. Each has deliberately-chosen light AND dark values (not a hue swap).
export const PRESETS = [
    {
        name: 'purple',
        label: 'Purple',
        light: { primary: '#7B00FF', secondary: '#00C3FF', success: '#00875A', warning: '#FF8B00', danger: '#DE350B', info: '#0065FF', neutral: '#6B778C', background: '#F8F9FA', text: '#172B4D' },
        dark: { primary: '#9D4EFF', secondary: '#33D6FF', success: '#57D9A3', warning: '#FFAB40', danger: '#FF6B4A', info: '#4C9AFF', neutral: '#9AA0B4', background: '#14151A', text: '#F4F5F7' }
    },
    {
        name: 'blue',
        label: 'Blue',
        light: { primary: '#0052CC', secondary: '#00B8D9', success: '#00875A', warning: '#FF8B00', danger: '#DE350B', info: '#0065FF', neutral: '#667085', background: '#F7F9FC', text: '#172B4D' },
        dark: { primary: '#4C9AFF', secondary: '#79E2F2', success: '#57D9A3', warning: '#FFAB40', danger: '#FF6B4A', info: '#85B8FF', neutral: '#97A3B6', background: '#131720', text: '#F2F5FA' }
    },
    {
        name: 'green',
        label: 'Green',
        light: { primary: '#00875A', secondary: '#36B37E', success: '#006644', warning: '#FF8B00', danger: '#DE350B', info: '#0065FF', neutral: '#667C6E', background: '#F5FAF7', text: '#16281F' },
        dark: { primary: '#57D9A3', secondary: '#79F2C0', success: '#79F2C0', warning: '#FFAB40', danger: '#FF6B4A', info: '#4C9AFF', neutral: '#9BB3A5', background: '#121815', text: '#EFFAF4' }
    },
    {
        name: 'rose',
        label: 'Red / Rose',
        light: { primary: '#DE350B', secondary: '#FF7452', success: '#00875A', warning: '#FF8B00', danger: '#BF2600', info: '#0065FF', neutral: '#8C6B72', background: '#FDF7F6', text: '#2B1717' },
        dark: { primary: '#FF6B4A', secondary: '#FFA187', success: '#57D9A3', warning: '#FFAB40', danger: '#FF8F73', info: '#4C9AFF', neutral: '#B79BA0', background: '#1A1315', text: '#FAEFEF' }
    },
    {
        name: 'orange',
        label: 'Orange',
        light: { primary: '#FF8B00', secondary: '#FFAB00', success: '#00875A', warning: '#FF991F', danger: '#DE350B', info: '#0065FF', neutral: '#8C7A66', background: '#FEFAF5', text: '#2B2013' },
        dark: { primary: '#FFAB40', secondary: '#FFCB6B', success: '#57D9A3', warning: '#FFC46B', danger: '#FF6B4A', info: '#4C9AFF', neutral: '#BBAA95', background: '#1A1610', text: '#FAF3E9' }
    },
    {
        name: 'teal',
        label: 'Teal',
        light: { primary: '#00A3A3', secondary: '#00C3FF', success: '#00875A', warning: '#FF8B00', danger: '#DE350B', info: '#0065FF', neutral: '#5F7A7A', background: '#F5FAFA', text: '#132424' },
        dark: { primary: '#33D6D6', secondary: '#33D6FF', success: '#57D9A3', warning: '#FFAB40', danger: '#FF6B4A', info: '#4C9AFF', neutral: '#93AFAF', background: '#101A1A', text: '#EDF7F7' }
    }
];

// --- PAL-04: runtime application -------------------------------------------------
// Module-level cache (not React state) so it can be applied/reapplied from anywhere
// (AuthContext's theme toggle, this module's own fetch) without prop-drilling.
let cachedSystemTheme = null;

export const getCachedSystemTheme = () => cachedSystemTheme;

export const applyRuntimePalette = () => {
    if (!cachedSystemTheme || typeof document === 'undefined') return;
    const mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const base = mode === 'dark' ? cachedSystemTheme.darkPalette : cachedSystemTheme.lightPalette;
    if (!base) return;

    const tokens = deriveTokens(base);
    Object.entries(tokens).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
    });
};

// Called after the initial GET and after any admin save — applies immediately.
export const setCachedSystemTheme = (systemTheme) => {
    cachedSystemTheme = systemTheme;
    applyRuntimePalette();
};
