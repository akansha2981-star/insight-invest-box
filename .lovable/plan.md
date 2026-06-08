
# Auto Content Refresh, SEO Intelligence & Website Optimization Engine

A daily AI engine that scans the whole site (except Blog), detects stale/broken/SEO-weak content, proposes changes into an admin review queue, and publishes only what's approved. Extends — does not replace — the existing Smart Refresh and Forex modules.

## Scope

**In scope:** Stock reviews, properties, mutual funds, crypto, markets/economy pages, calculators, currency converter, home banners, page_sections, FAQs, schema, sitemap, robots, internal links, disclaimers.
**Excluded:** `blog_posts` (manual editorial). Smart Refresh's blog timestamp logic stays as-is; new engine skips blog entirely.

## Architecture

```text
[Cron 02:00 IST] ─► edge: content-optimizer ─► proposals (pending)
                                            └─► seo_audit_findings
[Admin UI: AI Review Dashboard] ─► approve / reject / bulk publish
        │
        └─► edge: content-optimizer?action=apply ─► live tables + audit log
```

## Database (new tables)

1. `optimizer_proposals` — one row per proposed change
   - `target_type` (stock_review | property | page_section | sitemap | schema | meta | faq | internal_link | disclaimer | data_value)
   - `target_id`, `target_url`, `field`, `old_value` (jsonb), `new_value` (jsonb)
   - `category` (content_refresh | seo | data_integrity | trending_keyword | schema | broken_element)
   - `priority` (low|med|high), `confidence` (0-1), `reason`, `keywords` (text[])
   - `status` (pending|approved|rejected|published|reverted), `run_id`, `created_at`, `reviewed_by`, `reviewed_at`, `published_at`
2. `optimizer_runs` — per scan: started/finished, counts per category, status, summary jsonb
3. `seo_audit_findings` — 70-pt checklist: `check_key`, `page_url`, `severity`, `status`, `details`, `run_id`
4. `trending_keywords` — discovered keywords: `keyword`, `volume_score`, `source`, `mapped_target_type`, `mapped_target_id`, `discovered_at`
5. RLS: admins manage all; public has no access (admin-only data).

## Edge function: `content-optimizer`

Actions: `scan` (admin or cron), `apply` (publish approved), `revert`, `audit` (SEO only), `keywords` (trend fetch).

Scan pipeline:
1. Pull recent records from each in-scope table; flag rows where `updated_at < now - 7d`, missing meta_title/description, no schema, empty key_metrics, etc.
2. Verify numeric integrity (no NaN/blank in price_history, key_metrics, forex_rates).
3. Pull trending keywords via Lovable AI (Gemini) — return 25 finance keywords with mapping suggestions. Persist to `trending_keywords`.
4. For each flagged target, generate a proposal via Lovable AI: refreshed meta title, meta description, FAQ block, internal link suggestion, or schema JSON. Insert into `optimizer_proposals` as `pending` — **never mutate live tables in scan**.
5. Run 70-point SEO checklist over a curated URL list (home, /stocks, /mf, /crypto, /real-estate, /currency-converter, /economy, /markets, /news, calculators); write to `seo_audit_findings`.

Apply pipeline (admin-triggered, one or many proposal ids):
- Update target tables atomically; snapshot old_value already present for revert.
- Mark proposals `published`; insert audit entry into `optimizer_runs.summary`.

Cron: daily 02:00 IST via pg_cron + pg_net (matches existing forex cron pattern).

## Admin UI: `AdminAIOptimizer.tsx` (new tab in `AdminDashboard`)

Sections:
- **Live progress strip**: pages scanned / updated / refreshed / keywords / SEO fixed / pending / etc.
- **Run history**: latest 20 runs with status + counts; "Run scan now" button.
- **Review queue**: filterable table grouped by category (Content Refresh, SEO, Data Integrity, Trending Keyword, Schema, Broken Element). Each row shows target, field, old → new diff, AI reason, confidence; actions: approve, reject, view. Bulk select + bulk publish + "Approve all high-confidence".
- **SEO Audit tab**: 70-pt checklist with pass/fail per URL.
- **Trending Keywords tab**: discovered keywords with target mappings.
- **Audit log**: published/reverted entries with rollback.

## Sitewide Disclaimer

`ComplianceDisclaimer` already exists. Mount the exact required copy across:
- Footer (already)
- Calculator pages (SIP, EMI, FD, Tax) — bottom card variant
- Stocks, MF, Crypto, Markets, Economy pages — inline variant after hero
- Currency Converter — inline near results
- Stock review detail, AIAssistantBar — tiny variant

Update `ComplianceDisclaimer` text to the exact wording requested.

## Files

**New**
- `supabase/functions/content-optimizer/index.ts`
- `src/components/AdminAIOptimizer.tsx` (tabs: Overview, Review Queue, SEO Audit, Keywords, History)
- `src/components/optimizer/ProposalDiff.tsx`
- `supabase/migrations/<ts>_optimizer.sql` (4 tables + RLS + grants + pg_cron job)
- `src/hooks/useOptimizer.ts`

**Edited**
- `src/pages/AdminDashboard.tsx` — add "AI Optimizer" tab/route
- `src/components/ComplianceDisclaimer.tsx` — update copy to exact requested text
- `src/pages/{SIPCalculatorPage,EMICalculatorPage,FDCalculatorPage,TaxCalculatorPage,StocksPage,MFPage,CryptoPage,MarketsPage,EconomyPage,CurrencyConverterPage}.tsx` — mount disclaimer
- `src/integrations/supabase/types.ts` — auto-regen post-migration
- `supabase/config.toml` — register `content-optimizer` function (verify_jwt=true)

## Non-goals / explicit deferrals

- Real Google Trends API integration — uses Lovable AI to infer trending finance keywords (no paid key, deterministic enough). Can swap to a connector later.
- Core Web Vitals live measurement (requires CrUX/Lighthouse API) — checklist will mark these as "manual verification recommended" rather than fake green checks.
- Auto-publishing without review — explicitly disabled; everything routes through approval queue per spec.

## Confirmation needed

This is a large, multi-file build (≈1 edge function + 4 tables + 1 large admin component + ~10 disclaimer mounts). Confirm to proceed and I'll implement in one pass.
