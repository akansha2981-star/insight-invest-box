
CREATE TABLE public.forex_rates (
  code text PRIMARY KEY,
  name text,
  rate_usd numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'frankfurter'
);
GRANT SELECT ON public.forex_rates TO anon, authenticated;
GRANT ALL ON public.forex_rates TO service_role;
ALTER TABLE public.forex_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read forex rates" ON public.forex_rates FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.forex_history (
  id bigserial PRIMARY KEY,
  date date NOT NULL,
  code text NOT NULL,
  rate_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, code)
);
CREATE INDEX forex_history_code_date_idx ON public.forex_history (code, date DESC);
GRANT SELECT ON public.forex_history TO anon, authenticated;
GRANT ALL ON public.forex_history TO service_role;
ALTER TABLE public.forex_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read forex history" ON public.forex_history FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.forex_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  source text,
  trigger_type text NOT NULL DEFAULT 'manual',
  rates_updated int NOT NULL DEFAULT 0,
  history_rows int NOT NULL DEFAULT 0,
  error text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forex_logs TO authenticated;
GRANT ALL ON public.forex_logs TO service_role;
ALTER TABLE public.forex_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage forex logs" ON public.forex_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
