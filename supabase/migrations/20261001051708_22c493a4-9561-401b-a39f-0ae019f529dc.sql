CREATE TABLE public.swing_signal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_key text NOT NULL,
  strategy_name text NOT NULL,
  symbol text NOT NULL,
  signal_date date NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  closed_seen_at timestamptz,
  UNIQUE (strategy_key, symbol, signal_date)
);
GRANT SELECT, INSERT, UPDATE ON public.swing_signal_log TO authenticated;
GRANT ALL ON public.swing_signal_log TO service_role;
ALTER TABLE public.swing_signal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in read signal log" ON public.swing_signal_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "signed-in add signal log" ON public.swing_signal_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "signed-in close signal log" ON public.swing_signal_log FOR UPDATE TO authenticated USING (closed_seen_at IS NULL) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.swing_signal_log_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.first_seen_at := now(); NEW.closed_seen_at := NULL; RETURN NEW; END IF;
  NEW.strategy_key := OLD.strategy_key; NEW.strategy_name := OLD.strategy_name; NEW.symbol := OLD.symbol;
  NEW.signal_date := OLD.signal_date; NEW.first_seen_at := OLD.first_seen_at; NEW.closed_seen_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER swing_signal_log_guard BEFORE INSERT OR UPDATE ON public.swing_signal_log FOR EACH ROW EXECUTE FUNCTION public.swing_signal_log_guard();

INSERT INTO public.swing_settings (key, value) VALUES ('live_signals', '{"start":"2026-10-01","capitalPerTrade":10000}'::jsonb) ON CONFLICT (key) DO NOTHING;