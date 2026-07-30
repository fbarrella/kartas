import { query } from '../config/database.js';

const BASE_CATEGORIES = ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'neutral', 'background', 'text'];
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const isValidPalette = (palette) => {
    return !!palette && typeof palette === 'object' &&
        BASE_CATEGORIES.every((key) => typeof palette[key] === 'string' && HEX_RE.test(palette[key]));
};

export const systemSettingsController = {
    // Any authenticated user — needed to render the app's actual current colors (PAL-04)
    async getTheme(req, res) {
        try {
            const result = await query(
                'SELECT preset_name, light_palette, dark_palette, updated_at FROM system_theme_settings WHERE id = 1'
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'System theme settings not found' });
            }

            const row = result.rows[0];
            res.json({
                presetName: row.preset_name,
                lightPalette: row.light_palette,
                darkPalette: row.dark_palette,
                updatedAt: row.updated_at
            });
        } catch (error) {
            console.error('Error fetching system theme settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // Admin-only (gated by requireAdmin in the route). Validated manually here rather than
    // relying on express-validator's body()/param() rules, since validationResult() is never
    // called anywhere in this codebase and those rules are decorative-only (see DEVLOG).
    async updateTheme(req, res) {
        try {
            const { presetName, lightPalette, darkPalette } = req.body;

            if (!presetName || typeof presetName !== 'string') {
                return res.status(400).json({ error: 'presetName is required' });
            }

            if (!isValidPalette(lightPalette) || !isValidPalette(darkPalette)) {
                return res.status(400).json({
                    error: `lightPalette and darkPalette must each provide a valid 6-digit hex value for: ${BASE_CATEGORIES.join(', ')}`
                });
            }

            const result = await query(
                `UPDATE system_theme_settings
                 SET preset_name = $1, light_palette = $2, dark_palette = $3, updated_by = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE id = 1
                 RETURNING preset_name, light_palette, dark_palette, updated_at`,
                [presetName, JSON.stringify(lightPalette), JSON.stringify(darkPalette), req.user.userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'System theme settings not found' });
            }

            const row = result.rows[0];
            res.json({
                presetName: row.preset_name,
                lightPalette: row.light_palette,
                darkPalette: row.dark_palette,
                updatedAt: row.updated_at
            });
        } catch (error) {
            console.error('Error updating system theme settings:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
};
