
# Smart Financial News Engine

AI-powered news pipeline: admin clicks "Generate News (N)", system researches trending finance topics, generates full SEO-ready articles + deep insight blocks, queues them for human approval, then publishes to a new premium News Hub.

## Scope

**In scope:** new admin module, new public News Hub + Detail pages, new edge function, new DB tables. Reuses existing `blog_posts` data model for published storage so the existing News pages keep working, but stages drafts in a new `news_drafts` table so they don't pollute the editorial blog.

**Out of scope:** real-time push notifications, paid news API integration (uses Lovable AI web-grounded search via Gemini; can swap to Firecrawl/NewsAPI later), social auto-posting.

## Architecture

```text
[Admin: Generate News(N)] ─► edge: news-engine?action=discover
                                  │
                                  ├─► AI: discover N trending finance topics (categorized)
                                  ├─► AI per topic: full article + 14 insight blocks + SEO bundle
                                  └─► insert into news_drafts (status=pending)
                                                │
[Admin Review Dashboard] ─► approve / edit / reject / regenerate / publish
                                                │
                                  edge: news-engine?action=publish
                                                │
                                  ├─► insert into blog_posts (status=published, category=News)
                                  └─► mark draft published, link blog_post_id
```

## Database (new)

`news_drafts` — staging table for AI-generated articles
- `id`, `run_id`, `status` (pending|approved|rejected|published|regenerating)
- `topic`, `source_summary` (jsonb: original sources & links found by AI)
- `category` (Stock Market | Mutual Funds | Real Estate | Economy | …)
- `tags text[]`, `trending boolean`
- `headline`, `slug`, `summary`, `content` (HTML), `read_time_min`
- `meta_title`, `meta_description`, `meta_keywords text[]`
- `featured_image_prompt`, `featured_image_url`
- `insights jsonb` — 14 blocks: what_is, why_matters, market_impact, investor_impact, economy_impact, pros, risks, companies_affected, sentiment, expert_analysis, key_facts, faqs, related_topics, educational_context
- `schema_jsonld jsonb`, `social_meta jsonb`
- `seo_score int`, `internal_links jsonb`
- `created_at`, `reviewed_by`, `reviewed_at`, `published_at`, `blog_post_id uuid`

`news_runs` — per-generate-batch
- `id`, `triggered_by`, `requested_count`, `discovered`, `generated`, `failed`, `status`, `started_at`, `completed_at`, `summary jsonb`, `error`

RLS: admin-only for both. GRANT to authenticated + service_role; no anon.

## Edge function `news-engine`

Actions:
- `discover` — body `{count: 10|25|50|100}`. Single AI call asks Gemini (web-grounded via system prompt) to return N current trending Indian finance topics with category, brief, source hints. Stored in a run row.
- `generate` — for each topic (loop with concurrency 3), one structured-JSON Gemini call returns the full article + 14 insight blocks + SEO bundle + JSON-LD + social meta. Inserts into `news_drafts` (status=pending).
- `regenerate` — re-run generate for a single draft id (admin override).
- `approve` / `reject` — bulk status update on `news_drafts`.
- `publish` — for each approved draft: insert into `blog_posts` (category="News", subcategory=draft.category, status=published, tags, content includes insights rendered as styled HTML sections, meta_title/desc copied), set draft to published.
- `image` — optional: kick off Lovable AI image generation for featured image, stash URL.

JSON contract for generate (strict): one call, low temp, returns full bundle so the cost stays bounded. Reuses `llmJson` helper pattern from `content-optimizer`.

## Admin UI — `AdminNewsEngine.tsx` (new tab in AdminDashboard)

Sections:
- **Generate strip**: count selector (10/25/50/100), category multi-filter (optional), "Discover & Generate" button, live status (topics found / articles generated / failed).
- **Live progress tracker**: topics discovered, articles generated, approved, published, categories updated, SEO improvements applied (count of seo_score ≥ 80), internal links added, schema generated.
- **Queue tabs**: Pending Approval | Approved | Published | Rejected | Generation Logs.
- **Article row**: headline, category chip, trending chip, SEO score, read time, AI summary; expand to edit headline/summary/content/meta inline; actions: Approve, Reject, Regenerate, Edit, Preview.
- **Bulk actions**: Approve All, Reject All, Publish All Approved.
- **Run history**: latest 20 runs with counts + error.

## Public frontend

`src/pages/NewsHubPage.tsx` — premium timeline
- Hero with live "AI-curated finance news" label
- Chronological vertical timeline grouped by date with sticky date headers
- Card: publish date · time · category · trending pill · read-time · featured image · headline · summary
- Filter chips (categories), search box, infinite scroll (50/page)

`src/pages/NewsDetailPage.tsx` — already exists; **extend**, don't replace, to render the new `insights` jsonb when present. Render 14 collapsible sections (lucide icons, premium card design). Falls back to legacy article rendering when insights missing.

Route additions (`src/App.tsx`):
- `/news-hub` → NewsHubPage (keep existing `/news` for backward compat, link it to new hub)

JSON-LD `NewsArticle` schema injected per detail page from draft's `schema_jsonld`.

## SEO

- Per-article meta_title/desc set from draft.
- `NewsArticle` + `BreadcrumbList` + `FAQPage` JSON-LD per detail page.
- OpenGraph + Twitter card metadata.
- Auto-internal-links: draft.internal_links is a list of `{anchor, slug_to}` injected on publish using a simple HTML pass.
- Sitemap entry created via existing sitemap_urls insert on publish.

## Files

**New**
- `supabase/functions/news-engine/index.ts`
- `supabase/migrations/<ts>_news_engine.sql` (2 tables + RLS + grants)
- `src/components/AdminNewsEngine.tsx`
- `src/components/news/NewsTimeline.tsx`
- `src/components/news/NewsInsightsPanel.tsx`
- `src/pages/NewsHubPage.tsx`

**Edited**
- `src/App.tsx` — add `/news-hub` route
- `src/pages/AdminDashboard.tsx` — add "News Engine" tab
- `src/pages/NewsDetailPage.tsx` — render insights panel when present
- `src/integrations/supabase/types.ts` — regen post-migration
- `supabase/config.toml` — register `news-engine` (verify_jwt=false; in-code admin check)

## Non-goals / explicit deferrals

- True live web crawl: Gemini's training cutoff limits freshness. The function uses prompting to bias toward "currently trending" topics and stamps the run with the current date, but for verified live news a Firecrawl/NewsAPI connector is a follow-up. The UI surfaces "AI-curated; verify before publishing" so admins know to spot-check.
- Image generation defaults OFF (cost). Admin can click "Generate image" per draft.
- Core Web Vitals live measurement (deferred — same as existing optimizer).

## Confirmation

Large multi-file build (~1 edge function + 2 tables + 1 admin tab + 1 hub page + extended detail page). Confirm and I'll implement in one pass.
