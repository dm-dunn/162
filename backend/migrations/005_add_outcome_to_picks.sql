-- Add outcome column to picks table
-- Encodes pick_type + result as a single 2-char code for easy recovery:
--   SW = Spread Win    (+2 pts)
--   SL = Spread Loss   (-1 pt)
--   MW = Moneyline Win (+1 pt)
--   ML = Moneyline Loss ( 0 pts)
-- If points_earned ever becomes corrupted, outcome alone is sufficient to rebuild it.

ALTER TABLE picks
    ADD COLUMN IF NOT EXISTS outcome VARCHAR(2)
    CHECK (outcome IN ('SW', 'SL', 'MW', 'ML'));

-- Backfill existing graded rows from their pick_type + result values
UPDATE picks
SET outcome = CASE
    WHEN pick_type = 'spread'    AND result = 'win'  THEN 'SW'
    WHEN pick_type = 'spread'    AND result = 'loss' THEN 'SL'
    WHEN pick_type = 'moneyline' AND result = 'win'  THEN 'MW'
    WHEN pick_type = 'moneyline' AND result = 'loss' THEN 'ML'
    ELSE NULL
END
WHERE result IS NOT NULL;
