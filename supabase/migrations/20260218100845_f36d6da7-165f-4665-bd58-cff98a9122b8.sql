
-- Create stock_reviews table
CREATE TABLE public.stock_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'General',
  exchange TEXT NOT NULL DEFAULT 'NSE',
  current_price NUMERIC(12,2),
  target_price NUMERIC(12,2),
  rating TEXT DEFAULT 'HOLD', -- BUY, SELL, HOLD, STRONG BUY, STRONG SELL
  analyst_name TEXT,
  summary TEXT,
  investment_thesis TEXT,
  risks TEXT,
  financials JSONB DEFAULT '{}'::jsonb,
  key_metrics JSONB DEFAULT '{}'::jsonb,
  price_history JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],
  cover_image_url TEXT,
  status TEXT DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_reviews ENABLE ROW LEVEL SECURITY;

-- Admins can manage all reviews
CREATE POLICY "Admins can manage stock reviews"
ON public.stock_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Anyone can view published reviews
CREATE POLICY "Anyone can view published stock reviews"
ON public.stock_reviews
FOR SELECT
USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

-- Trigger to update updated_at
CREATE TRIGGER update_stock_reviews_updated_at
BEFORE UPDATE ON public.stock_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
