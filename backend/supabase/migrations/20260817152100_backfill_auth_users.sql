-- Link Auth accounts that existed before the application trigger was installed.
-- Existing application approval and role values are preserved. Newly discovered
-- accounts remain unapproved members until an administrator is explicitly chosen.

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
      email_verified, approved, role
    ) VALUES (
      NEW.id, NEW.id, lower(NEW.email), NULL,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'Member'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
      NULLIF(NEW.raw_user_meta_data->>'region', ''), NULLIF(NEW.raw_user_meta_data->>'instagram', ''),
      NEW.email_confirmed_at IS NOT NULL, FALSE, 'MEMBER'
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

UPDATE public.users AS application_user
SET
  auth_user_id = auth_user.id,
  email_verified = auth_user.email_confirmed_at IS NOT NULL,
  updated_at = now()
FROM auth.users AS auth_user
WHERE lower(application_user.email) = lower(auth_user.email);

INSERT INTO public.users (
  id, auth_user_id, email, password_hash, first_name, last_name, region, instagram,
  email_verified, approved, role
)
SELECT
  auth_user.id, auth_user.id, lower(auth_user.email), NULL,
  COALESCE(NULLIF(auth_user.raw_user_meta_data->>'first_name', ''), 'Member'),
  COALESCE(NULLIF(auth_user.raw_user_meta_data->>'last_name', ''), ''),
  NULLIF(auth_user.raw_user_meta_data->>'region', ''),
  NULLIF(auth_user.raw_user_meta_data->>'instagram', ''),
  auth_user.email_confirmed_at IS NOT NULL, FALSE, 'MEMBER'
FROM auth.users AS auth_user
WHERE NOT EXISTS (
  SELECT 1 FROM public.users AS application_user
  WHERE application_user.auth_user_id = auth_user.id
     OR lower(application_user.email) = lower(auth_user.email)
);

INSERT INTO public.profiles(user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;
