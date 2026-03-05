-- Add group leader support
-- Run once against the database

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_group_leader BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
