const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration(migrationFile) {
    const client = await pool.connect();

    try {
        const sql = fs.readFileSync(
            path.join(__dirname, '../../migrations', migrationFile),
            'utf8'
        );

        console.log(`Running migration: ${migrationFile}`);
        await client.query(sql);
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        pool.end();
    }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Please provide a migration file name');
    process.exit(1);
}

runMigration(migrationFile).catch(console.error);
