
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS developer_website text,
  ADD COLUMN IF NOT EXISTS source_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS bhk_configurations jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text;
