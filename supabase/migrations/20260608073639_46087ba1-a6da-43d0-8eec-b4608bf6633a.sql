
CREATE TABLE public.mf_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code text UNIQUE,
  scheme_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  fund_house text NOT NULL,
  fund_house_slug text,
  category text NOT NULL,
  sub_category text,
  plan_type text DEFAULT 'Direct',
  option_type text DEFAULT 'Growth',
  scheme_type text DEFAULT 'Open Ended',
  nav numeric(12,4) DEFAULT 0,
  nav_date date,
  aum_cr numeric(14,2) DEFAULT 0,
  expense_ratio numeric(6,3) DEFAULT 0,
  min_sip numeric(10,2) DEFAULT 500,
  min_lumpsum numeric(12,2) DEFAULT 5000,
  exit_load text,
  launch_date date,
  fund_manager text,
  risk_level text DEFAULT 'Moderate',
  rating numeric(2,1) DEFAULT 0,
  return_1m numeric(7,2) DEFAULT 0,
  return_3m numeric(7,2) DEFAULT 0,
  return_6m numeric(7,2) DEFAULT 0,
  return_1y numeric(7,2) DEFAULT 0,
  return_3y numeric(7,2) DEFAULT 0,
  return_5y numeric(7,2) DEFAULT 0,
  return_10y numeric(7,2) DEFAULT 0,
  alpha numeric(7,2) DEFAULT 0,
  beta numeric(6,3) DEFAULT 0,
  sharpe numeric(6,3) DEFAULT 0,
  sortino numeric(6,3) DEFAULT 0,
  std_dev numeric(6,3) DEFAULT 0,
  equity_pct numeric(5,2) DEFAULT 0,
  debt_pct numeric(5,2) DEFAULT 0,
  cash_pct numeric(5,2) DEFAULT 0,
  foreign_pct numeric(5,2) DEFAULT 0,
  holdings jsonb DEFAULT '[]'::jsonb,
  sector_allocation jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_pros jsonb DEFAULT '[]'::jsonb,
  ai_risks jsonb DEFAULT '[]'::jsonb,
  ai_verdict text,
  is_elss boolean DEFAULT false,
  is_nfo boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  views integer DEFAULT 0,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mf_funds TO anon, authenticated;
GRANT ALL ON public.mf_funds TO service_role, authenticated;
ALTER TABLE public.mf_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_funds_public_read" ON public.mf_funds FOR SELECT USING (true);
CREATE POLICY "mf_funds_admin_write" ON public.mf_funds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mf_funds_updated BEFORE UPDATE ON public.mf_funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_mf_funds_category ON public.mf_funds(category);
CREATE INDEX idx_mf_funds_fund_house ON public.mf_funds(fund_house_slug);

CREATE TABLE public.mf_etfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text UNIQUE NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  issuer text,
  asset_class text NOT NULL,
  sub_class text,
  nav numeric(12,4) DEFAULT 0,
  ltp numeric(12,4) DEFAULT 0,
  premium_discount numeric(6,3) DEFAULT 0,
  aum_cr numeric(14,2) DEFAULT 0,
  expense_ratio numeric(6,3) DEFAULT 0,
  tracking_error numeric(6,3) DEFAULT 0,
  avg_volume bigint DEFAULT 0,
  return_1m numeric(7,2) DEFAULT 0,
  return_3m numeric(7,2) DEFAULT 0,
  return_6m numeric(7,2) DEFAULT 0,
  return_1y numeric(7,2) DEFAULT 0,
  return_3y numeric(7,2) DEFAULT 0,
  return_5y numeric(7,2) DEFAULT 0,
  benchmark text,
  holdings jsonb DEFAULT '[]'::jsonb,
  sector_allocation jsonb DEFAULT '[]'::jsonb,
  country_allocation jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_pros jsonb DEFAULT '[]'::jsonb,
  ai_risks jsonb DEFAULT '[]'::jsonb,
  is_trending boolean DEFAULT false,
  views integer DEFAULT 0,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mf_etfs TO anon, authenticated;
