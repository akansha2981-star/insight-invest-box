import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL internal data for context
    const [propertiesRes, stocksRes, postsRes, trendsRes] = await Promise.all([
      sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,cover_image_url,roi_projection,amenities,developer_name,possession_status,area_sqft,price").eq("status", "active").limit(50),
      sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary,tags").eq("status", "published").limit(30),
      sb.from("blog_posts").select("title,slug,category,excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(15),
      sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights,period").limit(20),
    ]);

    const properties = (propertiesRes.data || []).map(p =>
      `${p.title} | ${p.city}${p.locality ? ', ' + p.locality : ''} | ${p.price_display || '₹' + p.price} | ${p.bhk || '-'} BHK | ${p.property_type} | ${p.listing_type} | ${p.developer_name || '-'} | ${p.possession_status || '-'} | ${p.area_sqft || '-'} sqft | slug:${p.slug}${p.amenities?.length ? ' | Amenities:' + p.amenities.join(',') : ''}`
    ).join("\n");

    const stocks = (stocksRes.data || []).map(s =>
      `${s.symbol} ${s.company_name} | Sector:${s.sector} | Rating:${s.rating || 'N/A'} | CMP:₹${s.current_price || 'N/A'} | Target:₹${s.target_price || 'N/A'} | ${s.summary || ''}`
    ).join("\n");

    const articles = (postsRes.data || []).map(a =>
      `${a.title} | Category:${a.category} | slug:${a.slug}`
    ).join("\n");

    const trends = (trendsRes.data || []).map(t =>
      `${t.city}${t.locality ? '/' + t.locality : ''} | Avg:₹${t.avg_price_sqft}/sqft | Change:${t.change_pct}% | ${t.ai_insights || ''}`
    ).join("\n");

    const systemPrompt = `You are InvestingIQ's AI assistant — an expert financial and real estate advisor for the Indian market.

CRITICAL RULES:
1. ONLY recommend items that exist in the database below. NEVER fabricate listings or stocks.
2. Answer in the SAME LANGUAGE the user writes in.
3. Be concise, helpful, and actionable. Use bullet points.
4. For ANY investment-related information, ALWAYS end with: "Data sourced from official exchanges (NSE/BSE) and trusted platforms. This is informational only — not a recommendation. Consult a certified financial advisor."

INTERNAL DATABASE:

PROPERTIES (${(propertiesRes.data || []).length} listings):
${properties || "No properties listed yet."}

STOCK REVIEWS (${(stocksRes.data || []).length} reviews):
${stocks || "No stock reviews yet."}

ARTICLES (${(postsRes.data || []).length}):
${articles || "No articles yet."}

PRICE TRENDS:
${trends || "No trend data yet."}

CARD FORMAT — When recommending items from our database, embed structured cards:
<!--CARDS:[{"type":"property","title":"Property Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"}]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"}]-->
<!--CARDS:[{"type":"article","title":"Article Title","subtitle":"Category","link":"/news/SLUG"}]-->

If the user asks about something NOT in our database, say: "I don't have that in our current listings. Here's what we do have that might interest you:" and suggest relevant alternatives from our data.`;

    const models = ["google/gemini-2.5-flash", "openai/gpt-5-mini", "google/gemini-3-flash-preview"];
    let response: Response | null = null;

    for (const model of models) {
      try {
        const attempt = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
            stream: true,
          }),
        });

        if (attempt.ok) {
          response = attempt;
          break;
        }

        const status = attempt.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.error(`Model ${model} failed with status ${status}, trying next...`);
      } catch (err) {
        console.error(`Model ${model} fetch error:`, err);
      }
    }

    if (!response) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again shortly." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
