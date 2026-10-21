import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { collectAllUrls, buildXml } from "../_shared/sitemap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
