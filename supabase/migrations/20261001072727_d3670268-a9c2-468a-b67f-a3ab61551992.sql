ALTER TABLE public.swing_signal_log ADD COLUMN IF NOT EXISTS entry_price numeric, ADD COLUMN IF NOT EXISTS plan jsonb;

CREATE OR REPLACE FUNCTION public.swing_signal_log_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE ref numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.first_seen_at := now(); NEW.closed_seen_at := NULL;
  ELSE
    NEW.strategy_key := OLD.strategy_key; NEW.strategy_name := OLD.strategy_name; NEW.symbol := OLD.symbol;
    NEW.signal_date := OLD.signal_date; NEW.first_seen_at := OLD.first_seen_at;
    NEW.closed_seen_at := CASE WHEN OLD.closed_seen_at IS NOT NULL THEN OLD.closed_seen_at WHEN NEW.closed_seen_at IS NOT NULL THEN now() ELSE NULL END;
    IF OLD.entry_price IS NOT NULL THEN NEW.entry_price := OLD.entry_price; NEW.plan := OLD.plan; END IF;
  END IF;
  -- The recorded buy price must be close to the latest stored price for that stock
  IF NEW.entry_price IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.entry_price IS NULL) THEN
    SELECT close INTO ref FROM public.swing_prices WHERE symbol = NEW.symbol ORDER BY trade_date DESC LIMIT 1;
    IF ref IS NULL OR NEW.entry_price <= 0 OR abs(NEW.entry_price - ref) / ref > 0.08 OR NEW.plan IS NULL THEN
      NEW.entry_price := NULL; NEW.plan := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $function$;