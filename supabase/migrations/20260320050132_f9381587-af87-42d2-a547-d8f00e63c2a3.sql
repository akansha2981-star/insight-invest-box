
-- Add image_url column to home_banners
ALTER TABLE public.home_banners ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read banner images
CREATE POLICY "Public read access on banners" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'banners');

-- Allow authenticated users to upload banner images
CREATE POLICY "Authenticated upload on banners" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');

-- Allow authenticated users to update banner images
CREATE POLICY "Authenticated update on banners" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'banners');

-- Allow authenticated users to delete banner images
CREATE POLICY "Authenticated delete on banners" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'banners');
