export const mockGames = [
  {
    id: 1,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(13, 10, 0, 0)).toISOString(),
    home_team_abbr: 'NYY',
    away_team_abbr: 'BOS',
    home_score: null,
    away_score: null,
    spread: -1.5,
    data_locked: false,
    status: 'scheduled',
    away_pitcher: { name: 'Brayan Bello', hand: 'R', era: '3.76', record: '8-9' },
    home_pitcher: { name: 'Gerrit Cole', hand: 'R', era: '2.94', record: '13-3' },
    away_injuries: [
      { name: 'Trevor Story', position: 'SS', status: 'IL60', note: 'Back surgery' },
      { name: 'Triston Casas', position: '1B', status: 'IL10', note: 'Rib stress fracture' },
    ],
    home_injuries: [
      { name: 'Nestor Cortes', position: 'SP', status: 'IL60', note: 'Elbow inflammation' },
      { name: 'DJ LeMahieu', position: '3B', status: 'day-to-day', note: 'Knee soreness' },
    ],
  },
  {
    id: 2,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(15, 35, 0, 0)).toISOString(),
    home_team_abbr: 'LAD',
    away_team_abbr: 'SF',
    home_score: null,
    away_score: null,
    spread: -1.5,
    data_locked: false,
    status: 'scheduled',
    away_pitcher: { name: 'Logan Webb', hand: 'R', era: '3.25', record: '11-8' },
    home_pitcher: { name: 'Yoshinobu Yamamoto', hand: 'R', era: '3.00', record: '7-2' },
    away_injuries: [
      { name: 'Blake Snell', position: 'SP', status: 'IL15', note: 'Groin strain' },
      { name: 'Jorge Soler', position: 'OF', status: 'day-to-day', note: 'Hamstring tightness' },
    ],
    home_injuries: [
      { name: 'Dustin May', position: 'SP', status: 'IL60', note: 'Elbow reconstruction' },
      { name: 'Tyler Glasnow', position: 'SP', status: 'IL15', note: 'Elbow soreness' },
    ],
  },
  {
    id: 3,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(16, 20, 0, 0)).toISOString(),
    home_team_abbr: 'HOU',
    away_team_abbr: 'OAK',
    home_score: null,
    away_score: null,
    spread: -1.5,
    data_locked: false,
    status: 'scheduled',
    away_pitcher: { name: 'JP Sears', hand: 'L', era: '4.42', record: '7-11' },
    home_pitcher: { name: 'Framber Valdez', hand: 'L', era: '2.90', record: '14-6' },
    away_injuries: [
      { name: 'Zack Gelof', position: '2B', status: 'day-to-day', note: 'Oblique tightness' },
      { name: 'Lawrence Butler', position: 'OF', status: 'questionable', note: 'Wrist soreness' },
    ],
    home_injuries: [
      { name: 'Jose Abreu', position: '1B', status: 'IL10', note: 'Knee inflammation' },
      { name: 'Cristian Javier', position: 'SP', status: 'IL60', note: 'Tommy John surgery' },
    ],
  },
  {
    id: 4,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(18, 45, 0, 0)).toISOString(),
    home_team_abbr: 'CHC',
    away_team_abbr: 'STL',
    home_score: null,
    away_score: null,
    spread: 1.5,
    data_locked: false,
    status: 'scheduled',
    away_pitcher: { name: 'Miles Mikolas', hand: 'R', era: '4.15', record: '9-10' },
    home_pitcher: { name: 'Justin Steele', hand: 'L', era: '3.06', record: '16-5' },
    away_injuries: [
      { name: 'Jordan Walker', position: 'OF', status: 'IL10', note: 'Oblique strain' },
      { name: 'Steven Matz', position: 'SP', status: 'IL60', note: 'Shoulder surgery' },
    ],
    home_injuries: [
      { name: 'Seiya Suzuki', position: 'OF', status: 'day-to-day', note: 'Finger soreness' },
      { name: 'Cody Bellinger', position: 'OF', status: 'questionable', note: 'Hamstring tightness' },
    ],
  },
  {
    id: 5,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(19, 10, 0, 0)).toISOString(),
    home_team_abbr: 'ATL',
    away_team_abbr: 'PHI',
    home_score: null,
    away_score: null,
    spread: -1.5,
    data_locked: false,
    status: 'scheduled',
    away_pitcher: { name: 'Zack Wheeler', hand: 'R', era: '2.87', record: '14-7' },
    home_pitcher: { name: 'Spencer Strider', hand: 'R', era: '3.86', record: '13-5' },
    away_injuries: [
      { name: 'Bryce Harper', position: 'DH', status: 'day-to-day', note: 'Thumb bruise' },
      { name: 'Trea Turner', position: 'SS', status: 'questionable', note: 'Hamstring tightness' },
    ],
    home_injuries: [
      { name: 'Ronald Acuna Jr.', position: 'OF', status: 'IL60', note: 'ACL recovery' },
      { name: 'Austin Riley', position: '3B', status: 'IL10', note: 'Wrist inflammation' },
    ],
  },
  {
    id: 6,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(19, 40, 0, 0)).toISOString(),
    home_team_abbr: 'TB',
    away_team_abbr: 'BAL',
    home_score: null,
    away_score: null,
    spread: -1.5,
    data_locked: false,
    status: 'scheduled',
    away_pitcher: { name: 'Corbin Burnes', hand: 'R', era: '2.92', record: '12-7' },
    home_pitcher: { name: 'Zach Eflin', hand: 'R', era: '3.50', record: '9-8' },
    away_injuries: [
      { name: 'John Means', position: 'SP', status: 'IL60', note: 'Tommy John surgery' },
      { name: 'Kyle Bradish', position: 'SP', status: 'IL60', note: 'Elbow surgery' },
    ],
    home_injuries: [
      { name: 'Brandon Lowe', position: '2B', status: 'IL10', note: 'Oblique strain' },
      { name: 'Shane McClanahan', position: 'SP', status: 'IL60', note: 'Flexor tendon surgery' },
    ],
  },
];

