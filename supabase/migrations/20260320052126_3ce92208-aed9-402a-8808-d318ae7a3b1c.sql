
-- Properties table for buy/rent listings
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  property_type text NOT NULL DEFAULT 'apartment',
  listing_type text NOT NULL DEFAULT 'buy',
  city text NOT NULL,
  locality text,
  price numeric NOT NULL DEFAULT 0,
  price_display text,
  bhk text,
  area_sqft numeric,
  amenities text[] DEFAULT '{}',
  description text,
  developer_name text,
  cover_image_url text,
  images text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  is_price_drop boolean DEFAULT false,
  original_price numeric,
  status text DEFAULT 'active',
  rating numeric DEFAULT 0,
  reviews_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active properties" ON public.properties
  FOR SELECT TO public USING (status = 'active');

CREATE POLICY "Admins can manage properties" ON public.properties
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
  );

-- Real estate services table
CREATE TABLE public.re_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon_name text DEFAULT 'Home',
  cover_image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.re_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services" ON public.re_services
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage services" ON public.re_services
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
  );

-- Price trends table (AI-generated)
CREATE TABLE public.re_price_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  locality text,
  avg_price_sqft numeric,
  change_pct numeric DEFAULT 0,
  trend_data jsonb DEFAULT '[]',
  period text DEFAULT 'monthly',
  ai_insights text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.re_price_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view price trends" ON public.re_price_trends
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage price trends" ON public.re_price_trends
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
  );

-- Interior design showcases
CREATE TABLE public.re_interior_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  before_image_url text,
  after_image_url text,
  cover_image_url text,
  category text DEFAULT 'Living Room',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.re_interior_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active designs" ON public.re_interior_designs
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage designs" ON public.re_interior_designs
  FOR ALL TO authenticated USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor')
  );

-- Storage bucket for real estate images
INSERT INTO storage.buckets (id, name, public)
VALUES ('real-estate', 'real-estate', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read on real-estate" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'real-estate');

CREATE POLICY "Auth upload on real-estate" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'real-estate');

CREATE POLICY "Auth update on real-estate" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'real-estate');

CREATE POLICY "Auth delete on real-estate" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'real-estate');
