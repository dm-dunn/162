-- Migration 012: Add CHECK constraint on games.status to prevent invalid state values.
-- Also adds 'postponed', 'suspended', and 'cancelled' as valid terminal statuses
-- so the finalize-games job can mark non-playable games without leaving them as 'scheduled'.

ALTER TABLE games
    ADD CONSTRAINT games_status_check
    CHECK (status IN ('scheduled', 'live', 'final', 'postponed', 'suspended', 'cancelled'));
