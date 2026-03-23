import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAINonStream(systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any): Promise<any | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const body: any = {
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        stream: false,
      };
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
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const body: any = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      };
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
  return null;
}

function extractToolResult(aiData: any): any {
  const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    try { return JSON.parse(toolCall.function.arguments); } catch { }
  }
  const content = aiData?.choices?.[0]?.message?.content;
  if (content) {
    try {
      const cleaned = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      return JSON.parse(cleaned);
    } catch { }
  }
  return null;
}

const ACTIONS: Record<string, { system: string; prompt: (ctx: any) => string; tools: any[]; toolName: string }> = {
  "generate-breaking-news": {
    system: "You are a financial news editor for InvestingIQ, an Indian finance platform. Generate breaking news headlines about Indian markets, economy, stocks. Current, relevant, factual tone. No emojis.",
    prompt: (ctx) => `Generate ${ctx.count || 3} breaking news headlines for Indian financial markets. Each should be concise (under 100 chars), current-sounding, professional. Date: ${new Date().toISOString().split('T')[0]}`,
    tools: [{
      type: "function",
      function: {
        name: "generate_headlines",
        description: "Generate breaking news headlines",
        parameters: {
          type: "object",
          properties: {
            headlines: { type: "array", items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } }
          },
          required: ["headlines"]
        }
      }
    }],
    toolName: "generate_headlines",
  },
  "generate-banner": {
    system: "You are a marketing copywriter for InvestingIQ, an Indian finance/real estate platform. Create compelling banner content. No emojis. Professional.",
    prompt: (ctx) => `Generate a homepage banner for type: ${ctx.type || "hero"}. Include title (compelling, 6-10 words), subtitle (supporting text, 15-25 words), cta_label (2-3 words), cta_url (internal link like /markets or /real-estate). Topic: Indian markets/investing/real estate. Date: ${new Date().toISOString().split('T')[0]}`,
    tools: [{
      type: "function",
      function: {
        name: "generate_banner",
        description: "Generate banner content",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            cta_label: { type: "string" },
            cta_url: { type: "string" },
          },
          required: ["title", "subtitle", "cta_label", "cta_url"]
        }
      }
    }],
    toolName: "generate_banner",
  },
  "generate-stock-review": {
    system: "You are a senior equity research analyst for Indian markets (NSE/BSE). Generate comprehensive stock analysis. Use realistic data. No emojis.",
    prompt: (ctx) => `Generate a stock review for ${ctx.symbol || "a trending Indian stock"}. Include symbol, company_name, sector, exchange, current_price (realistic), target_price, rating (BUY/HOLD/SELL), summary (2-3 sentences), investment_thesis (detailed paragraph), risks (key risk factors), and tags. Date: ${new Date().toISOString().split('T')[0]}`,
    tools: [{
      type: "function",
      function: {
        name: "generate_stock_review",
        description: "Generate stock review data",
        parameters: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            company_name: { type: "string" },
            sector: { type: "string" },
            exchange: { type: "string" },
            current_price: { type: "number" },
            target_price: { type: "number" },
            rating: { type: "string" },
            summary: { type: "string" },
            investment_thesis: { type: "string" },
            risks: { type: "string" },
            tags: { type: "string" },
            analyst_name: { type: "string" },
          },
          required: ["symbol", "company_name", "sector", "rating", "summary"]
        }
      }
    }],
    toolName: "generate_stock_review",
  },
  "generate-article-ideas": {
    system: "You are an editorial strategist for InvestingIQ. Suggest trending article topics about Indian markets, economy, stocks, real estate, mutual funds, crypto. No emojis.",
    prompt: (ctx) => `Suggest 5 trending article topics for category: ${ctx.category || "Markets"}. Each with a headline and brief description. Date: ${new Date().toISOString().split('T')[0]}`,
    tools: [{
      type: "function",
      function: {
        name: "suggest_topics",
        description: "Suggest article topics",
        parameters: {
          type: "object",
          properties: {
            topics: { type: "array", items: { type: "object", properties: { headline: { type: "string" }, description: { type: "string" }, category: { type: "string" } }, required: ["headline", "description"] } }
          },
          required: ["topics"]
        }
      }
    }],
    toolName: "suggest_topics",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, context } = await req.json();
    const config = ACTIONS[action];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await callAINonStream(
      config.system,
      config.prompt(context || {}),
      config.tools,
      { type: "function", function: { name: config.toolName } }
    );

    if (!aiData) {
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = extractToolResult(aiData);
    if (!result) {
      return new Response(JSON.stringify({ error: "AI returned invalid data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-admin-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
