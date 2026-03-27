/**
 * simulateGames.js — End-to-end scoring pipeline test
 *
 * Reads real picks from the DB, assigns simulated final scores to their games,
 * runs the full grading pipeline, and prints a detailed breakdown of every
 * pick outcome so you can verify the scoring math is correct.
 *
 * MODES
 * ─────
 *   node simulateGames.js                   Inspect: show picks + game state, no writes
 *   node simulateGames.js --simulate        Write simulated scores → run grading → report
 *   node simulateGames.js --reset           Undo: clear simulated scores, reset picks to pending
 *
 * SCORE OVERRIDES (optional, used with --simulate)
 *   --scores "AWAY@HOME:awayScore-homeScore, ..."
 *   Example: --scores "BOS@NYY:3-5, LAD@SF:1-4"
 *   Any game not in the override list gets an auto-generated score.
 *
 * The auto-generator deliberately produces varied outcomes:
 *   Game 1: Home wins by 3   (home covers −1.5, away +1.5 misses)
 *   Game 2: Home wins by 1   (home covers +1.5 if underdog; away covers −1.5 if favored)
 *   Game 3: Away wins by 2   (away covers in either direction)
 *   Game 4: Away wins by 1   (interesting edge — tests who covers +/−1.5)
 *   ... cycles back
 *
 * This ensures every branch of the spread grading logic gets exercised.
 */

require('dotenv').config();

const pool        = require('../config/database');
const ScoringService = require('../services/scoringService');

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';

function c(color, str) { return color + str + RESET; }

function formatSpread(spread, team) {
    if (spread == null) return 'N/A';
    const s = parseFloat(spread);
    if (team === 'home') return s >= 0 ? `+${s}` : `${s}`;
    return s >= 0 ? `-${s}` : `+${Math.abs(s)}`;
}

function formatML(ml) {
    if (ml == null) return '—';
    return ml > 0 ? `+${ml}` : `${ml}`;
}

function outcomeLabel(outcome) {
    const map = { MW: 'ML Win', ML: 'ML Loss', SW: 'SPR Win', SL: 'SPR Loss', SP: 'Push' };
    return map[outcome] || outcome || '—';
}

function resultColor(result) {
    if (result === 'win')  return c(GREEN,  '✅ WIN');
    if (result === 'loss') return c(RED,    '❌ LOSS');
    if (result === 'push') return c(YELLOW, '➖ PUSH');
    return c(DIM, '⏳ pending');
}

// Cycle of score templates that exercises every outcome branch
const SCORE_TEMPLATES = [
    { awayDelta: -3, homeScore: 6 }, // home wins by 3 → home covers −1.5
    { awayDelta:  2, homeScore: 4 }, // away wins by 2 → away covers either direction
    { awayDelta: -1, homeScore: 4 }, // home wins by 1 → edge case for ±1.5
    { awayDelta:  1, homeScore: 3 }, // away wins by 1 → edge case for ±1.5
    { awayDelta: -4, homeScore: 7 }, // home wins big
    { awayDelta:  3, homeScore: 2 }, // away wins big
];

function autoScore(gameIndex) {
    const t = SCORE_TEMPLATES[gameIndex % SCORE_TEMPLATES.length];
    const homeScore = t.homeScore;
    const awayScore = homeScore + t.awayDelta; // awayDelta negative = home wins
    return { homeScore: Math.max(0, homeScore), awayScore: Math.max(0, awayScore) };
}

// Parse --scores "BOS@NYY:3-5, LAD@SF:1-4"
function parseScoreOverrides(argv) {
    const idx = argv.indexOf('--scores');
    if (idx === -1) return {};
    const raw = argv[idx + 1] || '';
    const map = {};
    for (const part of raw.split(',')) {
        const trimmed = part.trim();
        // Match: AWAY@HOME:awayScore-homeScore
        const m = trimmed.match(/^(\w+)@(\w+):(\d+)-(\d+)$/i);
        if (m) {
            const key = `${m[1].toUpperCase()}@${m[2].toUpperCase()}`;
            map[key] = { awayScore: parseInt(m[3]), homeScore: parseInt(m[4]) };
        }
    }
    return map;
}

// ── Database queries ──────────────────────────────────────────────────────────

async function loadPicksAndGames() {
    const { rows } = await pool.query(`
        SELECT
            p.id          AS pick_id,
            p.user_id,
            u.username,
            p.pick_type,
            p.picked_team,
            p.result,
            p.points,
            p.outcome,
            g.id          AS game_id,
            g.game_date,
            g.away_team_abbr,
            g.home_team_abbr,
            g.spread,
            g.home_moneyline,
            g.away_moneyline,
            g.home_score,
            g.away_score,
            g.status,
            g.data_locked
        FROM picks p
        JOIN users u ON p.user_id = u.id
        JOIN games g ON p.game_id = g.id
        ORDER BY g.game_date DESC, g.id, p.id
    `);
    return rows;
}

