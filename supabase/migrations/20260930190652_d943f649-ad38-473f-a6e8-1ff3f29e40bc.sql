CREATE TABLE public.swing_instruments (
  exchange text NOT NULL,
  token text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exchange, token)
);
CREATE INDEX swing_instruments_name_idx ON public.swing_instruments (name);
GRANT SELECT ON public.swing_instruments TO authenticated;
GRANT ALL ON public.swing_instruments TO service_role;
ALTER TABLE public.swing_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read instruments" ON public.swing_instruments FOR SELECT TO authenticated USING (true);