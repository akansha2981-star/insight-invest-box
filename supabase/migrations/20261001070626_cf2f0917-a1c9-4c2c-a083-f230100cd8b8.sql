CREATE VIEW public.swing_market_screen WITH (security_invoker = true) AS
SELECT s.*,
  CASE WHEN dma50 > 0 THEN (price / dma50 - 1) * 100 END AS vs_dma50,
  CASE WHEN dma200 > 0 THEN (price / dma200 - 1) * 100 END AS vs_dma200,
  CASE WHEN prev_close > 0 AND open > 0 THEN (open / prev_close - 1) * 100 END AS gap_pct,
  CASE WHEN avg_vol_3m > 0 THEN volume::numeric / avg_vol_3m END AS vol_ratio,
  CASE WHEN hi52 > 0 THEN (price / hi52 - 1) * 100 END AS from_hi52,
  CASE WHEN lo52 > 0 THEN (price / lo52 - 1) * 100 END AS from_lo52,
  price * volume AS value_traded
FROM public.swing_market_snapshot s;
GRANT SELECT ON public.swing_market_screen TO authenticated;