export const mockPicks = [
  {
    id: 1,
    game_id: 1,
    pick_type: 'moneyline',
    picked_team: 'home',
    result: null,
    points_earned: 0
  },
  {
    id: 2,
    game_id: 3,
    pick_type: 'spread',
    picked_team: 'away',
    result: null,
    points_earned: 0
  }
];

export const mockUser = {
  id: 99,
  username: 'DADUNN',
  email: 'dadunn@example.com'
};

export const mockLeaderboard = [
  {
    user_id: 99,
    username: 'DADUNN',
    rank: 1,
    total_points: 78,
    total_games: 47,
    moneyline_wins: 22,
    moneyline_losses: 12,
    moneyline_win_pct: 64.71,
    spread_wins: 8,
    spread_losses: 5,
    spread_win_pct: 61.54,
    current_streak: 4,
    best_streak: 7,
    color: '#1e40af'
  },
  {
    user_id: 1,
    username: 'baseball_ace',
    rank: 2,
    total_points: 72,
    total_games: 45,
    moneyline_wins: 20,
    moneyline_losses: 14,
    moneyline_win_pct: 58.82,
    spread_wins: 7,
    spread_losses: 4,
    spread_win_pct: 63.64,
    current_streak: 2,
    best_streak: 5,
    color: '#dc2626'
  },
  {
    user_id: 2,
    username: 'slugger_mike',
    rank: 3,
    total_points: 65,
    total_games: 44,
    moneyline_wins: 18,
    moneyline_losses: 15,
    moneyline_win_pct: 54.55,
    spread_wins: 6,
    spread_losses: 5,
    spread_win_pct: 54.55,
    current_streak: 1,
    best_streak: 4,
    color: '#059669'
  },
  {
    user_id: 3,
    username: 'curveball_queen',
    rank: 4,
    total_points: 58,
    total_games: 42,
    moneyline_wins: 15,
    moneyline_losses: 16,
    moneyline_win_pct: 48.39,
    spread_wins: 7,
    spread_losses: 4,
    spread_win_pct: 63.64,
    current_streak: 0,
    best_streak: 6,
    color: '#7c3aed'
  },
  {
    user_id: 4,
    username: 'homer_hank',
    rank: 5,
    total_points: 51,
    total_games: 40,
    moneyline_wins: 14,
    moneyline_losses: 17,
    moneyline_win_pct: 45.16,
    spread_wins: 5,
    spread_losses: 4,
    spread_win_pct: 55.56,
    current_streak: 3,
    best_streak: 3,
    color: '#ea580c'
  }
];

export const mockStats = {
  total_picks: 47,
  total_wins: 30,
  total_losses: 17,
  total_points: 78,
  ml_wins: 22,
  ml_losses: 12,
  spread_wins: 8,
  spread_losses: 5
};

// In dev: set EXPO_PUBLIC_USE_MOCK=false in eas.json to disable, defaults to on locally
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
