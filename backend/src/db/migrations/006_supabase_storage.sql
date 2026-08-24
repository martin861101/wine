-- Create the public Supabase Storage bucket when this migration runs against
-- a Supabase project. It is a no-op for ordinary PostgreSQL/local Docker.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'event-photos',
        'event-photos',
        true,
        8388608,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      )
      ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types
    $sql$;
  END IF;
END
$$;
