import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OPENAI_USAGE_PAUSED } from "../_shared/openaiUsage.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function traceToLangSmith(runData: { name: string; run_type: string; inputs: Record<string, unknown>; outputs?: Record<string, unknown>; error?: string; start_time: string; extra?: Record<string, unknown> }) {
  const LANGSMITH_KEY = Deno.env.get("LANGSMITH_API_KEY");
  if (!LANGSMITH_KEY) return;
  try {
    await fetch("https://api.smith.langchain.com/runs", {
      method: "POST",
      headers: { "x-api-key": LANGSMITH_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), ...runData, outputs: runData.outputs || {}, error: runData.error || null, end_time: new Date().toISOString(), extra: { ...runData.extra, source: "investingiq-stock-analysis" }, session_name: "investingiq-chatbot" }),
    });
  } catch (e) { console.error("LangSmith trace error:", e instanceof Error ? e.message : e); }
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<Response | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview"];
    for (const model of models) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true }),
        });
        if (resp.ok) return resp;
        await resp.text().catch(() => {});
      } catch (e) { console.error(`Lovable ${model} error:`, e instanceof Error ? e.message : e); }
    }
  }
  const OPENAI_KEY = OPENAI_USAGE_PAUSED ? undefined : Deno.env.get("OPENAI_API_KEY");
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
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = new Date().toISOString();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { symbol, action } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "Stock symbol required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: stock } = await sb.from("stock_reviews").select("*").eq("symbol", symbol.toUpperCase()).maybeSingle();

    const stockContext = stock
      ? `Stock Data:\nSymbol: ${stock.symbol}\nCompany: ${stock.company_name}\nSector: ${stock.sector}\nExchange: ${stock.exchange}\nCMP: ₹${stock.current_price}\nTarget: ₹${stock.target_price}\nRating: ${stock.rating}\nSummary: ${stock.summary || "N/A"}\nThesis: ${stock.investment_thesis || "N/A"}\nRisks: ${stock.risks || "N/A"}\nFinancials: ${JSON.stringify(stock.financials || {})}\nMetrics: ${JSON.stringify(stock.key_metrics || {})}`
      : `No data in DB for ${symbol}. Use your knowledge about this Indian stock.`;

    const actionPrompts: Record<string, string> = {
      "full-analysis": `Comprehensive investment analysis for ${symbol}:\n1. Company Overview\n2. Financial Health\n3. Competitive Position\n4. Growth Drivers\n5. Valuation Analysis\n6. Risk Factors\n7. Recommendation with Target Price`,
      "risk-assessment": `Detailed risk assessment for ${symbol}:\n1. Business Risks\n2. Financial Risks\n3. Market Risks\n4. Macro Risks\n5. Risk Rating (Low/Medium/High)`,
      "peer-comparison": `Compare ${symbol} with top 3-4 peers:\n1. Key competitors\n2. Compare Revenue, PAT, P/E, ROCE, Market Cap\n3. Advantages/disadvantages\n4. Best value?`,
      "earnings-preview": `Earnings analysis for ${symbol}:\n1. Recent results\n2. Revenue/profit trends\n3. Key metrics\n4. Consensus estimates\n5. Catalysts/concerns`,
    };

    const userPrompt = actionPrompts[action] || actionPrompts["full-analysis"];
    const systemPrompt = `You are a senior equity research analyst specializing in Indian stock markets (NSE/BSE).
Provide detailed, data-driven analysis with specific numbers. Professional language, accessible.
NEVER use emojis. Use clean markdown with headers (##), bullets, bold for key figures.
Include disclaimer: AI-generated analysis, not a buy/sell recommendation.
Current date: ${new Date().toISOString().split('T')[0]}

${stockContext}`;

    const response = await callAI(systemPrompt, userPrompt);

    traceToLangSmith({ name: "stock-analysis", run_type: "llm", inputs: { symbol, action }, outputs: { responded: !!response, hasDbData: !!stock }, start_time: startTime, extra: { provider: "lovable-ai-gemini" } });

    if (!response) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-stock-analysis error:", e);
    traceToLangSmith({ name: "stock-analysis-error", run_type: "chain", inputs: {}, error: e instanceof Error ? e.message : "Unknown", start_time: startTime });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
