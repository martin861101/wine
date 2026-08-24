-- Submit a member review atomically and allow reviews of books outside the curated club catalogue.

CREATE OR REPLACE FUNCTION public.submit_book_review(
  input_book_title TEXT,
  input_author TEXT,
  input_genre TEXT,
  input_rating INTEGER,
  input_body TEXT,
  input_contains_spoilers BOOLEAN DEFAULT FALSE
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
  created_review_id UUID;
BEGIN
  IF member_id IS NULL OR NOT public.current_user_is_active() THEN
    RAISE EXCEPTION 'An active Wine & Chapters membership is required to submit a review.';
  END IF;

  IF char_length(btrim(COALESCE(input_book_title, ''))) < 2 THEN
    RAISE EXCEPTION 'Add the book title before submitting your review.';
  END IF;

  IF char_length(btrim(COALESCE(input_author, ''))) < 2 THEN
    RAISE EXCEPTION 'Add the author before submitting your review.';
  END IF;

  IF char_length(btrim(COALESCE(input_genre, ''))) < 2 THEN
    RAISE EXCEPTION 'Add the genre before submitting your review.';
  END IF;

  IF char_length(btrim(input_book_title)) > 180
    OR char_length(btrim(input_author)) > 160
    OR char_length(btrim(input_genre)) > 100 THEN
    RAISE EXCEPTION 'The book details are too long.';
  END IF;

  IF input_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Choose a star rating between 1 and 5.';
  END IF;

  IF char_length(btrim(COALESCE(input_body, ''))) < 20 THEN
    RAISE EXCEPTION 'Share at least a few sentences in your review.';
  END IF;

  IF char_length(input_body) > 8000 THEN
    RAISE EXCEPTION 'The review is too long.';
  END IF;

  SELECT b.id, b.title
  INTO selected_book_id, selected_book_title
  FROM public.books b
  WHERE lower(btrim(b.title)) = lower(btrim(input_book_title))
  ORDER BY b.created_at
  LIMIT 1;

  IF selected_book_id IS NULL THEN
    INSERT INTO public.books (title, author, categories, metadata)
    VALUES (
      btrim(input_book_title),
      btrim(input_author),
      jsonb_build_array(btrim(input_genre)),
      jsonb_build_object('source', 'member_review')
    )
    RETURNING id, title INTO selected_book_id, selected_book_title;
  END IF;

  INSERT INTO public.ratings (book_id, user_id, rating)
  VALUES (selected_book_id, member_id, input_rating)
  ON CONFLICT (book_id, user_id)
  DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();

  INSERT INTO public.reviews (
    book_id,
    user_id,
    title,
    body,
    contains_spoilers,
    status
  )
  VALUES (
    selected_book_id,
    member_id,
    'Review of ' || selected_book_title,
    btrim(input_body),
    COALESCE(input_contains_spoilers, FALSE),
    'PENDING'
  )
  RETURNING id INTO created_review_id;

  RETURN created_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_book_review(TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_book_review(TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN)
  TO authenticated;
