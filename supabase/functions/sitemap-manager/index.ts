import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Frontend static routes that should be in the sitemap.
// EXCLUDES: /admin, /admin/*, /login, /admin/login, /portfolio (auth-only), /sitemap (HTML page), /index.html, /not-found, dynamic placeholders.
const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: number }> = [
  { path: "/",                   changefreq: "daily",   priority: 1.0 },
  { path: "/news",               changefreq: "hourly",  priority: 0.9 },
  { path: "/markets",            changefreq: "hourly",  priority: 0.9 },
  { path: "/stocks",             changefreq: "hourly",  priority: 0.9 },
  { path: "/stocks/reviews",     changefreq: "daily",   priority: 0.8 },
  { path: "/economy",            changefreq: "daily",   priority: 0.8 },
  { path: "/mf",                 changefreq: "daily",   priority: 0.8 },
  { path: "/crypto",             changefreq: "hourly",  priority: 0.7 },
  { path: "/real-estate",        changefreq: "daily",   priority: 0.9 },
  { path: "/tools/sip",          changefreq: "monthly", priority: 0.7 },
  { path: "/tools/emi",          changefreq: "monthly", priority: 0.7 },
  { path: "/tools/fd",           changefreq: "monthly", priority: 0.7 },
  { path: "/tools/tax",          changefreq: "monthly", priority: 0.7 },
  { path: "/tools/screener",     changefreq: "weekly",  priority: 0.7 },
  { path: "/tools/portfolio",    changefreq: "monthly", priority: 0.6 },
  { path: "/about",              changefreq: "monthly", priority: 0.5 },
  { path: "/careers",            changefreq: "monthly", priority: 0.5 },
  { path: "/contact",            changefreq: "monthly", priority: 0.5 },
  { path: "/privacy",            changefreq: "yearly",  priority: 0.3 },
  { path: "/terms",              changefreq: "yearly",  priority: 0.3 },
];

// Excluded path prefixes (defence in depth)
const EXCLUDE_PREFIXES = ["/admin", "/login", "/portfolio", "/sitemap", "/index.html"];

function isAllowed(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  return !EXCLUDE_PREFIXES.some(p => path === p || path.startsWith(p + "/"));
}

type Row = { url: string; path: string; source: string; lastmod: string; changefreq: string; priority: number };

