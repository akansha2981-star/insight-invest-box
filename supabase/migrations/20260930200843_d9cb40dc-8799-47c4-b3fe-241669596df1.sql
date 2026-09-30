CREATE TABLE public.swing_custom_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  family_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  version integer NOT NULL DEFAULT 1,
  definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, version)
);
GRANT SELECT, INSERT, DELETE ON public.swing_custom_strategies TO authenticated;
GRANT ALL ON public.swing_custom_strategies TO service_role;
ALTER TABLE public.swing_custom_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own custom strategies" ON public.swing_custom_strategies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own custom strategies" ON public.swing_custom_strategies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own custom strategies" ON public.swing_custom_strategies FOR DELETE TO authenticated USING (auth.uid() = user_id);