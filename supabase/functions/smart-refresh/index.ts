// Smart Website Refresh & Auto Update Manager edge function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_DAYS = 30;

async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        return d.choices?.[0]?.message?.content ?? null;
      }
    } catch (_) { /* noop */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "scan";

    // ────────── ROLLBACK ──────────
    if (action === "rollback") {
      const logId = body.log_id;
      const { data: log } = await admin.from("refresh_logs").select("*").eq("id", logId).single();
      if (!log) return new Response(JSON.stringify({ error: "Log not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const snap = (log.snapshot ?? {}) as any;
      let restored = 0;
      if (Array.isArray(snap.blog_posts)) {
        for (const p of snap.blog_posts) {
          await admin.from("blog_posts").update({ status: p.status, published_at: p.published_at, updated_at: p.updated_at }).eq("id", p.id);
          restored++;
        }
      }
      await admin.from("refresh_logs").update({ rolled_back_at: new Date().toISOString() }).eq("id", logId);
      return new Response(JSON.stringify({ ok: true, restored }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ────────── SCAN (analyze) ──────────
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - STALE_DAYS * 86400_000).toISOString();

    const [postsRes, reviewsRes, propsRes] = await Promise.all([
      admin.from("blog_posts").select("id,title,slug,status,updated_at,published_at,category"),
      admin.from("stock_reviews").select("id,symbol,company_name,status,updated_at,published_at"),
      admin.from("properties").select("id,title,status,updated_at"),
    ]);
    const posts = postsRes.data ?? [];
    const reviews = reviewsRes.data ?? [];
    const props = propsRes.data ?? [];

    const stalePosts = posts.filter(p => (p.updated_at ?? "") < staleCutoff);
    const staleReviews = reviews.filter(r => (r.updated_at ?? "") < staleCutoff);
    const staleProps = props.filter(p => (p.updated_at ?? "") < staleCutoff);

    if (action === "scan") {
      return new Response(JSON.stringify({
        ok: true,
        now: now.toISOString(),
        stale_days_threshold: STALE_DAYS,
        counts: {
          total_blogs: posts.length, stale_blogs: stalePosts.length,
          total_reviews: reviews.length, stale_reviews: staleReviews.length,
          total_properties: props.length, stale_properties: staleProps.length,
        },
        stale_samples: {
          blogs: stalePosts.slice(0, 8).map(p => ({ id: p.id, title: p.title, slug: p.slug, updated_at: p.updated_at })),
          reviews: staleReviews.slice(0, 8).map(r => ({ id: r.id, symbol: r.symbol, company_name: r.company_name, updated_at: r.updated_at })),
          properties: staleProps.slice(0, 8).map(p => ({ id: p.id, title: p.title, updated_at: p.updated_at })),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ────────── REFRESH ──────────
    if (action === "refresh") {
      const actions: any[] = [];
      const snapshot: any = { blog_posts: [], created_at: now.toISOString() };
      let items_updated = 0, items_archived = 0, items_created = 0;

      // Snapshot affected blog posts BEFORE mutation (rollback support)
      for (const p of stalePosts) snapshot.blog_posts.push(p);

      // 1. Touch updated_at on stale blog posts (keeps SEO freshness)
      if (stalePosts.length) {
        const ids = stalePosts.map(p => p.id);
        const { error } = await admin.from("blog_posts").update({ updated_at: now.toISOString() }).in("id", ids);
        if (!error) { items_updated += ids.length; actions.push({ type: "refresh_blog_timestamps", count: ids.length }); }
      }

      // 2. Touch stock reviews
      if (staleReviews.length) {
        const ids = staleReviews.map(r => r.id);
        await admin.from("stock_reviews").update({ updated_at: now.toISOString() }).in("id", ids);
        items_updated += ids.length;
        actions.push({ type: "refresh_stock_review_timestamps", count: ids.length });
      }

      // 3. Touch properties
      if (staleProps.length) {
        const ids = staleProps.map(p => p.id);
        await admin.from("properties").update({ updated_at: now.toISOString() }).in("id", ids);
        items_updated += ids.length;
        actions.push({ type: "refresh_property_timestamps", count: ids.length });
      }

      // 4. AI Market Summary — published as a new blog post (auto fresh content)
      let aiCreated = false;
      try {
        const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
        const sys = `You are a senior Indian markets editor for InvestingIQ. Write a concise, accurate market summary in clean HTML (<h2>, <p>, <ul><li>). End with a one-paragraph note about InvestingIQ. No emojis.`;
        const usr = `Write today's (${dateStr}) Indian market summary article. Cover Nifty/Sensex direction, top movers (generic guidance), sector trends, global cues, and outlook. 500-700 words. Return only HTML body.`;
        const html = await callAI(sys, usr);
        if (html && html.length > 200) {
          const title = `Indian Market Wrap — ${dateStr}`;
          const slug = `market-wrap-${now.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;
          const meta_title = `${title} | InvestingIQ`;
          const meta_description = `Daily Indian market summary for ${dateStr}: Nifty, Sensex, sector trends, top movers and outlook. By InvestingIQ.`;
          const excerpt = `Auto-generated market summary for ${dateStr}.`;
          const { error: insErr } = await admin.from("blog_posts").insert({
            title, slug, content: html, excerpt,
            meta_title, meta_description,
            status: "published", published_at: now.toISOString(),
            category: "Markets", tags: ["market-wrap", "ai-generated", "daily"],
            author_name: "InvestingIQ Desk",
          });
          if (!insErr) { items_created++; aiCreated = true; actions.push({ type: "ai_market_summary_published", title, slug }); }
        }
      } catch (e) {
        actions.push({ type: "ai_market_summary_error", error: e instanceof Error ? e.message : "unknown" });
      }

      // 5. Archive very old drafts (>180d, never published)
      const archiveCutoff = new Date(now.getTime() - 180 * 86400_000).toISOString();
      const draftsToArchive = posts.filter(p => p.status === "draft" && (p.updated_at ?? "") < archiveCutoff);
      if (draftsToArchive.length) {
        for (const p of draftsToArchive) snapshot.blog_posts.push(p);
        await admin.from("blog_posts").update({ status: "archived" }).in("id", draftsToArchive.map(p => p.id));
        items_archived += draftsToArchive.length;
        actions.push({ type: "archive_stale_drafts", count: draftsToArchive.length });
      }

      const summary = {
        ran_at: now.toISOString(),
        pages_refreshed: stalePosts.length + staleReviews.length + staleProps.length,
        items_updated, items_archived, items_created,
        ai_market_summary_created: aiCreated,
      };

      const { data: logRow } = await admin.from("refresh_logs").insert({
        triggered_by: user.id, trigger_type: "manual", status: "success",
        completed_at: now.toISOString(),
        summary, actions, snapshot,
        pages_refreshed: summary.pages_refreshed,
        items_updated, items_archived, items_created,
      }).select("id").single();

      return new Response(JSON.stringify({ ok: true, log_id: logRow?.id, summary, actions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
