import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { cities } = await req.json();
    const cityList = cities || ["Mumbai", "Bengaluru", "Gurugram", "Pune", "Noida", "Hyderabad", "Chennai", "Thane"];

    const prompt = `You are a real estate market analyst for India. Provide current price trends for the following cities: ${cityList.join(", ")}.

For each city, return data in this exact JSON format. Return ONLY the JSON array, no other text:
[
  {
    "city": "CityName",
    "locality": "Top locality name",
    "avg_price_sqft": 12000,
    "change_pct": 8.5,
    "ai_insights": "Brief 1-sentence market insight"
  }
]

Use realistic 2026 Indian real estate prices in INR per sq.ft. Include popular localities.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a real estate data analyst. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "update_price_trends",
            description: "Update price trends for Indian cities",
            parameters: {
              type: "object",
              properties: {
                trends: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      city: { type: "string" },
                      locality: { type: "string" },
                      avg_price_sqft: { type: "number" },
                      change_pct: { type: "number" },
                      ai_insights: { type: "string" }
                    },
                    required: ["city", "locality", "avg_price_sqft", "change_pct", "ai_insights"]
                  }
                }
              },
              required: ["trends"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "update_price_trends" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { trends } = JSON.parse(toolCall.function.arguments);

    // Upsert trends into database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let updated = 0;
    for (const trend of trends) {
      // Check if exists
      const { data: existing } = await supabase
        .from("re_price_trends")
        .select("id")
        .eq("city", trend.city)
        .maybeSingle();

      if (existing) {
        await supabase.from("re_price_trends").update({
          locality: trend.locality,
          avg_price_sqft: trend.avg_price_sqft,
          change_pct: trend.change_pct,
          ai_insights: trend.ai_insights,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("re_price_trends").insert(trend);
      }
      updated++;
    }

    return new Response(JSON.stringify({ success: true, updated, trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("re-price-trends-ai error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
