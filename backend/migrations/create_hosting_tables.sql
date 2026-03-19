-- Hosting: each student can deploy static HTML/CSS/JS sites
CREATE TABLE IF NOT EXISTS hosted_sites (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hosted_sites_user ON hosted_sites(user_id);
