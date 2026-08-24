-- Make the external-book key usable by PostgREST upserts. A partial unique
-- index cannot be inferred by ON CONFLICT (external_provider, external_id).
DROP INDEX IF EXISTS public.idx_books_external;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.books'::regclass
      AND conname = 'books_external_provider_id_key'
  ) THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_external_provider_id_key
      UNIQUE (external_provider, external_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_events()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := public.app_user_id();
  result JSONB;
BEGIN
  IF NOT public.current_user_is_active() THEN
    RAISE EXCEPTION 'Active membership required.';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'eventDate', e.event_date,
    'startTime', e.start_time,
    'endTime', e.end_time,
    'venueName', e.venue_name,
    'venueAddress', e.venue_address,
    'theme', e.theme,
    'coverImage', e.cover_image,
    'capacity', e.capacity,
    'contributionAmount', e.contribution_amount,
    'rsvpDeadline', e.rsvp_deadline,
    'attendingCount', COALESCE((
      SELECT sum(er.guest_count)
      FROM event_rsvps er
      WHERE er.event_id = e.id AND er.status = 'ATTENDING'
    ), 0),
    'myRsvp', (
      SELECT jsonb_build_object('status', er.status, 'guestCount', er.guest_count)
      FROM event_rsvps er
      WHERE er.event_id = e.id AND er.user_id = uid
    )
  ) ORDER BY e.event_date, e.start_time), '[]'::jsonb)
  INTO result
  FROM events e
  WHERE e.status = 'PUBLISHED';

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_events() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_current_read(
  selected_book_id UUID,
  selected_start_date DATE,
  selected_end_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;
  IF selected_end_date < selected_start_date THEN
    RAISE EXCEPTION 'The reading end date must be on or after the start date.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM books WHERE id = selected_book_id) THEN
    RAISE EXCEPTION 'Book not found.';
  END IF;

  UPDATE club_books
  SET status = 'PAST', updated_at = now()
  WHERE status = 'CURRENT';

  INSERT INTO club_books(book_id, start_date, end_date, selected_by, status, progress_percent)
  VALUES (
    selected_book_id,
    selected_start_date,
    selected_end_date,
    public.app_user_id(),
    'CURRENT',
    0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_current_read(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_current_read(UUID, DATE, DATE) TO authenticated;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'READER'
    CHECK (membership_tier IN ('READER', 'CHAPTER_MEMBER', 'PATRON')),
  ADD COLUMN IF NOT EXISTS membership_status TEXT NOT NULL DEFAULT 'INACTIVE'
    CHECK (membership_status IN ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  ADD COLUMN IF NOT EXISTS membership_paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.membership_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('CHAPTER_MEMBER', 'PATRON')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT UNIQUE,
  status payment_status NOT NULL DEFAULT 'PENDING',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS membership_orders_email_idx
  ON public.membership_orders (lower(email), created_at DESC);

ALTER TABLE public.membership_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY membership_orders_own_read
ON public.membership_orders FOR SELECT TO authenticated
USING (user_id = public.app_user_id() OR public.current_user_is_admin());
