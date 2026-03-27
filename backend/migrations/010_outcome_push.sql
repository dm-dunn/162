-- Extend the outcome CHECK constraint to include 'SP' (Spread Push).
-- A push occurs when the run differential exactly equals the spread value
-- (e.g. home wins by exactly 2 with a +2 run line). No points awarded or lost.
-- Pushes are theoretically impossible with ±1.5 run lines (non-integer),
-- but real lines can occasionally be ±2, so the grading service handles it.

ALTER TABLE picks
    DROP CONSTRAINT IF EXISTS picks_outcome_check;

ALTER TABLE picks
    ADD CONSTRAINT picks_outcome_check
    CHECK (outcome IN ('SW', 'SL', 'MW', 'ML', 'SP'));
