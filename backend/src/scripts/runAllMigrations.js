const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

async function runAllMigrations() {
    const client = await pool.connect();

    try {
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort(); // alphabetical = numeric order (001_, 002_, ...)

        console.log(`Found ${files.length} migration(s) to run:\n`);

        for (const file of files) {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            console.log(`Running: ${file}`);
            await client.query(sql);
            console.log(`✅ Done: ${file}\n`);
        }

        console.log('All migrations completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
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
