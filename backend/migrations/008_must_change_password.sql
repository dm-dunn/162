-- Add must_change_password flag to users
-- Used for the temporary password reset flow: when a user resets their password
-- via email, they receive a temporary password and this flag is set to true.
-- On next login, the mobile app detects this flag and forces them to set a new password.
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
