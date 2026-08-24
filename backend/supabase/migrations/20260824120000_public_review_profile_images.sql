-- Expose the matching review author's avatar only when their profile is public.
-- Published reviews remain readable by anonymous visitors; member-only and private
-- profile images intentionally continue to use the branded frontend fallback.

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
    'author', jsonb_build_object(
      'id', u.id,
      'firstName', u.first_name,
      'lastName', u.last_name,
      'avatarUrl', CASE WHEN p.profile_visibility = 'PUBLIC' THEN p.avatar_url ELSE NULL END
    ),
    'comments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'body', c.body, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
      'author', jsonb_build_object('id', cu.id, 'firstName', cu.first_name, 'lastName', cu.last_name)
    ) ORDER BY c.created_at) FROM review_comments c JOIN users cu ON cu.id = c.user_id WHERE c.review_id = r.id), '[]'::jsonb)
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM reviews r
  JOIN books b ON b.id = r.book_id
  JOIN users u ON u.id = r.user_id
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE r.status = 'PUBLISHED'
$$;

REVOKE ALL ON FUNCTION public.get_published_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_reviews() TO anon, authenticated;
