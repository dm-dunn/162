/**
 * testGradingWorkflow.js
 *
 * Two-mode test script for the full pick → grade → leaderboard pipeline.
 *
 * Usage:
 *   node src/scripts/testGradingWorkflow.js --setup   Create 5 test games for UI picks
 *   node src/scripts/testGradingWorkflow.js --grade   Grade pending picks and report results
 */

'use strict';

const pool          = require('../config/database');
const ScoringService = require('../services/scoringService');

// ─── Constants ────────────────────────────────────────────────────────────────

const NUM_TEST_GAMES = 5;

const TEST_TEAMS = [
    { name: 'New York Yankees',     abbr: 'NYY' },
    { name: 'Boston Red Sox',       abbr: 'BOS' },
    { name: 'Los Angeles Dodgers',  abbr: 'LAD' },
    { name: 'Houston Astros',       abbr: 'HOU' },
    { name: 'Chicago Cubs',         abbr: 'CHC' },
    { name: 'Atlanta Braves',       abbr: 'ATL' },
    { name: 'Tampa Bay Rays',       abbr: 'TB'  },
    { name: 'San Diego Padres',     abbr: 'SD'  },
    { name: 'Toronto Blue Jays',    abbr: 'TOR' },
    { name: 'San Francisco Giants', abbr: 'SF'  },
];