GRANT ALL ON public.mf_etfs TO service_role, authenticated;
ALTER TABLE public.mf_etfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_etfs_public_read" ON public.mf_etfs FOR SELECT USING (true);
CREATE POLICY "mf_etfs_admin_write" ON public.mf_etfs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mf_etfs_updated BEFORE UPDATE ON public.mf_etfs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mf_nav_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES public.mf_funds(id) ON DELETE CASCADE,
  date date NOT NULL,
  nav numeric(12,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fund_id, date)
);
GRANT SELECT ON public.mf_nav_history TO anon, authenticated;
GRANT ALL ON public.mf_nav_history TO service_role, authenticated;
ALTER TABLE public.mf_nav_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_nav_public_read" ON public.mf_nav_history FOR SELECT USING (true);
CREATE POLICY "mf_nav_admin_write" ON public.mf_nav_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.mf_fund_houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  total_aum_cr numeric(14,2) DEFAULT 0,
  fund_count integer DEFAULT 0,
  logo_url text,
  description text,
  founded_year integer,
  ceo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mf_fund_houses TO anon, authenticated;
GRANT ALL ON public.mf_fund_houses TO service_role, authenticated;
ALTER TABLE public.mf_fund_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_fh_public_read" ON public.mf_fund_houses FOR SELECT USING (true);
CREATE POLICY "mf_fh_admin_write" ON public.mf_fund_houses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mf_fh_updated BEFORE UPDATE ON public.mf_fund_houses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mf_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  summary text,
  content text,
  category text DEFAULT 'general',
  source text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mf_news TO anon, authenticated;
GRANT ALL ON public.mf_news TO service_role, authenticated;
ALTER TABLE public.mf_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_news_public_read" ON public.mf_news FOR SELECT USING (true);
CREATE POLICY "mf_news_admin_write" ON public.mf_news FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.mf_industry_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_mf_aum_cr numeric(16,2) DEFAULT 0,
  total_etf_aum_cr numeric(16,2) DEFAULT 0,
  net_inflows_cr numeric(14,2) DEFAULT 0,
  top_gaining_categories jsonb DEFAULT '[]'::jsonb,
  top_losing_categories jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mf_industry_stats TO anon, authenticated;
GRANT ALL ON public.mf_industry_stats TO service_role, authenticated;
ALTER TABLE public.mf_industry_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mf_is_public_read" ON public.mf_industry_stats FOR SELECT USING (true);
CREATE POLICY "mf_is_admin_write" ON public.mf_industry_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.mf_fund_houses (name, slug, total_aum_cr, fund_count, description, founded_year) VALUES
('SBI Mutual Fund','sbi-mutual-fund',916000,140,'India''s largest mutual fund house, joint venture between SBI and Amundi.',1987),
('HDFC Mutual Fund','hdfc-mutual-fund',612000,120,'One of India''s largest and most trusted AMCs.',1999),
('ICICI Prudential Mutual Fund','icici-prudential-mutual-fund',738000,130,'Joint venture between ICICI Bank and Prudential Plc.',1993),
('Nippon India Mutual Fund','nippon-india-mutual-fund',438000,110,'Formerly Reliance Mutual Fund, owned by Nippon Life.',1995),
('Axis Mutual Fund','axis-mutual-fund',294000,90,'Subsidiary of Axis Bank, known for equity strategies.',2009),
('Kotak Mahindra Mutual Fund','kotak-mahindra-mutual-fund',412000,95,'Part of Kotak Mahindra Group.',1998),
('Aditya Birla Sun Life Mutual Fund','aditya-birla-sun-life-mutual-fund',358000,105,'JV between Aditya Birla Group and Sun Life Financial.',1994),
('UTI Mutual Fund','uti-mutual-fund',320000,100,'India''s oldest mutual fund house, established in 1963.',1963);

