ALTER TABLE public.swing_deployments ADD COLUMN IF NOT EXISTS market_filter boolean NOT NULL DEFAULT true;

CREATE TABLE public.swing_universe (
  symbol text PRIMARY KEY,
  exchange text NOT NULL DEFAULT 'NSE',
  token text NOT NULL,
  name text NOT NULL,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.swing_universe TO authenticated;
GRANT ALL ON public.swing_universe TO service_role;
ALTER TABLE public.swing_universe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read strategy universe" ON public.swing_universe FOR SELECT TO authenticated USING (true);