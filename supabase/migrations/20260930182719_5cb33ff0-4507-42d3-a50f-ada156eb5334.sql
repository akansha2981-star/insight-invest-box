CREATE TABLE public.swing_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swing_strategies TO authenticated;
GRANT ALL ON public.swing_strategies TO service_role;
ALTER TABLE public.swing_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read strategies" ON public.swing_strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage strategies" ON public.swing_strategies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.swing_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  trade_date date NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symbol, trade_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swing_prices TO authenticated;
GRANT ALL ON public.swing_prices TO service_role;
ALTER TABLE public.swing_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read prices" ON public.swing_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage prices" ON public.swing_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX swing_prices_symbol_date ON public.swing_prices(symbol, trade_date);

CREATE TABLE public.swing_portfolios (
  user_id uuid PRIMARY KEY,
  capital numeric NOT NULL DEFAULT 50000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swing_portfolios TO authenticated;
GRANT ALL ON public.swing_portfolios TO service_role;
ALTER TABLE public.swing_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own portfolio" ON public.swing_portfolios FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.swing_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.swing_strategies(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  entry_price numeric NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  exit_price numeric,
  exit_date date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swing_trades TO authenticated;
GRANT ALL ON public.swing_trades TO service_role;
ALTER TABLE public.swing_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own trades" ON public.swing_trades FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.swing_touch_updated() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER t1 BEFORE UPDATE ON public.swing_strategies FOR EACH ROW EXECUTE FUNCTION public.swing_touch_updated();
CREATE TRIGGER t2 BEFORE UPDATE ON public.swing_portfolios FOR EACH ROW EXECUTE FUNCTION public.swing_touch_updated();
CREATE TRIGGER t3 BEFORE UPDATE ON public.swing_trades FOR EACH ROW EXECUTE FUNCTION public.swing_touch_updated();

INSERT INTO public.swing_strategies (name, description, rule_type, params) VALUES
('Moving Average Crossover','Buy when the fast average crosses above the slow average; sell on the reverse cross.','ma_cross','{"fast":20,"slow":50}'),
('RSI Reversal','Buy when RSI rises back above the oversold level; sell when it falls below overbought.','rsi','{"period":14,"oversold":30,"overbought":70}'),
('Breakout','Buy on a close above the highest high of the lookback; sell on a close below the lowest low.','breakout','{"lookback":20}'),
('MACD','Buy when MACD crosses above its signal line; sell on the cross below.','macd','{"fast":12,"slow":26,"signal":9}'),
('Volume Breakout','Buy when price breaks the lookback high on volume above average times multiplier.','volume_breakout','{"lookback":20,"multiplier":1.5}');