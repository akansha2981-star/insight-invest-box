import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<any | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (resp.ok) return await resp.json();
      const t = await resp.text().catch(() => "");
      console.error("Lovable AI failed:", resp.status, t);
      if (resp.status === 429 || resp.status === 402) return { __error: resp.status };
    } catch (e) { console.error("Lovable AI err", e); }
  }
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (resp.ok) return await resp.json();
    } catch (e) { console.error("OpenAI err", e); }
  }
  return null;
}

const extractText = (data: any): string => data?.choices?.[0]?.message?.content ?? "";
const stripCodeFence = (s: string) => s.replace(/^```(?:json|html)?\n?/i, "").replace(/\n?```$/i, "").trim();

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InvestingIQ-Bot/1.0)" },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch (e) {
    console.error("fetchText fail", url, e instanceof Error ? e.message : e);
    return null;
  }
}

async function getGoogleTrendsIndia(): Promise<Array<{ title: string; traffic: string; source: string }>> {
  const xml = await fetchText("https://trends.google.com/trending/rss?geo=IN");
  if (!xml) return [];
  const items: Array<{ title: string; traffic: string; source: string }> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || "").trim();
    const traffic = (block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/)?.[1] || "").trim();
    if (title) items.push({ title, traffic: traffic || "1,000+", source: "Google Trends IN" });
  }
  return items;
}

async function getRssHeadlines(url: string, source: string, limit = 15): Promise<Array<{ title: string; source: string }>> {
  const xml = await fetchText(url);
  if (!xml) return [];
  const titles: Array<{ title: string; source: string }> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && titles.length < limit) {
    const t = (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || "").trim();
    if (t) titles.push({ title: t, source });
  }
  return titles;
}

// ───────────────── DEEP SEO AUDIT (70+ checks) ─────────────────
type Check = { id: string; category: string; label: string; status: "pass" | "warn" | "fail"; detail?: string; weight: number };

