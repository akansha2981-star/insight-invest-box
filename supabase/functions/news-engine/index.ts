// Smart Financial News Engine
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "Stock Market", "Mutual Funds", "Real Estate", "Economy", "Personal Finance",
  "IPOs", "Banking", "Cryptocurrency", "Taxation", "Government Policies",
  "Global Markets", "Business News",
];

const INSIGHT_KEYS = [
  "what_is", "why_matters", "market_impact", "sector_impact", "investor_impact",
  "economy_impact", "pros", "risks", "companies_affected", "sentiment",
  "expert_analysis", "key_takeaways", "key_facts", "faqs", "related_topics",
  "educational_context",
];

async function llmJson(system: string, user: string, model = "google/gemini-2.5-flash"): Promise<any | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system + " Reply ONLY with strict JSON, no markdown fences." },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const raw: string = d.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    try { return JSON.parse(cleaned); } catch { return null; }
  } catch { return null; }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function buildPublishedHtml(d: any): string {
  // IMPORTANT: only return the raw news story. All insight sections
  // (what_is, why_matters, market_impact, pros, risks, FAQs, etc.) are
  // rendered as dedicated premium UI blocks on the News Detail Page,
  // so we must NOT duplicate them inside the article body.
  const summary = d.summary ? `<p class="news-lede"><strong>${d.summary}</strong></p>` : "";
  return [summary, d.content ?? ""].filter(Boolean).join("\n");
}


