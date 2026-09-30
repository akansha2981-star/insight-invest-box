CREATE TABLE public.swing_live_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, symbol text NOT NULL, exchange text NOT NULL DEFAULT 'NSE', side text NOT NULL CHECK (side IN ('BUY','SELL')), quantity integer NOT NULL CHECK (quantity > 0), price numeric NOT NULL, order_value numeric NOT NULL, status text NOT NULL, broker_order_id text, message text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.swing_live_orders TO authenticated;
GRANT ALL ON public.swing_live_orders TO service_role;
ALTER TABLE public.swing_live_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read live orders" ON public.swing_live_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.swing_settings (key, value) VALUES ('live_orders', '{"enabled":false,"maxOrderValue":10000,"dailyLimit":25000}') ON CONFLICT (key) DO NOTHING;