
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS insights jsonb,
  ADD COLUMN IF NOT EXISTS seo_keywords jsonb,
  ADD COLUMN IF NOT EXISTS related_searches text[],
  ADD COLUMN IF NOT EXISTS trending_questions text[],
  ADD COLUMN IF NOT EXISTS internal_links jsonb,
  ADD COLUMN IF NOT EXISTS schema_jsonld jsonb;

ALTER TABLE public.news_drafts
  ADD COLUMN IF NOT EXISTS related_searches text[],
  ADD COLUMN IF NOT EXISTS trending_questions text[];
