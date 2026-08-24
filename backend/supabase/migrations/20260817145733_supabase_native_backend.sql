-- Complete the Supabase-native backend: application tables, Auth linkage,
-- row-level security, browser-safe RPCs, and Storage policies.

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE review_status AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE poll_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE poll_type AS ENUM ('BOOK_BALLOT', 'MONTHLY_POLL', 'GENERAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE suggestion_type AS ENUM ('BOOK', 'VENUE', 'ACTIVITY', 'THEME', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE suggestion_status AS ENUM ('NEW', 'REVIEWED', 'ACCEPTED', 'DECLINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE giveaway_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE announcement_type AS ENUM ('GENERAL', 'EVENT', 'BOOK', 'PAYMENT', 'URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE rsvp_status AS ENUM ('ATTENDING', 'MAYBE', 'DECLINED', 'WAITLIST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_type AS ENUM ('EVENT', 'CONTRIBUTION', 'MERCHANDISE', 'MEMBERSHIP', 'DONATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE profile_visibility AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, role user_role NOT NULL DEFAULT 'MEMBER',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE, approved BOOLEAN NOT NULL DEFAULT FALSE,
  region TEXT, instagram TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, display_name TEXT, avatar_url TEXT,
  bio TEXT, favourite_book TEXT, favourite_genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_visibility profile_visibility NOT NULL DEFAULT 'MEMBERS', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), external_provider TEXT, external_id TEXT,
  isbn TEXT, isbn_13 TEXT, isbn_10 TEXT, title TEXT NOT NULL, author TEXT, subtitle TEXT,
  description TEXT, cover_url TEXT, publisher TEXT, published_date TEXT,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_external ON books(external_provider, external_id) WHERE external_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS club_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  start_date DATE NOT NULL, end_date DATE NOT NULL, selected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PAST', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_books_current ON club_books(status) WHERE status = 'CURRENT';
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL,
  contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE, status review_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT,
  event_date DATE NOT NULL, start_time TEXT NOT NULL DEFAULT '18:00', end_time TEXT,
  venue_name TEXT NOT NULL, venue_address TEXT, theme TEXT, cover_image TEXT,
  capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0), contribution_amount INTEGER,
  rsvp_deadline DATE, payment_deadline DATE, status event_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'ATTENDING', guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);

CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type poll_type NOT NULL, title TEXT NOT NULL,
  description TEXT, starts_at TIMESTAMPTZ NOT NULL DEFAULT now(), ends_at TIMESTAMPTZ,
  hide_results BOOLEAN NOT NULL DEFAULT FALSE, status poll_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_ends ON polls(ends_at);

CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL, book_id UUID REFERENCES books(id) ON DELETE SET NULL, image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_option ON poll_votes(option_id);

CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type suggestion_type NOT NULL, title TEXT NOT NULL, description TEXT,
  status suggestion_status NOT NULL DEFAULT 'NEW', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_user ON suggestions(user_id);

CREATE TABLE giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT, prize TEXT NOT NULL,
  image_url TEXT, starts_at TIMESTAMPTZ NOT NULL DEFAULT now(), ends_at TIMESTAMPTZ,
  status giveaway_status NOT NULL DEFAULT 'DRAFT', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE giveaway_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), giveaway_id UUID NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(giveaway_id, user_id)
);

CREATE TABLE event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, image_url TEXT NOT NULL, thumbnail_url TEXT,
  caption TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, body TEXT NOT NULL,
  type announcement_type NOT NULL DEFAULT 'GENERAL', priority INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, provider TEXT NOT NULL, provider_reference TEXT,
  type payment_type NOT NULL, amount INTEGER NOT NULL CHECK (amount >= 0), currency TEXT NOT NULL DEFAULT 'ZAR',
  status payment_status NOT NULL DEFAULT 'PENDING', metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), paid_at TIMESTAMPTZ
);
CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL, event_id TEXT NOT NULL,
  type TEXT NOT NULL, payload JSONB NOT NULL, processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 200),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE,
  subscribed BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  email TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 2 AND 200),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 2 AND 5000),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE club_books ADD COLUMN progress_percent INTEGER NOT NULL DEFAULT 0
  CHECK (progress_percent BETWEEN 0 AND 100);

