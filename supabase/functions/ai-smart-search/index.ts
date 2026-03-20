import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Search query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch all data for AI context
    const [propsRes, stocksRes, postsRes, trendsRes] = await Promise.all([
      sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,area_sqft,price,amenities,roi_projection,is_featured").eq("status", "active").limit(50),
      sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary,tags").eq("status", "published").limit(40),
      sb.from("blog_posts").select("title,slug,category,excerpt,tags").eq("status", "published").order("published_at", { ascending: false }).limit(20),
      sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights").limit(20),
    ]);

    const dbContext = `
PROPERTIES (${(propsRes.data || []).length}):
${(propsRes.data || []).map(p => `${p.title} | ${p.city}${p.locality ? '/' + p.locality : ''} | ${p.price_display || '₹' + p.price} | ${p.bhk || '-'} BHK | ${p.property_type} | slug:${p.slug}`).join("\n")}

STOCKS (${(stocksRes.data || []).length}):
${(stocksRes.data || []).map(s => `${s.symbol} ${s.company_name} | ${s.sector} | Rating:${s.rating} | CMP:₹${s.current_price} | Target:₹${s.target_price}`).join("\n")}

ARTICLES (${(postsRes.data || []).length}):
${(postsRes.data || []).map(a => `${a.title} | ${a.category} | slug:${a.slug}`).join("\n")}

PRICE TRENDS:
${(trendsRes.data || []).map(t => `${t.city}${t.locality ? '/' + t.locality : ''} | ₹${t.avg_price_sqft}/sqft | ${t.change_pct}%`).join("\n")}`;

    const systemPrompt = `You are InvestingIQ's smart search engine. The user typed a natural language search query.
Your job is to understand their INTENT and return the most relevant results from our database, plus AI-generated insights.

RULES:
1. Search semantically — "affordable homes near tech hubs" should match Bangalore/Pune properties
2. "dividend stocks" should match stocks with relevant sectors/tags
3. Return results as structured cards using this format:
<!--CARDS:[{"type":"property","title":"Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"}]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"}]-->
<!--CARDS:[{"type":"article","title":"Title","subtitle":"Category","link":"/news/SLUG"}]-->
4. After cards, add a brief AI summary explaining WHY these results match
5. NEVER use emojis. Professional formatting only.
6. If nothing matches well, use your knowledge to answer and suggest what to explore.

DATABASE:
${dbContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-smart-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
