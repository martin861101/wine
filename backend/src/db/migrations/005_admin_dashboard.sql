-- 005_admin_dashboard.sql
-- Newsletter subscribers and persisted current-read progress.

CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_subscribers_active
  ON newsletter_subscribers(subscribed, created_at DESC);

ALTER TABLE club_books
  ADD COLUMN progress_percent INTEGER NOT NULL DEFAULT 0
  CHECK (progress_percent BETWEEN 0 AND 100);