-- Supabase Auth owns passwords and sessions. auth_user_id also lets an existing
-- legacy application row retain its foreign-key identity after its Auth account is created.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN auth_user_id UUID UNIQUE;
UPDATE users SET auth_user_id = id WHERE id IN (SELECT id FROM auth.users);

CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE application_user_id UUID;
BEGIN
  SELECT id INTO application_user_id FROM public.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF application_user_id IS NULL THEN
    INSERT INTO public.users (
      id, auth_user_id, email, password_hash, first_name, last_name, region, instagram,
      email_verified, approved
    ) VALUES (
      NEW.id, NEW.id, lower(NEW.email), NULL,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'Member'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
      NULLIF(NEW.raw_user_meta_data->>'region', ''), NULLIF(NEW.raw_user_meta_data->>'instagram', ''),
      NEW.email_confirmed_at IS NOT NULL, FALSE
    ) RETURNING id INTO application_user_id;
  ELSE
    UPDATE public.users SET
      auth_user_id = NEW.id,
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = now()
    WHERE id = application_user_id;
  END IF;
  INSERT INTO public.profiles(user_id) VALUES (application_user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user();
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email, email_confirmed_at, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user();

CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT approved AND email_verified FROM public.users WHERE auth_user_id = auth.uid()), FALSE) $$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT approved AND email_verified AND role = 'ADMIN' FROM public.users WHERE auth_user_id = auth.uid()), FALSE) $$;

REVOKE ALL ON FUNCTION public.app_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- RLS is the authorization boundary for the browser-held publishable key.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_read_self_or_admin ON users FOR SELECT TO authenticated
  USING (id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY users_admin_update ON users FOR UPDATE TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY profiles_read ON profiles FOR SELECT TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin())
  WITH CHECK (user_id = public.app_user_id() OR public.current_user_is_admin());

CREATE POLICY books_member_read ON books FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY books_admin_write ON books FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY club_books_member_read ON club_books FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY club_books_admin_write ON club_books FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY ratings_member_read ON ratings FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY ratings_own_insert ON ratings FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND user_id = public.app_user_id());
CREATE POLICY ratings_own_update ON ratings FOR UPDATE TO authenticated
  USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
CREATE POLICY ratings_own_delete ON ratings FOR DELETE TO authenticated USING (user_id = public.app_user_id());

CREATE POLICY reviews_member_read ON reviews FOR SELECT TO authenticated
  USING (public.current_user_is_active() AND (status = 'PUBLISHED' OR user_id = public.app_user_id() OR public.current_user_is_admin()));
CREATE POLICY reviews_own_insert ON reviews FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND user_id = public.app_user_id());
CREATE POLICY reviews_own_update ON reviews FOR UPDATE TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin())
  WITH CHECK (user_id = public.app_user_id() OR public.current_user_is_admin());

CREATE POLICY events_member_read ON events FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY events_admin_write ON events FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY rsvps_member_read ON event_rsvps FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY rsvps_own_insert ON event_rsvps FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND user_id = public.app_user_id());
CREATE POLICY rsvps_own_update ON event_rsvps FOR UPDATE TO authenticated
  USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
CREATE POLICY rsvps_own_delete ON event_rsvps FOR DELETE TO authenticated USING (user_id = public.app_user_id());

CREATE POLICY polls_member_read ON polls FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY polls_admin_write ON polls FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY poll_options_member_read ON poll_options FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY poll_options_admin_write ON poll_options FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY poll_votes_member_read ON poll_votes FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY poll_votes_own_insert ON poll_votes FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND user_id = public.app_user_id());
CREATE POLICY poll_votes_own_update ON poll_votes FOR UPDATE TO authenticated
  USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());

CREATE POLICY discussions_member_read ON discussion_threads FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY discussions_own_insert ON discussion_threads FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND author_id = public.app_user_id());
CREATE POLICY discussions_own_update ON discussion_threads FOR UPDATE TO authenticated
  USING (author_id = public.app_user_id() OR public.current_user_is_admin())
  WITH CHECK (author_id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY comments_member_read ON discussion_comments FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY comments_own_insert ON discussion_comments FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND author_id = public.app_user_id());
