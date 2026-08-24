CREATE TABLE IF NOT EXISTS public.contribution_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount BETWEEN 2000 AND 10000000),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  provider_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS contribution_orders_email_idx
  ON public.contribution_orders (lower(email), created_at DESC);

ALTER TABLE public.contribution_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY contribution_orders_own_read
ON public.contribution_orders FOR SELECT TO authenticated
USING (user_id = public.app_user_id() OR public.current_user_is_admin());
