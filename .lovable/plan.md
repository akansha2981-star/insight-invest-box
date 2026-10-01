# Full market coverage: all NSE/BSE stocks, live indices, company figures

## What you will get
1. **All NSE stocks (about 2,000 shares) plus BSE shares** in the screener and live dashboard, not just the 50 followed today.
2. **Real NIFTY 50, BANK NIFTY, SENSEX, NIFTY IT and other major indices** on the live dashboard, replacing the averaged "market index".
3. **Company figures** (market cap, P/E, P/B, ROE, dividend yield, 52-week range, sector) as screener columns and filters, with the source and date shown.

## How it works (plain terms)
- The broker price feed already sends daily prices for us, even though trading on the account is switched off. Only stock search is blocked. Instead of search, we load the broker's full public list of shares, then fetch prices for every share in small batches through the day.
- The first full load takes a few hours of background batches. After that, each day only needs the latest prices.
- Indices come from the same broker feed using their index codes.
- Company figures come from a free public finance data source (unofficial). We refresh them once a day and label them "unofficial, may be delayed". If a figure is missing, it shows "-", never a made-up number.

## Limits to know
- Prices for the full list update every 15 to 30 minutes. Live 30-second prices stay on the followed stocks and your watchlists, because the broker limits how many quotes we can ask for.
- BSE shares that also trade on NSE are shown once, using NSE prices. BSE-only shares use BSE daily prices.
- Strategies, backtests and the AI coach keep running on the followed list plus any stock you add, so pages stay fast. The screener covers everything.

## Technical details
- New table `swing_instruments` refresh from Angel One OpenAPIScripMaster.json (NSE -EQ + BSE A/B/T/X groups), done by a new `swing-universe` edge function.
- `swing-sync` gains a `batch` mode: picks the 60 oldest-synced symbols per call (fits the time limit at ~3 requests/sec), with a `swing_sync_cursor` column; pg_cron calls it every 2 min during and after market hours until all are fresh. Full history (1,100 days) for new symbols, 20 days for refreshes.
- Index tokens (NSE 99926000 NIFTY, 99926009 BANKNIFTY, 99926037 FINNIFTY, 99926008 NIFTY IT; BSE 99919000 SENSEX) stored in `swing_prices` with an `is_index` flag; LiveDashboard and the market regime use NIFTY 50 when available, falling back to the equal-weight index.
- New `swing_fundamentals` table (symbol, market_cap, pe, pb, roe, div_yield, sector, source, fetched_at) filled daily by a `swing-fundamentals` edge function in batches; screener rule engine gets these fields.
- Screener loads the full universe through a lightweight latest-bar summary (server-side view) instead of full history for every stock; StockDetail fetches history on demand.
- Mirror any engine changes in `supabase/functions/_shared/swing`. Update AGENTS.md rules about universe and index.