CREATE POLICY comments_own_update ON discussion_comments FOR UPDATE TO authenticated
  USING (author_id = public.app_user_id() OR public.current_user_is_admin())
  WITH CHECK (author_id = public.app_user_id() OR public.current_user_is_admin());

CREATE POLICY suggestions_own_read ON suggestions FOR SELECT TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY suggestions_own_insert ON suggestions FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND user_id = public.app_user_id());
CREATE POLICY giveaways_member_read ON giveaways FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY giveaways_admin_write ON giveaways FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY giveaway_entries_read ON giveaway_entries FOR SELECT TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY giveaway_entries_insert ON giveaway_entries FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND user_id = public.app_user_id());
CREATE POLICY event_photos_member_read ON event_photos FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY event_photos_member_insert ON event_photos FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_active() AND uploaded_by = public.app_user_id());
CREATE POLICY announcements_member_read ON announcements FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY announcements_admin_write ON announcements FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY payments_own_read ON payments FOR SELECT TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY payments_admin_write ON payments FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY webhook_admin_only ON payment_webhook_events FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY audit_admin_read ON audit_logs FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY newsletter_admin_read ON newsletter_subscribers FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY contact_messages_admin_read ON contact_messages FOR SELECT TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(input_email TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF input_email IS NULL OR input_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;
  INSERT INTO newsletter_subscribers(email) VALUES (lower(btrim(input_email)))
  ON CONFLICT (email) DO UPDATE SET subscribed = TRUE, updated_at = now();
  RETURN jsonb_build_object('message', 'You''re on the list. Look out for our next letter.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_discussions()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.current_user_is_active() THEN RAISE EXCEPTION 'Active membership required.'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'title', t.title, 'body', t.body, 'createdAt', t.created_at,
    'updatedAt', t.updated_at,
    'author', jsonb_build_object('id', u.id, 'firstName', u.first_name, 'lastName', u.last_name),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'body', c.body, 'createdAt', c.created_at,
      'author', jsonb_build_object('id', cu.id, 'firstName', cu.first_name, 'lastName', cu.last_name)
    ) ORDER BY c.created_at) FROM discussion_comments c JOIN users cu ON cu.id = c.author_id WHERE c.thread_id = t.id), '[]'::jsonb)
  ) ORDER BY t.updated_at DESC, t.created_at DESC), '[]'::jsonb) INTO result
  FROM (SELECT * FROM discussion_threads ORDER BY updated_at DESC, created_at DESC LIMIT 50) t
  JOIN users u ON u.id = t.author_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_discussions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discussions() TO authenticated;

CREATE OR REPLACE FUNCTION public.poll_result(selected_poll_id UUID, selected_user_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', p.id, 'title', p.title, 'endsAt', p.ends_at,
    'myVoteId', (SELECT option_id FROM poll_votes WHERE poll_id = p.id AND user_id = selected_user_id),
    'options', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', po.id, 'label', po.label,
      'count', CASE WHEN NOT p.hide_results OR p.ends_at < now() THEN (SELECT count(*) FROM poll_votes pv WHERE pv.option_id = po.id) ELSE 0 END,
      'percentage', CASE WHEN (NOT p.hide_results OR p.ends_at < now()) AND (SELECT count(*) FROM poll_votes pv WHERE pv.poll_id = p.id) > 0
        THEN round(100.0 * (SELECT count(*) FROM poll_votes pv WHERE pv.option_id = po.id) / (SELECT count(*) FROM poll_votes pv WHERE pv.poll_id = p.id)) ELSE 0 END
    ) ORDER BY po.sort_order) FROM poll_options po WHERE po.poll_id = p.id), '[]'::jsonb)
  ) FROM polls p WHERE p.id = selected_poll_id
