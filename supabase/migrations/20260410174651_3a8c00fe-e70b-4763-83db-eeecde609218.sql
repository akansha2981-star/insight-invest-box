
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS nearest_hospital text,
  ADD COLUMN IF NOT EXISTS nearest_school text,
  ADD COLUMN IF NOT EXISTS nearest_mall text,
  ADD COLUMN IF NOT EXISTS rera_status text DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS price_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_max numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bhk_min text,
  ADD COLUMN IF NOT EXISTS bhk_max text,
  ADD COLUMN IF NOT EXISTS area_min numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_max numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_history_detail jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_towers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_images text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}'::text[];
