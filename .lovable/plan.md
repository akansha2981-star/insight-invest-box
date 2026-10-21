# Verified research and publishing automation

## Result
Extend the existing admin-only AI News & Research Centre into a working background research, SEO, publishing and website-maintenance system. Preserve existing pages, content tools, manual editing and trading functionality.

## 1. Audit and synchronize the existing site
- Inventory all published articles, stock analysis, active properties, public pages, categories and eligible URLs using paginated reads.
- Store an initial audit covering duplicate topics/content, outdated evidence, missing metadata, broken internal links and sitemap differences.
- Repair safe metadata/link issues; retain existing content and record substantive changes rather than deleting or overwriting material blindly.

## 2. Connect real research and keyword services
- Connect Firecrawl for internet search and retrieval of source pages; store source URLs, publisher identity, retrieval time, relevant evidence and content fingerprints.
- Connect Semrush for India-focused keyword demand, related searches and ranking-page evidence. Never invent search volumes or treat SEO data as factual article evidence.
- Use existing Trends/RSS discovery as topic leads only, not verified facts. Source pages and scraped text are untrusted input, not executable instructions.
- Prefer official exchange, regulator, government and developer sources. Respect source access restrictions and do not bypass logins or paywalls.

## 3. Build the verified publishing workflow
Discovery → duplicate check → source retrieval → claim verification → keyword/search-intent research → original draft → editorial/SEO checks → publish or hold.
- Normally require three independent sources including a primary source; narrow attributed official announcements may use one.
- Link factual claims to retrieved evidence; conflicts or insufficient evidence prevent publishing. AI confidence alone is not verification.
- Target 2,000+ words only when evidence and search intent justify it; avoid filler, unsupported forecasts, recommendations and rumours.
- Validate headings, summaries, appropriate tables/FAQs, metadata, self-referencing canonical URLs, supported structured data, relevant internal links and financial disclaimers. Sanitize generated HTML.
- Publish through existing content tables and preserve manual publishing. Use stable topic/content identifiers and transactional publication to prevent duplicates on retries.
- Refresh stock analysis only from verified changed facts; retain revision history and do not change trading rules or live orders.

## 4. Verified real-estate updates
- Monitor configured official source URLs for existing properties and compare with stored evidence snapshots.
- Apply supported changes to prices, availability and project details with source references, timestamps and before/after history.
- RERA changes require the relevant official registry evidence. Inaccessible registries, contradictory prices or missing identifiers become exceptions, not invented updates.
- Preserve existing manual fields when evidence is insufficient. Record a significant-content timestamp separately from routine monitoring checks.

## 5. Reliable background execution
- Persist admin-controlled start/end times and frequency in Asia/Kolkata, publication mode, permitted topics/sources, daily work limits and emergency pause.
- Use secure server-side workers, persistent stage tracking, database leases, unique job keys and bounded batches; resume completed work without redoing it.
- Schedule actual research runs at the configured frequency inside the configured window, including overnight-window handling; default to the existing 20:00 IST daily schedule until changed.
- Wake workers when work is queued. Arm bounded delayed retries only while pending work exists, and stop retry scheduling when the queue drains; avoid a permanent high-frequency queue sweeper.
- Retry transient rate limits/server errors with backoff and attempt caps. Persist credit/policy pauses across all entry points. Provider denials/refusals stop work without retries or model substitution.
- Keep credentials server-side and require verified admin access for configuration and manual actions; scheduled callbacks use protected server authorization.

## 6. Automatic live sitemap
You approved serving a fresh public sitemap without republishing the website.
- Reuse the existing sitemap manager and XML-serving tools, reconcile their entries with public routes and the pages' actual eligibility filters, and retrieve all eligible records.
- Remove generation-time, refresh-time and other non-page-specific lastmod fallbacks from every existing sitemap path. Use authoritative significant-page-change timestamps or omit lastmod.
- Deduplicate URLs, remove ineligible entries and preserve https://www.investingiq.in as the canonical base.
- Refresh and validate at **10:00 AM and 10:00 PM IST** every day, independently of the research window. Store run outcome, URL count and errors; retain the last valid snapshot if refresh fails.
- Verify the public /sitemap.xml address actually serves fresh XML. A frontend redirect alone is not sufficient; if public delivery requires hosting configuration, report that specific blocker and do not claim activation.

## 7. Admin automation dashboard
- Extend the existing centre with persisted schedule settings, connection health, emergency pause, run/retry status and daily summaries.
- Show discovered topics, verified/held drafts, published articles, stock/property changes, evidence, SEO checks, copyable canonical URLs, sitemap history and actionable errors.
- Display only stored results. Search Console analytics remain unconnected unless separately authorized; publishing or copying a URL does not imply Google indexing.

## Technical approach
- Retain React/Vite and the existing Lovable Cloud backend. Extend existing content publishing and sitemap functions rather than introduce a second CMS.
- Add protected application tables for settings, bounded jobs/leases, evidence, audits/revisions and sitemap history with explicit grants and admin-only policies.
- Use server-side Lovable AI Gateway calls for new evidence-grounded generation; preserve existing models and behavior on unrelated tools.
- Record the job, evidence and live sitemap architecture in AGENTS.md and maintain roadmap.md as work progresses.

## Verification and activation
- Test concrete rules: IST windows, both sitemap times, source requirements, insufficient evidence, duplicate prevention, immutable completed work, pause behavior, property changes and valid lastmod provenance.
- Exercise an authenticated admin flow from real research input through verified publication and public article readback, including a retry without duplicate publishing. Do not publish a throwaway test article as real news.
- Confirm verified property changes read back correctly; validate public sitemap inclusion/removal, valid XML and unchanged-page timestamps.
- Test background execution without an open dashboard, non-admin denial and failure recovery. Enable unattended publishing only after the end-to-end checks pass.

## Required setup and limits
- No research or SEO service connection is currently linked. Firecrawl and Semrush connection cards will request authorization during implementation; availability and account quotas must be tested before activation.
- Lovable AI and managed research usage can spend workspace credits; Semrush subscription limits apply. Scheduling frequency and daily work limits bound costs.
- Official property/RERA sources may require licensed access or permission; affected records remain unchanged until usable evidence is available.
- Public live sitemap delivery may need a hosting change if the current domain cannot route /sitemap.xml to the existing live XML service. Report this explicitly rather than declaring a scheduled database refresh sufficient.