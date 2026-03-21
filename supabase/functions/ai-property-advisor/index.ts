import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(systemPrompt: string, userPrompt: string): Promise<Response | null> {
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 30000);
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true }),
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (resp.ok) return resp;
      await resp.text().catch(() => {});
    } catch (e) { console.error("OpenAI error:", e instanceof Error ? e.message : e); }
  }
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true }),
      });
      if (resp.ok) return resp;
      await resp.text().catch(() => {});
    } catch (e) { console.error("Lovable AI error:", e instanceof Error ? e.message : e); }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug, action } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "Property slug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: property } = await sb.from("properties").select("*").eq("slug", slug).maybeSingle();
    const city = property?.city || "";
    const { data: trends } = await sb.from("re_price_trends").select("*").ilike("city", `%${city}%`).limit(5);
    const { data: similar } = await sb.from("properties").select("title,city,locality,price,price_display,bhk,property_type,area_sqft,developer_name,slug").eq("status", "active").eq("city", city).neq("slug", slug).limit(5);

    const propertyCtx = property
      ? `Property: ${property.title}\nCity: ${property.city}, Locality: ${property.locality || "N/A"}\nPrice: ${property.price_display || "₹" + property.price}\nType: ${property.bhk || "-"} BHK ${property.property_type}\nArea: ${property.area_sqft || "N/A"} sqft\nDeveloper: ${property.developer_name || "N/A"}\nPossession: ${property.possession_status || "N/A"}\nAmenities: ${(property.amenities || []).join(", ") || "N/A"}\nROI: ${property.roi_projection || "N/A"}\nRERA: ${property.rera_id || "N/A"}`
      : `No property found for slug: ${slug}`;

    const trendsCtx = (trends || []).map(t => `${t.city}${t.locality ? "/" + t.locality : ""}: ₹${t.avg_price_sqft}/sqft, ${t.change_pct}% change. ${t.ai_insights || ""}`).join("\n") || "No trend data.";
    const similarCtx = (similar || []).map(p => `${p.title} | ${p.city}/${p.locality} | ${p.price_display || "₹" + p.price} | ${p.bhk} BHK | ${p.area_sqft} sqft | by ${p.developer_name}`).join("\n") || "No similar properties.";

    const actionPrompts: Record<string, string> = {
      "investment-analysis": `Investment analysis:\n1. Value Assessment\n2. ROI Potential\n3. Location Analysis\n4. Developer Credibility\n5. Risk Factors\n6. Verdict — Buy/Hold/Wait`,
      "locality-insights": `Locality insights for ${property?.locality || property?.city}:\n1. Infrastructure & Connectivity\n2. Social Infrastructure\n3. Employment Hubs\n4. Price Trends\n5. Upcoming Developments\n6. Livability Score (1-10)`,
      "compare-similar": `Compare with similar properties:\n1. Price/sqft comparison\n2. Amenities\n3. Developer reputation\n4. Location advantage\n5. Value for money\n\nSimilar Properties:\n${similarCtx}`,
      "price-prediction": `Price prediction:\n1. Current vs historical\n2. Price trend (1-3 years)\n3. 1-year prediction\n4. 3-year prediction\n5. Growth factors\n6. Best time to buy\n\nTrends:\n${trendsCtx}`,
    };

    const userPrompt = actionPrompts[action] || actionPrompts["investment-analysis"];
    const systemPrompt = `You are a senior real estate investment advisor for Indian markets.
Detailed, data-driven analysis with specific numbers. Objective and balanced.
NEVER use emojis. Clean markdown with headers, bullets, bold for key figures.
Include disclaimer: AI-generated, consult registered advisor.
Date: ${new Date().toISOString().split('T')[0]}

${propertyCtx}

AREA TRENDS:
${trendsCtx}`;

    const response = await callAI(systemPrompt, userPrompt);
    if (!response) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-property-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
