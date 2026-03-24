// Mock data for testing the UI with realistic MLB games
export const mockGames = [
  {
    id: 1,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(13, 10, 0, 0)).toISOString(),
    home_team_abbr: 'NYY',
    away_team_abbr: 'BOS',
    home_score: null,
    away_score: null,
    spread: -1.5, // Negative means home team is favored
    data_locked: false,
    status: 'scheduled'
  },
  {
    id: 2,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(15, 35, 0, 0)).toISOString(),
    home_team_abbr: 'LAD',
    away_team_abbr: 'SF',
    home_score: null,
    away_score: null,
    spread: -1.5, // LAD favored
    data_locked: false,
    status: 'scheduled'
  },
  {
    id: 3,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(16, 20, 0, 0)).toISOString(),
    home_team_abbr: 'HOU',
    away_team_abbr: 'OAK',
    home_score: null,
    away_score: null,
    spread: -1.5, // HOU favored
    data_locked: false,
    status: 'scheduled'
  },
  {
    id: 4,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(18, 45, 0, 0)).toISOString(),
    home_team_abbr: 'CHC',
    away_team_abbr: 'STL',
    home_score: null,
    away_score: null,
    spread: 1.5, // STL (away) favored
    data_locked: false,
    status: 'scheduled'
  },
  {
    id: 5,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(19, 10, 0, 0)).toISOString(),
    home_team_abbr: 'ATL',
    away_team_abbr: 'PHI',
    home_score: null,
    away_score: null,
    spread: -1.5, // ATL favored
    data_locked: false,
    status: 'scheduled'
  },
  {
    id: 6,
    game_date: new Date().toISOString().split('T')[0],
    game_time: new Date(new Date().setHours(19, 40, 0, 0)).toISOString(),
    home_team_abbr: 'TB',
    away_team_abbr: 'BAL',
    home_score: null,
    away_score: null,
    spread: -1.5, // TB favored
    data_locked: false,
    status: 'scheduled'
  }
];

// Mock picks for testing
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

// Mock user for testing (DADUNN)
export const mockUser = {
  id: 99,
  username: 'DADUNN',
  email: 'dadunn@example.com'
};

// Mock leaderboard data for the dashboard
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

// Mock stats for profile page
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

// Set this to true to use mock data instead of API calls
// Change this to false to use real API data
export const USE_MOCK_DATA = false;

// Toggle function for easy switching
export const toggleMockData = () => {
  console.log('To toggle mock data, change USE_MOCK_DATA in frontend/src/utils/mockData.js');
};
