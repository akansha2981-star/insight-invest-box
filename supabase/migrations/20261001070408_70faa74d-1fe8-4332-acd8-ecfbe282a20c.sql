CREATE TABLE public.swing_market_snapshot (
  exchange text NOT NULL,
  symbol text NOT NULL,
  token text,
  name text,
  yahoo text NOT NULL,
  is_index boolean NOT NULL DEFAULT false,
  price numeric, prev_close numeric, open numeric, high numeric, low numeric, change_pct numeric,
  volume bigint, avg_vol_10d bigint, avg_vol_3m bigint,
  dma50 numeric, dma200 numeric, hi52 numeric, lo52 numeric,
  market_cap numeric, pe numeric, forward_pe numeric, pb numeric, eps numeric, book_value numeric, roe numeric, div_yield numeric,
  quote_time timestamptz, quoted_at timestamptz,
  PRIMARY KEY (exchange, symbol)
);
CREATE INDEX swing_snap_quoted ON public.swing_market_snapshot (quoted_at NULLS FIRST);
CREATE INDEX swing_snap_name ON public.swing_market_snapshot (name);
GRANT SELECT ON public.swing_market_snapshot TO authenticated;
GRANT ALL ON public.swing_market_snapshot TO service_role;
ALTER TABLE public.swing_market_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read snapshot" ON public.swing_market_snapshot FOR SELECT TO authenticated USING (true);

CREATE TABLE public.swing_index_prices (
  symbol text NOT NULL, trade_date date NOT NULL,
  open numeric, high numeric, low numeric, close numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, trade_date)
);
GRANT SELECT ON public.swing_index_prices TO authenticated;
GRANT ALL ON public.swing_index_prices TO service_role;
ALTER TABLE public.swing_index_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read index prices" ON public.swing_index_prices FOR SELECT TO authenticated USING (true);