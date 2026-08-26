-- Structured book reviews, automatic member access, account status, and admin auditing.
-- Existing application rows and community content are retained.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- `approved` is retained for older clients, but it is no longer an authorization gate.
ALTER TABLE public.users ALTER COLUMN approved SET DEFAULT TRUE;
UPDATE public.users SET approved = TRUE WHERE approved IS DISTINCT FROM TRUE;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS book_title TEXT,
  ADD COLUMN IF NOT EXISTS book_author TEXT,
  ADD COLUMN IF NOT EXISTS overall_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS book_format TEXT,
  ADD COLUMN IF NOT EXISTS picked_by TEXT,
  ADD COLUMN IF NOT EXISTS started_on DATE,
  ADD COLUMN IF NOT EXISTS finished_on DATE,
  ADD COLUMN IF NOT EXISTS spice_level SMALLINT,
  ADD COLUMN IF NOT EXISTS tear_level SMALLINT,
  ADD COLUMN IF NOT EXISTS made_me_feel TEXT[],
  ADD COLUMN IF NOT EXISTS thoughts TEXT,
  ADD COLUMN IF NOT EXISTS favourite_quotes TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT;

UPDATE public.reviews r
SET
  book_title = COALESCE(r.book_title, b.title),
  book_author = COALESCE(r.book_author, b.author),
  overall_rating = COALESCE(r.overall_rating, (
    SELECT rating.rating FROM public.ratings rating
    WHERE rating.book_id = r.book_id AND rating.user_id = r.user_id
  )),
  thoughts = COALESCE(r.thoughts, r.body)
FROM public.books b
WHERE b.id = r.book_id
  AND (r.book_title IS NULL OR r.book_author IS NULL OR r.overall_rating IS NULL OR r.thoughts IS NULL);

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_overall_rating_check,
  DROP CONSTRAINT IF EXISTS reviews_spice_level_check,
  DROP CONSTRAINT IF EXISTS reviews_tear_level_check,
  DROP CONSTRAINT IF EXISTS reviews_book_format_check,
  DROP CONSTRAINT IF EXISTS reviews_recommendation_check,
  DROP CONSTRAINT IF EXISTS reviews_reading_dates_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_overall_rating_check
    CHECK (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_spice_level_check
    CHECK (spice_level IS NULL OR spice_level BETWEEN 0 AND 5),
  ADD CONSTRAINT reviews_tear_level_check
    CHECK (tear_level IS NULL OR tear_level BETWEEN 0 AND 5),
  ADD CONSTRAINT reviews_book_format_check
    CHECK (book_format IS NULL OR book_format IN ('Paperback', 'Hardback', 'E-book', 'Audiobook')),
  ADD CONSTRAINT reviews_recommendation_check
    CHECK (recommendation IS NULL OR recommendation IN ('Yes', 'No', 'Maybe')),
  ADD CONSTRAINT reviews_reading_dates_check
    CHECK (started_on IS NULL OR finished_on IS NULL OR finished_on >= started_on);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_email TEXT,
  ADD COLUMN IF NOT EXISTS success BOOLEAN,
  ADD COLUMN IF NOT EXISTS error_code TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_target_created_idx
  ON public.audit_logs (target_user_id, created_at DESC);

ALTER TABLE public.payment_method_settings
  ADD COLUMN IF NOT EXISTS fallback_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE application_user_id UUID;
BEGIN
  SELECT id INTO application_user_id
  FROM public.users
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF application_user_id IS NULL THEN
    INSERT INTO public.users (
      id, auth_user_id, email, password_hash, first_name, last_name, region, instagram,
      email_verified, approved, role, blocked
    ) VALUES (
      NEW.id, NEW.id, lower(NEW.email), NULL,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'Member'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
      NULLIF(NEW.raw_user_meta_data->>'region', ''),
      NULLIF(NEW.raw_user_meta_data->>'instagram', ''),
      NEW.email_confirmed_at IS NOT NULL, TRUE, 'MEMBER', FALSE
    ) RETURNING id INTO application_user_id;
  ELSE
    UPDATE public.users
    SET auth_user_id = NEW.id,
        email = lower(NEW.email),
        email_verified = NEW.email_confirmed_at IS NOT NULL,
        approved = TRUE,
        updated_at = now()
    WHERE id = application_user_id;
  END IF;

  INSERT INTO public.profiles(user_id)
  VALUES (application_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT email_verified AND NOT blocked AND deleted_at IS NULL
    FROM public.users WHERE auth_user_id = auth.uid()
  ), FALSE)
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT email_verified AND NOT blocked AND deleted_at IS NULL AND role = 'ADMIN'
    FROM public.users WHERE auth_user_id = auth.uid()
  ), FALSE)
