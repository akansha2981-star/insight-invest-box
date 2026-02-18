-- Create page_sections table for admin-managed content blocks on each section page
CREATE TABLE public.page_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key text NOT NULL, -- e.g. 'markets', 'stocks', 'economy', etc.
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  section_type text NOT NULL DEFAULT 'text', -- 'text', 'banner', 'alert'
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible sections
CREATE POLICY "Anyone can read visible page sections"
ON public.page_sections FOR SELECT
USING (is_visible = true);

-- Only admins/editors can manage sections
CREATE POLICY "Admins can manage page sections"
ON public.page_sections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_page_sections_updated_at
BEFORE UPDATE ON public.page_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some default content for each page
INSERT INTO public.page_sections (page_key, title, content, section_type, sort_order) VALUES
('markets', 'Market Overview', 'Welcome to the Markets section. Track live BSE/NSE indices, F&O data, commodity prices and global market movements in real-time.', 'banner', 0),
('stocks', 'Stock Market', 'Explore top gainers, losers, 52-week highs & lows, and screen stocks by sector, market cap, and fundamentals.', 'banner', 0),
('economy', 'Indian Economy', 'Stay updated with the latest macroeconomic data, RBI policy updates, GDP figures, inflation numbers, and fiscal policy news.', 'banner', 0),
('mf', 'Mutual Funds & ETFs', 'Discover top-performing mutual funds and ETFs. Compare NAVs, returns, and make informed investment decisions.', 'banner', 0),
('crypto', 'Cryptocurrency', 'Track live cryptocurrency prices, market cap rankings, and the latest news from the global crypto market.', 'banner', 0),
('portfolio', 'My Portfolio', 'Monitor your investments, track performance, analyse asset allocation, and stay on top of your financial goals.', 'banner', 0);
