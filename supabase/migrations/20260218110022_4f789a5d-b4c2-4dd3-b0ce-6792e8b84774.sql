
-- Create home_banners table for backend-editable homepage banners and announcements
CREATE TABLE public.home_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  cta_label text,
  cta_url text,
  bg_color text NOT NULL DEFAULT 'blue',
  banner_type text NOT NULL DEFAULT 'hero',  -- 'hero' | 'announcement'
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners"
ON public.home_banners FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage banners"
ON public.home_banners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER update_home_banners_updated_at
BEFORE UPDATE ON public.home_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
