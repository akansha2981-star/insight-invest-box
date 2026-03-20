
-- Add new detailed fields to properties table
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS roi_projection text,
  ADD COLUMN IF NOT EXISTS investment_plan text,
  ADD COLUMN IF NOT EXISTS green_area_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS density text,
  ADD COLUMN IF NOT EXISTS total_floors integer,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS overview text,
  ADD COLUMN IF NOT EXISTS possession_status text DEFAULT 'under_construction',
  ADD COLUMN IF NOT EXISTS rera_id text,
  ADD COLUMN IF NOT EXISTS floor_plans text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}';