// external_game_ids used by this script — never collide with real MLB data
const TEST_IDS = Array.from({ length: NUM_TEST_GAMES }, function(_, i) {
    return 'test-workflow-' + i;
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function separator(char, width) {
    char  = char  || '-';
    width = width || 60;
    console.log(char.repeat(width));
}

function header(title) {
    separator('=');
    console.log(' ' + title);
    separator('=');
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nonTiedScores() {
    var home, away;
    do {
        home = randomInt(0, 12);
        away = randomInt(0, 12);
    } while (home === away);
    return { home: home, away: away };
}

function getTeamPair(index) {
    var hi = (index * 2)     % TEST_TEAMS.length;
    var ai = (index * 2 + 1) % TEST_TEAMS.length;
    return { home: TEST_TEAMS[hi], away: TEST_TEAMS[ai] };
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// ─── --setup ─────────────────────────────────────────────────────────────────

async function runSetup() {
    header('SETUP: Creating test games');
    console.log('');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        var today    = new Date().toISOString().split('T')[0];
        var gameIds  = [];
        var gameMeta = [];

        for (var i = 0; i < NUM_TEST_GAMES; i++) {
            var teams = getTeamPair(i);

            // Game time = now + (4 + i) hours — well past the 5-min lockout in Pick.create()
            var gameTime = new Date();
            gameTime.setHours(gameTime.getHours() + 4 + i);

            var result = await client.query(
                `INSERT INTO games (
                    external_game_id, game_date, game_time,
                    home_team, away_team, home_team_abbr, away_team_abbr,
                    venue, spread, status, data_locked, home_score, away_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', false, NULL, NULL)
                ON CONFLICT (external_game_id) DO UPDATE SET
                    game_date   = EXCLUDED.game_date,
                    game_time   = EXCLUDED.game_time,
                    home_team   = EXCLUDED.home_team,
                    away_team   = EXCLUDED.away_team,
                    home_team_abbr = EXCLUDED.home_team_abbr,
                    away_team_abbr = EXCLUDED.away_team_abbr,
                    status      = 'scheduled',
                    data_locked = false,
                    home_score  = NULL,
                    away_score  = NULL,
                    updated_at  = CURRENT_TIMESTAMP
                RETURNING id`,
                [
                    TEST_IDS[i],
                    today,
                    gameTime,
                    teams.home.name,
                    teams.away.name,
                    teams.home.abbr,
                    teams.away.abbr,
                    teams.home.abbr + ' Stadium',
                    1.5
                ]
            );

            var gameId = result.rows[0].id;
            gameIds.push(gameId);
            gameMeta.push({
                id:       gameId,
                homeAbbr: teams.home.abbr,
                awayAbbr: teams.away.abbr,
                gameTime: gameTime
            });
        }

        // Reset any existing picks for these games back to ungraded
        // Preserves the pick rows (user's team selection) but clears all grading data
        var resetResult = await client.query(
            `UPDATE picks
             SET result        = NULL,
                 points_earned = NULL,
                 outcome       = NULL,
                 graded_at     = NULL,
                 updated_at    = CURRENT_TIMESTAMP
             WHERE game_id = ANY($1)`,
            [gameIds]
        );

        await client.query('COMMIT');

        // ── Print summary ──────────────────────────────────────────────────────
        console.log('');
        separator();
        console.log(' Games created / reset:');
        separator();
        console.log('');

        for (var j = 0; j < gameMeta.length; j++) {
            var gm = gameMeta[j];
            console.log(
                '  Game ' + String(gm.id).padEnd(6) +
                gm.awayAbbr.padEnd(5) + ' @ ' + gm.homeAbbr.padEnd(5) +
                ' | game_time: ' + formatTime(gm.gameTime)
            );
        }

        console.log('');
        if (resetResult.rowCount > 0) {
            console.log('  ' + resetResult.rowCount + ' existing pick(s) reset to ungraded.');
            console.log('');
        }

        separator('=');
        console.log(' Ready. Go to http://localhost:5173/dashboard and make your picks.');
        console.log(' Then run:  node src/scripts/testGradingWorkflow.js --grade');
        separator('=');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nERROR during setup:');
        console.error(err);
        throw err;
    } finally {
        client.release();
        pool.end();
    }
}

// ─── --grade ─────────────────────────────────────────────────────────────────

async function runGrade() {
    header('GRADE: Running scoring pipeline');
    console.log('');

    const client = await pool.connect();

    try {
        // ── 1. Look up the test games ──────────────────────────────────────────
        var gamesResult = await client.query(
            `SELECT id, home_team_abbr, away_team_abbr, spread
             FROM games
             WHERE external_game_id = ANY($1)
             ORDER BY id ASC`,
            [TEST_IDS]
        );

        if (gamesResult.rows.length === 0) {
            console.log('ERROR: No test games found. Run --setup first.');
            return;
        }

        var games = gamesResult.rows;

        // ── 2. Check for pending picks ─────────────────────────────────────────
        var gameIds = games.map(function(g) { return g.id; });

        var pendingCheck = await client.query(
            'SELECT COUNT(*) AS cnt FROM picks WHERE game_id = ANY($1) AND result IS NULL',
            [gameIds]
        );

        var pendingCount = parseInt(pendingCheck.rows[0].cnt);

        if (pendingCount === 0) {
            console.log('WARNING: No pending picks found for test games.');
            console.log('         Run --setup, make picks in the UI, then re-run --grade.');
            console.log('');
        } else {
            console.log('Found ' + pendingCount + ' pending pick(s) across ' + games.length + ' game(s).');
            console.log('');
        }

        // ── 3. Generate random scores and mark games final ─────────────────────
        separator();
        console.log(' STEP 1: Generating random scores');
        separator();
        console.log('');

        var gameScores = [];

        for (var i = 0; i < games.length; i++) {
            var g      = games[i];
            var scores = nonTiedScores();
            var winner = scores.home > scores.away
                ? g.home_team_abbr + ' (home)'
                : g.away_team_abbr + ' (away)';

            await client.query(
                `UPDATE games
                 SET home_score = $1, away_score = $2, status = 'final',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [scores.home, scores.away, g.id]
            );

            console.log(
                '  Game ' + g.id + ': ' +
                g.away_team_abbr + ' ' + scores.away +
                ' - ' + g.home_team_abbr + ' ' + scores.home +
                '  |  Winner: ' + winner
            );

            gameScores.push({
                id:       g.id,
                homeAbbr: g.home_team_abbr,
                awayAbbr: g.away_team_abbr,
                home:     scores.home,
                away:     scores.away
            });
        }

        // Commit score updates before calling ScoringService —
        // the service reads via its own pool.query and needs to see 'final' status.
        await client.query('COMMIT');
        client.release();

        // ── 4. Grade picks ─────────────────────────────────────────────────────
        console.log('');
        separator();
        console.log(' STEP 2: Grading picks');
        separator();
        console.log('');

        var userSummary = {};

        for (var m = 0; m < gameScores.length; m++) {
            var gs      = gameScores[m];
            var winTeam = gs.home > gs.away ? gs.homeAbbr : gs.awayAbbr;

            console.log(
                '  Game ' + gs.id + ': ' +
                gs.awayAbbr + ' ' + gs.away +
                ' - ' + gs.homeAbbr + ' ' + gs.home +
                '  (winner: ' + winTeam + ')'
            );

            // Snapshot pending picks with usernames before grading clears result IS NULL
            var picksSnap = await pool.query(
                `SELECT p.id, p.pick_type, p.picked_team, u.id AS uid, u.username
                 FROM picks p
                 JOIN users u ON u.id = p.user_id
                 WHERE p.game_id = $1 AND p.result IS NULL`,
                [gs.id]
            );

            var gradedResults = await ScoringService.gradePicksForGame(gs.id);

            // Index graded results by pickId
            var gradedMap = {};
            for (var n = 0; n < gradedResults.length; n++) {
                gradedMap[gradedResults[n].pickId] = gradedResults[n];
            }

            if (picksSnap.rows.length === 0) {
                console.log('    (no picks for this game)');
            }

            for (var p = 0; p < picksSnap.rows.length; p++) {
                var pick   = picksSnap.rows[p];
                var graded = gradedMap[pick.id];
                if (!graded) continue;

                var pts = (graded.points >= 0 ? '+' : '') + graded.points;
                console.log(
                    '    ' +
                    pick.username.padEnd(20) +
                    ' | ' + pick.pick_type.padEnd(10) +
                    ' | picked: ' + pick.picked_team.padEnd(5) +
                    ' | outcome: ' + (graded.outcome || 'N/A').padEnd(3) +
                    ' | points: ' + pts
                );

                if (!userSummary[pick.uid]) {
                    userSummary[pick.uid] = {
                        username:     pick.username,
                        picksGraded:  0,
                        pointsEarned: 0
                    };
                }
                userSummary[pick.uid].picksGraded  += 1;
                userSummary[pick.uid].pointsEarned += graded.points;
            }

            console.log('');
        }

        // ── 5. Update leaderboard ──────────────────────────────────────────────
        await ScoringService.updateLeaderboard();

        // ── 6. Per-user summary ────────────────────────────────────────────────
        separator();
        console.log(' STEP 3: Per-user summary (this run)');
        separator();
        console.log('');

        var entries = Object.values(userSummary);

        if (entries.length === 0) {
            console.log('  No picks were graded this run.');
        }

        for (var q = 0; q < entries.length; q++) {
            var u    = entries[q];
            var sign = u.pointsEarned >= 0 ? '+' : '';
            console.log(
                '  ' + u.username.padEnd(20) +
                ' | picks graded: ' + u.picksGraded +
                ' | points this run: ' + sign + u.pointsEarned
            );
        }

        console.log('');

        // ── 7. Final leaderboard ───────────────────────────────────────────────
        separator();
        console.log(' STEP 4: Final leaderboard');
        separator();
        console.log('');

        var lb = await pool.query(
            `SELECT l.rank, u.username, l.total_points, l.total_games,
                    l.moneyline_wins, l.moneyline_losses,
                    l.spread_wins, l.spread_losses
             FROM leaderboard l
             JOIN users u ON u.id = l.user_id
             ORDER BY l.rank ASC NULLS LAST`
        );

        console.log(
            '  ' +
            'Rank'.padEnd(6) +
            'Username'.padEnd(22) +
            'Total Pts'.padEnd(12) +
            'ML W/L'.padEnd(10) +
            'Spread W/L'
        );
        separator('-', 62);

        for (var r = 0; r < lb.rows.length; r++) {
            var row  = lb.rows[r];
            var rank = row.rank !== null ? String(row.rank) : '?';
            console.log(
                '  ' +
                rank.padEnd(6) +
                row.username.padEnd(22) +
                String(row.total_points).padEnd(12) +
                (row.moneyline_wins + '/' + row.moneyline_losses).padEnd(10) +
                (row.spread_wins    + '/' + row.spread_losses)
            );
        }

        console.log('');
        separator('=');
        console.log(' Grading complete. Run --setup to start a fresh round.');
        separator('=');

    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        console.error('\nERROR during grading:');
        console.error(err);
        throw err;
    } finally {
        try { client.release(); } catch (_) {}
        pool.end();
    }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

var mode = process.argv[2];

if (mode === '--setup') {
    runSetup().catch(console.error);
} else if (mode === '--grade') {
    runGrade().catch(console.error);
} else {
    console.log('');
    console.log('Usage:');
    console.log('  node src/scripts/testGradingWorkflow.js --setup');
    console.log('      Create 5 test games as scheduled. Go make picks in the UI.');
    console.log('');
    console.log('  node src/scripts/testGradingWorkflow.js --grade');
    console.log('      Generate random scores, grade pending picks, update leaderboard.');
    console.log('');
    process.exit(1);
}
