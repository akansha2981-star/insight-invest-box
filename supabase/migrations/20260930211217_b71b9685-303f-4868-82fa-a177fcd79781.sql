INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'work.bschoolbuzz.in@gmail.com' ON CONFLICT DO NOTHING;
ALTER TABLE public.swing_custom_strategies ADD COLUMN IF NOT EXISTS ai_note text;
ALTER TABLE public.swing_ai_proposals ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS approved_by uuid;