$$;

-- Prevent a review owner from promoting or reassigning their own review. Admins retain
-- moderation access, while members can still correct their submitted content.
CREATE OR REPLACE FUNCTION public.protect_review_moderation_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.current_user_is_admin() AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.book_id IS DISTINCT FROM OLD.book_id
    OR NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    RAISE EXCEPTION 'Review ownership, book and moderation status can only be changed by an administrator.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_review_moderation_fields ON public.reviews;
CREATE TRIGGER protect_review_moderation_fields
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_review_moderation_fields();

DROP POLICY IF EXISTS reviews_own_insert ON public.reviews;
CREATE POLICY reviews_own_insert ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_active()
    AND user_id = public.app_user_id()
    AND status = 'PENDING'
  );

DROP POLICY IF EXISTS reviews_own_update ON public.reviews;
CREATE POLICY reviews_own_update ON public.reviews FOR UPDATE TO authenticated
  USING (
    (public.current_user_is_active() AND user_id = public.app_user_id())
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    (public.current_user_is_active() AND user_id = public.app_user_id())
    OR public.current_user_is_admin()
  );

-- Full structured submission contract. Nullable optional fields remain nullable; values are
-- never folded into body text or silently discarded.
CREATE OR REPLACE FUNCTION public.submit_book_review(
  input_book_title TEXT,
  input_author TEXT,
  input_genre TEXT,
  input_rating INTEGER,
  input_thoughts TEXT,
  input_contains_spoilers BOOLEAN DEFAULT FALSE,
  input_format TEXT DEFAULT NULL,
  input_picked_by TEXT DEFAULT NULL,
  input_start_date DATE DEFAULT NULL,
  input_end_date DATE DEFAULT NULL,
  input_spice_level INTEGER DEFAULT NULL,
  input_tear_level INTEGER DEFAULT NULL,
  input_made_me_feel TEXT[] DEFAULT NULL,
  input_favourite_quotes TEXT DEFAULT NULL,
  input_recommendation TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_id UUID := public.app_user_id();
  selected_book_id UUID;
  selected_book_title TEXT;
  selected_book_author TEXT;
  created_review_id UUID;
BEGIN
  IF member_id IS NULL OR NOT public.current_user_is_active() THEN
    RAISE EXCEPTION 'A verified Wine & Chapters membership is required to submit a review.';
  END IF;
  IF char_length(btrim(COALESCE(input_book_title, ''))) NOT BETWEEN 2 AND 180 THEN
    RAISE EXCEPTION 'Book title must be between 2 and 180 characters.';
  END IF;
  IF char_length(btrim(COALESCE(input_author, ''))) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Author must be between 2 and 160 characters.';
  END IF;
  IF char_length(btrim(COALESCE(input_genre, ''))) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Genre must be between 2 and 100 characters.';
  END IF;
  IF input_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Choose a star rating between 1 and 5.';
  END IF;
  IF char_length(btrim(COALESCE(input_thoughts, ''))) NOT BETWEEN 20 AND 8000 THEN
    RAISE EXCEPTION 'Thoughts must be between 20 and 8000 characters.';
  END IF;
  IF input_format IS NOT NULL AND input_format NOT IN ('Paperback', 'Hardback', 'E-book', 'Audiobook') THEN
    RAISE EXCEPTION 'Invalid book format.';
  END IF;
  IF input_spice_level IS NOT NULL AND input_spice_level NOT BETWEEN 0 AND 5 THEN
    RAISE EXCEPTION 'Spice level must be between 0 and 5.';
  END IF;
  IF input_tear_level IS NOT NULL AND input_tear_level NOT BETWEEN 0 AND 5 THEN
    RAISE EXCEPTION 'Tear level must be between 0 and 5.';
  END IF;
  IF input_recommendation IS NOT NULL AND input_recommendation NOT IN ('Yes', 'No', 'Maybe') THEN
    RAISE EXCEPTION 'Invalid recommendation.';
  END IF;
  IF input_start_date IS NOT NULL AND input_end_date IS NOT NULL AND input_end_date < input_start_date THEN
    RAISE EXCEPTION 'The finish date must be on or after the start date.';
  END IF;
  IF cardinality(input_made_me_feel) > 20
    OR EXISTS (SELECT 1 FROM unnest(input_made_me_feel) feeling WHERE char_length(btrim(feeling)) NOT BETWEEN 1 AND 60) THEN
    RAISE EXCEPTION 'Invalid made-me-feel selections.';
  END IF;
  IF char_length(COALESCE(input_picked_by, '')) > 100
    OR char_length(COALESCE(input_favourite_quotes, '')) > 8000 THEN
    RAISE EXCEPTION 'One or more optional review fields are too long.';
  END IF;

  SELECT b.id, b.title, b.author
  INTO selected_book_id, selected_book_title, selected_book_author
  FROM public.books b
  WHERE lower(btrim(b.title)) = lower(btrim(input_book_title))
    AND lower(btrim(COALESCE(b.author, ''))) = lower(btrim(input_author))
  ORDER BY b.created_at
  LIMIT 1;

  IF selected_book_id IS NULL THEN
    INSERT INTO public.books (title, author, categories, metadata)
    VALUES (
      btrim(input_book_title), btrim(input_author), jsonb_build_array(btrim(input_genre)),
      jsonb_build_object('source', 'member_review')
    ) RETURNING id, title, author
      INTO selected_book_id, selected_book_title, selected_book_author;
  END IF;

  INSERT INTO public.ratings (book_id, user_id, rating)
  VALUES (selected_book_id, member_id, input_rating)
  ON CONFLICT (book_id, user_id)
  DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();

  INSERT INTO public.reviews (
    book_id, user_id, title, body, contains_spoilers, status,
    book_title, book_author, overall_rating, genre, book_format, picked_by,
    started_on, finished_on, spice_level, tear_level, made_me_feel,
    thoughts, favourite_quotes, recommendation
  ) VALUES (
    selected_book_id, member_id, 'Review of ' || selected_book_title, btrim(input_thoughts),
    COALESCE(input_contains_spoilers, FALSE), 'PENDING',
    selected_book_title, COALESCE(selected_book_author, btrim(input_author)), input_rating,
    btrim(input_genre), input_format, NULLIF(btrim(input_picked_by), ''),
    input_start_date, input_end_date, input_spice_level, input_tear_level,
    CASE WHEN input_made_me_feel IS NULL THEN NULL ELSE ARRAY(
      SELECT btrim(feeling) FROM unnest(input_made_me_feel) feeling
    ) END,
    btrim(input_thoughts), NULLIF(btrim(input_favourite_quotes), ''), input_recommendation
  ) RETURNING id INTO created_review_id;

  RETURN created_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_book_review(
  TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT, TEXT, DATE, DATE,
  INTEGER, INTEGER, TEXT[], TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_book_review(
  TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT, TEXT, DATE, DATE,
  INTEGER, INTEGER, TEXT[], TEXT, TEXT
) TO authenticated;

-- Keep the previous RPC signature working for already-deployed clients.
CREATE OR REPLACE FUNCTION public.submit_book_review(
  input_book_title TEXT,
  input_author TEXT,
  input_genre TEXT,
  input_rating INTEGER,
  input_body TEXT,
  input_contains_spoilers BOOLEAN DEFAULT FALSE
)
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.submit_book_review(
    input_book_title, input_author, input_genre, input_rating, input_body,
    input_contains_spoilers, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  )
$$;

REVOKE ALL ON FUNCTION public.submit_book_review(TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_book_review(TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_published_reviews()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'bookId', r.book_id,
    'title', r.title,
    'body', r.body,
    'bookTitle', COALESCE(r.book_title, b.title),
    'bookAuthor', COALESCE(r.book_author, b.author),
    'bookCoverUrl', b.cover_url,
    'overallRating', COALESCE(r.overall_rating, rating.rating),
    'genre', r.genre,
    'format', r.book_format,
    'pickedBy', r.picked_by,
    'startDate', r.started_on,
    'endDate', r.finished_on,
    'spiceLevel', r.spice_level,
    'tearLevel', r.tear_level,
    'madeMeFeel', r.made_me_feel,
    'thoughts', COALESCE(r.thoughts, r.body),
    'favouriteQuotes', r.favourite_quotes,
    'recommendation', r.recommendation,
    'containsSpoilers', r.contains_spoilers,
    'createdAt', r.created_at,
    'author', jsonb_build_object(
      'id', u.id,
      'firstName', u.first_name,
      'lastName', u.last_name,
      'avatarUrl', CASE WHEN p.profile_visibility = 'PUBLIC' THEN p.avatar_url ELSE NULL END
    ),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'body', c.body, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
      'author', jsonb_build_object('id', cu.id, 'firstName', cu.first_name, 'lastName', cu.last_name)
    ) ORDER BY c.created_at)
      FROM public.review_comments c
      JOIN public.users cu ON cu.id = c.user_id
      WHERE c.review_id = r.id), '[]'::jsonb)
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM public.reviews r
  JOIN public.books b ON b.id = r.book_id
  JOIN public.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.ratings rating ON rating.book_id = r.book_id AND rating.user_id = r.user_id
  WHERE r.status = 'PUBLISHED'