INSERT INTO public.mf_funds (scheme_code, scheme_name, slug, fund_house, fund_house_slug, category, sub_category, nav, nav_date, aum_cr, expense_ratio, fund_manager, risk_level, rating, return_1m, return_3m, return_6m, return_1y, return_3y, return_5y, return_10y, alpha, beta, sharpe, equity_pct, debt_pct, cash_pct, is_trending, is_elss) VALUES
('MF001','SBI Bluechip Fund','sbi-bluechip-fund','SBI Mutual Fund','sbi-mutual-fund','Equity','Large Cap',82.45,'2026-06-07',46200,1.45,'Sohini Andani','Moderately High',4.5,2.1,6.8,14.2,22.5,16.8,14.2,12.5,2.1,0.92,1.18,96,2,2,true,false),
('MF002','HDFC Top 100 Fund','hdfc-top-100-fund','HDFC Mutual Fund','hdfc-mutual-fund','Equity','Large Cap',1042.30,'2026-06-07',35400,1.52,'Rahul Baijal','Moderately High',4,1.8,6.2,13.5,21.8,15.9,13.5,11.8,1.5,0.95,1.10,95,3,2,true,false),
('MF003','ICICI Prudential Bluechip Fund','icici-prudential-bluechip-fund','ICICI Prudential Mutual Fund','icici-prudential-mutual-fund','Equity','Large Cap',98.20,'2026-06-07',56800,1.48,'Anish Tawakley','Moderately High',5,2.5,7.1,15.0,23.8,17.2,14.8,13.2,2.5,0.91,1.22,97,1,2,true,false),
('MF004','Axis Bluechip Fund','axis-bluechip-fund','Axis Mutual Fund','axis-mutual-fund','Equity','Large Cap',62.18,'2026-06-07',35200,1.55,'Shreyash Devalkar','Moderately High',4,1.9,5.8,12.5,19.5,14.8,13.2,10.5,1.2,0.94,1.05,96,2,2,false,false),
('MF005','Mirae Asset Large Cap Fund','mirae-asset-large-cap-fund','Mirae Asset Mutual Fund','mirae-asset-mutual-fund','Equity','Large Cap',105.50,'2026-06-07',38400,1.40,'Gaurav Khandelwal','Moderately High',4.5,2.3,6.9,14.5,22.1,16.5,14.5,12.1,2.3,0.93,1.15,97,2,1,true,false),
('MF006','Axis Midcap Fund','axis-midcap-fund','Axis Mutual Fund','axis-mutual-fund','Equity','Mid Cap',82.50,'2026-06-07',28400,1.65,'Shreyash Devalkar','High',5,3.2,9.5,19.2,32.5,24.8,21.5,18.2,3.5,1.05,1.45,95,3,2,true,false),
('MF007','Kotak Emerging Equity Fund','kotak-emerging-equity-fund','Kotak Mahindra Mutual Fund','kotak-mahindra-mutual-fund','Equity','Mid Cap',98.40,'2026-06-07',38900,1.62,'Pankaj Tibrewal','High',5,3.5,10.2,20.5,34.2,26.5,22.8,19.5,4.2,1.08,1.52,96,2,2,true,false),
('MF008','HDFC Mid-Cap Opportunities Fund','hdfc-mid-cap-opportunities-fund','HDFC Mutual Fund','hdfc-mutual-fund','Equity','Mid Cap',142.30,'2026-06-07',62500,1.55,'Chirag Setalvad','High',4.5,3.0,9.0,18.5,30.8,23.5,20.2,17.5,3.2,1.06,1.40,94,4,2,true,false),
('MF009','Nippon India Small Cap Fund','nippon-india-small-cap-fund','Nippon India Mutual Fund','nippon-india-mutual-fund','Equity','Small Cap',158.25,'2026-06-07',48200,1.58,'Samir Rachh','Very High',5,4.2,12.5,24.8,42.5,32.5,28.5,24.2,5.5,1.15,1.65,95,3,2,true,false),
('MF010','SBI Small Cap Fund','sbi-small-cap-fund','SBI Mutual Fund','sbi-mutual-fund','Equity','Small Cap',152.40,'2026-06-07',32500,1.62,'R. Srinivasan','Very High',4.5,3.8,11.8,23.5,40.2,30.8,27.2,23.5,5.0,1.12,1.58,96,2,2,true,false),
('MF011','Axis Small Cap Fund','axis-small-cap-fund','Axis Mutual Fund','axis-mutual-fund','Equity','Small Cap',88.50,'2026-06-07',22400,1.68,'Anupam Tiwari','Very High',4.5,4.0,12.0,24.0,41.0,31.5,27.8,23.8,5.2,1.13,1.62,95,3,2,false,false),
('MF012','Axis Long Term Equity Fund','axis-long-term-equity-fund','Axis Mutual Fund','axis-mutual-fund','Equity','ELSS',82.15,'2026-06-07',35400,1.58,'Jinesh Gopani','Moderately High',4.5,2.8,8.2,16.5,26.5,19.2,16.8,14.5,3.0,0.98,1.28,96,2,2,true,true),
('MF013','Mirae Asset Tax Saver Fund','mirae-asset-tax-saver-fund','Mirae Asset Mutual Fund','mirae-asset-mutual-fund','Equity','ELSS',45.20,'2026-06-07',22800,1.55,'Neelesh Surana','Moderately High',5,3.2,9.0,18.0,28.5,21.5,18.5,16.2,3.5,0.96,1.35,97,2,1,true,true),
('MF014','SBI Long Term Equity Fund','sbi-long-term-equity-fund','SBI Mutual Fund','sbi-mutual-fund','Equity','ELSS',322.50,'2026-06-07',26800,1.62,'Dinesh Balachandran','Moderately High',4,2.5,7.8,15.8,25.2,18.5,15.8,13.5,2.5,0.97,1.20,95,3,2,false,true),
('MF015','UTI Nifty 50 Index Fund','uti-nifty-50-index-fund','UTI Mutual Fund','uti-mutual-fund','Equity','Index',128.45,'2026-06-07',18500,0.30,'Sharwan Goyal','Moderately High',4,2.0,6.5,13.8,21.5,16.2,14.0,12.0,0.1,1.00,1.12,99,0,1,true,false),
('MF016','HDFC Index Fund Nifty 50','hdfc-index-fund-nifty-50','HDFC Mutual Fund','hdfc-mutual-fund','Equity','Index',218.30,'2026-06-07',14800,0.40,'Krishan Daga','Moderately High',4,2.0,6.4,13.7,21.4,16.1,13.9,11.9,0.0,1.00,1.11,99,0,1,false,false),
('MF017','ICICI Prudential Nifty 50 Index Fund','icici-prudential-nifty-50-index-fund','ICICI Prudential Mutual Fund','icici-prudential-mutual-fund','Equity','Index',218.50,'2026-06-07',15200,0.35,'Kayzad Eghlim','Moderately High',4,2.0,6.5,13.8,21.5,16.2,14.0,12.0,0.1,1.00,1.12,99,0,1,true,false),
('MF018','Parag Parikh Flexi Cap Fund','parag-parikh-flexi-cap-fund','PPFAS Mutual Fund','ppfas-mutual-fund','Equity','Flexi Cap',82.40,'2026-06-07',68500,1.18,'Rajeev Thakkar','High',5,2.8,8.5,17.2,27.8,20.5,18.2,15.8,3.8,0.88,1.42,68,5,2,true,false),
('MF019','HDFC Flexi Cap Fund','hdfc-flexi-cap-fund','HDFC Mutual Fund','hdfc-mutual-fund','Equity','Flexi Cap',1582.30,'2026-06-07',52400,1.48,'Roshi Jain','High',4.5,2.6,8.2,16.8,26.5,19.8,17.5,15.2,3.2,0.95,1.32,95,3,2,true,false),
('MF020','HDFC Balanced Advantage Fund','hdfc-balanced-advantage-fund','HDFC Mutual Fund','hdfc-mutual-fund','Hybrid','Balanced Advantage',382.50,'2026-06-07',82400,1.42,'Anil Bamboli','Moderately High',4.5,1.8,5.5,11.8,18.5,14.5,12.8,11.5,2.0,0.72,1.05,65,30,5,true,false),
('MF021','ICICI Prudential Balanced Advantage Fund','icici-prudential-balanced-advantage-fund','ICICI Prudential Mutual Fund','icici-prudential-mutual-fund','Hybrid','Balanced Advantage',62.50,'2026-06-07',56800,1.45,'Sankaran Naren','Moderately High',4,1.7,5.4,11.5,18.0,14.2,12.5,11.2,1.8,0.70,1.02,62,32,6,false,false),
('MF022','SBI Conservative Hybrid Fund','sbi-conservative-hybrid-fund','SBI Mutual Fund','sbi-mutual-fund','Hybrid','Conservative Hybrid',72.40,'2026-06-07',9800,1.35,'R. Srinivasan','Moderate',4,1.2,3.8,7.5,11.5,9.8,9.2,8.8,1.0,0.45,0.85,25,70,5,false,false),
('MF023','HDFC Short Term Debt Fund','hdfc-short-term-debt-fund','HDFC Mutual Fund','hdfc-mutual-fund','Debt','Short Duration',32.50,'2026-06-07',16800,0.85,'Anil Bamboli','Low to Moderate',4,0.6,1.8,3.5,7.2,6.8,6.5,7.0,0.5,0.15,0.65,0,98,2,false,false),
('MF024','ICICI Prudential Liquid Fund','icici-prudential-liquid-fund','ICICI Prudential Mutual Fund','icici-prudential-mutual-fund','Debt','Liquid',358.20,'2026-06-07',52000,0.25,'Rahul Goswami','Low',3.5,0.5,1.4,2.8,6.5,5.8,5.5,6.2,0.0,0.05,0.50,0,99,1,false,false),
('MF025','Quant Active Fund','quant-active-fund','Quant Mutual Fund','quant-mutual-fund','Equity','Multi Cap',625.40,'2026-06-07',12400,1.85,'Sandeep Tandon','Very High',5,4.5,13.5,26.5,45.2,35.8,30.5,26.5,6.5,1.18,1.72,95,3,2,true,false),
('MF026','PGIM India Midcap Opportunities Fund','pgim-india-midcap-opportunities-fund','PGIM India Mutual Fund','pgim-india-mutual-fund','Equity','Mid Cap',58.50,'2026-06-07',9800,1.92,'Vinay Paharia','High',4.5,3.4,10.0,20.0,33.5,25.8,22.5,19.0,4.0,1.07,1.50,96,2,2,true,false),
('MF027','Tata Digital India Fund','tata-digital-india-fund','Tata Mutual Fund','tata-mutual-fund','Equity','Sectoral - Technology',42.50,'2026-06-07',10500,1.95,'Meeta Shetty','Very High',4,3.8,11.0,22.0,38.5,28.5,25.0,22.0,4.5,1.20,1.55,98,1,1,true,false),
('MF028','SBI Healthcare Opportunities Fund','sbi-healthcare-opportunities-fund','SBI Mutual Fund','sbi-mutual-fund','Equity','Sectoral - Healthcare',358.50,'2026-06-07',3200,2.05,'Tanmaya Desai','Very High',4.5,3.5,10.5,21.0,35.2,26.8,23.5,20.5,4.2,1.10,1.48,97,2,1,false,false),
('MF029','Motilal Oswal Nasdaq 100 FOF','motilal-oswal-nasdaq-100-fof','Motilal Oswal Mutual Fund','motilal-oswal-mutual-fund','Equity','International',38.50,'2026-06-07',4200,0.65,'Swapnil Mayekar','High',4.5,4.5,12.5,25.5,38.5,28.5,24.5,0,5.5,0.85,1.45,0,2,3,true,false),
('MF030','Franklin India Smaller Companies Fund','franklin-india-smaller-companies-fund','Franklin Templeton Mutual Fund','franklin-templeton-mutual-fund','Equity','Small Cap',145.20,'2026-06-07',12500,1.75,'R. Janakiraman','Very High',4,3.9,11.5,23.0,39.5,29.8,26.5,22.8,4.8,1.14,1.55,95,3,2,false,false);

