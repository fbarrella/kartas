CREATE TABLE IF NOT EXISTS system_theme_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    preset_name VARCHAR(50) NOT NULL DEFAULT 'purple',
    light_palette JSONB NOT NULL,
    dark_palette JSONB NOT NULL,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seeded with today's current purple values (matches DM-01's :root / [data-theme="dark"]
-- defaults exactly) so the app's visual identity is unchanged until an admin actively
-- picks something else.
INSERT INTO system_theme_settings (id, preset_name, light_palette, dark_palette)
VALUES (
    1,
    'purple',
    '{"primary":"#7B00FF","secondary":"#00C3FF","success":"#00875A","warning":"#FF8B00","danger":"#DE350B","info":"#0065FF","neutral":"#6B778C","background":"#F8F9FA","text":"#172B4D"}'::jsonb,
    '{"primary":"#9D4EFF","secondary":"#33D6FF","success":"#57D9A3","warning":"#FFAB40","danger":"#FF6B4A","info":"#4C9AFF","neutral":"#9AA0B4","background":"#14151A","text":"#F4F5F7"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
