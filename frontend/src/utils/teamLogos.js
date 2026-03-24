// MLB Team Logos - Using ESPN's CDN for reliable team logos
export const teamLogos = {
  // American League East
  'BAL': 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png',
  'BOS': 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png',
  'NYY': 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png',
  'TB': 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png',
  'TOR': 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png',

  // American League Central
  'CWS': 'https://a.espncdn.com/i/teamlogos/mlb/500/chw.png',
  'CLE': 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png',
  'DET': 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png',
  'KC': 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png',
  'MIN': 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png',

  // American League West
  'HOU': 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png',
  'LAA': 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png',
  'OAK': 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png',
  'SEA': 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png',
  'TEX': 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png',

  // National League East
  'ATL': 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png',
  'MIA': 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png',
  'NYM': 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png',
  'PHI': 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png',
  'WSH': 'https://a.espncdn.com/i/teamlogos/mlb/500/wsh.png',

  // National League Central
  'CHC': 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png',
  'CIN': 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png',
  'MIL': 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png',
  'PIT': 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png',
  'STL': 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png',

  // National League West
  'ARI': 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png',
  'COL': 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png',
  'LAD': 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png',
  'SD': 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png',
  'SF': 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png',
};

// Helper function to get team logo with fallback
export const getTeamLogo = (abbr) => {
  return teamLogos[abbr] || `https://via.placeholder.com/80/003087/FFFFFF?text=${abbr}`;
};

// Helper function to get team full name (optional, for tooltips)
export const teamNames = {
  'BAL': 'Baltimore Orioles',
  'BOS': 'Boston Red Sox',
  'NYY': 'New York Yankees',
  'TB': 'Tampa Bay Rays',
  'TOR': 'Toronto Blue Jays',
  'CWS': 'Chicago White Sox',
  'CLE': 'Cleveland Guardians',
  'DET': 'Detroit Tigers',
  'KC': 'Kansas City Royals',
  'MIN': 'Minnesota Twins',
  'HOU': 'Houston Astros',
  'LAA': 'Los Angeles Angels',
  'OAK': 'Oakland Athletics',
  'SEA': 'Seattle Mariners',
  'TEX': 'Texas Rangers',
  'ATL': 'Atlanta Braves',
  'MIA': 'Miami Marlins',
  'NYM': 'New York Mets',
  'PHI': 'Philadelphia Phillies',
  'WSH': 'Washington Nationals',
  'CHC': 'Chicago Cubs',
  'CIN': 'Cincinnati Reds',
  'MIL': 'Milwaukee Brewers',
  'PIT': 'Pittsburgh Pirates',
  'STL': 'St. Louis Cardinals',
  'ARI': 'Arizona Diamondbacks',
  'COL': 'Colorado Rockies',
  'LAD': 'Los Angeles Dodgers',
  'SD': 'San Diego Padres',
  'SF': 'San Francisco Giants',
};

export const getTeamName = (abbr) => {
  return teamNames[abbr] || abbr;
};

// Team primary colors for hover effects
export const teamColors = {
  // American League East
  'BAL': '#DF4601', // Orange
  'BOS': '#BD3039', // Red
  'NYY': '#003087', // Navy Blue
  'TB': '#092C5C', // Navy Blue
  'TOR': '#134A8E', // Blue

  // American League Central
  'CWS': '#27251F', // Black
  'CLE': '#00385D', // Navy Blue
  'DET': '#0C2C56', // Navy Blue
  'KC': '#004687', // Royal Blue
  'MIN': '#002B5C', // Navy Blue

  // American League West
  'HOU': '#EB6E1F', // Orange
  'LAA': '#BA0021', // Red
  'OAK': '#003831', // Green
  'SEA': '#0C2C56', // Navy Blue
  'TEX': '#003278', // Blue

  // National League East
  'ATL': '#CE1141', // Red
  'MIA': '#00A3E0', // Blue
  'NYM': '#002D72', // Blue
  'PHI': '#E81828', // Red
  'WSH': '#AB0003', // Red

  // National League Central
  'CHC': '#0E3386', // Blue
  'CIN': '#C6011F', // Red
  'MIL': '#12284B', // Navy Blue
  'PIT': '#FDB827', // Gold/Yellow
  'STL': '#C41E3A', // Red

  // National League West
  'ARI': '#A71930', // Red
  'COL': '#33006F', // Purple
  'LAD': '#005A9C', // Blue
  'SD': '#2F241D', // Brown
  'SF': '#FD5A1E', // Orange
};

export const getTeamColor = (abbr) => {
  return teamColors[abbr] || '#003087';
};