$$;
REVOKE ALL ON FUNCTION public.poll_result(UUID, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_widget_home()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := public.app_user_id(); current_book JSONB; upcoming_event JSONB;
  ballot JSONB; monthly_poll JSONB; announcement_data JSONB; giveaway_data JSONB;
  ballot_id UUID; monthly_id UUID; member_rating INTEGER; rsvp_status TEXT;
BEGIN
  IF NOT public.current_user_is_active() THEN RAISE EXCEPTION 'Active membership required.'; END IF;

  SELECT jsonb_build_object(
    'id', cb.id,
    'book', jsonb_build_object('id', b.id, 'title', b.title, 'author', b.author, 'description', b.description, 'coverUrl', b.cover_url),
    'startDate', cb.start_date, 'endDate', cb.end_date,
    'averageRating', COALESCE((SELECT round(avg(rating)::numeric, 1) FROM ratings WHERE book_id = b.id), 0),
    'ratingCount', (SELECT count(*) FROM ratings WHERE book_id = b.id),
    'reviews', (SELECT count(*) FROM reviews WHERE book_id = b.id AND status = 'PUBLISHED'),
    'myRating', (SELECT rating FROM ratings WHERE book_id = b.id AND user_id = uid),
    'progressPercent', cb.progress_percent
  ) INTO current_book FROM club_books cb JOIN books b ON b.id = cb.book_id
  WHERE cb.status = 'CURRENT' ORDER BY cb.start_date DESC LIMIT 1;
  member_rating := NULLIF(current_book->>'myRating', '')::integer;

  SELECT jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description, 'eventDate', e.event_date,
    'startTime', e.start_time, 'venueName', e.venue_name, 'capacity', e.capacity,
    'attendingCount', COALESCE((SELECT sum(guest_count) FROM event_rsvps WHERE event_id = e.id AND status = 'ATTENDING'), 0),
    'capacityRemaining', greatest(0, e.capacity - COALESCE((SELECT sum(guest_count) FROM event_rsvps WHERE event_id = e.id AND status = 'ATTENDING'), 0)),
    'myRsvp', (SELECT jsonb_build_object('status', er.status, 'guestCount', er.guest_count) FROM event_rsvps er WHERE er.event_id = e.id AND er.user_id = uid)
  ) INTO upcoming_event FROM events e
  WHERE e.status = 'PUBLISHED' AND e.event_date >= current_date ORDER BY e.event_date, e.start_time LIMIT 1;
  rsvp_status := upcoming_event->'myRsvp'->>'status';

  SELECT id INTO ballot_id FROM polls WHERE type = 'BOOK_BALLOT' AND status = 'ACTIVE'
    AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()) ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO monthly_id FROM polls WHERE type = 'MONTHLY_POLL' AND status = 'ACTIVE'
    AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()) ORDER BY created_at DESC LIMIT 1;
  IF ballot_id IS NOT NULL THEN ballot := public.poll_result(ballot_id, uid); END IF;
  IF monthly_id IS NOT NULL THEN monthly_poll := public.poll_result(monthly_id, uid); END IF;

  SELECT jsonb_build_object('id', id, 'title', title, 'body', body, 'type', type)
    INTO announcement_data FROM announcements
    WHERE starts_at <= now() AND (expires_at IS NULL OR expires_at > now())
    ORDER BY priority DESC, created_at DESC LIMIT 1;
  SELECT jsonb_build_object('id', g.id, 'title', g.title, 'description', g.description, 'prize', g.prize,
    'entries', (SELECT count(*) FROM giveaway_entries ge WHERE ge.giveaway_id = g.id))
    INTO giveaway_data FROM giveaways g WHERE status = 'ACTIVE' AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now()) ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'currentBook', current_book, 'upcomingEvent', upcoming_event,
    'activeBallot', ballot, 'activePoll', monthly_poll,
    'announcement', announcement_data, 'giveaway', giveaway_data,
    'member', jsonb_build_object(
      'rating', member_rating, 'rsvpStatus', rsvp_status,
      'pollVoted', COALESCE((ballot->>'myVoteId') IS NOT NULL OR (monthly_poll->>'myVoteId') IS NOT NULL, FALSE),
      'pollId', COALESCE(ballot_id, monthly_id),
      'myVoteId', COALESCE(ballot->>'myVoteId', monthly_poll->>'myVoteId')
    ),
    'stats', jsonb_build_object(
      'members', (SELECT count(*) FROM users WHERE approved AND email_verified),
      'booksRead', (SELECT count(*) FROM club_books)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_widget_home() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_widget_home() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB; widget JSONB;
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  widget := public.get_widget_home();
  SELECT jsonb_build_object(
    'members', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'email', email, 'firstName', first_name, 'lastName', last_name, 'role', role,
      'emailVerified', email_verified, 'approved', approved, 'region', region, 'createdAt', created_at
    ) ORDER BY created_at DESC) FROM (SELECT * FROM users ORDER BY created_at DESC LIMIT 250) m), '[]'::jsonb),
    'subscribers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'email', email, 'subscribed', subscribed, 'createdAt', created_at
    ) ORDER BY created_at DESC) FROM (SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 250) s), '[]'::jsonb),
    'books', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'author', author, 'coverUrl', cover_url, 'createdAt', created_at
    ) ORDER BY created_at DESC) FROM (SELECT * FROM books ORDER BY created_at DESC LIMIT 100) b), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'eventDate', event_date, 'startTime', start_time,
      'venueName', venue_name, 'capacity', capacity, 'status', status
    ) ORDER BY event_date DESC, start_time DESC) FROM (SELECT * FROM events ORDER BY event_date DESC, start_time DESC LIMIT 100) e), '[]'::jsonb),
    'currentBook', widget->'currentBook',
    'stats', jsonb_build_object(
      'members', (SELECT count(*) FROM users),
      'approvedMembers', (SELECT count(*) FROM users WHERE approved),
      'subscribers', (SELECT count(*) FROM newsletter_subscribers WHERE subscribed),
      'books', (SELECT count(*) FROM books), 'events', (SELECT count(*) FROM events)
    )
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_member(
  member_id UUID, new_approved BOOLEAN DEFAULT NULL, new_role TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated users%ROWTYPE;
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  IF member_id = public.app_user_id() AND (new_approved = FALSE OR new_role = 'MEMBER') THEN
    RAISE EXCEPTION 'You cannot remove your own administrator access.';
  END IF;
  IF new_role IS NOT NULL AND new_role NOT IN ('ADMIN', 'MEMBER') THEN RAISE EXCEPTION 'Invalid role.'; END IF;
  UPDATE users SET approved = COALESCE(new_approved, approved),
    role = COALESCE(new_role::user_role, role), updated_at = now()
  WHERE id = member_id RETURNING * INTO updated;
  IF updated.id IS NULL THEN RAISE EXCEPTION 'Member not found.'; END IF;
  RETURN jsonb_build_object(
    'id', updated.id, 'email', updated.email, 'firstName', updated.first_name,
    'lastName', updated.last_name, 'role', updated.role, 'emailVerified', updated.email_verified,
    'approved', updated.approved, 'region', updated.region, 'createdAt', updated.created_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_member(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_member(UUID, BOOLEAN, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_current_read(
  selected_book_id UUID, selected_start_date DATE, selected_end_date DATE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  UPDATE club_books SET status = 'PAST', updated_at = now() WHERE status = 'CURRENT';
  INSERT INTO club_books(book_id, start_date, end_date, selected_by, status)
  VALUES (selected_book_id, selected_start_date, selected_end_date, public.app_user_id(), 'CURRENT');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_current_read(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_current_read(UUID, DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_discussion_thread()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE discussion_threads SET updated_at = now() WHERE id = NEW.thread_id; RETURN NEW; END;
$$;
CREATE TRIGGER discussion_comment_touches_thread
AFTER INSERT ON discussion_comments FOR EACH ROW EXECUTE FUNCTION public.touch_discussion_thread();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-photos', 'event-photos', TRUE, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY event_photos_public_read ON storage.objects FOR SELECT TO public USING (bucket_id = 'event-photos');
CREATE POLICY event_photos_member_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-photos' AND public.current_user_is_active());
CREATE POLICY event_photos_owner_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-photos' AND (owner_id = auth.uid()::text OR public.current_user_is_admin()))
  WITH CHECK (bucket_id = 'event-photos' AND (owner_id = auth.uid()::text OR public.current_user_is_admin()));
CREATE POLICY event_photos_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-photos' AND (owner_id = auth.uid()::text OR public.current_user_is_admin()));