async function collectAllUrls(sb: any, baseUrl: string): Promise<Row[]> {
  const rows: Row[] = [];
  const seen = new Set<string>();
  const add = (path: string, source: string, lastmod: Date | string | null, changefreq = "weekly", priority = 0.7) => {
    if (!isAllowed(path)) return;
    if (seen.has(path)) return;
    seen.add(path);
    rows.push({
      url: `${baseUrl}${path}`,
      path,
      source,
      lastmod: (lastmod ? new Date(lastmod) : new Date()).toISOString(),
      changefreq,
      priority,
    });
  };

  // Static
  for (const r of STATIC_ROUTES) add(r.path, "static", new Date(), r.changefreq, r.priority);

  // Blog posts
  const { data: blogs } = await sb
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);
  for (const b of (blogs || [])) {
    if (b.slug) add(`/news/${b.slug}`, "blog", b.updated_at || b.published_at, "weekly", 0.8);
  }

  // Stock reviews
  const { data: reviews } = await sb
    .from("stock_reviews")
    .select("symbol, updated_at")
    .limit(5000);
  for (const r of (reviews || [])) {
    if (r.symbol) add(`/stocks/review/${r.symbol}`, "stock_review", r.updated_at, "weekly", 0.7);
  }

  // Real estate properties
  const { data: props } = await sb
    .from("properties")
    .select("slug, updated_at, city, listing_type, status")
    .eq("status", "active")
    .limit(5000);
  const cityBuckets = new Set<string>();
  for (const p of (props || [])) {
    if (p.slug) add(`/real-estate/${p.slug}`, "property", p.updated_at, "weekly", 0.7);
    if (p.city && p.listing_type) {
      const city = String(p.city).toLowerCase().trim().replace(/\s+/g, "-");
      const bucket = String(p.listing_type).toLowerCase().trim();
      cityBuckets.add(`${city}|${bucket}`);
    }
  }
  for (const cb of cityBuckets) {
    const [city, bucket] = cb.split("|");
    add(`/real-estate/${city}/${bucket}`, "re_city", new Date(), "daily", 0.6);
  }

  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roles) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "stats";

    const { data: meta } = await sb.from("sitemap_meta").select("*").eq("id", 1).maybeSingle();
    const baseUrl = (body?.base_url || meta?.base_url || "https://www.investingiq.in").replace(/\/$/, "");

    if (action === "stats") {
      const { count: total } = await sb.from("sitemap_urls").select("*", { count: "exact", head: true }).eq("is_active", true);
      const { data: bySource } = await sb.from("sitemap_urls").select("source").eq("is_active", true);
      const sourceCounts: Record<string, number> = {};
      for (const r of (bySource || [])) sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
      const { data: recent } = await sb.from("sitemap_urls").select("url, path, source, lastmod, first_seen").eq("is_active", true).order("first_seen", { ascending: false }).limit(20);
      return new Response(JSON.stringify({
        total_urls: total ?? 0,
        last_generated_at: meta?.last_generated_at,
        last_updated_at: meta?.last_updated_at,
        last_added_count: meta?.last_added_count ?? 0,
        base_url: baseUrl,
        source_breakdown: sourceCounts,
        recent,
        public_sitemap_url: `${baseUrl}/sitemap.xml`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate" || action === "refresh") {
      const rows = await collectAllUrls(sb, baseUrl);
      const incomingPaths = new Set(rows.map(r => r.path));

      // Existing
      const { data: existing } = await sb.from("sitemap_urls").select("path, is_active");
      const existingMap = new Map<string, boolean>();
      for (const r of (existing || [])) existingMap.set(r.path, r.is_active);

      const isRefresh = action === "refresh";
      const newRows = rows.filter(r => !existingMap.has(r.path));
      const addedCount = newRows.length;

      if (isRefresh) {
        // Only insert new ones; update lastmod for existing ones that came back
        if (newRows.length) {
          await sb.from("sitemap_urls").upsert(newRows, { onConflict: "url" });
        }
        // Bump lastmod for known ones (no duplicates created — upsert by url)
        const touchRows = rows.filter(r => existingMap.has(r.path)).map(r => ({ ...r }));
        if (touchRows.length) {
          await sb.from("sitemap_urls").upsert(touchRows, { onConflict: "url" });
        }
        // Re-activate any that were soft-deleted but came back
        const reactivate = rows.filter(r => existingMap.get(r.path) === false).map(r => r.path);
        if (reactivate.length) {
          await sb.from("sitemap_urls").update({ is_active: true }).in("path", reactivate);
        }
      } else {
        // Full regenerate: upsert everything, deactivate URLs that no longer exist
        if (rows.length) {
          await sb.from("sitemap_urls").upsert(rows, { onConflict: "url" });
        }
        // Soft-delete stale (paths in DB but not in fresh scan)
        const stalePaths = (existing || []).filter((e: any) => !incomingPaths.has(e.path) && e.is_active).map((e: any) => e.path);
        if (stalePaths.length) {
          await sb.from("sitemap_urls").update({ is_active: false }).in("path", stalePaths);
        }
      }

      const { count: total } = await sb.from("sitemap_urls").select("*", { count: "exact", head: true }).eq("is_active", true);
      const now = new Date().toISOString();
      const metaUpdate: any = {
        id: 1,
        last_updated_at: now,
        last_added_count: addedCount,
        total_urls: total ?? 0,
        base_url: baseUrl,
        updated_at: now,
      };
      if (!isRefresh) metaUpdate.last_generated_at = now;
      await sb.from("sitemap_meta").upsert(metaUpdate, { onConflict: "id" });

      return new Response(JSON.stringify({
        action,
        added: addedCount,
        total_urls: total ?? 0,
        scanned: rows.length,
        deactivated: !isRefresh ? (existing || []).filter((e: any) => !incomingPaths.has(e.path) && e.is_active).length : 0,
        new_urls: newRows.slice(0, 50).map(r => r.url),
        public_sitemap_url: `${baseUrl}/sitemap.xml`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "preview-xml") {
      const { data: urls } = await sb.from("sitemap_urls").select("url, lastmod, changefreq, priority").eq("is_active", true).order("priority", { ascending: false }).limit(50000);
      const xml = buildXml(urls || []);
      return new Response(JSON.stringify({ xml }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sitemap-manager error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildXml(urls: Array<{ url: string; lastmod: string; changefreq: string; priority: number }>): string {
  const items = urls.map(u =>
    `  <url>\n    <loc>${escapeXml(u.url)}</loc>\n    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${Number(u.priority).toFixed(1)}</priority>\n  </url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