$$;

REVOKE ALL ON FUNCTION public.get_published_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_reviews() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB; widget JSONB;
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  widget := public.get_widget_home();
  SELECT jsonb_build_object(
    'members', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'email', email, 'firstName', first_name, 'lastName', last_name, 'role', role,
      'emailVerified', email_verified, 'verified', email_verified, 'approved', approved,
      'blocked', blocked, 'deletedAt', deleted_at,
      'status', CASE WHEN deleted_at IS NOT NULL THEN 'REMOVED' WHEN blocked THEN 'BLOCKED'
        WHEN email_verified THEN 'VERIFIED' ELSE 'UNVERIFIED' END,
      'region', region, 'createdAt', created_at
    ) ORDER BY created_at DESC)
      FROM (SELECT * FROM public.users ORDER BY created_at DESC LIMIT 250) m), '[]'::jsonb),
    'subscribers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'email', email, 'subscribed', subscribed, 'createdAt', created_at
    ) ORDER BY created_at DESC)
      FROM (SELECT * FROM public.newsletter_subscribers ORDER BY created_at DESC LIMIT 250) s), '[]'::jsonb),
    'books', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'author', author, 'coverUrl', cover_url, 'createdAt', created_at
    ) ORDER BY created_at DESC)
      FROM (SELECT * FROM public.books ORDER BY created_at DESC LIMIT 100) b), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'eventDate', event_date, 'startTime', start_time,
      'venueName', venue_name, 'capacity', capacity, 'status', status
    ) ORDER BY event_date DESC, start_time DESC)
      FROM (SELECT * FROM public.events ORDER BY event_date DESC, start_time DESC LIMIT 100) e), '[]'::jsonb),
    'currentBook', widget->'currentBook',
    'stats', jsonb_build_object(
      'members', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL),
      'approvedMembers', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL AND NOT blocked),
      'activeMembers', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL AND NOT blocked AND email_verified),
      'blockedMembers', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL AND blocked),
      'unverifiedMembers', (SELECT count(*) FROM public.users WHERE deleted_at IS NULL AND NOT email_verified),
      'subscribers', (SELECT count(*) FROM public.newsletter_subscribers WHERE subscribed),
      'books', (SELECT count(*) FROM public.books),
      'events', (SELECT count(*) FROM public.events)
    )
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_content()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  SELECT jsonb_build_object(
    'suggestions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'title', s.title, 'description', s.description, 'type', s.type,
      'status', s.status, 'createdAt', s.created_at,
      'memberName', u.first_name || ' ' || u.last_name
    ) ORDER BY s.created_at DESC) FROM public.suggestions s JOIN public.users u ON u.id = s.user_id), '[]'::jsonb),
    'reviews', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'title', r.title, 'body', r.body, 'status', r.status,
      'bookId', r.book_id, 'bookTitle', COALESCE(r.book_title, b.title),
      'bookAuthor', COALESCE(r.book_author, b.author), 'overallRating', COALESCE(r.overall_rating, rating.rating),
      'genre', r.genre, 'format', r.book_format, 'pickedBy', r.picked_by,
      'startDate', r.started_on, 'endDate', r.finished_on,
      'spiceLevel', r.spice_level, 'tearLevel', r.tear_level,
      'madeMeFeel', r.made_me_feel, 'thoughts', COALESCE(r.thoughts, r.body),
      'favouriteQuotes', r.favourite_quotes, 'recommendation', r.recommendation,
      'containsSpoilers', r.contains_spoilers,
      'reviewerId', r.user_id, 'memberName', u.first_name || ' ' || u.last_name,
      'createdAt', r.created_at
    ) ORDER BY r.created_at DESC)
      FROM public.reviews r
      JOIN public.books b ON b.id = r.book_id
      JOIN public.users u ON u.id = r.user_id
      LEFT JOIN public.ratings rating ON rating.book_id = r.book_id AND rating.user_id = r.user_id), '[]'::jsonb),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'reviewId', c.review_id, 'body', c.body,
      'memberName', u.first_name || ' ' || u.last_name, 'createdAt', c.created_at
    ) ORDER BY c.created_at DESC)
      FROM public.review_comments c JOIN public.users u ON u.id = c.user_id), '[]'::jsonb),
    'discussions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'body', t.body,
      'memberName', u.first_name || ' ' || u.last_name, 'createdAt', t.created_at,
      'commentCount', (SELECT count(*) FROM public.discussion_comments c WHERE c.thread_id = t.id),
      'deletedAt', t.deleted_at, 'deletionReason', t.deletion_reason
    ) ORDER BY t.deleted_at NULLS FIRST, t.created_at DESC)
      FROM public.discussion_threads t JOIN public.users u ON u.id = t.author_id), '[]'::jsonb),
    'polls', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.title, 'status', p.status, 'endsAt', p.ends_at,
      'hideResults', p.hide_results
    ) ORDER BY p.created_at DESC) FROM public.polls p), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_content() TO authenticated;

