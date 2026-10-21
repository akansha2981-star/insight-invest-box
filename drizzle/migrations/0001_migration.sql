CREATE TABLE public.news_activity_log (
  id bigserial PRIMARY KEY,
  job_id uuid,
  stage text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  message text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.news_activity_log (created_at DESC);
ALTER TABLE public.news_activity_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.news_activity_log TO authenticated;
GRANT ALL ON public.news_activity_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.news_activity_log_id_seq TO service_role;
CREATE POLICY "Admins read activity" ON public.news_activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.news_live_writing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'writing',
  partial_text text NOT NULL DEFAULT '',
  chars integer NOT NULL DEFAULT 0,
  draft_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, topic)
);
ALTER TABLE public.news_live_writing ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.news_live_writing TO authenticated;
GRANT ALL ON public.news_live_writing TO service_role;
CREATE POLICY "Admins read live writing" ON public.news_live_writing FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.sitemap_runs ADD COLUMN IF NOT EXISTS submissions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER PUBLICATION supabase_realtime ADD TABLE public.news_activity_log, public.news_live_writing, public.news_automation_jobs, public.news_drafts;