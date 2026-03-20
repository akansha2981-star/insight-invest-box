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

    const { slug, action } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "Property slug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: property } = await sb.from("properties").select("*").eq("slug", slug).maybeSingle();

    // Fetch price trends for context
    const city = property?.city || "";
    const { data: trends } = await sb.from("re_price_trends")
      .select("*")
      .ilike("city", `%${city}%`)
      .limit(5);

    // Fetch similar properties for comparison
    const { data: similar } = await sb.from("properties")
      .select("title,city,locality,price,price_display,bhk,property_type,area_sqft,developer_name,slug")
      .eq("status", "active")
      .eq("city", city)
      .neq("slug", slug)
      .limit(5);

    const propertyCtx = property
      ? `Property: ${property.title}
City: ${property.city}, Locality: ${property.locality || "N/A"}
Price: ${property.price_display || "₹" + property.price}
Type: ${property.bhk || "-"} BHK ${property.property_type}
Area: ${property.area_sqft || "N/A"} sqft
Developer: ${property.developer_name || "N/A"}
Possession: ${property.possession_status || "N/A"}
Amenities: ${(property.amenities || []).join(", ") || "N/A"}
ROI Projection: ${property.roi_projection || "N/A"}
Investment Plan: ${property.investment_plan || "N/A"}
RERA: ${property.rera_id || "N/A"}`
      : `No property found for slug: ${slug}`;

    const trendsCtx = (trends || []).map(t =>
      `${t.city}${t.locality ? "/" + t.locality : ""}: ₹${t.avg_price_sqft}/sqft, ${t.change_pct}% change. ${t.ai_insights || ""}`
    ).join("\n") || "No trend data available.";

    const similarCtx = (similar || []).map(p =>
      `${p.title} | ${p.city}/${p.locality} | ${p.price_display || "₹" + p.price} | ${p.bhk} BHK | ${p.area_sqft} sqft | by ${p.developer_name}`
    ).join("\n") || "No similar properties found.";

    const actionPrompts: Record<string, string> = {
      "investment-analysis": `Provide a detailed investment analysis for this property:
1. Value Assessment — Is the price fair for the area?
2. ROI Potential — Expected rental yield and capital appreciation
3. Location Analysis — Connectivity, infrastructure, growth potential
4. Developer Credibility
5. Risk Factors
6. Final Verdict — Buy/Hold/Wait with reasoning
Use specific numbers and percentages.`,
      "locality-insights": `Provide comprehensive locality insights for ${property?.locality || property?.city}:
1. Infrastructure & Connectivity (metro, highways, airport)
2. Social Infrastructure (schools, hospitals, malls)
3. Employment Hubs nearby
4. Price Trends — historical and projected
5. Upcoming Developments that could impact prices
6. Livability Score (1-10) with reasoning`,
      "compare-similar": `Compare this property with similar options in the area:
1. Price per sqft comparison
2. Amenities comparison
3. Developer reputation comparison
4. Location advantage comparison
5. Value for money ranking
6. Which property offers the best deal and why?

Similar Properties:
${similarCtx}`,
      "price-prediction": `Provide price trend analysis and predictions for this property/locality:
1. Current market price vs historical prices
2. Price trend (last 1-3 years)
3. 1-year price prediction with confidence level
4. 3-year price prediction
5. Factors that could accelerate or slow price growth
6. Best time to buy assessment

Price Trends Data:
${trendsCtx}`,
    };

    const userPrompt = actionPrompts[action] || actionPrompts["investment-analysis"];

    const systemPrompt = `You are a senior real estate investment advisor specializing in Indian real estate markets.
Provide detailed, data-driven property analysis with specific numbers.
Reference actual market data when available. Be objective and balanced.
NEVER use emojis. Use clean markdown formatting with headers (##), bullet points, and bold for key figures.
Include a disclaimer that this is AI-generated analysis and users should consult a registered advisor.

${propertyCtx}

AREA PRICE TRENDS:
${trendsCtx}`;

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
          { role: "user", content: userPrompt },
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
    console.error("ai-property-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
