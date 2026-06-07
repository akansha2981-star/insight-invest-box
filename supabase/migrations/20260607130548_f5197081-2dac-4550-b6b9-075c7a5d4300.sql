
CREATE TABLE public.sitemap_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  path text NOT NULL,
  source text NOT NULL DEFAULT 'static',
  lastmod timestamptz NOT NULL DEFAULT now(),
  changefreq text NOT NULL DEFAULT 'weekly',
  priority numeric NOT NULL DEFAULT 0.7,
  is_active boolean NOT NULL DEFAULT true,
  first_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sitemap_urls_active_idx ON public.sitemap_urls (is_active);
CREATE INDEX sitemap_urls_source_idx ON public.sitemap_urls (source);

GRANT SELECT ON public.sitemap_urls TO anon, authenticated;
GRANT ALL ON public.sitemap_urls TO service_role;
ALTER TABLE public.sitemap_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active sitemap urls"
ON public.sitemap_urls FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage sitemap urls"
ON public.sitemap_urls FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sitemap_urls_updated_at
BEFORE UPDATE ON public.sitemap_urls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.sitemap_meta (
  id int PRIMARY KEY DEFAULT 1,
  last_generated_at timestamptz,
  last_updated_at timestamptz,
  last_added_count int NOT NULL DEFAULT 0,
  total_urls int NOT NULL DEFAULT 0,
  base_url text NOT NULL DEFAULT 'https://www.investingiq.in',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sitemap_meta_singleton CHECK (id = 1)
);

INSERT INTO public.sitemap_meta (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.sitemap_meta TO anon, authenticated;
GRANT ALL ON public.sitemap_meta TO service_role;
ALTER TABLE public.sitemap_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read sitemap meta"
ON public.sitemap_meta FOR SELECT
USING (true);

CREATE POLICY "Admins can update sitemap meta"
ON public.sitemap_meta FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
