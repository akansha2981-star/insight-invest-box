
CREATE TABLE public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'login',
  provider text NOT NULL DEFAULT 'email',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all auth events"
ON public.auth_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert auth events"
ON public.auth_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);
CREATE INDEX idx_auth_events_provider ON public.auth_events(provider);
