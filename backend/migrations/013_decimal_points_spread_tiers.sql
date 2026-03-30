-- Migration 013: Decimal points + tiered spread scoring
--
-- WHAT CHANGED AND WHY
-- ────────────────────
-- The original spread scoring (SW=+2, SL=-1) treated all spread picks equally,
-- but the two sides of the MLB run line are NOT equally hard:
--
--   Underdog +1.5 covers ~57% of games (wins outright OR loses by exactly 1).
--   Favorite  -1.5 covers ~43% of games (must win by 2+).
--
-- New outcome codes:
--   SFW  Spread Favorite Win  — picked the -1.5 side, covered (+2 pts)
--   SFL  Spread Favorite Loss — picked the -1.5 side, didn't cover (-1 pt)
--   SDW  Spread Dog Win       — picked the +1.5 side, covered (+0.5 pts)
--   SDL  Spread Dog Loss      — picked the +1.5 side, didn't cover  (0 pts)
--
-- Legacy codes SW / SL are kept in the constraint so any pre-migration rows
-- remain valid. New picks will never receive SW or SL.
--
-- COLUMN TYPE CHANGES
-- ───────────────────
-- points_earned (picks), daily_points (daily_scores), and total_points
-- (leaderboard) are widened from INTEGER to NUMERIC(7,1) to support +0.5.

-- 1. Widen points columns
ALTER TABLE picks
    ALTER COLUMN points_earned TYPE NUMERIC(7,1);

ALTER TABLE daily_scores
    ALTER COLUMN daily_points TYPE NUMERIC(7,1);

ALTER TABLE leaderboard
    ALTER COLUMN total_points TYPE NUMERIC(7,1);

-- 2. Widen outcome column and extend constraint to include 3-char codes
ALTER TABLE picks
    ALTER COLUMN outcome TYPE VARCHAR(3);

ALTER TABLE picks
    DROP CONSTRAINT IF EXISTS picks_outcome_check;

ALTER TABLE picks
    ADD CONSTRAINT picks_outcome_check
    CHECK (outcome IN (
        'MW',   -- Moneyline Win      (+1)
        'ML',   -- Moneyline Loss      (0)
        'SW',   -- Spread Win (legacy) (+2) — kept for backward compat
        'SL',   -- Spread Loss (legacy)(-1) — kept for backward compat
        'SP',   -- Spread Push         (0)
        'SFW',  -- Spread Favorite Win (+2)
        'SFL',  -- Spread Favorite Loss(-1)
        'SDW',  -- Spread Dog Win      (+0.5)
        'SDL'   -- Spread Dog Loss      (0)
    ));

-- 3. Backfill any legacy SW/SL rows into the new codes based on the pick side.
--    For a legacy SW row: if the user picked home and spread < 0, they picked
--    the favorite → SFW. Otherwise they picked the underdog → SDW.
--    Same logic applies to SL → SFL or SDL.
--    points_earned is also corrected: SDW should be 0.5, SDL stays 0.
UPDATE picks p
SET
    outcome = CASE
        WHEN p.outcome = 'SW' AND (
            (p.picked_team = 'home' AND g.spread < 0) OR
            (p.picked_team = 'away' AND g.spread > 0)
        ) THEN 'SFW'
        WHEN p.outcome = 'SW' THEN 'SDW'
        WHEN p.outcome = 'SL' AND (
            (p.picked_team = 'home' AND g.spread < 0) OR
            (p.picked_team = 'away' AND g.spread > 0)
        ) THEN 'SFL'
        WHEN p.outcome = 'SL' THEN 'SDL'
        ELSE p.outcome
    END,
    points_earned = CASE
        WHEN p.outcome = 'SW' AND (
            (p.picked_team = 'home' AND g.spread < 0) OR
            (p.picked_team = 'away' AND g.spread > 0)
        ) THEN 2.0
        WHEN p.outcome = 'SW' THEN 0.5   -- was wrongly giving +2 for easy cover
        WHEN p.outcome = 'SL' THEN 0.0   -- dog loss stays 0 (was -1, now corrected)
        ELSE p.points_earned
    END
FROM games g
WHERE p.game_id = g.id
  AND p.outcome IN ('SW', 'SL');

-- 4. Recompute leaderboard total_points from the corrected picks data
--    (safe to do pre-beta; no real season data exists yet)
UPDATE leaderboard l
SET total_points = (
    SELECT COALESCE(SUM(p.points_earned), 0)
    FROM picks p
    WHERE p.user_id = l.user_id
      AND p.result IS NOT NULL
);