async function setGameScore(gameId, homeScore, awayScore) {
    await pool.query(
        `UPDATE games
         SET home_score  = $2,
             away_score  = $3,
             status      = 'final',
             updated_at  = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [gameId, homeScore, awayScore]
    );
}

async function resetGame(gameId) {
    await pool.query(
        `UPDATE games
         SET home_score  = NULL,
             away_score  = NULL,
             status      = 'scheduled',
             updated_at  = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [gameId]
    );
}

async function resetPick(pickId) {
    await pool.query(
        `UPDATE picks
         SET result  = NULL,
             points  = NULL,
             outcome = NULL
         WHERE id = $1`,
        [pickId]
    );
}

// ── INSPECT mode ──────────────────────────────────────────────────────────────

async function inspect(rows) {
    console.log(c(BOLD, '\n⚾  MLB162 — Game Simulation Inspector\n'));

    if (rows.length === 0) {
        console.log(c(YELLOW, '  No picks found in the database.\n'));
        return;
    }

    // Group by game
    const games = {};
    for (const row of rows) {
        if (!games[row.game_id]) games[row.game_id] = { meta: row, picks: [] };
        games[row.game_id].picks.push(row);
    }

    console.log(c(DIM, `  Found ${rows.length} pick(s) across ${Object.keys(games).length} game(s)\n`));

    for (const [gameId, { meta: g, picks }] of Object.entries(games)) {
        const matchup = `${g.away_team_abbr} @ ${g.home_team_abbr}`;
        const date    = g.game_date?.toISOString?.()?.split('T')[0] ?? g.game_date;
        const scored  = g.home_score != null;

        console.log(c(BOLD + CYAN, `  ── ${matchup}  (${date})  Game #${gameId} ──`));
        console.log(`     Spread : home ${formatSpread(g.spread, 'home')} / away ${formatSpread(g.spread, 'away')}`);
        console.log(`     ML     : home ${formatML(g.home_moneyline)} / away ${formatML(g.away_moneyline)}`);
        console.log(`     Score  : ${scored ? `${g.away_score}–${g.home_score} (${g.status})` : c(DIM, 'not yet final')}`);
        console.log(`     Locked : ${g.data_locked ? c(YELLOW, 'yes') : 'no'}`);
        console.log('');

        for (const p of picks) {
            const team = p.picked_team === 'home' ? `${g.home_team_abbr} (home)` : `${g.away_team_abbr} (away)`;
            const type = p.pick_type === 'spread' ? 'SPR' : 'ML ';
            const grade = p.result
                ? `${resultColor(p.result)}  ${c(DIM, outcomeLabel(p.outcome))}  ${p.points > 0 ? c(GREEN, `+${p.points} pts`) : p.points < 0 ? c(RED, `${p.points} pts`) : c(DIM, '0 pts')}`
                : c(DIM, 'ungraded');

            console.log(`     [${type}] ${c(BOLD, p.username.padEnd(16))} → ${team.padEnd(16)} ${grade}`);
        }
        console.log('');
    }
}

// ── SIMULATE mode ─────────────────────────────────────────────────────────────

