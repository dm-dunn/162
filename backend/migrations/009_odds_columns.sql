-- Add moneyline odds columns to games table.
-- home_moneyline / away_moneyline: American-format odds (e.g. -150, +130).
-- These are populated by the daily odds fetch job (OddsService / fetch-odds cron).
-- The existing `spread` column continues to hold the home team's run line
-- (negative = home favored, e.g. -1.5; positive = home underdog, e.g. +1.5).

ALTER TABLE games ADD COLUMN IF NOT EXISTS home_moneyline INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS away_moneyline INTEGER;

CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
