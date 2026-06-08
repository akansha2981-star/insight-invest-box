
-- news_runs
CREATE TABLE public.news_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid,
  trigger_type text NOT NULL DEFAULT 'manual',
  requested_count int NOT NULL DEFAULT 10,
  discovered int NOT NULL DEFAULT 0,
  generated int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_runs TO authenticated;
GRANT ALL ON public.news_runs TO service_role;
ALTER TABLE public.news_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage news runs" ON public.news_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- news_drafts
CREATE TABLE public.news_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.news_runs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  topic text NOT NULL,
  source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'Markets',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  trending boolean NOT NULL DEFAULT false,
  headline text NOT NULL,
  slug text NOT NULL,
  summary text,
  content text,
  read_time_min int NOT NULL DEFAULT 4,
  meta_title text,
  meta_description text,
  meta_keywords text[] NOT NULL DEFAULT '{}'::text[],
  featured_image_prompt text,
  featured_image_url text,
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_jsonld jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_score int NOT NULL DEFAULT 0,
  internal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_at timestamptz,
  blog_post_id uuid
);
CREATE INDEX news_drafts_status_idx ON public.news_drafts(status);
CREATE INDEX news_drafts_run_idx ON public.news_drafts(run_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_drafts TO authenticated;
GRANT ALL ON public.news_drafts TO service_role;
ALTER TABLE public.news_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage news drafts" ON public.news_drafts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_news_drafts_updated_at
  BEFORE UPDATE ON public.news_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