INSERT INTO public.mf_etfs (symbol, name, slug, issuer, asset_class, sub_class, nav, ltp, premium_discount, aum_cr, expense_ratio, tracking_error, avg_volume, return_1m, return_3m, return_6m, return_1y, return_3y, return_5y, benchmark, is_trending) VALUES
('NIFTYBEES','Nippon India ETF Nifty BeES','niftybees','Nippon India','Equity','Index - Nifty 50',285.40,285.85,0.16,18500,0.05,0.08,3580000,2.0,6.5,13.8,21.5,16.2,14.0,'Nifty 50',true),
('JUNIORBEES','Nippon India ETF Junior BeES','juniorbees','Nippon India','Equity','Index - Nifty Next 50',682.50,683.20,0.10,4800,0.15,0.12,820000,2.5,7.8,16.2,25.5,19.5,17.5,'Nifty Next 50',true),
('BANKBEES','Nippon India ETF Bank BeES','bankbees','Nippon India','Equity','Sectoral - Bank',548.20,548.85,0.12,9800,0.19,0.14,2150000,1.8,6.0,12.5,19.8,15.5,13.8,'Nifty Bank',true),
('GOLDBEES','Nippon India ETF Gold BeES','goldbees','Nippon India','Commodity','Gold',62.45,62.55,0.16,10200,0.79,0.15,4250000,2.5,5.8,12.5,18.5,14.5,13.2,'Gold',true),
('GOLDSHARE','SBI Gold ETF','goldshare','SBI','Commodity','Gold',62.30,62.40,0.16,4800,0.78,0.14,1850000,2.4,5.7,12.4,18.4,14.4,13.1,'Gold',false),
('SILVERBEES','Nippon India Silver ETF','silverbees','Nippon India','Commodity','Silver',88.50,88.65,0.17,2400,0.79,0.18,950000,3.5,8.5,18.2,28.5,22.5,0,'Silver',true),
('NETF','ICICI Prudential Nifty ETF','netf','ICICI Prudential','Equity','Index - Nifty 50',285.20,285.65,0.16,12500,0.05,0.09,2850000,2.0,6.5,13.8,21.5,16.2,14.0,'Nifty 50',false),
('SETFNIF50','SBI Nifty 50 ETF','setfnif50','SBI','Equity','Index - Nifty 50',285.10,285.55,0.16,148000,0.04,0.07,5200000,2.0,6.5,13.8,21.5,16.2,14.0,'Nifty 50',true),
('HDFCSENSEX','HDFC Sensex ETF','hdfcsensex','HDFC','Equity','Index - Sensex',942.50,943.20,0.07,8500,0.05,0.08,1850000,2.1,6.6,13.9,21.6,16.3,14.1,'Sensex',false),
('MOM100','Motilal Oswal Nasdaq 100 ETF','mom100','Motilal Oswal','International','US Tech',158.50,159.20,0.44,8200,0.58,0.45,580000,4.5,12.5,25.5,38.5,28.5,24.5,'Nasdaq 100',true),
('MASPTOP50','Mirae Asset NYSE FANG+ ETF','masptop50','Mirae Asset','International','US Tech',82.50,82.95,0.55,4200,0.65,0.52,420000,5.5,15.0,30.5,45.0,32.5,0,'NYSE FANG+',true),
('NIFTYITETF','Nippon India ETF Nifty IT','niftyitetf','Nippon India','Equity','Sectoral - IT',42.50,42.65,0.35,2800,0.20,0.18,850000,3.8,11.0,22.0,38.5,28.5,25.0,'Nifty IT',true),
('PHARMABEES','Nippon India ETF Nifty Pharma','pharmabees','Nippon India','Equity','Sectoral - Pharma',22.50,22.58,0.36,1800,0.21,0.19,650000,3.5,10.5,21.0,35.2,26.8,23.5,'Nifty Pharma',false),
('CPSEETF','Nippon India CPSE ETF','cpseetf','Nippon India','Equity','PSU',62.50,62.65,0.24,42500,0.05,0.10,2850000,3.0,9.5,19.5,32.5,25.5,22.0,'CPSE Index',true),
('LIQUIDBEES','Nippon India ETF Liquid BeES','liquidbees','Nippon India','Debt','Liquid',1000.00,1000.05,0.005,4500,0.65,0.05,1250000,0.5,1.4,2.8,6.5,5.8,5.5,'Crisil Liquid',false);

