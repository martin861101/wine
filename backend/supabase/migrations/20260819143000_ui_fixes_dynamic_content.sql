-- UI fixes: public dynamic content, review discussions and richer admin management.

CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_comments_review_created_idx
  ON public.review_comments (review_id, created_at);
CREATE INDEX IF NOT EXISTS review_comments_user_idx
  ON public.review_comments (user_id);

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS book_identity TEXT;

CREATE POLICY review_comments_member_read ON public.review_comments
  FOR SELECT TO authenticated USING (public.current_user_is_active());
CREATE POLICY review_comments_own_insert ON public.review_comments
  FOR INSERT TO authenticated WITH CHECK (
    public.current_user_is_active()
    AND user_id = public.app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.status = 'PUBLISHED'
    )
  );
CREATE POLICY review_comments_owner_or_admin_update ON public.review_comments
  FOR UPDATE TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin())
  WITH CHECK (user_id = public.app_user_id() OR public.current_user_is_admin());
CREATE POLICY review_comments_owner_or_admin_delete ON public.review_comments
  FOR DELETE TO authenticated
  USING (user_id = public.app_user_id() OR public.current_user_is_admin());

CREATE POLICY reviews_admin_delete ON public.reviews
  FOR DELETE TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.get_public_home()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_book JSONB; upcoming_event JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', cb.id,
    'book', jsonb_build_object(
      'id', b.id, 'title', b.title, 'author', b.author,
      'description', b.description, 'coverUrl', b.cover_url,
      'categories', b.categories, 'publishedDate', b.published_date
    ),
    'startDate', cb.start_date, 'endDate', cb.end_date,
    'averageRating', COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM ratings r WHERE r.book_id = b.id), 0),
    'ratingCount', (SELECT count(*) FROM ratings r WHERE r.book_id = b.id),
    'reviews', (SELECT count(*) FROM reviews r WHERE r.book_id = b.id AND r.status = 'PUBLISHED'),
    'progressPercent', cb.progress_percent
  ) INTO current_book
  FROM club_books cb JOIN books b ON b.id = cb.book_id
  WHERE cb.status = 'CURRENT'
  ORDER BY cb.start_date DESC LIMIT 1;

  SELECT jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'eventDate', e.event_date, 'startTime', e.start_time, 'endTime', e.end_time,
    'venueName', e.venue_name, 'venueAddress', e.venue_address,
    'theme', e.theme, 'coverImage', e.cover_image,
    'capacity', e.capacity, 'contributionAmount', e.contribution_amount,
    'rsvpDeadline', e.rsvp_deadline,
    'attendingCount', COALESCE((
      SELECT sum(er.guest_count) FROM event_rsvps er
      WHERE er.event_id = e.id AND er.status = 'ATTENDING'
    ), 0)
  ) INTO upcoming_event
  FROM events e
  WHERE e.status = 'PUBLISHED' AND e.event_date >= current_date
  ORDER BY e.event_date, e.start_time LIMIT 1;

  RETURN jsonb_build_object('currentBook', current_book, 'upcomingEvent', upcoming_event);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_home() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_home() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_events()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'eventDate', e.event_date, 'startTime', e.start_time, 'endTime', e.end_time,
    'venueName', e.venue_name, 'venueAddress', e.venue_address,
    'theme', e.theme, 'coverImage', e.cover_image,
    'capacity', e.capacity, 'contributionAmount', e.contribution_amount,
    'rsvpDeadline', e.rsvp_deadline,
    'attendingCount', COALESCE((
      SELECT sum(er.guest_count) FROM event_rsvps er
      WHERE er.event_id = e.id AND er.status = 'ATTENDING'
    ), 0),
    'myRsvp', NULL
  ) ORDER BY e.event_date, e.start_time), '[]'::jsonb)
  FROM events e
  WHERE e.status = 'PUBLISHED' AND e.event_date >= current_date
$$;

