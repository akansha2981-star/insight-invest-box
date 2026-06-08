
CREATE TABLE public.refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid REFERENCES auth.users(id),
  trigger_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  pages_refreshed int NOT NULL DEFAULT 0,
  items_updated int NOT NULL DEFAULT 0,
  items_archived int NOT NULL DEFAULT 0,
  items_created int NOT NULL DEFAULT 0,
  rolled_back_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refresh_logs TO authenticated;
GRANT ALL ON public.refresh_logs TO service_role;
ALTER TABLE public.refresh_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage refresh logs" ON public.refresh_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
