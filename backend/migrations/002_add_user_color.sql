-- Add color field to users table for leaderboard visualization
ALTER TABLE users ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#1e40af';

-- Update existing users with different default colors
UPDATE users SET color = '#dc2626' WHERE username = 'baseball_ace';
UPDATE users SET color = '#059669' WHERE username = 'slugger_mike';
UPDATE users SET color = '#7c3aed' WHERE username = 'curveball_queen';
UPDATE users SET color = '#ea580c' WHERE username = 'homer_hank';
