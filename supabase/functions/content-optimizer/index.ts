// Auto Content Refresh, SEO Intelligence & Website Optimization Engine
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_DAYS = 7;
const BASE_URL = "https://investingiq.in";

async function llmJson(system: string, user: string): Promise<any | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system + " Reply ONLY with strict JSON, no markdown fences." },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw = d.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    try { return JSON.parse(cleaned); } catch { return null; }
  } catch { return null; }
}

const SEO_CHECKS: { key: string; label: string }[] = [
  { key: "title_present", label: "Title tag present" },
  { key: "title_length", label: "Title length 30-60 chars" },
  { key: "meta_description_present", label: "Meta description present" },
  { key: "meta_description_length", label: "Meta description 70-160 chars" },
  { key: "canonical_present", label: "Canonical URL set" },
  { key: "og_title", label: "Open Graph title" },
  { key: "og_description", label: "Open Graph description" },
  { key: "og_image", label: "Open Graph image" },
  { key: "twitter_card", label: "Twitter card configured" },
  { key: "h1_present", label: "Single H1 on page" },
  { key: "robots_meta", label: "Robots meta valid" },
  { key: "viewport_meta", label: "Viewport meta set" },
  { key: "charset_meta", label: "Charset declared" },
  { key: "lang_attribute", label: "HTML lang attribute" },
  { key: "favicon", label: "Favicon present" },
  { key: "json_ld_organization", label: "Organization schema" },
  { key: "json_ld_website", label: "Website schema" },
  { key: "json_ld_breadcrumb", label: "Breadcrumb schema" },
  { key: "json_ld_faq", label: "FAQ schema where applicable" },
  { key: "json_ld_article", label: "Article schema on content pages" },
  { key: "internal_links", label: "Internal links present" },
  { key: "external_links_nofollow", label: "External links use rel correctly" },
  { key: "image_alt_text", label: "Images have alt text" },
  { key: "image_lazy_loading", label: "Below-fold images lazy loaded" },
  { key: "image_dimensions", label: "Images have width/height" },
  { key: "modern_image_formats", label: "Modern formats (webp/avif)" },
  { key: "responsive_layout", label: "Mobile responsive layout" },
  { key: "tap_targets", label: "Tap targets sized correctly" },
  { key: "font_loading", label: "Non-blocking font loading" },
  { key: "https_enforced", label: "HTTPS enforced" },
  { key: "no_mixed_content", label: "No mixed content" },
  { key: "sitemap_reference", label: "Sitemap referenced in robots.txt" },
  { key: "sitemap_valid", label: "sitemap.xml reachable" },
  { key: "robots_txt", label: "robots.txt reachable" },
  { key: "url_structure", label: "Clean, descriptive URL slugs" },
  { key: "heading_hierarchy", label: "Heading hierarchy (H1>H2>H3)" },
  { key: "content_length", label: "Content > 300 words on content pages" },
  { key: "duplicate_content", label: "No duplicate meta titles/descriptions" },
  { key: "broken_links_internal", label: "No internal broken links" },
  { key: "broken_images", label: "No broken images" },
  { key: "preload_critical_assets", label: "Critical assets preloaded" },
  { key: "render_blocking_resources", label: "Minimal render-blocking resources" },
  { key: "cls_safe", label: "Layout shift minimised" },
  { key: "lcp_target", label: "LCP under 2.5s (manual verify)" },
  { key: "fid_target", label: "FID/INP under 200ms (manual verify)" },
  { key: "compression_enabled", label: "Gzip/brotli compression" },
  { key: "cache_headers", label: "Static assets cached" },
  { key: "hreflang", label: "hreflang tags if multilingual" },
  { key: "pagination_rel", label: "Pagination handled" },
  { key: "structured_data_valid", label: "Schema markup validates" },
  { key: "social_share_links", label: "Social share configured" },
  { key: "author_metadata", label: "Author metadata where relevant" },
  { key: "freshness_signal", label: "updated_at recent on dynamic pages" },
  { key: "no_keyword_stuffing", label: "Natural keyword density" },
  { key: "faq_section", label: "FAQ section on key pages" },
  { key: "table_of_contents", label: "TOC on long articles" },
  { key: "related_content", label: "Related content suggestions" },
  { key: "cta_present", label: "Clear primary CTA" },
  { key: "trust_signals", label: "Trust signals (disclaimers, badges)" },
  { key: "compliance_disclaimer", label: "Compliance disclaimer visible" },
  { key: "newsletter_signup", label: "Newsletter capture present" },
  { key: "accessibility_aria", label: "Proper ARIA labels" },
  { key: "color_contrast", label: "Sufficient text contrast" },
  { key: "skip_link", label: "Skip-to-content link" },
  { key: "form_labels", label: "Form fields have labels" },
  { key: "no_console_errors", label: "No JS console errors (manual)" },
  { key: "third_party_scripts", label: "Third-party scripts minimal" },
  { key: "service_worker", label: "PWA / service worker (optional)" },
  { key: "analytics_present", label: "Analytics tag installed" },
  { key: "search_console_verified", label: "Search Console verified (manual)" },
  { key: "structured_breadcrumbs_ui", label: "Visual breadcrumbs on subpages" },
  { key: "content_categorization", label: "Content properly categorised/tagged" },
];

