import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OPENAI_USAGE_PAUSED } from "../_shared/openaiUsage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAINonStream(systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any): Promise<any | null> {
  const OPENAI_KEY = OPENAI_USAGE_PAUSED ? undefined : Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const body: any = { model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) return await resp.json();
      await resp.text().catch(() => {});
    } catch (e) { console.error("OpenAI error:", e instanceof Error ? e.message : e); }
  }
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const body: any = { model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) return await resp.json();
      await resp.text().catch(() => {});
    } catch (e) { console.error("Lovable AI error:", e instanceof Error ? e.message : e); }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cities } = await req.json();
    const cityList = cities || ["Mumbai", "Bengaluru", "Gurugram", "Pune", "Noida", "Hyderabad", "Chennai", "Thane"];

    const prompt = `Provide current price trends for: ${cityList.join(", ")}. Use realistic 2026 Indian real estate prices in INR/sqft. Include popular localities.`;
    const tools = [{
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
    }];

    const aiData = await callAINonStream(
      "You are a real estate data analyst. Return only valid JSON arrays.",
      prompt,
      tools,
      { type: "function", function: { name: "update_price_trends" } }
    );

    if (!aiData) {
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { trends } = JSON.parse(toolCall.function.arguments);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let updated = 0;
    for (const trend of trends) {
      const { data: existing } = await supabase.from("re_price_trends").select("id").eq("city", trend.city).maybeSingle();
      if (existing) {
        await supabase.from("re_price_trends").update({ locality: trend.locality, avg_price_sqft: trend.avg_price_sqft, change_pct: trend.change_pct, ai_insights: trend.ai_insights, updated_at: new Date().toISOString() }).eq("id", existing.id);
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
