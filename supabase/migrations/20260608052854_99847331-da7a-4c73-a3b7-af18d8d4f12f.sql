
-- 1) optimizer_runs
CREATE TABLE public.optimizer_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid,
  trigger_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  pages_scanned int NOT NULL DEFAULT 0,
  proposals_created int NOT NULL DEFAULT 0,
  seo_findings int NOT NULL DEFAULT 0,
  keywords_found int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.optimizer_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.optimizer_runs TO authenticated;
ALTER TABLE public.optimizer_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage optimizer runs" ON public.optimizer_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_optimizer_runs_updated BEFORE UPDATE ON public.optimizer_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) optimizer_proposals
CREATE TABLE public.optimizer_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.optimizer_runs(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id text,
  target_url text,
  target_label text,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  category text NOT NULL DEFAULT 'content_refresh',
  priority text NOT NULL DEFAULT 'medium',
  confidence numeric NOT NULL DEFAULT 0.7,
  reason text,
  keywords text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.optimizer_proposals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.optimizer_proposals TO authenticated;
ALTER TABLE public.optimizer_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage optimizer proposals" ON public.optimizer_proposals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_optimizer_proposals_status ON public.optimizer_proposals(status);
CREATE INDEX idx_optimizer_proposals_category ON public.optimizer_proposals(category);
CREATE INDEX idx_optimizer_proposals_run ON public.optimizer_proposals(run_id);
CREATE TRIGGER trg_optimizer_proposals_updated BEFORE UPDATE ON public.optimizer_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) seo_audit_findings
CREATE TABLE public.seo_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.optimizer_runs(id) ON DELETE SET NULL,
  check_key text NOT NULL,
  check_label text NOT NULL,
  page_url text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'pass',
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seo_audit_findings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_audit_findings TO authenticated;
ALTER TABLE public.seo_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo findings" ON public.seo_audit_findings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_seo_findings_run ON public.seo_audit_findings(run_id);
CREATE INDEX idx_seo_findings_status ON public.seo_audit_findings(status);

-- 4) trending_keywords
CREATE TABLE public.trending_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.optimizer_runs(id) ON DELETE SET NULL,
  keyword text NOT NULL,
  volume_score int NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'ai-gemini',
  mapped_target_type text,
  mapped_target_id text,
  mapped_reason text,
  discovered_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.trending_keywords TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trending_keywords TO authenticated;
ALTER TABLE public.trending_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage trending keywords" ON public.trending_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_trending_keywords_run ON public.trending_keywords(run_id);

-- Daily cron 02:00 IST = 20:30 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'content-optimizer-daily',
  '30 20 * * *',
  $$
  SELECT net.http_post(
    url:='https://euxpopovbfjkzhxiclrl.supabase.co/functions/v1/content-optimizer',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHBvcG92YmZqa3poeGljbHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTYzNzgsImV4cCI6MjA4Njk3MjM3OH0.DnXqXR4fsxW2XOGcsPvlVOWABrTaLVlzVhdfagtux6Y"}'::jsonb,
    body:='{"action":"scan","trigger":"cron"}'::jsonb
  );
  $$
);