function scoreSeo(d: any): number {
  let s = 0;
  if (d.meta_title && d.meta_title.length >= 30 && d.meta_title.length <= 65) s += 15;
  if (d.meta_description && d.meta_description.length >= 70 && d.meta_description.length <= 165) s += 15;
  if (d.headline && d.headline.length >= 30) s += 10;
  if ((d.meta_keywords ?? []).length >= 3) s += 10;
  if (d.summary && d.summary.length >= 80) s += 10;
  if (d.content && d.content.length >= 600) s += 15;
  const ins = d.insights ?? {};
  const hit = INSIGHT_KEYS.filter(k => ins[k] && (typeof ins[k] === "string" ? ins[k].length > 20 : true)).length;
  s += Math.round((hit / INSIGHT_KEYS.length) * 25);
  return Math.min(100, s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "generate";

    // ───────────── ENRICH (public): backfill insights for a published post ─────────────
    if (action === "enrich") {
      const slug: string = body.slug;
      if (!slug) return json({ error: "slug required" }, 400);
      const { data: post } = await admin
        .from("blog_posts")
        .select("id,title,excerpt,category,content,insights")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!post) return json({ error: "Post not found" }, 404);

      const existing = (post.insights ?? {}) as Record<string, unknown>;
      const hasRich = INSIGHT_KEYS.some(k => {
        const v = existing[k];
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "string") return v.trim().length > 20;
        return !!v;
      });
      if (hasRich) return json({ ok: true, insights: existing, cached: true });

      const plain = String(post.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
      const generated = await llmJson(
        `You are a senior Indian financial analyst for InvestingIQ. Read the news article and produce ONLY the analytical "insights" JSON object that helps Indian retail investors understand it. Be factual, balanced, and specific to the Indian market context. Output STRICT JSON only with this exact shape (no markdown, no extra fields):
{
  "what_is": string (80-160 words),
  "why_matters": string (80-160 words),
  "market_impact": string (impact on Sensex/Nifty/broader indices, 80-160 words),
  "sector_impact": [{"sector": string, "impact": "Positive"|"Negative"|"Mixed"|"Neutral", "note": string}] (3-6),
  "investor_impact": string (80-160 words),
  "economy_impact": string (80-160 words),
  "pros": string[] (4-6),
  "risks": string[] (4-6),
  "companies_affected": [{"name": string, "ticker": string, "impact": "Positive"|"Negative"|"Mixed"|"Neutral", "note": string}] (3-8 Indian listed companies where relevant),
  "sentiment": "Bullish"|"Bearish"|"Neutral",
  "expert_analysis": string (160-280 words),
  "key_takeaways": string[] (4-6),
  "key_facts": string[] (4-8 specific data points / numbers / dates),
  "faqs": [{"q": string, "a": string}] (6-10),
  "related_topics": string[] (5-8),
  "educational_context": string (120-220 words for beginners)
}
Hard rules: do not fabricate prices/quotes; if uncertain say "reportedly" or omit; no investment advice; neutral tone.`,
        `Article title: ${post.title}\nCategory: ${post.category ?? "Markets"}\nExcerpt: ${post.excerpt ?? ""}\n\nArticle body (plain text):\n${plain}\n\nProduce the insights JSON now.`
      );

      if (!generated || typeof generated !== "object") {
        return json({ error: "AI generation failed" }, 502);
      }

      const { error: upErr } = await admin
        .from("blog_posts")
        .update({ insights: generated })
        .eq("id", post.id);
      if (upErr) return json({ error: upErr.message }, 500);

      return json({ ok: true, insights: generated, cached: false });
    }

    // ───────────── AUTH (admin actions only) ─────────────
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
    const userId = user.id;

    // ───────────── APPROVE / REJECT ─────────────
    if (action === "approve" || action === "reject") {
      const ids: string[] = body.draft_ids ?? [];
      if (!ids.length) return json({ error: "draft_ids required" }, 400);
      const status = action === "approve" ? "approved" : "rejected";
      const { error, count } = await admin.from("news_drafts")
        .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() }, { count: "exact" })
        .in("id", ids).in("status", ["pending", "approved"]);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, updated: count ?? ids.length });
    }

    // ───────────── EDIT ─────────────
    if (action === "edit") {
      const id: string = body.draft_id;
      const patch = body.patch ?? {};
      const allowed = ["headline", "summary", "content", "meta_title", "meta_description", "category", "tags", "featured_image_url"];
      const safe: any = {};
      for (const k of allowed) if (k in patch) safe[k] = patch[k];
      const { error } = await admin.from("news_drafts").update(safe).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ───────────── PUBLISH ─────────────
    if (action === "publish") {
      const ids: string[] = body.draft_ids ?? [];
      if (!ids.length) return json({ error: "draft_ids required" }, 400);
      const { data: drafts } = await admin.from("news_drafts").select("*").in("id", ids).eq("status", "approved");
      let published = 0; const errors: any[] = [];
      for (const d of drafts ?? []) {
        try {
          const finalHtml = buildPublishedHtml(d);
          // Ensure unique slug
          let slug = d.slug || slugify(d.headline);
          const { data: existing } = await admin.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
          if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

          const { data: inserted, error: insErr } = await admin.from("blog_posts").insert({
            title: d.headline,
            slug,
            content: finalHtml,
            excerpt: d.summary,
            cover_image_url: null,
            tags: d.tags ?? [],
            category: d.category ?? "Markets",
            status: "published",
            published_at: new Date().toISOString(),
            author_name: "InvestingIQ AI Desk",
            meta_title: d.meta_title,
            meta_description: d.meta_description,
            
            insights: d.insights ?? {},
            schema_jsonld: d.schema_jsonld ?? {},
            internal_links: d.internal_links ?? [],
            related_searches: d.related_searches ?? [],
            trending_questions: d.trending_questions ?? [],
            seo_keywords: {
              primary: (d.meta_keywords ?? [])[0] ?? null,
              all: d.meta_keywords ?? [],
              tags: d.tags ?? [],
            },
          }).select("id").single();
          if (insErr) throw insErr;
          await admin.from("news_drafts").update({
            status: "published", published_at: new Date().toISOString(),
            blog_post_id: inserted!.id, reviewed_by: userId,
          }).eq("id", d.id);
          published++;
        } catch (e: any) {
          const msg = e?.message || e?.error_description || e?.details || e?.hint || (typeof e === "string" ? e : JSON.stringify(e));
          console.error("publish error for draft", d.id, msg, e);
          errors.push({ id: d.id, error: msg || "unknown" });
        }
      }
      return json({ ok: true, published, errors });
    }

    // ───────────── REGENERATE single ─────────────
    if (action === "regenerate") {
      const id: string = body.draft_id;
      const { data: d } = await admin.from("news_drafts").select("*").eq("id", id).single();
      if (!d) return json({ error: "Draft not found" }, 404);
      const fresh = await generateArticle(d.topic, d.category);
      if (!fresh) return json({ error: "AI generation failed" }, 500);
      const seo_score = scoreSeo(fresh);
      const { error } = await admin.from("news_drafts").update({
        headline: fresh.headline, slug: slugify(fresh.headline),
        summary: fresh.summary, content: fresh.content,
        meta_title: fresh.meta_title, meta_description: fresh.meta_description,
        meta_keywords: fresh.meta_keywords ?? [], tags: fresh.tags ?? [],
        trending: !!fresh.trending, read_time_min: fresh.read_time_min ?? 4,
        insights: fresh.insights ?? {}, schema_jsonld: fresh.schema_jsonld ?? {},
        social_meta: fresh.social_meta ?? {}, internal_links: fresh.internal_links ?? [],
        related_searches: fresh.related_searches ?? [],
        trending_questions: fresh.trending_questions ?? [],
        featured_image_prompt: null,
        seo_score, status: "pending",
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ───────────── GENERATE (discover + generate batch, BACKGROUND) ─────────────
    if (action !== "generate") return json({ error: "Unknown action" }, 400);

    const requested = Math.max(1, Math.min(100, Number(body.count) || 10));
    const focusCategories: string[] = Array.isArray(body.categories) && body.categories.length ? body.categories : CATEGORIES;

    const { data: runRow, error: runErr } = await admin.from("news_runs").insert({
      triggered_by: userId, trigger_type: "manual", requested_count: requested, status: "running",
    }).select("id").single();
    if (runErr || !runRow) return json({ error: runErr?.message ?? "Failed to create run" }, 500);
    const runId = runRow.id as string;

    // Run the slow work in the background so we don't hit the edge-function wall clock.
    const work = (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const topics = await llmJson(
          "You are an Indian financial news editor. Identify currently trending, news-worthy topics for InvestingIQ readers. Return strict JSON: {topics:[{topic, category, trending, brief, sources:[{name,url}]}]}",
          `Today is ${today}. List ${requested} CURRENTLY trending, high-interest finance/investment news topics most relevant to Indian readers across these categories: ${focusCategories.join(", ")}. Bias toward this week's developments: market moves, RBI/SEBI actions, IPOs, results, policy, global cues, crypto, real estate. Each item must include category (one of the provided list), trending (boolean), 2-sentence brief, and 1-3 plausible source names.`
        );
        const topicList: any[] = Array.isArray(topics?.topics) ? topics.topics.slice(0, requested) : [];
        await admin.from("news_runs").update({ discovered: topicList.length }).eq("id", runId);

        if (!topicList.length) {
          await admin.from("news_runs").update({ status: "failed", error: "No topics discovered", completed_at: new Date().toISOString() }).eq("id", runId);
          return;
        }

        let generated = 0, failed = 0;
        const concurrency = 3;

        async function processOne(t: any) {
          try {
            const article = await generateArticle(t.topic ?? t.brief ?? "Trending finance update", t.category);
            if (!article || !article.headline) { failed++; return; }
            const seo_score = scoreSeo(article);
            const draft = {
              run_id: runId, status: "pending",
              topic: t.topic ?? article.headline,
              source_summary: { sources: t.sources ?? [], brief: t.brief ?? null },
              category: t.category ?? article.category ?? "Stock Market",
              tags: article.tags ?? [], trending: !!t.trending,
              headline: article.headline, slug: slugify(article.headline),
              summary: article.summary, content: article.content,
              read_time_min: article.read_time_min ?? 4,
              meta_title: article.meta_title, meta_description: article.meta_description,
              meta_keywords: article.meta_keywords ?? [],
              featured_image_prompt: null,
              insights: article.insights ?? {}, schema_jsonld: article.schema_jsonld ?? {},
              social_meta: article.social_meta ?? {},
              internal_links: article.internal_links ?? [],
              related_searches: article.related_searches ?? [],
              trending_questions: article.trending_questions ?? [],
              seo_score,
            };
            // Insert immediately so admin sees progress in Pending tab.
            const { error: insErr } = await admin.from("news_drafts").insert(draft);
            if (insErr) { failed++; console.error("draft insert error", insErr.message); return; }
            generated++;
          } catch (e) { failed++; console.error("generate error", e); }
        }

        for (let i = 0; i < topicList.length; i += concurrency) {
          await Promise.all(topicList.slice(i, i + concurrency).map(processOne));
          await admin.from("news_runs").update({ generated, failed }).eq("id", runId);
        }

        await admin.from("news_runs").update({
          status: failed === topicList.length ? "failed" : "success",
          completed_at: new Date().toISOString(), generated, failed,
        }).eq("id", runId);
      } catch (e) {
        console.error("background run error", e);
        await admin.from("news_runs").update({
          status: "failed",
          error: e instanceof Error ? e.message : "Unknown error",
          completed_at: new Date().toISOString(),
        }).eq("id", runId);
      }
    })();

    // @ts-ignore EdgeRuntime is provided by Supabase edge runtime
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);

    return json({
      ok: true, run_id: runId, queued: true, requested,
      message: "Generation started in the background. Drafts will appear in the Pending tab over the next 1-3 minutes.",
    });
  } catch (e) {
    console.error("news-engine fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});


async function generateArticle(topic: string, category?: string): Promise<any | null> {
  return await llmJson(
    `You are a senior Indian financial journalist AND an experienced SEO strategist for InvestingIQ.
Before writing, perform DEEP keyword research mentally: identify the primary search intent, high-volume head terms, long-tail variants, question-based queries ("how", "what", "why", "when"), "people also ask" queries, related/LSI terms, and emerging trending phrases on Indian finance Twitter/Google Trends.
Then write an ORIGINAL, factual, non-plagiarised news article that naturally weaves those keywords through the headline, intro, H2/H3 subheads, body, FAQs, and meta tags — without keyword stuffing. Optimize the article to rank for MULTIPLE related queries at once.

Output STRICT JSON ONLY with this shape (no markdown, no commentary):
{
  "headline": string (50-90 chars, factual, contains primary keyword, no clickbait),
  "summary": string (2 sentences, 100-180 chars, contains primary keyword),
  "content": string (HTML body using <h2>,<h3>,<p>,<ul>,<li>; 600-1000 words; subheads MUST use long-tail/question keywords; no <html>/<body>/<img> tags; no image references),
  "category": string,
  "tags": string[] (4-8 lowercase tags),
  "trending": boolean,
  "read_time_min": number,
  "meta_title": string (50-65 chars, primary keyword near the start),
  "meta_description": string (140-160 chars, includes primary + 1 secondary keyword, has a soft CTA),
  "meta_keywords": string[] (8-15: mix of short-tail, long-tail, question-based, and trending),
  "seo_keywords": {
    "primary": string,
    "secondary": string[] (3-6),
    "long_tail": string[] (5-10 multi-word phrases),
    "short_tail": string[] (3-6 one-or-two-word head terms),
    "question_based": string[] (5-8 'how/what/why/when' queries),
    "trending": string[] (3-6 currently-trending phrases),
    "lsi": string[] (5-10 semantically related terms),
    "search_intent": "informational"|"navigational"|"transactional"|"commercial"
  },
  "related_searches": string[] (8-12 "people also search for" style queries),
  "trending_questions": string[] (6-10 "people also ask" questions phrased naturally),
  "insights": {
    "what_is": string (80-160 words plain-English explainer),
    "why_matters": string (why this matters to Indian retail investors, 80-160 words),
    "market_impact": string (impact on Sensex/Nifty/broader indices, 80-160 words),
    "sector_impact": [{"sector": string, "impact": "Positive"|"Negative"|"Mixed"|"Neutral", "note": string}] (3-6 sectors),
    "investor_impact": string (what individual investors should think about, 80-160 words),
    "economy_impact": string (impact on Indian economy / GDP / inflation, 80-160 words),
    "pros": string[] (4-6 advantages / opportunities),
    "risks": string[] (4-6 risks / concerns),
    "companies_affected": [{"name": string, "ticker": string, "impact": "Positive"|"Negative"|"Mixed"|"Neutral", "note": string}] (3-8 Indian listed companies where relevant),
    "sentiment": "Bullish"|"Bearish"|"Neutral",
    "expert_analysis": string (160-280 word AI analyst take, balanced),
    "key_takeaways": string[] (4-6 crisp one-liners),
    "key_facts": string[] (4-8 specific data points / numbers / dates),
    "faqs": [{"q": string, "a": string}] (6-10 FAQs answering trending_questions where possible),
    "related_topics": string[] (5-8 related finance topics),
    "educational_context": string (120-220 words for beginners)
  },
  "schema_jsonld": object (valid schema.org NewsArticle with headline, datePublished, author, publisher, articleSection, keywords),
  "social_meta": {"og_title": string, "og_description": string, "twitter_title": string, "twitter_description": string},
  "internal_links": [{"anchor": string, "slug_to": string, "rationale": string}] (4-8 suggested internal links to slugs under /news, /stock-review, /mutual-funds, /tools, /financial-calculators)
}

Hard rules:
- DO NOT include any image, picture, photo, infographic, or "featured_image_prompt" field.
- DO NOT fabricate statistics, prices, or quotes. If a number isn't certain, phrase it as "reportedly" or omit it.
- NO investment advice. Neutral, balanced tone.
- End the "content" field with a one-line disclaimer: "Disclaimer: This article is for informational purposes only and is not investment advice."`,
    `Topic: ${topic}\nSuggested category: ${category ?? "Stock Market"}\nWrite the complete SEO-optimized article JSON now.`
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
