import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    try {
        console.log('Running database migrations...');

        const migrationFile = path.join(__dirname, '001_initial_schema.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        await pool.query(sql);

        console.log('✓ Migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