function runDeepSeoAudit(article: any, primaryKeyword: string): { score: number; checks: Check[]; summary: any } {
  const html = String(article.html_content || "");
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const kw = (primaryKeyword || "").toLowerCase();
  const kwRe = kw ? new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi") : null;
  const occ = kwRe ? (plain.match(kwRe) || []).length : 0;
  const density = wc ? (occ / wc) * 100 : 0;

  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
  const h3 = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim());
  const internalLinks = [...html.matchAll(/<a[^>]+href=["'](\/[^"']*)["'][^>]*>/gi)].length;
  const externalLinks = [...html.matchAll(/<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi)].length;
  const images = [...html.matchAll(/<img[^>]*>/gi)];
  const imagesWithAlt = images.filter(m => /alt=["'][^"']+["']/.test(m[0])).length;
  const tables = (html.match(/<table[\s\S]*?<\/table>/gi) || []).length;
  const lists = (html.match(/<(ul|ol)[\s\S]*?<\/(ul|ol)>/gi) || []).length;
  const blockquotes = (html.match(/<blockquote/gi) || []).length;
  const faqCount = (html.match(/<h3[^>]*>\s*Q/gi) || []).length;

  const firstPara = paragraphs[0] || "";
  const intro100 = words.slice(0, 100).join(" ").toLowerCase();
  const meta = String(article.meta_description || "");
  const metaTitle = String(article.meta_title || "");
  const title = String(article.title || "");
  const slug = String(article.slug || "");
  const excerpt = String(article.excerpt || "");
  const tags: string[] = Array.isArray(article.tags) ? article.tags : [];

  const longSentences = plain.split(/[.!?]+/).filter(s => s.split(/\s+/).length > 25).length;
  const avgParaWords = paragraphs.length ? Math.round(paragraphs.reduce((a, p) => a + p.split(/\s+/).length, 0) / paragraphs.length) : 0;

  const checks: Check[] = [
    // Meta (10)
    { id: "meta_title_present", category: "Meta", label: "Meta title present", status: metaTitle ? "pass" : "fail", weight: 3 },
    { id: "meta_title_length", category: "Meta", label: "Meta title 50–60 chars", status: metaTitle.length >= 50 && metaTitle.length <= 60 ? "pass" : metaTitle.length > 0 ? "warn" : "fail", detail: `${metaTitle.length} chars`, weight: 2 },
    { id: "meta_title_has_kw", category: "Meta", label: "Meta title contains primary keyword", status: metaTitle.toLowerCase().includes(kw) ? "pass" : "fail", weight: 3 },
    { id: "meta_desc_present", category: "Meta", label: "Meta description present", status: meta ? "pass" : "fail", weight: 3 },
    { id: "meta_desc_length", category: "Meta", label: "Meta description 150–160 chars", status: meta.length >= 140 && meta.length <= 165 ? "pass" : meta.length ? "warn" : "fail", detail: `${meta.length} chars`, weight: 2 },
    { id: "meta_desc_has_kw", category: "Meta", label: "Meta description has keyword", status: meta.toLowerCase().includes(kw) ? "pass" : "warn", weight: 2 },
    { id: "meta_desc_has_cta", category: "Meta", label: "Meta description has actionable verb", status: /\b(learn|discover|find|read|explore|see|get|understand|know)\b/i.test(meta) ? "pass" : "warn", weight: 1 },
    { id: "excerpt_present", category: "Meta", label: "Excerpt/summary present", status: excerpt.length > 60 ? "pass" : "warn", weight: 1 },
    { id: "tags_present", category: "Meta", label: "Tags present (≥5)", status: tags.length >= 5 ? "pass" : tags.length >= 3 ? "warn" : "fail", detail: `${tags.length} tags`, weight: 1 },
    { id: "category_set", category: "Meta", label: "Category set", status: article.category ? "pass" : "fail", weight: 1 },

    // Title & URL (5)
    { id: "title_present", category: "Title", label: "Article H1/title present", status: title && h1.length ? "pass" : "fail", weight: 3 },
    { id: "title_length", category: "Title", label: "Title 40–70 chars", status: title.length >= 40 && title.length <= 70 ? "pass" : "warn", detail: `${title.length} chars`, weight: 1 },
    { id: "title_has_kw", category: "Title", label: "Title contains primary keyword", status: title.toLowerCase().includes(kw) ? "pass" : "fail", weight: 3 },
    { id: "slug_present", category: "URL", label: "URL slug present", status: slug ? "pass" : "fail", weight: 2 },
    { id: "slug_has_kw", category: "URL", label: "Slug contains keyword", status: slug.toLowerCase().includes(kw.replace(/\s+/g, "-")) ? "pass" : "warn", weight: 2 },

    // Headings (8)
    { id: "single_h1", category: "Headings", label: "Exactly one H1", status: h1.length === 1 ? "pass" : "fail", detail: `${h1.length} found`, weight: 3 },
    { id: "h2_count", category: "Headings", label: "5+ H2 sections", status: h2.length >= 5 ? "pass" : h2.length >= 3 ? "warn" : "fail", detail: `${h2.length} H2s`, weight: 2 },
    { id: "h3_used", category: "Headings", label: "H3 subsections used", status: h3.length >= 3 ? "pass" : "warn", detail: `${h3.length} H3s`, weight: 1 },
    { id: "h2_has_kw", category: "Headings", label: "≥1 H2 contains keyword/LSI", status: h2.some(h => h.toLowerCase().includes(kw)) ? "pass" : "warn", weight: 2 },
    { id: "heading_hierarchy", category: "Headings", label: "Heading hierarchy (no H3 before H2)", status: h2.length === 0 && h3.length > 0 ? "fail" : "pass", weight: 1 },
    { id: "no_empty_headings", category: "Headings", label: "No empty headings", status: [...h1, ...h2, ...h3].every(h => h.length > 2) ? "pass" : "fail", weight: 1 },
    { id: "table_of_contents", category: "Headings", label: "Table of contents present", status: /table of contents|toc/i.test(html) ? "pass" : "warn", weight: 1 },
    { id: "faq_section", category: "Headings", label: "FAQ section (≥4 Q&A)", status: faqCount >= 4 ? "pass" : faqCount >= 2 ? "warn" : "fail", detail: `${faqCount} FAQs`, weight: 2 },

    // Content quality (12)
    { id: "word_count", category: "Content", label: "Word count ≥ 800", status: wc >= 1500 ? "pass" : wc >= 800 ? "warn" : "fail", detail: `${wc} words`, weight: 3 },
    { id: "intro_has_kw", category: "Content", label: "Keyword in first 100 words", status: intro100.includes(kw) ? "pass" : "fail", weight: 3 },
    { id: "kw_density", category: "Content", label: "Keyword density 0.8–2.5%", status: density >= 0.8 && density <= 2.5 ? "pass" : density > 0 && density <= 4 ? "warn" : "fail", detail: `${density.toFixed(2)}%`, weight: 3 },
    { id: "kw_in_conclusion", category: "Content", label: "Keyword in last 200 words", status: words.slice(-200).join(" ").toLowerCase().includes(kw) ? "pass" : "warn", weight: 1 },
    { id: "para_length", category: "Content", label: "Avg paragraph ≤ 80 words", status: avgParaWords <= 80 ? "pass" : avgParaWords <= 120 ? "warn" : "fail", detail: `${avgParaWords} avg`, weight: 1 },
    { id: "long_sentences", category: "Content", label: "≤10 sentences >25 words", status: longSentences <= 10 ? "pass" : "warn", detail: `${longSentences} long`, weight: 1 },
    { id: "lists_used", category: "Content", label: "Lists (ul/ol) used", status: lists >= 2 ? "pass" : lists >= 1 ? "warn" : "fail", weight: 2 },
    { id: "table_used", category: "Content", label: "Data table included", status: tables >= 1 ? "pass" : "warn", weight: 1 },
    { id: "blockquote", category: "Content", label: "Expert quote/blockquote", status: blockquotes >= 1 ? "pass" : "warn", weight: 1 },
    { id: "conclusion", category: "Content", label: "Conclusion section", status: /conclusion|key takeaway/i.test(html) ? "pass" : "fail", weight: 1 },
    { id: "key_takeaways", category: "Content", label: "Key takeaways block", status: /key takeaway/i.test(html) ? "pass" : "warn", weight: 1 },
    { id: "first_para_strong", category: "Content", label: "Strong intro (≥60 words)", status: firstPara.split(/\s+/).length >= 60 ? "pass" : "warn", weight: 1 },

    // Links (6)
    { id: "internal_links", category: "Links", label: "≥3 internal links", status: internalLinks >= 3 ? "pass" : internalLinks >= 1 ? "warn" : "fail", detail: `${internalLinks} internal`, weight: 3 },
    { id: "internal_link_5plus", category: "Links", label: "5+ internal links (depth)", status: internalLinks >= 5 ? "pass" : "warn", weight: 2 },
    { id: "external_links", category: "Links", label: "≥1 authoritative external link", status: externalLinks >= 1 ? "pass" : "warn", detail: `${externalLinks} external`, weight: 1 },
    { id: "no_broken_anchor", category: "Links", label: "No empty anchor tags", status: !/<a[^>]*>\s*<\/a>/i.test(html) ? "pass" : "fail", weight: 1 },
    { id: "links_descriptive", category: "Links", label: "Anchor text not 'click here'", status: !/>(\s*click here\s*|\s*here\s*|\s*read more\s*)</gi.test(html) ? "pass" : "warn", weight: 1 },
    { id: "external_authority", category: "Links", label: "Links to NSE/BSE/SEBI/RBI/AMFI", status: /(nseindia|bseindia|sebi\.gov|rbi\.org|amfiindia)/i.test(html) ? "pass" : "warn", weight: 1 },

    // Images & Media (4)
    { id: "image_present", category: "Media", label: "≥1 image", status: images.length >= 1 ? "pass" : "warn", weight: 1 },
    { id: "all_images_alt", category: "Media", label: "All images have alt text", status: images.length === 0 ? "warn" : imagesWithAlt === images.length ? "pass" : "fail", detail: `${imagesWithAlt}/${images.length}`, weight: 2 },
    { id: "alt_has_kw", category: "Media", label: "≥1 alt contains keyword", status: images.length === 0 ? "warn" : images.some(m => new RegExp(kw, "i").test(m[0])) ? "pass" : "warn", weight: 1 },
    { id: "media_diversity", category: "Media", label: "Media diversity (table/list/quote)", status: (tables + lists + blockquotes) >= 3 ? "pass" : "warn", weight: 1 },

    // India-focus & E-E-A-T (8)
    { id: "rupee_symbol", category: "India", label: "Uses ₹ rupee symbol", status: /₹/.test(plain) ? "pass" : "warn", weight: 2 },
    { id: "india_terms", category: "India", label: "NSE/BSE/SEBI/RBI mentioned", status: /(NSE|BSE|SEBI|RBI|AMFI)/.test(plain) ? "pass" : "fail", weight: 2 },
    { id: "indian_examples", category: "India", label: "Indian company/city examples", status: /(Mumbai|Delhi|Bengaluru|Reliance|HDFC|TCS|Infosys|Tata|Adani)/i.test(plain) ? "pass" : "warn", weight: 1 },
    { id: "current_year", category: "Freshness", label: "Current year referenced", status: new RegExp(String(new Date().getFullYear())).test(plain) ? "pass" : "warn", weight: 1 },
    { id: "disclaimer", category: "E-E-A-T", label: "SEBI compliance disclaimer", status: /disclaimer.{0,200}sebi|not.{0,30}investment advisor|educational purposes/i.test(html) ? "pass" : "fail", weight: 3 },
    { id: "author_voice", category: "E-E-A-T", label: "First-hand analyst voice", status: /(analyst|our view|we believe|in our analysis)/i.test(plain) ? "pass" : "warn", weight: 1 },
    { id: "data_citations", category: "E-E-A-T", label: "Data/numbers present", status: (plain.match(/\d+(\.\d+)?%/g) || []).length >= 3 ? "pass" : "warn", weight: 1 },
    { id: "structured_data_ready", category: "Schema", label: "FAQ schema-ready (Q/A format)", status: faqCount >= 3 ? "pass" : "warn", weight: 1 },

    // Readability & UX (5)
    { id: "no_lorem", category: "Quality", label: "No placeholder text", status: !/lorem ipsum|TODO|TBD/i.test(html) ? "pass" : "fail", weight: 2 },
    { id: "no_md_artifacts", category: "Quality", label: "No raw markdown artefacts", status: !/##\s|\*\*[^*]+\*\*/.test(html) ? "pass" : "warn", weight: 1 },
    { id: "html_clean", category: "Quality", label: "Clean HTML (no <html>/<body>)", status: !/<\/?(html|body|head)\b/i.test(html) ? "pass" : "fail", weight: 1 },
    { id: "no_keyword_stuffing", category: "Quality", label: "No keyword stuffing (<3.5%)", status: density < 3.5 ? "pass" : "fail", weight: 2 },
    { id: "scannable", category: "Quality", label: "Scannable (lists+headings ≥8)", status: (lists + h2.length + h3.length) >= 8 ? "pass" : "warn", weight: 1 },
  ];

  const total = checks.reduce((a, c) => a + c.weight, 0);
  const earned = checks.reduce((a, c) => a + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0), 0);
  const score = Math.round((earned / total) * 100);

  return {
    score,
    checks,
    summary: {
      total_checks: checks.length,
      passed: checks.filter(c => c.status === "pass").length,
      warnings: checks.filter(c => c.status === "warn").length,
      failed: checks.filter(c => c.status === "fail").length,
      word_count: wc,
      keyword_density: +density.toFixed(2),
      internal_links: internalLinks,
      external_links: externalLinks,
      h2_count: h2.length,
      images: images.length,
      faqs: faqCount,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const body = await req.json();
    const { action, topic, category, keywords, wordLimit, keywordDensity, primaryKeyword, article } = body;
    const today = new Date().toISOString().split("T")[0];

    // Supabase client for fetching existing posts (for internal linking)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (action === "discover-topics") {
      const [trends, et, mc, etRealty, etMf] = await Promise.all([
        getGoogleTrendsIndia(),
        getRssHeadlines("https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "Economic Times Markets"),
        getRssHeadlines("https://www.moneycontrol.com/rss/business.xml", "Moneycontrol Business"),
        getRssHeadlines("https://economictimes.indiatimes.com/wealth/real-estate/rssfeeds/13357135.cms", "ET Real Estate"),
        getRssHeadlines("https://economictimes.indiatimes.com/mf/rssfeeds/16678014.cms", "ET Mutual Funds"),
      ]);

      const liveContext = [
        `GOOGLE TRENDS INDIA (live, today):\n${trends.slice(0, 20).map(t => `- ${t.title} | est. traffic: ${t.traffic}`).join("\n") || "(no data)"}`,
        `ECONOMIC TIMES MARKETS (live headlines):\n${et.slice(0, 15).map(t => `- ${t.title}`).join("\n") || "(no data)"}`,
        `MONEYCONTROL BUSINESS (live headlines):\n${mc.slice(0, 15).map(t => `- ${t.title}`).join("\n") || "(no data)"}`,
        `ET REAL ESTATE (live):\n${etRealty.slice(0, 10).map(t => `- ${t.title}`).join("\n") || "(no data)"}`,
        `ET MUTUAL FUNDS (live):\n${etMf.slice(0, 10).map(t => `- ${t.title}`).join("\n") || "(no data)"}`,
      ].join("\n\n");

      const system = `You are an Indian financial markets SEO research analyst.
You have LIVE trending search data and LIVE news headlines from India today (${today}).

1. Identify the 10 BEST high-search-intent article topics for an Indian finance publisher.
2. Use live data as the PRIMARY signal. Combine multiple headlines on the same story.
3. STRICTLY ONLY: Indian Stock Market, Mutual Funds, Real Estate (India), Personal Finance, Tax, IPO, Crypto, Investment Strategy, Economy/RBI/SEBI.
4. REJECT off-topic content.
5. Use Google Trends traffic numbers when available; otherwise estimate realistic India monthly search volume.

Return ONLY JSON:
{ "topics": [ { "title": "...", "primary_keyword": "...", "search_volume": 12000, "difficulty": "Low|Medium|High", "intent": "Informational|Transactional|Navigational", "category": "Stocks|Mutual Funds|Real Estate|Personal Finance|Tax|IPO|Crypto|Economy", "rationale": "1 sentence citing the live signal", "source": "Google Trends IN|Economic Times|Moneycontrol|Mixed" } ] }`;
      const user = `LIVE DATA:\n\n${liveContext}\n\nGenerate 10 topics.`;
      const data = await callAI(system, user, 3500);
      if (!data) return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const raw = stripCodeFence(extractText(data));
      try {
        const parsed = JSON.parse(raw);
        return new Response(JSON.stringify({
          ...parsed,
          live_sources: { google_trends: trends.length, et_markets: et.length, moneycontrol: mc.length, et_realty: etRealty.length, et_mf: etMf.length },
          fetched_at: new Date().toISOString(),
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw: raw.slice(0, 1000) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "write-article") {
      if (!topic) return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const wl = Math.max(400, Math.min(5000, Number(wordLimit) || 1500));
      const kd = Math.max(0.3, Math.min(5, Number(keywordDensity) || 1.5));
      const kw = primaryKeyword || topic;
      const targetOccurrences = Math.round((wl * kd) / 100);

      // Fetch existing published posts for internal linking
      const { data: existingPosts } = await supabase
        .from("blog_posts")
        .select("title, slug, category, tags")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(40);

      const linkCorpus = (existingPosts || []).map((p: any) =>
        `- "${p.title}" → /blog/${p.slug} [${p.category}] tags: ${(p.tags || []).join(", ")}`
      ).join("\n") || "(no existing posts yet)";

      const system = `You are India's top financial SEO content writer. You write deeply researched, SEO-optimised, E-E-A-T compliant long-form articles for an Indian audience.

NON-NEGOTIABLE:
- Target ${wl} words (range ${Math.round(wl*0.9)}-${Math.round(wl*1.1)})
- Primary keyword "${kw}" must appear ~${targetOccurrences} times (~${kd}% density). Place in H1, first 100 words, ≥1 H2, last 200 words. Never stuff.
- LSI/semantic variants throughout
- 100% India focused: ₹, NSE/BSE, SEBI, RBI, AMFI, Indian companies, Indian tax laws/cities
- Today: ${today}

INTERNAL LINKING (CRITICAL FOR SEO):
You MUST insert 4-7 contextual internal links to the following existing articles where topically relevant. Use natural anchor text (NOT "click here"). Format: <a href="/blog/{slug}">descriptive anchor</a>
Available articles:
${linkCorpus}

EXTERNAL LINKING:
Add 1-2 authoritative external links (open in new tab) to nseindia.com, bseindia.com, sebi.gov.in, rbi.org.in, or amfiindia.com where relevant. Format: <a href="https://..." target="_blank" rel="noopener">anchor</a>

STRUCTURE (clean HTML, no <html>/<body>):
1. <h1> with primary keyword
2. Strong intro paragraph (60+ words) — keyword in first 100 words
3. <h2>Table of Contents</h2> with <ul>
4. 6-9 <h2> sections, each 2-4 <p> of 4-6 sentences; use <h3> sub-points
5. ≥1 <table> with relevant data
6. ≥1 <blockquote> with expert quote (cite analyst + firm)
7. <h2>Key Takeaways</h2> with 5-7 <ul><li>
8. <h2>Frequently Asked Questions</h2> with 5 <h3>Q...</h3><p>A...</p>
9. <h2>Conclusion</h2>
10. <p><em>Disclaimer: This article is for educational purposes only. InvestingIQ is not a SEBI-registered investment advisor. Consult a qualified advisor before investing.</em></p>

OUTPUT — JSON only, no code fence:
{
  "title": "50-70 chars, includes keyword",
  "slug": "url-friendly-slug-with-keyword",
  "meta_title": "55-60 chars, includes keyword",
  "meta_description": "150-160 chars compelling, includes keyword and an actionable verb",
  "excerpt": "120-160 char hook",
  "category": "Markets|Mutual Funds|Real Estate|Personal Finance|Tax|IPO|Crypto|Economy",
  "tags": ["6-10 relevant tags"],
  "html_content": "FULL HTML body with internal+external links embedded",
  "word_count": 1500,
  "keyword_occurrences": 22
}`;
      const user = `Write the article now.
Topic: ${topic}
Primary keyword: ${kw}
Category: ${category || "auto"}
Secondary keywords: ${keywords || "auto-select LSI"}
Target word count: ${wl}
Target density: ${kd}% (~${targetOccurrences} occurrences)`;

      const data = await callAI(system, user, 16000);
      if (!data) return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const raw = stripCodeFence(extractText(data));
      try {
        const parsed = JSON.parse(raw);
        const plain = String(parsed.html_content || "").replace(/<[^>]+>/g, " ");
        const words = plain.trim().split(/\s+/).filter(Boolean);
        const wc = words.length;
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        const occ = (plain.match(re) || []).length;
        parsed.word_count = wc;
        parsed.keyword_occurrences = occ;
        parsed.actual_density = wc ? +((occ / wc) * 100).toFixed(2) : 0;
        parsed.internal_links_count = [...String(parsed.html_content || "").matchAll(/<a[^>]+href=["']\/[^"']*["']/gi)].length;
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw: raw.slice(0, 2000) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "seo-audit") {
      if (!article || !article.html_content) {
        return new Response(JSON.stringify({ error: "article required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Run deterministic audit
      const audit = runDeepSeoAudit(article, primaryKeyword || article.title || "");

      // If score < 90, run AI optimiser pass to fix gaps
      let optimized = article;
      let improvements: string[] = [];
      if (audit.score < 92) {
        const fails = audit.checks.filter(c => c.status !== "pass").map(c => `- [${c.status.toUpperCase()}] ${c.label}${c.detail ? ` (${c.detail})` : ""}`).join("\n");

        const { data: existingPosts } = await supabase
          .from("blog_posts")
          .select("title, slug")
          .eq("status", "published")
          .limit(30);
        const linkCorpus = (existingPosts || []).map((p: any) => `- "${p.title}" → /blog/${p.slug}`).join("\n");

        const system = `You are a senior SEO editor. Refine the given article HTML to fix the failing/warning checks below WITHOUT changing the core message. Keep word count similar. Maintain India focus, ₹ symbol, SEBI disclaimer.

Failing/warning checks to fix:
${fails}

If internal links are insufficient, embed more from this list:
${linkCorpus}

Return ONLY JSON:
{
  "title": "...",
  "slug": "...",
  "meta_title": "55-60 chars with keyword",
  "meta_description": "150-160 chars with keyword + actionable verb",
  "excerpt": "...",
  "category": "...",
  "tags": [...],
  "html_content": "improved HTML",
  "improvements": ["bullet list of what you changed"]
}`;
        const user = `Primary keyword: ${primaryKeyword}\n\nCurrent article JSON:\n${JSON.stringify({
          title: article.title, slug: article.slug, meta_title: article.meta_title,
          meta_description: article.meta_description, excerpt: article.excerpt,
          category: article.category, tags: article.tags, html_content: article.html_content,
        })}`;

        const aiData = await callAI(system, user, 16000);
        if (aiData && !aiData.__error) {
          try {
            const refined = JSON.parse(stripCodeFence(extractText(aiData)));
            if (refined?.html_content) {
              improvements = Array.isArray(refined.improvements) ? refined.improvements : [];
              optimized = { ...article, ...refined };
              // recompute stats
              const plain = String(optimized.html_content || "").replace(/<[^>]+>/g, " ");
              const wordsArr = plain.trim().split(/\s+/).filter(Boolean);
              const re = new RegExp(`\\b${(primaryKeyword || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
              const occ = (plain.match(re) || []).length;
              optimized.word_count = wordsArr.length;
              optimized.keyword_occurrences = occ;
              optimized.actual_density = wordsArr.length ? +((occ / wordsArr.length) * 100).toFixed(2) : 0;
            }
          } catch (e) { console.error("optimiser parse", e); }
        }
      }

      const finalAudit = runDeepSeoAudit(optimized, primaryKeyword || optimized.title || "");

      return new Response(JSON.stringify({
        article: optimized,
        audit: finalAudit,
        improvements,
        previous_score: audit.score,
        final_score: finalAudit.score,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-content-studio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
