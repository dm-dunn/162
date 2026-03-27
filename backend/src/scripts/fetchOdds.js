/**
 * fetchOdds.js — Manual odds fetch script
 *
 * Calls OddsService directly (no HTTP, no JWT needed) to pull today's
 * real MLB run lines + moneylines from The Odds API and write them to the DB.
 *
 * Usage:
 *   npm run fetch-odds                        # fetch for today
 *   npm run fetch-odds -- --date 2026-04-01   # fetch for a specific date
 *
 * The script uses whatever DATABASE_URL and ODDS_API_KEY are in your .env,
 * so point those at the right environment before running.
 */

require('dotenv').config();

const OddsService = require('../services/oddsService');

// ── Parse optional --date flag ────────────────────────────────────────────────
let targetDate = new Date();

const dateArgIndex = process.argv.indexOf('--date');
if (dateArgIndex !== -1 && process.argv[dateArgIndex + 1]) {
    const raw = process.argv[dateArgIndex + 1];
    const parsed = new Date(raw + 'T12:00:00Z'); // noon UTC avoids TZ edge cases
    if (isNaN(parsed.getTime())) {
        console.error(`❌  Invalid date: "${raw}". Expected format: YYYY-MM-DD`);
        process.exit(1);
    }
    targetDate = parsed;
}

const dateStr = targetDate.toISOString().split('T')[0];

// ── Guard: ODDS_API_KEY must be set ──────────────────────────────────────────
if (!process.env.ODDS_API_KEY) {
    console.error('❌  ODDS_API_KEY is not set in your .env file.');
    console.error('    Sign up at https://the-odds-api.com and paste your key in .env');
    process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log(`\n⚾  MLB162 — Manual Odds Fetch`);
console.log(`    Date:    ${dateStr}`);
console.log(`    DB:      ${(process.env.DATABASE_URL || '').replace(/:\/\/.*@/, '://<creds>@')}`);
console.log(`    API key: ${process.env.ODDS_API_KEY.slice(0, 6)}••••\n`);

OddsService.fetchDailyOdds(targetDate)
    .then(({ updated, skipped, errors, remainingCredits }) => {
        console.log('─'.repeat(44));
        console.log(`  ✅  Updated  : ${updated} game(s)`);
        console.log(`  ⏭   Skipped  : ${skipped} game(s)`);
        if (errors > 0) {
            console.log(`  ❌  Errors   : ${errors} game(s)  ← check logs above`);
        }
        if (remainingCredits !== null) {
            console.log(`  💳  API credits remaining: ${remainingCredits}`);
        }
        console.log('─'.repeat(44));

        if (updated === 0 && skipped === 0 && errors === 0) {
            console.log('\n⚠️   No games found in DB for this date.');
            console.log('    Try running the game fetch first:');
            console.log('    npm run fetch-games\n');
        } else if (updated === 0 && errors === 0) {
            console.log('\n⚠️   Games were found but none could be matched to Odds API data.');
            console.log('    This usually means the API has no lines yet (too early)');
            console.log('    or team names differ. Check the logs above for specifics.\n');
        } else {
            console.log('\n✅  Done. Restart the app or wait for the next cache refresh.\n');
        }

        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌  Odds fetch failed:', err.message);
        if (err.message.includes('ODDS_API_KEY')) {
            console.error('    Double-check your ODDS_API_KEY in .env');
        }
        process.exit(1);
    });