INSERT INTO public.mf_industry_stats (total_mf_aum_cr, total_etf_aum_cr, net_inflows_cr, top_gaining_categories, top_losing_categories) VALUES
(6850000, 850000, 28500,
 '[{"name":"Small Cap","change":4.2},{"name":"Mid Cap","change":3.5},{"name":"Sectoral - IT","change":3.8},{"name":"International","change":4.5},{"name":"ELSS","change":2.8}]'::jsonb,
 '[{"name":"Banking","change":-0.8},{"name":"Gilt Long Duration","change":-0.5},{"name":"PSU Debt","change":-0.3}]'::jsonb);

INSERT INTO public.mf_news (title, slug, summary, content, category, source) VALUES
('Mutual Fund Industry AUM Crosses Rs 68 Lakh Crore Milestone','mf-aum-68-lakh-crore','Indian mutual fund industry assets under management have crossed the Rs 68 lakh crore mark in June 2026, driven by strong SIP inflows.','The Indian mutual fund industry continues its remarkable growth trajectory, with total AUM crossing Rs 68 lakh crore in June 2026. Monthly SIP contributions hit a record Rs 26,000 crore, signaling sustained retail participation.','Industry','AMFI'),
('Small Cap Funds Lead Performance Charts in 2026','small-cap-funds-lead-2026','Small cap mutual funds have emerged as the top-performing category in 2026, with average 1-year returns exceeding 40%.','Small cap funds have outperformed all other equity categories in 2026, with the average fund returning over 40% in the past year. Top performers include Nippon India Small Cap and SBI Small Cap funds.','Performance','AMFI'),
('SEBI Tightens Disclosure Norms for Mutual Funds','sebi-disclosure-norms-2026','SEBI has introduced enhanced disclosure requirements for mutual funds, mandating detailed risk metrics in monthly factsheets.','The Securities and Exchange Board of India has rolled out new disclosure norms requiring mutual fund houses to publish detailed risk metrics including Sharpe ratio, Sortino ratio, and downside risk in monthly factsheets.','Regulatory','SEBI');