async function simulate(rows, scoreOverrides) {
    console.log(c(BOLD, '\n⚾  MLB162 — Simulating Game Results\n'));

    if (rows.length === 0) {
        console.log(c(YELLOW, '  No picks to simulate.\n'));
        return;
    }

    // Group by game
    const games = {};
    for (const row of rows) {
        if (!games[row.game_id]) games[row.game_id] = { meta: row, picks: [] };
        games[row.game_id].picks.push(row);
    }

    let gameIndex = 0;
    const summary = { wins: 0, losses: 0, pushes: 0, totalPoints: 0 };

    for (const [gameId, { meta: g, picks }] of Object.entries(games)) {
        const matchup = `${g.away_team_abbr}@${g.home_team_abbr}`;

        // Pick score: override → auto
        let homeScore, awayScore;
        if (scoreOverrides[matchup]) {
            ({ homeScore, awayScore } = scoreOverrides[matchup]);
            console.log(c(CYAN, `  ${g.away_team_abbr} @ ${g.home_team_abbr} — using override score`));
        } else if (g.home_score != null) {
            // Already has a real score — use it
            homeScore = g.home_score;
            awayScore = g.away_score;
            console.log(c(CYAN, `  ${g.away_team_abbr} @ ${g.home_team_abbr} — already has score ${awayScore}–${homeScore}, re-grading`));
        } else {
            ({ homeScore, awayScore } = autoScore(gameIndex));
            console.log(c(CYAN, `  ${g.away_team_abbr} @ ${g.home_team_abbr} — auto score: ${awayScore}–${homeScore} (away–home)`));
        }

        // Print the spread context
        const spread = parseFloat(g.spread);
        const runDiff = homeScore - awayScore;
        if (!isNaN(spread)) {
            const adjustedDiff = runDiff + spread;
            const homeCovered  = adjustedDiff > 0;
            console.log(c(DIM, `     Spread: home ${formatSpread(g.spread,'home')} | run diff: ${runDiff > 0 ? '+' : ''}${runDiff} | adjusted: ${adjustedDiff > 0 ? '+' : ''}${adjustedDiff.toFixed(1)} → ${homeCovered ? 'HOME covers' : 'AWAY covers'}`));
        }
        console.log('');

        // Write score to DB
        await setGameScore(gameId, homeScore, awayScore);

        // Run grading for this game
        const gradeResults = await ScoringService.gradePicksForGame(parseInt(gameId));

        // Print pick outcomes
        for (const grade of gradeResults) {
            const pick = picks.find(p => p.pick_id === grade.pickId);
            if (!pick) continue;

            const team = pick.picked_team === 'home' ? `${g.home_team_abbr} (home)` : `${g.away_team_abbr} (away)`;
            const type = pick.pick_type === 'spread' ? 'SPR' : 'ML ';
            const pts  = grade.points > 0 ? c(GREEN, `+${grade.points} pts`) : grade.points < 0 ? c(RED, `${grade.points} pts`) : c(DIM, '0 pts');

            console.log(`     [${type}] ${c(BOLD, pick.username.padEnd(16))} → ${team.padEnd(18)} ${resultColor(grade.result)}  ${c(DIM, outcomeLabel(grade.outcome))}  ${pts}`);

            if (grade.result === 'win')  { summary.wins++;   summary.totalPoints += grade.points; }
            if (grade.result === 'loss') { summary.losses++;  summary.totalPoints += grade.points; }
            if (grade.result === 'push') { summary.pushes++; }
        }
        console.log('');
        gameIndex++;
    }

    // Summary
    console.log('─'.repeat(56));
    console.log(c(BOLD, '  SIMULATION SUMMARY'));
    console.log(`  Wins   : ${c(GREEN,  String(summary.wins))}`);
    console.log(`  Losses : ${c(RED,    String(summary.losses))}`);
    console.log(`  Pushes : ${c(YELLOW, String(summary.pushes))}`);
    const pts = summary.totalPoints;
    console.log(`  Net Pts: ${pts >= 0 ? c(GREEN, '+' + pts) : c(RED, String(pts))}`);
    console.log('─'.repeat(56));
    console.log(c(DIM, '\n  Run with --reset to undo all simulated scores.\n'));
}

// ── RESET mode ────────────────────────────────────────────────────────────────

async function reset(rows) {
    console.log(c(BOLD, '\n⚾  MLB162 — Resetting Simulation\n'));

    if (rows.length === 0) {
        console.log(c(YELLOW, '  No picks found — nothing to reset.\n'));
        return;
    }

    const gameIds = [...new Set(rows.map(r => r.game_id))];
    const pickIds = rows.map(r => r.pick_id);

    for (const gameId of gameIds) {
        const g = rows.find(r => r.game_id === gameId);
        await resetGame(gameId);
        console.log(`  Cleared score: ${g.away_team_abbr} @ ${g.home_team_abbr} (game #${gameId})`);
    }

    for (const pickId of pickIds) {
        await resetPick(pickId);
    }

    console.log(c(GREEN, `\n  ✅  Reset ${gameIds.length} game(s) and ${pickIds.length} pick(s) to pending.\n`));
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const mode = args.includes('--simulate') ? 'simulate'
               : args.includes('--reset')    ? 'reset'
               : 'inspect';

    const scoreOverrides = parseScoreOverrides(args);

    let rows;
    try {
        rows = await loadPicksAndGames();
    } catch (err) {
        console.error(c(RED, `\n❌  DB error: ${err.message}\n`));
        process.exit(1);
    }

    if (mode === 'simulate') {
        await simulate(rows, scoreOverrides);
    } else if (mode === 'reset') {
        await reset(rows);
    } else {
        await inspect(rows);
    }

    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error(c(RED, `\n❌  Unexpected error: ${err.message}`));
    console.error(err.stack);
    process.exit(1);
});
