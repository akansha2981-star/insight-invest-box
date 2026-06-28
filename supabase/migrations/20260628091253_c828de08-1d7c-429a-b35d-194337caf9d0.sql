
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT,
  action TEXT NOT NULL,
  category TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_activity_log_admin_id ON public.admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log(created_at DESC);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON public.admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert their own activity"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));
