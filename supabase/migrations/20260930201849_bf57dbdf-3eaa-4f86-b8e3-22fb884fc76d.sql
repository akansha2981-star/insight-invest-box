CREATE TABLE public.swing_watchlists (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60), symbols text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swing_watchlists TO authenticated;
GRANT ALL ON public.swing_watchlists TO service_role;
ALTER TABLE public.swing_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own watchlists" ON public.swing_watchlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.swing_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid);
GRANT SELECT, INSERT, UPDATE ON public.swing_settings TO authenticated;
GRANT ALL ON public.swing_settings TO service_role;
ALTER TABLE public.swing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read settings" ON public.swing_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert settings" ON public.swing_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings" ON public.swing_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.swing_settings (key, value) VALUES ('controls', '{"disabled":[],"defaultRisk":1,"maxRisk":5,"maxPositions":20}');

CREATE POLICY "Admins read all custom strategies" ON public.swing_custom_strategies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));