REVOKE ALL ON FUNCTION public.get_public_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_events() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_events()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := public.app_user_id(); result JSONB;
BEGIN
  IF NOT public.current_user_is_active() THEN RAISE EXCEPTION 'Active membership required.'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id, 'title', e.title, 'description', e.description,
    'eventDate', e.event_date, 'startTime', e.start_time, 'endTime', e.end_time,
    'venueName', e.venue_name, 'venueAddress', e.venue_address,
    'theme', e.theme, 'coverImage', e.cover_image,
    'capacity', e.capacity, 'contributionAmount', e.contribution_amount,
    'rsvpDeadline', e.rsvp_deadline,
    'attendingCount', COALESCE((SELECT sum(er.guest_count) FROM event_rsvps er WHERE er.event_id = e.id AND er.status = 'ATTENDING'), 0),
    'myRsvp', (SELECT jsonb_build_object('status', er.status, 'guestCount', er.guest_count) FROM event_rsvps er WHERE er.event_id = e.id AND er.user_id = uid)
  ) ORDER BY e.event_date, e.start_time), '[]'::jsonb)
  INTO result
  FROM events e
  WHERE e.status = 'PUBLISHED' AND e.event_date >= current_date;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_events() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_published_reviews()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id, 'bookId', r.book_id, 'title', r.title, 'body', r.body,
    'containsSpoilers', r.contains_spoilers, 'createdAt', r.created_at,
    'bookTitle', b.title, 'bookAuthor', b.author, 'bookCoverUrl', b.cover_url,
    'author', jsonb_build_object('id', u.id, 'firstName', u.first_name, 'lastName', u.last_name),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'body', c.body, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
      'author', jsonb_build_object('id', cu.id, 'firstName', cu.first_name, 'lastName', cu.last_name)
    ) ORDER BY c.created_at) FROM review_comments c JOIN users cu ON cu.id = c.user_id WHERE c.review_id = r.id), '[]'::jsonb)
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM reviews r
  JOIN books b ON b.id = r.book_id
  JOIN users u ON u.id = r.user_id
  WHERE r.status = 'PUBLISHED'
$$;

REVOKE ALL ON FUNCTION public.get_published_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_reviews() TO anon, authenticated;

-- Members may browse community suggestions; sensitive profile fields remain hidden.
CREATE POLICY suggestions_member_read ON public.suggestions
  FOR SELECT TO authenticated USING (public.current_user_is_active());

CREATE UNIQUE INDEX IF NOT EXISTS suggestions_book_identity_unique_idx
  ON public.suggestions (book_identity)
  WHERE type = 'BOOK' AND book_identity IS NOT NULL;

CREATE POLICY suggestions_admin_update ON public.suggestions
  FOR UPDATE TO authenticated USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
CREATE POLICY suggestions_admin_delete ON public.suggestions
  FOR DELETE TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.get_community_activity()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(activity ORDER BY occurred_at DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', 'suggestion-' || s.id, 'kind', 'suggestion',
      'text', u.first_name || ' suggested “' || s.title || '”', 'occurredAt', s.created_at
    ) AS activity, s.created_at AS occurred_at
    FROM suggestions s JOIN users u ON u.id = s.user_id WHERE s.type = 'BOOK'
    UNION ALL
    SELECT jsonb_build_object(
      'id', 'review-' || r.id, 'kind', 'review',
      'text', u.first_name || ' reviewed “' || b.title || '”', 'occurredAt', r.created_at
    ), r.created_at
    FROM reviews r JOIN users u ON u.id = r.user_id JOIN books b ON b.id = r.book_id
    WHERE r.status = 'PUBLISHED'
    UNION ALL
    SELECT jsonb_build_object(
      'id', 'poll-' || p.id, 'kind', 'poll',
      'text', 'A new book vote is open: ' || p.title, 'occurredAt', p.created_at
    ), p.created_at
    FROM polls p WHERE p.status = 'ACTIVE'
    ORDER BY occurred_at DESC LIMIT 20
  ) feed
$$;
REVOKE ALL ON FUNCTION public.get_community_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_activity() TO authenticated;

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
    ) ORDER BY s.created_at DESC) FROM suggestions s JOIN users u ON u.id = s.user_id), '[]'::jsonb),
    'reviews', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'title', r.title, 'body', r.body, 'status', r.status,
      'bookTitle', b.title, 'memberName', u.first_name || ' ' || u.last_name,
      'createdAt', r.created_at
    ) ORDER BY r.created_at DESC) FROM reviews r JOIN books b ON b.id = r.book_id JOIN users u ON u.id = r.user_id), '[]'::jsonb),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'reviewId', c.review_id, 'body', c.body,
      'memberName', u.first_name || ' ' || u.last_name, 'createdAt', c.created_at
    ) ORDER BY c.created_at DESC) FROM review_comments c JOIN users u ON u.id = c.user_id), '[]'::jsonb),
    'polls', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.title, 'status', p.status, 'endsAt', p.ends_at,
      'hideResults', p.hide_results
    ) ORDER BY p.created_at DESC) FROM polls p), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_content() TO authenticated;
