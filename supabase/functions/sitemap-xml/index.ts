import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Publicly serves /sitemap.xml content. No auth required.
serve(async (_req) => {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: urls } = await sb
      .from("sitemap_urls")
      .select("url, lastmod, changefreq, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(50000);

    const items = (urls || []).map((u: any) =>
      `  <url>\n    <loc>${escapeXml(u.url)}</loc>\n    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${Number(u.priority).toFixed(1)}</priority>\n  </url>`
    ).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("sitemap-xml error", e);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
