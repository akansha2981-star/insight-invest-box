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
  const ins = d.insights ?? {};
  const sec = (title: string, body: string) => body ? `<section class="news-insight"><h2>${title}</h2>${body}</section>` : "";
  const list = (arr: any) => Array.isArray(arr) ? `<ul>${arr.map((x: any) => `<li>${typeof x === "string" ? x : JSON.stringify(x)}</li>`).join("")}</ul>` : "";
  const faqs = Array.isArray(ins.faqs) ? `<div class="news-faqs">${ins.faqs.map((f: any) => `<details><summary><strong>${f.q ?? f.question ?? ""}</strong></summary><p>${f.a ?? f.answer ?? ""}</p></details>`).join("")}</div>` : "";
  const summary = d.summary ? `<p class="news-lede"><strong>${d.summary}</strong></p>` : "";
  return [
    summary,
    d.content ?? "",
    sec("What is this news about?", ins.what_is ? `<p>${ins.what_is}</p>` : ""),
    sec("Why this news matters", ins.why_matters ? `<p>${ins.why_matters}</p>` : ""),
    sec("Potential impact on the stock market", ins.market_impact ? `<p>${ins.market_impact}</p>` : ""),
    sec("Impact on investors", ins.investor_impact ? `<p>${ins.investor_impact}</p>` : ""),
    sec("Impact on the Indian economy", ins.economy_impact ? `<p>${ins.economy_impact}</p>` : ""),
    sec("Pros & positive outcomes", list(ins.pros)),
    sec("Risks & concerns", list(ins.risks)),
    sec("Companies & sectors affected", list(ins.companies_affected)),
    sec("Market sentiment", ins.sentiment ? `<p><strong>${ins.sentiment}</strong></p>` : ""),
    sec("Expert AI analysis", ins.expert_analysis ? `<p>${ins.expert_analysis}</p>` : ""),
    sec("Key facts & numbers", list(ins.key_facts)),
    sec("Frequently asked questions", faqs),
    sec("Educational context", ins.educational_context ? `<p>${ins.educational_context}</p>` : ""),
    sec("Related topics", list(ins.related_topics)),
  ].filter(Boolean).join("\n");
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

    // ───────────── AUTH ─────────────
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
            meta_keywords: d.meta_keywords ?? [],
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
        } catch (e) {
          errors.push({ id: d.id, error: e instanceof Error ? e.message : "unknown" });
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
        featured_image_prompt: fresh.featured_image_prompt,
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
              featured_image_prompt: article.featured_image_prompt,
              insights: article.insights ?? {}, schema_jsonld: article.schema_jsonld ?? {},
              social_meta: article.social_meta ?? {},
              internal_links: article.internal_links ?? [], seo_score,
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
    `You are a senior Indian financial journalist for InvestingIQ. Write ORIGINAL, factual, non-plagiarised news content for Indian retail investors. Output STRICT JSON ONLY with this shape:
{
  "headline": string (50-90 chars, factual, no clickbait),
  "summary": string (2 sentences, 100-180 chars),
  "content": string (HTML body using <h2>,<h3>,<p>,<ul>,<li>; 500-900 words; no <html>/<body> tags),
  "category": string,
  "tags": string[] (3-7 lowercase tags),
  "trending": boolean,
  "read_time_min": number,
  "meta_title": string (50-65 chars, includes primary keyword),
  "meta_description": string (140-160 chars),
  "meta_keywords": string[] (5-10),
  "featured_image_prompt": string (visual description, no people likeness),
  "insights": {
    "what_is": string, "why_matters": string, "market_impact": string, "investor_impact": string,
    "economy_impact": string, "pros": string[], "risks": string[], "companies_affected": string[],
    "sentiment": "Bullish"|"Bearish"|"Neutral", "expert_analysis": string,
    "key_facts": string[], "faqs": [{"q":string,"a":string}], "related_topics": string[], "educational_context": string
  },
  "schema_jsonld": object (a valid NewsArticle schema.org object),
  "social_meta": {"og_title":string,"og_description":string,"twitter_title":string,"twitter_description":string},
  "internal_links": [{"anchor":string,"slug_to":string}]
}
Rules: write neutral, accurate, no investment advice, no fabricated statistics, include a brief disclaimer line at the end of content.`,
    `Topic: ${topic}\nSuggested category: ${category ?? "Stock Market"}\nWrite the complete article JSON now.`
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