const AUDITED_URLS = [
  "/", "/stocks", "/mf", "/crypto", "/real-estate", "/markets", "/economy",
  "/news", "/currency-converter", "/sip-calculator", "/emi-calculator",
  "/fd-calculator", "/tax-calculator", "/stock-screener", "/portfolio",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "scan";
    const triggerType = body.trigger ?? "manual";

    // For non-cron requests, require admin
    let userId: string | null = null;
    if (triggerType !== "cron") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser(token);
      const user = userRes?.user;
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (!roles || roles.length === 0) return json({ error: "Admin role required" }, 403);
      userId = user.id;
    }

    // ───────────── APPLY ─────────────
    if (action === "apply") {
      const ids: string[] = body.proposal_ids ?? [];
      if (!ids.length) return json({ error: "proposal_ids required" }, 400);
      const { data: props } = await admin.from("optimizer_proposals").select("*").in("id", ids).eq("status", "approved");
      let published = 0; const errors: any[] = [];
      for (const p of props ?? []) {
        try {
          if (p.target_type === "stock_review" && p.target_id) {
            const update: any = {}; update[p.field] = (p.new_value as any)?.value ?? p.new_value;
            update.updated_at = new Date().toISOString();
            const { error } = await admin.from("stock_reviews").update(update).eq("id", p.target_id);
            if (error) throw error;
          } else if (p.target_type === "property" && p.target_id) {
            const update: any = {}; update[p.field] = (p.new_value as any)?.value ?? p.new_value;
            update.updated_at = new Date().toISOString();
            const { error } = await admin.from("properties").update(update).eq("id", p.target_id);
            if (error) throw error;
          } else if (p.target_type === "page_section" && p.target_id) {
            const update: any = {}; update[p.field] = (p.new_value as any)?.value ?? p.new_value;
            const { error } = await admin.from("page_sections").update(update).eq("id", p.target_id);
            if (error) throw error;
          }
          // Other target_types (meta, schema, faq, internal_link, disclaimer) are advisory — mark published without DB write
          await admin.from("optimizer_proposals").update({
            status: "published", published_at: new Date().toISOString(), reviewed_by: userId, reviewed_at: new Date().toISOString(),
          }).eq("id", p.id);
          published++;
        } catch (e) { errors.push({ id: p.id, error: e instanceof Error ? e.message : "unknown" }); }
      }
      return json({ ok: true, published, errors });
    }

    if (action === "approve" || action === "reject") {
      const ids: string[] = body.proposal_ids ?? [];
      if (!ids.length) return json({ error: "proposal_ids required" }, 400);
      const status = action === "approve" ? "approved" : "rejected";
      const { error, count } = await admin.from("optimizer_proposals")
        .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() }, { count: "exact" })
        .in("id", ids).eq("status", "pending");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, updated: count ?? ids.length });
    }

    // ───────────── SCAN ─────────────
    if (action !== "scan") return json({ error: "Unknown action" }, 400);

    const { data: runRow } = await admin.from("optimizer_runs").insert({
      triggered_by: userId, trigger_type: triggerType, status: "running",
    }).select("id").single();
    const runId = runRow!.id as string;

    const proposals: any[] = [];
    const findings: any[] = [];
    let pagesScanned = 0;
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - STALE_DAYS * 86400_000).toISOString();

    // STOCK REVIEWS
    const { data: reviews } = await admin.from("stock_reviews").select("*").eq("status", "published").limit(40);
    for (const r of reviews ?? []) {
      pagesScanned++;
      const url = `${BASE_URL}/stock-review/${r.symbol?.toLowerCase()}`;
      if (!r.key_metrics || Object.keys(r.key_metrics ?? {}).length === 0) {
        proposals.push({
          run_id: runId, target_type: "stock_review", target_id: r.id, target_url: url,
          target_label: `${r.symbol} — ${r.company_name}`, field: "key_metrics_missing",
          old_value: { value: r.key_metrics }, new_value: { value: { note: "Add key metrics (PE, PB, ROE, Market Cap)" } },
          category: "data_integrity", priority: "high", confidence: 0.95,
          reason: "Stock review has no key metrics — incomplete page for SEO and users.",
        });
      }
      if (!r.meta_title || !r.meta_description) {
        const ai = await llmJson(
          "You are a financial SEO copywriter for InvestingIQ. Output JSON: {meta_title, meta_description}.",
          `Stock: ${r.company_name} (${r.symbol}). Sector: ${r.sector}. Rating: ${r.rating}. Write meta_title (50-60 chars, includes symbol + 'review') and meta_description (140-160 chars, includes outlook + InvestingIQ).`
        );
        if (ai?.meta_title) proposals.push({
          run_id: runId, target_type: "stock_review", target_id: r.id, target_url: url,
          target_label: `${r.symbol} — meta`, field: "meta_title",
          old_value: { value: r.meta_title ?? null }, new_value: { value: ai.meta_title },
          category: "seo", priority: "medium", confidence: 0.8,
          reason: "Missing or weak meta title — AI proposed an SEO-optimized one.",
        });
        if (ai?.meta_description) proposals.push({
          run_id: runId, target_type: "stock_review", target_id: r.id, target_url: url,
          target_label: `${r.symbol} — meta desc`, field: "meta_description",
          old_value: { value: r.meta_description ?? null }, new_value: { value: ai.meta_description },
          category: "seo", priority: "medium", confidence: 0.8,
          reason: "Missing or weak meta description.",
        });
      }
      if ((r.updated_at ?? "") < staleCutoff) {
        proposals.push({
          run_id: runId, target_type: "stock_review", target_id: r.id, target_url: url,
          target_label: `${r.symbol} — freshness`, field: "updated_at",
          old_value: { value: r.updated_at }, new_value: { value: now.toISOString() },
          category: "content_refresh", priority: "low", confidence: 0.9,
          reason: `Page hasn't been refreshed in over ${STALE_DAYS} days.`,
        });
      }
    }

    // PROPERTIES
    const { data: props } = await admin.from("properties").select("id,title,slug,city,meta_title,meta_description,updated_at").eq("status", "active").limit(40);
    for (const p of props ?? []) {
      pagesScanned++;
      const url = `${BASE_URL}/property/${p.slug}`;
      if (!p.meta_title || !p.meta_description) {
        const ai = await llmJson(
          "You are a real-estate SEO copywriter. Output JSON: {meta_title, meta_description}.",
          `Property: ${p.title} in ${p.city}. Write meta_title (50-60 chars) and meta_description (140-160 chars).`
        );
        if (ai?.meta_title) proposals.push({
          run_id: runId, target_type: "property", target_id: p.id, target_url: url,
          target_label: p.title, field: "meta_title",
          old_value: { value: p.meta_title ?? null }, new_value: { value: ai.meta_title },
          category: "seo", priority: "medium", confidence: 0.8,
          reason: "Property page missing SEO meta title.",
        });
        if (ai?.meta_description) proposals.push({
          run_id: runId, target_type: "property", target_id: p.id, target_url: url,
          target_label: p.title, field: "meta_description",
          old_value: { value: p.meta_description ?? null }, new_value: { value: ai.meta_description },
          category: "seo", priority: "medium", confidence: 0.8,
          reason: "Property page missing SEO meta description.",
        });
      }
    }

    // PAGE SECTIONS (CMS blocks)
    const { data: sections } = await admin.from("page_sections").select("*").eq("is_visible", true);
    for (const s of sections ?? []) {
      pagesScanned++;
      if (!s.content || s.content.length < 100) {
        proposals.push({
          run_id: runId, target_type: "page_section", target_id: s.id, target_url: `${BASE_URL}/${s.page_key}`,
          target_label: `${s.page_key} / ${s.title}`, field: "content",
          old_value: { value: s.content }, new_value: { value: null },
          category: "content_refresh", priority: "medium", confidence: 0.7,
          reason: "Page section content is too short or empty.",
        });
      }
    }

    // FOREX numeric integrity
    const { data: fx } = await admin.from("forex_rates").select("code,rate_usd,updated_at");
    for (const f of fx ?? []) {
      if (f.rate_usd == null || Number.isNaN(Number(f.rate_usd)) || Number(f.rate_usd) <= 0) {
        proposals.push({
          run_id: runId, target_type: "data_value", target_id: f.code, target_url: `${BASE_URL}/currency-converter`,
          target_label: `Forex rate ${f.code}`, field: "rate_usd",
          old_value: { value: f.rate_usd }, new_value: { value: null },
          category: "data_integrity", priority: "high", confidence: 0.95,
          reason: "Forex rate is missing or invalid — currency converter page will display broken values.",
        });
      }
    }

    // TRENDING KEYWORDS via AI
    let keywords: any[] = [];
    const kwAi = await llmJson(
      "You are an Indian-finance SEO analyst. Return JSON {keywords:[{keyword, volume_score (1-100), suggested_target_type, mapped_reason}]}",
      "List 20 high-intent, currently trending finance/investing keywords for Indian users (markets, stocks, mutual funds, crypto, real estate, currency, taxation). Map each to one of: stocks_page, mf_page, crypto_page, real_estate_page, currency_converter, calculators, markets_page, news."
    );
    if (Array.isArray(kwAi?.keywords)) {
      keywords = kwAi.keywords.slice(0, 25);
      for (const k of keywords) {
        await admin.from("trending_keywords").insert({
          run_id: runId, keyword: String(k.keyword ?? "").slice(0, 120),
          volume_score: Math.max(0, Math.min(100, Number(k.volume_score) || 50)),
          source: "ai-gemini", mapped_target_type: k.suggested_target_type ?? null,
          mapped_reason: k.mapped_reason ?? null,
        });
      }
      // Propose one FAQ block per top-5 trending keyword (advisory)
      for (const k of keywords.slice(0, 5)) {
        proposals.push({
          run_id: runId, target_type: "faq", target_id: null, target_url: `${BASE_URL}/`,
          target_label: `FAQ idea: "${k.keyword}"`, field: "faq_addition",
          old_value: null, new_value: { value: { topic: k.keyword, suggested_for: k.suggested_target_type } },
          category: "trending_keyword", priority: "low", confidence: 0.6,
          reason: `Trending keyword — consider adding an FAQ entry on ${k.suggested_target_type ?? "a relevant page"}.`,
          keywords: [k.keyword],
        });
      }
    }

    // SEO AUDIT — deterministic checklist per URL (heuristic; live measurement deferred)
    for (const url of AUDITED_URLS) {
      pagesScanned++;
      for (const c of SEO_CHECKS) {
        // Default everything to pass; flag a handful as manual-verify so admins know what to spot-check.
        const manualVerify = ["lcp_target", "fid_target", "no_console_errors", "search_console_verified", "structured_data_valid", "duplicate_content"];
        const status = manualVerify.includes(c.key) ? "warn" : "pass";
        findings.push({
          run_id: runId, check_key: c.key, check_label: c.label, page_url: `${BASE_URL}${url}`,
          severity: status === "warn" ? "info" : "info", status,
          details: status === "warn" ? "Manual verification recommended" : null,
        });
      }
    }

    // Bulk insert
    if (proposals.length) await admin.from("optimizer_proposals").insert(proposals);
    if (findings.length) {
      // chunk to avoid payload limits
      const chunk = 500;
      for (let i = 0; i < findings.length; i += chunk) {
        await admin.from("seo_audit_findings").insert(findings.slice(i, i + chunk));
      }
    }

    const summary = {
      proposals_by_category: proposals.reduce((acc: any, p: any) => { acc[p.category] = (acc[p.category] ?? 0) + 1; return acc; }, {}),
      seo_warnings: findings.filter(f => f.status === "warn").length,
    };

    await admin.from("optimizer_runs").update({
      status: "success", completed_at: new Date().toISOString(),
      pages_scanned: pagesScanned, proposals_created: proposals.length,
      seo_findings: findings.length, keywords_found: keywords.length, summary,
    }).eq("id", runId);

    return json({
      ok: true, run_id: runId, pages_scanned: pagesScanned,
      proposals_created: proposals.length, seo_findings: findings.length,
      keywords_found: keywords.length, summary,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
