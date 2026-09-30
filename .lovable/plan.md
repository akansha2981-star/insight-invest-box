# AI Strategy Coach + Leaderboard

## An honest note first
No software, and no AI, can make strategies "100% working" or promise the highest returns. Markets change, and a strategy tuned too tightly to past prices usually fails later. So the AI gets full freedom to change or invent strategies, but the desk only **adopts** a change when it proves itself on prices it was not tuned on. That keeps the improvements real instead of just looking good on paper.

## What you will get

**1. AI Leaderboard page (new tab under Strategies)**
- Every strategy (the 20 built-in, your custom ones, and AI-made ones) ranked daily by return, win rate, max drawdown, trade count and robustness score.
- Up/down arrows showing rank movement since yesterday.
- A badge for AI-made or AI-improved versions, with their version history (v1, v2, v3...).

**2. Daily AI analysis (runs automatically every weekday after market close, around 4:30 PM IST)**
- The system sends the AI each strategy's results: losing trades, where stops were hit, which market conditions hurt it, drawdown periods, and trade frequency.
- The AI names the actual fault for each weak strategy (for example "stops too tight in sideways markets", "entries late after breakouts") and proposes a concrete fix.
- The AI can also invent brand-new strategies of its own, using any indicator, sector filter or rule the builder supports. No limit on what it tries.

**3. Automatic updating, with a safety test**
- Every AI proposal is turned into a real strategy and backtested automatically.
- It is split into a "training" period and an unseen "test" period. The change is adopted (saved as a new version and shown on the leaderboard and in Strategy Lab, auto-trading, live test, etc.) only if it beats the current version on the unseen period and has enough trades.
- Rejected ideas are still logged with the reason, so the AI learns from them next day (it sees its own past attempts).
- Old versions are never overwritten, so any earlier backtest stays reproducible and you can switch back.

**4. AI change log**
- Each day's report: what the AI found, what it changed, before/after numbers, adopted or rejected and why.
- A "Run AI analysis now" button for admins, plus an on/off switch in Desk controls.

Everything stays paper trading. Real broker orders remain separately switched off as today.

## Technical details
- Copy the pure strategy engine (engine, indicators, strategies20, rules, robust — about 700 lines, no browser dependencies) into `supabase/functions/_shared/swing/` so the server simulates with identical logic to the app.
- New tables: `swing_ai_runs` (date, status, summary, lock/lease, pause reason), `swing_ai_proposals` (run, parent strategy, fault, rule JSON, train/test metrics, adopted flag, reason), `swing_leaderboard_snapshots` (date, strategy key, metrics, rank). Admin write via service role, signed-in read.
- New edge function `swing-ai-coach`: single-flight lock, skips if already run today, loads `swing_prices`, computes leaderboard snapshot, sends a compact stats payload to Lovable AI (`openai/gpt-6-astra`, Responses API, structured JSON output matching the rules schema), validates each proposal, backtests train/test, inserts adopted ones into `swing_custom_strategies` with author "AI" and parent link. Bounded to about 10 proposals per run. Stops and records a pause on 402/403/repeated 429.
- Extend the rules schema only if the AI needs rule types the builder lacks (added in both the app and shared copy).
- Daily schedule via pg_cron at 11:00 UTC on weekdays calling the function.
- UI: `Leaderboard.tsx` and `AiCoachLog.tsx` in `src/pages/money/`, wired into MoneyDashboard tabs; toggle in AdminControls.
