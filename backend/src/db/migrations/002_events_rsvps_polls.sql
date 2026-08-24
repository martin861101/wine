-- 002_events_rsvps_polls.sql
-- Events, RSVPs, polls, poll options, poll votes.

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '18:00',
  end_time TEXT,
  venue_name TEXT NOT NULL,
  venue_address TEXT,
  theme TEXT,
  cover_image TEXT,
  capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0),
  contribution_amount INTEGER,
  rsvp_deadline DATE,
  payment_deadline DATE,
  status event_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);

-- RSVPs
CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'ATTENDING',
  guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_event_rsvps_unique ON event_rsvps(event_id, user_id);
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);

-- Polls (one engine for book ballots, monthly polls and general polls)
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type poll_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  hide_results BOOLEAN NOT NULL DEFAULT FALSE,
  status poll_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_ends ON polls(ends_at);

CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_poll_votes_unique ON poll_votes(poll_id, user_id);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_option ON poll_votes(option_id);
