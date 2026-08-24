-- A single, public-safe payment method configuration. The manual message may
-- contain banking instructions, but never provider credentials or API keys.
CREATE TABLE public.payment_method_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  online_payments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  manual_payment_message TEXT NOT NULL DEFAULT
    'Online payments are currently unavailable. Please contact Wine & Chapters for banking details and payment instructions.'
    CHECK (char_length(btrim(manual_payment_message)) BETWEEN 1 AND 5000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.payment_method_settings (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_payment_method_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_payment_method_settings_before_update
BEFORE UPDATE ON public.payment_method_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_payment_method_settings();

ALTER TABLE public.payment_method_settings ENABLE ROW LEVEL SECURITY;

-- The setting and administrator-authored instructions are intentionally
-- readable by visitors so the public checkout can safely choose its state.
CREATE POLICY payment_method_settings_public_read
ON public.payment_method_settings FOR SELECT TO anon, authenticated
USING (TRUE);

CREATE POLICY payment_method_settings_admin_insert
ON public.payment_method_settings FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_admin());

CREATE POLICY payment_method_settings_admin_update
ON public.payment_method_settings FOR UPDATE TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

REVOKE ALL ON TABLE public.payment_method_settings FROM anon, authenticated;
GRANT SELECT ON TABLE public.payment_method_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.payment_method_settings TO authenticated;