-- Edge Functions use this service-role-only RPC to serialize block/removal state changes.
-- The advisory lock prevents two concurrent requests from both removing the final active admin.
CREATE OR REPLACE FUNCTION public.admin_set_member_blocked(
  actor_user_id UUID,
  member_id UUID,
  new_blocked BOOLEAN
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target public.users%ROWTYPE; active_admins BIGINT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('wine-admin-member-state', 0));

  SELECT * INTO target FROM public.users
  WHERE id = member_id AND deleted_at IS NULL
  FOR UPDATE;
  IF target.id IS NULL THEN RAISE EXCEPTION 'Member not found.'; END IF;
  IF new_blocked AND actor_user_id = member_id THEN
    RAISE EXCEPTION 'Administrators cannot block themselves.';
  END IF;
  IF new_blocked AND NOT target.blocked AND target.role = 'ADMIN' AND target.email_verified THEN
    SELECT count(*) INTO active_admins FROM public.users
    WHERE role = 'ADMIN' AND email_verified AND NOT blocked AND deleted_at IS NULL;
    IF active_admins <= 1 THEN
      RAISE EXCEPTION 'The last active administrator cannot be blocked or removed.';
    END IF;
  END IF;

  UPDATE public.users
  SET blocked = new_blocked,
      blocked_at = CASE WHEN new_blocked THEN COALESCE(blocked_at, now()) ELSE NULL END,
      approved = TRUE,
      updated_at = now()
  WHERE id = member_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_member_blocked(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_blocked(UUID, UUID, BOOLEAN) TO service_role;

-- `auto_expose_new_tables` is disabled. Grant the Edge runtime only the table
-- capabilities used by trusted member administration and existing broadcasts.
GRANT SELECT, UPDATE ON TABLE public.users TO service_role;
GRANT SELECT, UPDATE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;
GRANT SELECT ON TABLE public.newsletter_subscribers TO service_role;

CREATE OR REPLACE FUNCTION public.admin_update_member(
  member_id UUID, new_approved BOOLEAN DEFAULT NULL, new_role TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated public.users%ROWTYPE; active_admins BIGINT;
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  IF new_approved = FALSE THEN
    RAISE EXCEPTION 'Administrator approval has been retired. Use the protected block operation instead.';
  END IF;
  IF new_role IS NOT NULL AND new_role NOT IN ('ADMIN', 'MEMBER') THEN RAISE EXCEPTION 'Invalid role.'; END IF;
  IF member_id = public.app_user_id() AND new_role = 'MEMBER' THEN
    RAISE EXCEPTION 'You cannot remove your own administrator access.';
  END IF;
  IF new_role = 'MEMBER' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = member_id AND role = 'ADMIN' AND NOT blocked AND deleted_at IS NULL
  ) THEN
    SELECT count(*) INTO active_admins FROM public.users
    WHERE role = 'ADMIN' AND NOT blocked AND deleted_at IS NULL AND email_verified;
    IF active_admins <= 1 THEN RAISE EXCEPTION 'The last active administrator cannot be demoted.'; END IF;
  END IF;

  UPDATE public.users
  SET approved = TRUE, role = COALESCE(new_role::user_role, role), updated_at = now()
  WHERE id = member_id AND deleted_at IS NULL
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN RAISE EXCEPTION 'Member not found.'; END IF;

  INSERT INTO public.audit_logs(actor_id, target_user_id, target_email, action, entity_type, entity_id, success, metadata)
  VALUES (public.app_user_id(), updated.id, updated.email, 'MEMBER_ROLE_UPDATED', 'user', updated.id::text,
    TRUE, jsonb_build_object('role', updated.role));

  RETURN jsonb_build_object(
    'id', updated.id, 'email', updated.email, 'firstName', updated.first_name,
    'lastName', updated.last_name, 'role', updated.role,
    'emailVerified', updated.email_verified, 'verified', updated.email_verified,
    'approved', TRUE, 'blocked', updated.blocked,
    'status', CASE WHEN updated.blocked THEN 'BLOCKED' WHEN updated.email_verified THEN 'VERIFIED' ELSE 'UNVERIFIED' END,
    'region', updated.region, 'createdAt', updated.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_member(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_member(UUID, BOOLEAN, TEXT) TO authenticated;
