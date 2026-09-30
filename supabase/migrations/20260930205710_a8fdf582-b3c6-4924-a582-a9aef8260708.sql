CREATE TABLE public.swing_ai_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  parent_key text,
  definition jsonb NOT NULL,
  fault text,
  change_summary text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.swing_ai_strategies TO authenticated;
GRANT ALL ON public.swing_ai_strategies TO service_role;
ALTER TABLE public.swing_ai_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read AI strategies" ON public.swing_ai_strategies FOR SELECT TO authenticated USING (true);

CREATE TABLE public.swing_ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL,
  trigger_type text NOT NULL DEFAULT 'cron',
  status text NOT NULL DEFAULT 'running',
  summary text,
  diagnosis jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposals_count integer NOT NULL DEFAULT 0,
  adopted_count integer NOT NULL DEFAULT 0,
  error text,
  lease_until timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.swing_ai_runs TO authenticated;
GRANT ALL ON public.swing_ai_runs TO service_role;
ALTER TABLE public.swing_ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read AI runs" ON public.swing_ai_runs FOR SELECT TO authenticated USING (true);

CREATE TABLE public.swing_ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.swing_ai_runs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  parent_key text,
  name text NOT NULL,
  fault text,
  change_summary text,
  definition jsonb,
  train jsonb,
  test jsonb,
  parent_test jsonb,
  adopted boolean NOT NULL DEFAULT false,
  reason text,
  ai_strategy_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.swing_ai_proposals TO authenticated;
GRANT ALL ON public.swing_ai_proposals TO service_role;
ALTER TABLE public.swing_ai_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read AI proposals" ON public.swing_ai_proposals FOR SELECT TO authenticated USING (true);

CREATE TABLE public.swing_leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snap_date date NOT NULL,
  strategy_key text NOT NULL,
  name text NOT NULL,
  source text NOT NULL,
  rank integer NOT NULL,
  score numeric NOT NULL,
  metrics jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snap_date, strategy_key)
);
GRANT SELECT ON public.swing_leaderboard_snapshots TO authenticated;
GRANT ALL ON public.swing_leaderboard_snapshots TO service_role;
ALTER TABLE public.swing_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read leaderboard" ON public.swing_leaderboard_snapshots FOR SELECT TO authenticated USING (true);

INSERT INTO public.swing_settings (key, value) VALUES ('ai_coach', '{"enabled": true}'::jsonb) ON CONFLICT (key) DO NOTHING;