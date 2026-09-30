CREATE TABLE public.swing_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_key text NOT NULL,
  capital numeric NOT NULL CHECK (capital >= 1000 AND capital <= 100000000),
  risk_pct numeric NOT NULL DEFAULT 1 CHECK (risk_pct > 0 AND risk_pct <= 5),
  start_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped')),
  stopped_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swing_deployments TO authenticated;
GRANT ALL ON public.swing_deployments TO service_role;
ALTER TABLE public.swing_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own deployments" ON public.swing_deployments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX swing_deployments_user_idx ON public.swing_deployments(user_id);
CREATE OR REPLACE FUNCTION public.swing_touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER swing_deployments_touch BEFORE UPDATE ON public.swing_deployments FOR EACH ROW EXECUTE FUNCTION public.swing_touch_updated_at();