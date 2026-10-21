import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildXml } from "../_shared/sitemap.ts";

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

    const xml = buildXml(urls || []);

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
