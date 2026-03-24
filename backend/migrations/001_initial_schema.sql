-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games Table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    external_game_id VARCHAR(50) UNIQUE NOT NULL,
    game_date DATE NOT NULL,
    game_time TIMESTAMP NOT NULL,
    home_team VARCHAR(50) NOT NULL,
    away_team VARCHAR(50) NOT NULL,
    home_team_abbr VARCHAR(5) NOT NULL,
    away_team_abbr VARCHAR(5) NOT NULL,
    venue VARCHAR(100),
    spread DECIMAL(3,1) DEFAULT 1.5,
    home_lineup JSONB,
    away_lineup JSONB,
    home_pitcher JSONB,
    away_pitcher JSONB,
    status VARCHAR(20) DEFAULT 'scheduled',
    home_score INTEGER,
    away_score INTEGER,
    lineup_last_updated TIMESTAMP,
    data_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_external_id ON games(external_game_id);
CREATE INDEX IF NOT EXISTS idx_status ON games(status);

-- Picks Table
CREATE TABLE IF NOT EXISTS picks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    pick_type VARCHAR(20) NOT NULL,
    picked_team VARCHAR(10) NOT NULL,
    confidence INTEGER DEFAULT 1,
    result VARCHAR(20),
    points_earned INTEGER DEFAULT 0,
    picked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_picks ON picks(user_id);
CREATE INDEX IF NOT EXISTS idx_game_picks ON picks(game_id);
CREATE INDEX IF NOT EXISTS idx_result ON picks(result);

-- Daily Scores Table
CREATE TABLE IF NOT EXISTS daily_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score_date DATE NOT NULL,
    games_picked INTEGER DEFAULT 0,
    moneyline_wins INTEGER DEFAULT 0,
    moneyline_losses INTEGER DEFAULT 0,
    spread_wins INTEGER DEFAULT 0,
    spread_losses INTEGER DEFAULT 0,
    daily_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily ON daily_scores(user_id, score_date);

-- Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    moneyline_wins INTEGER DEFAULT 0,
    moneyline_losses INTEGER DEFAULT 0,
    moneyline_win_pct DECIMAL(5,2),
    spread_wins INTEGER DEFAULT 0,
    spread_losses INTEGER DEFAULT 0,
    spread_win_pct DECIMAL(5,2),
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    rank INTEGER,
    rank_change INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_rank ON leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_points ON leaderboard(total_points DESC);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_audit ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_created ON audit_logs(created_at);

-- API Cache Table
CREATE TABLE IF NOT EXISTS api_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_expires ON api_cache(expires_at);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);