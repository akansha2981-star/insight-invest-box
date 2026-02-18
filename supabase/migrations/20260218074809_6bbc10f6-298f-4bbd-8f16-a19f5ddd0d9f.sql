
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'Markets',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TIMESTAMPTZ,
  author_name TEXT DEFAULT 'Editorial Team',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin users table (role-based)
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Featured stocks / banners config
CREATE TABLE public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Blog posts: everyone can read published posts
CREATE POLICY "Anyone can view published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

-- Blog posts: only admins/editors can manage
CREATE POLICY "Admins can manage all posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- User roles: only admins can manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Site config: public read, admin write
CREATE POLICY "Anyone can read site config"
  ON public.site_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site config"
  ON public.site_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some sample blog posts
INSERT INTO public.blog_posts (title, slug, content, excerpt, tags, category, status, published_at, author_name) VALUES
('Sensex Surges 800 Points: IT Stocks Lead Rally Amid Global Optimism', 'sensex-surges-800-points-it-stocks', 'The BSE Sensex surged over 800 points on Tuesday, driven by strong buying in IT and banking stocks as global markets rallied on positive economic data from the United States. Infosys, TCS, and Wipro were among the top gainers, rising between 2-3%. The broader market also participated in the rally with the Nifty Midcap index up 1.5%. Analysts attribute the surge to easing inflation concerns and strong Q3 earnings expectations. Foreign institutional investors (FIIs) turned net buyers after several sessions of selling, purchasing equities worth ₹2,345 crore. The rupee also strengthened against the dollar, trading at 83.12 per USD. Market breadth was positive with 2,100 stocks advancing against 800 declining on BSE. Going forward, experts expect the market to remain in a consolidation phase with a positive bias ahead of the Union Budget.', 'BSE Sensex surged 800 points led by IT and banking stocks amid global optimism. FIIs turned net buyers purchasing ₹2,345 crore worth of equities.', ARRAY['Sensex', 'IT Stocks', 'Market Rally', 'FII'], 'Markets', 'published', now() - interval '2 hours', 'Rajesh Kumar'),
('RBI Holds Repo Rate at 6.5%: What It Means for Your EMIs', 'rbi-holds-repo-rate-6-5-percent', 'The Reserve Bank of India (RBI) Monetary Policy Committee (MPC) voted unanimously to keep the repo rate unchanged at 6.5% for the sixth consecutive time. Governor Shaktikanta Das emphasized the need to maintain the current stance to ensure inflation returns durably to the 4% target. The decision was widely expected by markets. Home loan borrowers will continue to pay the same EMIs for now, though analysts expect a rate cut in the second half of the fiscal year. The central bank revised its GDP growth forecast upward to 7.2% for FY25, citing robust domestic consumption and government capital expenditure. The RBI also highlighted risks from global geopolitical tensions and volatile crude oil prices. Banks are expected to maintain their current lending rates, providing stability to the credit market.', 'RBI keeps repo rate steady at 6.5% for the sixth consecutive time. Home loan EMIs remain unchanged; rate cut expected in H2 FY25.', ARRAY['RBI', 'Repo Rate', 'EMI', 'Monetary Policy'], 'Economy', 'published', now() - interval '5 hours', 'Priya Sharma'),
('Top 5 Stocks to Watch This Week: Analysts Pick Their Favorites', 'top-5-stocks-to-watch-this-week', 'As markets gear up for a crucial week with important economic data releases and quarterly results, analysts have identified five stocks that could see significant movement. 1. Reliance Industries: The conglomerate is set to announce its Q3 results. Analysts expect strong performance from the Jio and retail segments. Target price: ₹2,850. 2. HDFC Bank: After recent consolidation, the stock looks attractive at current levels. Strong loan growth and NIM expansion expected. Target: ₹1,720. 3. Infosys: Q3 results expected to show revenue guidance upgrade. The stock offers good risk-reward at current valuations. Target: ₹1,850. 4. Maruti Suzuki: Volume data shows strong momentum. Rural demand recovery and new model launches to drive growth. Target: ₹12,500. 5. Sun Pharma: US business showing recovery with new product approvals expected. Specialty segment growing at 20%+ YoY. Target: ₹1,400. Investors should conduct their own due diligence before making investment decisions.', 'Analysts pick their top 5 stock picks for the week including Reliance, HDFC Bank, Infosys, Maruti, and Sun Pharma with target prices.', ARRAY['Stocks', 'Investment', 'Analysis', 'HDFC Bank', 'Infosys'], 'Stocks', 'published', now() - interval '1 day', 'Amit Patel'),
('Gold Hits All-Time High: Should You Invest Now?', 'gold-hits-all-time-high-should-you-invest', 'Gold prices have reached a record high, crossing ₹72,000 per 10 grams on the Multi Commodity Exchange (MCX). International prices also hit an all-time high of $2,350 per troy ounce. The rally is being driven by expectations of US Fed rate cuts, geopolitical uncertainty, and strong central bank buying. Financial planners suggest maintaining 10-15% allocation to gold in a diversified portfolio. Sovereign Gold Bonds (SGBs) and Gold ETFs are preferred instruments for retail investors over physical gold. The upcoming Union Budget may also contain provisions that could impact gold import duty. Experts are divided on whether this is the right time to increase gold exposure, with some advising caution given the sharp run-up.', 'Gold crosses ₹72,000 per 10 grams on MCX amid Fed rate cut hopes and geopolitical tensions. Experts advise 10-15% portfolio allocation.', ARRAY['Gold', 'Commodities', 'Investment', 'MCX'], 'Commodities', 'published', now() - interval '2 days', 'Sneha Reddy'),
('Budget 2025: Key Expectations for the Stock Market', 'budget-2025-key-expectations-stock-market', 'With the Union Budget just weeks away, the financial markets are buzzing with expectations and wishlist items. Market participants are hoping for continued capital expenditure push, potential tax relief for the middle class, and measures to boost consumption. The government is expected to maintain fiscal discipline with a deficit target of 5.1% of GDP. Infrastructure and defense sectors are expected to benefit from increased allocations. The removal of Long-Term Capital Gains (LTCG) tax on equities is an unlikely but hopeful expectation. Healthcare and education allocations are also expected to see a boost. Corporate tax rates are likely to remain unchanged, maintaining competitiveness with global peers. The market will closely watch the fine print for any changes to securities transaction tax (STT).', 'Union Budget 2025 expectations: CapEx push, tax relief, fiscal discipline at 5.1% GDP deficit. Infrastructure, defense, healthcare sectors in focus.', ARRAY['Budget 2025', 'Policy', 'Tax', 'Investment'], 'Economy', 'published', now() - interval '3 days', 'Vikram Singh');

-- Seed site config
INSERT INTO public.site_config (key, value) VALUES
('featured_indices', '["SENSEX", "NIFTY", "BANKNIFTY", "NIFTYIT"]'),
('marquee_message', '"Markets are open: Live prices updating every 30 seconds"'),
('homepage_banner', '{"title": "Market Outlook 2025", "subtitle": "Expert analysis and predictions", "cta": "Read More"}');
