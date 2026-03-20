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

    // Fetch context from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const [propertiesRes, stocksRes] = await Promise.all([
      sb.from("properties").select("title,slug,city,price_display,bhk,property_type,listing_type,cover_image_url,roi_projection").limit(20),
      sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary").eq("status", "published").limit(15),
    ]);

    const properties = (propertiesRes.data || []).map(p => `${p.title} | ${p.city} | ${p.price_display || ''} | ${p.bhk || ''} | ${p.property_type} | ${p.listing_type} | slug:${p.slug}`).join("\n");
    const stocks = (stocksRes.data || []).map(s => `${s.symbol} ${s.company_name} | ${s.sector} | Rating:${s.rating || 'N/A'} | CMP:${s.current_price || 'N/A'} Target:${s.target_price || 'N/A'}`).join("\n");

    const systemPrompt = `You are InvestingIQ's AI assistant — an expert financial and real estate advisor for the Indian market. Answer in the SAME LANGUAGE the user writes in. Be concise and actionable.

PLATFORM DATA:
PROPERTIES:
${properties || "No properties listed yet."}

STOCKS:
${stocks || "No stock reviews yet."}

When recommending items, include them as structured cards:
<!--CARDS:[{"type":"property","title":"Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"},...]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"},...]-->

For investment questions, add a brief disclaimer. Be helpful and direct.`;

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
      const status = response.status;
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
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
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
