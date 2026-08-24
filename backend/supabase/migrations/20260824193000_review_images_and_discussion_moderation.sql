-- Admin-managed book review cover images and Reading Room post moderation.

ALTER TABLE public.discussion_threads
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

ALTER TABLE public.discussion_threads
  DROP CONSTRAINT IF EXISTS discussion_threads_deletion_reason_length;
ALTER TABLE public.discussion_threads
  ADD CONSTRAINT discussion_threads_deletion_reason_length
  CHECK (deletion_reason IS NULL OR char_length(btrim(deletion_reason)) <= 500);

CREATE INDEX IF NOT EXISTS discussion_threads_visible_updated_idx
  ON public.discussion_threads (updated_at DESC, created_at DESC)
  WHERE deleted_at IS NULL;

-- Do not permit members to write moderation fields. Admin changes flow through
-- the RPC below, which verifies the existing application-role model.
DROP POLICY IF EXISTS discussions_member_read ON public.discussion_threads;
DROP POLICY IF EXISTS discussions_own_update ON public.discussion_threads;
DROP POLICY IF EXISTS comments_member_read ON public.discussion_comments;
DROP POLICY IF EXISTS comments_own_insert ON public.discussion_comments;

CREATE POLICY discussions_member_read ON public.discussion_threads FOR SELECT TO authenticated
  USING (public.current_user_is_active() AND deleted_at IS NULL);
CREATE POLICY discussions_own_update ON public.discussion_threads FOR UPDATE TO authenticated
  USING (author_id = public.app_user_id() AND deleted_at IS NULL)
  WITH CHECK (
    author_id = public.app_user_id()
    AND deleted_at IS NULL
    AND deleted_by IS NULL
    AND deletion_reason IS NULL
  );
CREATE POLICY comments_member_read ON public.discussion_comments FOR SELECT TO authenticated
  USING (
    public.current_user_is_active()
    AND EXISTS (
      SELECT 1 FROM public.discussion_threads t
      WHERE t.id = thread_id AND t.deleted_at IS NULL
    )
  );
CREATE POLICY comments_own_insert ON public.discussion_comments FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_active()
    AND author_id = public.app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.discussion_threads t
      WHERE t.id = thread_id AND t.deleted_at IS NULL
    )
  );

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
    ) ORDER BY c.created_at) FROM discussion_comments c JOIN users cu ON cu.id = c.author_id
      WHERE c.thread_id = t.id), '[]'::jsonb)
  ) ORDER BY t.updated_at DESC, t.created_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT * FROM discussion_threads
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC, created_at DESC LIMIT 50
  ) t
  JOIN users u ON u.id = t.author_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_discussions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discussions() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderate_discussion(
  selected_thread_id UUID,
  moderation_action TEXT,
  moderation_reason TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;
  IF moderation_action = 'remove' THEN
    UPDATE public.discussion_threads
    SET deleted_at = now(), deleted_by = public.app_user_id(),
        deletion_reason = NULLIF(btrim(moderation_reason), ''), updated_at = now()
    WHERE id = selected_thread_id AND deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Post was not found or has already been removed.'; END IF;
  ELSIF moderation_action = 'restore' THEN
    UPDATE public.discussion_threads
    SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL, updated_at = now()
    WHERE id = selected_thread_id AND deleted_at IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Removed post was not found.'; END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported moderation action.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_moderate_discussion(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_moderate_discussion(UUID, TEXT, TEXT) TO authenticated;

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
    'discussions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'body', t.body,
      'memberName', u.first_name || ' ' || u.last_name, 'createdAt', t.created_at,
      'commentCount', (SELECT count(*) FROM discussion_comments c WHERE c.thread_id = t.id),
      'deletedAt', t.deleted_at, 'deletionReason', t.deletion_reason
    ) ORDER BY t.deleted_at NULLS FIRST, t.created_at DESC)
      FROM discussion_threads t JOIN users u ON u.id = t.author_id), '[]'::jsonb),
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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-images', 'review-images', TRUE, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY review_images_public_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'review-images');
CREATE POLICY review_images_admin_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-images' AND public.current_user_is_admin());
CREATE POLICY review_images_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'review-images' AND public.current_user_is_admin())
  WITH CHECK (bucket_id = 'review-images' AND public.current_user_is_admin());
CREATE POLICY review_images_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-images' AND public.current_user_is_admin());
