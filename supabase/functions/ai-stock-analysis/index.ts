import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { symbol, action } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "Stock symbol is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch stock data from DB
    const { data: stock } = await sb.from("stock_reviews")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .maybeSingle();

    const stockContext = stock
      ? `Stock Data from our DB:\nSymbol: ${stock.symbol}\nCompany: ${stock.company_name}\nSector: ${stock.sector}\nExchange: ${stock.exchange}\nCurrent Price: ₹${stock.current_price}\nTarget Price: ₹${stock.target_price}\nRating: ${stock.rating}\nSummary: ${stock.summary || "N/A"}\nInvestment Thesis: ${stock.investment_thesis || "N/A"}\nRisks: ${stock.risks || "N/A"}\nFinancials: ${JSON.stringify(stock.financials || {})}\nKey Metrics: ${JSON.stringify(stock.key_metrics || {})}`
      : `No data found in our database for ${symbol}. Use your knowledge about this Indian stock.`;

    const actionPrompts: Record<string, string> = {
      "full-analysis": `Provide a comprehensive investment analysis for ${symbol} including:
1. Company Overview & Business Model
2. Financial Health (Revenue, Profit, Margins, Debt)
3. Competitive Position & Market Share
4. Growth Drivers & Catalysts
5. Valuation Analysis (P/E, P/B, DCF estimate)
6. Risk Factors
7. Investment Recommendation with Target Price
Format with clear headers and bullet points.`,
      "risk-assessment": `Provide a detailed risk assessment for ${symbol}:
1. Business Risks (competition, regulatory, cyclical)
2. Financial Risks (debt, liquidity, margin pressure)
3. Market Risks (valuation, sentiment, sector rotation)
4. Macro Risks (interest rates, inflation, geopolitical)
5. Risk Rating (Low/Medium/High) with explanation
Format with clear headers.`,
      "peer-comparison": `Compare ${symbol} with its top 3-4 peers in the same sector:
1. List key competitors
2. Compare on: Revenue, PAT, P/E, ROCE, Market Cap
3. Competitive advantages and disadvantages
4. Which stock offers best value?
Present comparison in a structured format.`,
      "earnings-preview": `Provide an earnings preview/analysis for ${symbol}:
1. Recent quarterly results summary
2. Revenue and profit trends (YoY, QoQ)
3. Key metrics to watch
4. Analyst consensus estimates
5. Potential catalysts or concerns
Format clearly with data points.`,
    };

    const userPrompt = actionPrompts[action] || actionPrompts["full-analysis"];

    const systemPrompt = `You are a senior equity research analyst specializing in Indian stock markets (NSE/BSE).
Provide detailed, data-driven analysis with specific numbers and percentages.
Use professional financial language but keep it accessible.
NEVER use emojis. Use clean markdown formatting with headers (##), bullet points, and bold for key figures.
Always include a disclaimer that this is AI-generated analysis and not a buy/sell recommendation.

${stockContext}`;

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-stock-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
