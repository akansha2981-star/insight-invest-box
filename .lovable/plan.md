# Mutual Funds & ETFs Research Ecosystem

This is a large build. To keep it shippable and high-quality, I'll deliver it in **3 phases**. Phase 1 ships a complete, usable product immediately; Phases 2 and 3 add depth.

## Phase 1 — Foundation + Core Hub (this turn)

### Database (1 migration)
- `mf_funds` — scheme_code, scheme_name, fund_house, category, sub_category, plan_type (Direct/Regular), option (Growth/IDCW), nav, nav_date, aum_cr, expense_ratio, min_sip, min_lumpsum, exit_load, launch_date, fund_manager, risk_level, rating, returns_1m/3m/6m/1y/3y/5y/10y, alpha, beta, sharpe, sortino, std_dev, holdings (jsonb), sector_allocation (jsonb), ai_summary, ai_pros, ai_risks, ai_verdict, slug, views, trending
- `mf_etfs` — symbol, name, asset_class, issuer, nav, ltp, aum_cr, expense_ratio, tracking_error, avg_volume, returns_1m/3m/6m/1y/3y/5y, holdings, sector_allocation, ai_summary, slug, views
- `mf_nav_history` — fund_id, date, nav
- `mf_fund_houses` — name, slug, total_aum_cr, fund_count, logo_url, description
- `mf_news` — title, slug, content, category, published_at
- `mf_industry_stats` — total_mf_aum, total_etf_aum, net_inflows, top_categories (jsonb), updated_at
- Full GRANTs + RLS (public SELECT, admin write via has_role)
- Seed ~30 popular funds + 15 ETFs + 8 fund houses

### Edge function `mf-engine`
- `refresh-nav` — pull NAV from AMFI public feed (no API key needed)
- `ai-analyze` — Gemini-generated summary/pros/risks/verdict per fund
- `generate-news` — daily MF news using Lovable AI
- `industry-stats` — aggregate stats

### Public pages & routes
- `/mutual-funds` — **Hub Dashboard**: industry widgets, trending funds, top performers (tabs: 1M/3M/1Y/3Y/5Y), highest AUM, lowest expense, best SIP/ELSS/Large/Mid/Small/Index, NFOs, most viewed
- `/mutual-funds/screener` — **Advanced Screener** with all filter groups (Basic, Performance, Risk, Cost, Size, Portfolio, Rating, ESG, Tax) + saved ranking presets
- `/mutual-funds/compare` — compare up to 5 funds (returns, risk, expense, manager, alpha/beta/sharpe + charts)
- `/mutual-funds/overlap` — portfolio overlap tool (common holdings, overlap %, sector overlap)
- `/mutual-funds/:slug` — **Fund Detail**: overview, NAV chart, Growth of ₹10k, CAGR, rolling returns, holdings, sector pie, AI analysis panel, embedded SIP/Lumpsum/SWP calculators, similar funds
- `/mutual-funds/fund-house/:slug` — fund house page (AUM, fund count, top funds, managers)
- `/mutual-funds/news` — MF news center

- `/etfs` — **ETF Hub**: trending, top performers, best gold/sector/dividend ETFs, ETF heatmap
- `/etfs/screener` — ETF screener (asset class, performance, tracking error, AUM, liquidity)
- `/etfs/compare` — ETF vs ETF / ETF vs MF / ETF vs Index
- `/etfs/:slug` — **ETF Detail**: price, NAV, premium/discount, tracking error, charts (1D/1W/1M/6M/1Y/5Y), holdings, sectors

### Tools section
- `/tools/sip-calculator` (already exists — link in)
- `/tools/step-up-sip` — Step-Up SIP Calculator
- `/tools/goal-sip` — Goal-based SIP
- `/tools/retirement-sip` — Retirement planner
- `/tools/child-education-sip`
- `/tools/marriage-sip`
- `/tools/inflation-sip` — Inflation-adjusted SIP
- `/tools/fire-calculator` — FIRE calculator
- `/tools/swp-calculator`
- `/tools/lumpsum-calculator`
- `/tools/portfolio-analyzer` — Smart Portfolio Analyzer (fund/units/price → current value, gain/loss, CAGR, diversification)
- `/tools` — hub listing all calculators

### SEO landing pages (auto-generated content)
- `/best-mutual-funds-2026`
- `/best-sip-funds`
- `/best-elss-funds`
- `/best-small-cap-funds`
- `/best-index-funds`
- `/best-etfs-india`
- `/gold-etf-vs-physical-gold`
- `/etf-vs-mutual-fund`
- `/sip-vs-lumpsum`
Each with H1, FAQs, JSON-LD (FAQPage + Article), fund tables.

### Admin (`AdminMutualFunds.tsx` in AdminDashboard)
- Refresh NAV (AMFI)
- Generate AI Analysis (bulk + per-fund)
- Generate SEO content
- Edit fund records
- Trigger news generation
- View industry stats

### Reused components
- `MFScreener`, `MFFundCard`, `MFCompareTable`, `NAVChart` (recharts), `HoldingsTable`, `SectorPie`, `CalculatorShell`, `AIFundPanel`, `OverlapMatrix`

### Compliance
- "Not investment advice" disclaimer on every MF/ETF page and AI panel
- Data sourced from AMFI/public feeds, may be delayed

## Phase 2 (next iteration, after approval)
- ETF Intelligence Center (flows, heatmap, sector rotation)
- AI Fund Recommendation Engine with category drill-downs
- Research Terminal (Bloomberg-like unified dashboard at `/research-terminal`)
- News auto-scheduling via pg_cron

## Phase 3 (polish)
- ESG scores, custom user rankings persistence (auth)
- Live ETF intraday via Angel One integration

---

## Technical notes
- Stack: existing React + Tailwind + shadcn + recharts + framer-motion
- AI: Lovable AI Gateway (`google/gemini-3-flash-preview`)
- NAV source: AMFI daily NAVAll.txt (free, no key)
- All routes added to `App.tsx` + sitemap
- Design: light theme for tools/hub, dark premium theme for AI panels (matches existing memory rules)
- No emojis, Lucide icons only

## Scope of this turn
Phase 1 in full: migration + edge function + all listed pages + admin panel + 9 calculators + 9 SEO landing pages + routes + sitemap. Heavy build — expect ~25 new files.

Approve to proceed with Phase 1.