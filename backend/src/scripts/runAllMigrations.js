const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

async function runAllMigrations() {
    const client = await pool.connect();

    try {
        // Ensure the tracking table exists — safe to run every time
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename   TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort(); // alphabetical = numeric order (001_, 002_, ...)

        // Fetch already-applied migrations
        const { rows } = await client.query('SELECT filename FROM schema_migrations');
        const applied = new Set(rows.map(r => r.filename));

        const pending = files.filter(f => !applied.has(f));

        if (pending.length === 0) {
            console.log('✅ All migrations already applied — nothing to do.');
            return;
        }

        console.log(`Found ${files.length} migration(s) total, ${pending.length} pending:\n`);

        // Postgres error codes that mean "this object already exists"
        // — a safe signal that the migration was applied before tracking began.
        const ALREADY_EXISTS = new Set([
            '42701', // duplicate_column
            '42P07', // duplicate_table
            '42710', // duplicate_object
            '42P16', // invalid_table_definition (e.g. duplicate constraint)
        ]);

        for (const file of pending) {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            console.log(`Running: ${file}`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`✅ Done: ${file}\n`);
            } catch (err) {
                await client.query('ROLLBACK');
                if (ALREADY_EXISTS.has(err.code)) {
                    // Object already exists → migration was applied before we
                    // started tracking.  Mark it applied and keep going.
                    await client.query(
                        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                        [file]
                    );
                    console.warn(`⚠️  Skipped (already applied): ${file} — ${err.message}\n`);
                } else {
                    console.error(`❌ Migration failed: ${file}`);
                    throw err;
                }
            }
        }

        console.log('All pending migrations completed successfully.');
    } catch (error) {
        console.error('❌ Migration runner error:', error.message);
        throw error;
    } finally {
        client.release();
        pool.end();
    }
}

runAllMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
});
