const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Mock user data
const mockUsers = [
    { username: 'baseball_ace', email: 'ace@example.com' },
    { username: 'slugger_mike', email: 'mike@example.com' },
    { username: 'curveball_queen', email: 'queen@example.com' },
    { username: 'homer_hank', email: 'hank@example.com' }
];

// MLB teams for mock games
const mlbTeams = [
    { name: 'New York Yankees', abbr: 'NYY' },
    { name: 'Boston Red Sox', abbr: 'BOS' },
    { name: 'Los Angeles Dodgers', abbr: 'LAD' },
    { name: 'San Francisco Giants', abbr: 'SF' },
    { name: 'Chicago Cubs', abbr: 'CHC' },
    { name: 'Houston Astros', abbr: 'HOU' },
    { name: 'Atlanta Braves', abbr: 'ATL' },
    { name: 'Tampa Bay Rays', abbr: 'TB' },
    { name: 'San Diego Padres', abbr: 'SD' },
    { name: 'Toronto Blue Jays', abbr: 'TOR' }
];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomTeams() {
    const shuffled = [...mlbTeams].sort(() => 0.5 - Math.random());
    return { home: shuffled[0], away: shuffled[1] };
}

async function seedMockData() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('Creating mock users...');
        const userIds = [];
        const defaultPassword = await bcrypt.hash('password123', 12);

        for (const user of mockUsers) {
            const result = await client.query(
                `INSERT INTO users (username, email, password_hash)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
                 RETURNING id`,
                [user.username, user.email, defaultPassword]
            );
            userIds.push(result.rows[0].id);
            console.log(`  Created user: ${user.username}`);
        }

        console.log('\nCreating mock games...');
        const gameIds = [];
        const startDate = new Date('2024-04-01');

        for (let i = 0; i < 50; i++) {
            const gameDate = new Date(startDate);
            gameDate.setDate(startDate.getDate() + Math.floor(i / 5));

            const gameTime = new Date(gameDate);
            gameTime.setHours(13 + (i % 3) * 3, 0, 0, 0);

            const teams = getRandomTeams();
            const homeScore = getRandomInt(0, 10);
            const awayScore = getRandomInt(0, 10);

            const result = await client.query(
                `INSERT INTO games (
                    external_game_id, game_date, game_time,
                    home_team, away_team, home_team_abbr, away_team_abbr,
                    venue, spread, status, home_score, away_score, data_locked
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (external_game_id) DO UPDATE
                 SET home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score
                 RETURNING id`,
                [
                    `mock-game-${i}`,
                    gameDate.toISOString().split('T')[0],
                    gameTime,
                    teams.home.name,
                    teams.away.name,
                    teams.home.abbr,
                    teams.away.abbr,
                    `${teams.home.name} Stadium`,
                    1.5,
                    'final',
                    homeScore,
                    awayScore,
                    true
                ]
            );
            gameIds.push({ id: result.rows[0].id, homeScore, awayScore, homeAbbr: teams.home.abbr, awayAbbr: teams.away.abbr });

            if ((i + 1) % 10 === 0) {
                console.log(`  Created ${i + 1} games...`);
            }
        }

        console.log('\nCreating mock picks...');
        let totalPicks = 0;

        for (const userId of userIds) {
            const userWinRate = 0.45 + Math.random() * 0.2; // Between 45% and 65%

            for (const game of gameIds) {
                // Each user picks 80-100% of games
                if (Math.random() > 0.15) {
                    const pickType = Math.random() > 0.5 ? 'moneyline' : 'spread';

                    // Randomly pick home or away
                    const pickedTeam = Math.random() > 0.5 ? game.homeAbbr : game.awayAbbr;

                    // Determine if this pick won
                    const pickedHome = pickedTeam === game.homeAbbr;
                    let won;

                    if (pickType === 'moneyline') {
                        won = (pickedHome && game.homeScore > game.awayScore) ||
                              (!pickedHome && game.awayScore > game.homeScore);
                    } else { // spread
                        const homeWithSpread = game.homeScore + (pickedHome ? 1.5 : -1.5);
                        won = pickedHome ? homeWithSpread > game.awayScore : game.awayScore + 1.5 > game.homeScore;
                    }

                    // Apply user's win rate bias
                    if (Math.random() > userWinRate) {
                        won = !won;
                    }

                    const result = won ? 'win' : 'loss';
                    const points = won ? (pickType === 'moneyline' ? 2 : 1) : 0;

                    await client.query(
                        `INSERT INTO picks (user_id, game_id, pick_type, picked_team, result, points_earned)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (user_id, game_id) DO UPDATE
                         SET result = EXCLUDED.result, points_earned = EXCLUDED.points_earned`,
                        [userId, game.id, pickType, pickedTeam, result, points]
                    );
                    totalPicks++;
                }
            }
        }
        console.log(`  Created ${totalPicks} picks`);

        console.log('\nUpdating leaderboard...');

        // Calculate and update leaderboard stats for each user
        for (const userId of userIds) {
            const stats = await client.query(
                `SELECT
                    COUNT(*) as total_games,
                    COALESCE(SUM(points_earned), 0) as total_points,
                    COUNT(*) FILTER (WHERE pick_type = 'moneyline' AND result = 'win') as ml_wins,
                    COUNT(*) FILTER (WHERE pick_type = 'moneyline' AND result = 'loss') as ml_losses,
                    COUNT(*) FILTER (WHERE pick_type = 'spread' AND result = 'win') as spread_wins,
                    COUNT(*) FILTER (WHERE pick_type = 'spread' AND result = 'loss') as spread_losses
                 FROM picks WHERE user_id = $1`,
                [userId]
            );

            const s = stats.rows[0];
            const mlTotal = parseInt(s.ml_wins) + parseInt(s.ml_losses);
            const spreadTotal = parseInt(s.spread_wins) + parseInt(s.spread_losses);
            const mlPct = mlTotal > 0 ? (parseInt(s.ml_wins) / mlTotal * 100).toFixed(2) : 0;
            const spreadPct = spreadTotal > 0 ? (parseInt(s.spread_wins) / spreadTotal * 100).toFixed(2) : 0;

            await client.query(
                `INSERT INTO leaderboard (
                    user_id, total_points, total_games,
                    moneyline_wins, moneyline_losses, moneyline_win_pct,
                    spread_wins, spread_losses, spread_win_pct
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (user_id) DO UPDATE SET
                    total_points = EXCLUDED.total_points,
                    total_games = EXCLUDED.total_games,
                    moneyline_wins = EXCLUDED.moneyline_wins,
                    moneyline_losses = EXCLUDED.moneyline_losses,
                    moneyline_win_pct = EXCLUDED.moneyline_win_pct,
                    spread_wins = EXCLUDED.spread_wins,
                    spread_losses = EXCLUDED.spread_losses,
                    spread_win_pct = EXCLUDED.spread_win_pct,
                    last_updated = CURRENT_TIMESTAMP`,
                [userId, s.total_points, s.total_games, s.ml_wins, s.ml_losses, mlPct, s.spread_wins, s.spread_losses, spreadPct]
            );
        }

        // Update ranks
        await client.query(
            `UPDATE leaderboard SET rank = subquery.rank
             FROM (
                 SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_points DESC, moneyline_win_pct DESC) as rank
                 FROM leaderboard
             ) AS subquery
             WHERE leaderboard.user_id = subquery.user_id`
        );

        await client.query('COMMIT');

        console.log('\n✅ Mock data seeded successfully!');
        console.log(`   - ${mockUsers.length} users created`);
        console.log(`   - ${gameIds.length} games created`);
        console.log(`   - ${totalPicks} picks created`);
        console.log('\nYou can login with any user:');
        console.log('   Username: baseball_ace, slugger_mike, curveball_queen, or homer_hank');
        console.log('   Password: password123');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding data:', error);
        throw error;
    } finally {
        client.release();
        pool.end();
    }
}

seedMockData().catch(console.error);
