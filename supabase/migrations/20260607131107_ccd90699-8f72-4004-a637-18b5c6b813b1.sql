
UPDATE public.sitemap_meta SET base_url = 'https://investingiq.in' WHERE id = 1;
ALTER TABLE public.sitemap_meta ALTER COLUMN base_url SET DEFAULT 'https://investingiq.in';
