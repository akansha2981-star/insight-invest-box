import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any): Promise<any | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const body: any = {
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        stream: false,
        max_tokens: 6000,
      };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) return await resp.json();
      console.error("Lovable AI error:", resp.status);
    } catch (e) { console.error("AI error:", e); }
  }
  return null;
}

function extractToolResult(aiData: any): any {
  const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    try { return JSON.parse(toolCall.function.arguments); } catch {}
  }
  const content = aiData?.choices?.[0]?.message?.content;
  if (content) {
    try { return JSON.parse(content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()); } catch {}
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, stocksData } = await req.json();

    if (action === "refresh") {
      const systemPrompt = `You are a real-time Indian stock market data analyst. Generate current-looking market data for Indian stocks. Use realistic prices, changes, and volumes based on actual market patterns. Date: ${new Date().toISOString().split('T')[0]}. Time: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

      const userPrompt = `Refresh market data for these Indian stocks. Provide realistic, current-sounding data. Stocks: ${stocksData?.map((s: any) => s.symbol).join(', ') || 'RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, BHARTIARTL, SBIN, ITC, KOTAKBANK, LT, AXISBANK, WIPRO, MARUTI, SUNPHARMA, TITAN, ULTRACEMCO, BAJFINANCE, NESTLEIND, ASIANPAINT, HCLTECH, HINDUNILVR, TECHM, TATAMOTORS, TATASTEEL, POWERGRID, NTPC, ONGC, COALINDIA, JSWSTEEL, ADANIPORTS, BAJAJFINSV, DRREDDY, DIVISLAB, HEROMOTOCO, APOLLOHOSP, CIPLA, EICHERMOT, SBILIFE, BPCL, GRASIM'}.

For EACH stock provide:
- symbol, price (realistic INR), change (realistic daily change), changePercent, volume (realistic format like "12.5M"), sector
- Ensure some stocks are gainers and some losers (reflecting real market randomness)
- Use realistic price ranges for each stock based on actual Indian market`;

      const tools = [{
        type: "function",
        function: {
          name: "refresh_stocks",
          description: "Refresh stock market data with latest prices",
          parameters: {
            type: "object",
            properties: {
              stocks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symbol: { type: "string" },
                    name: { type: "string" },
                    price: { type: "number" },
                    change: { type: "number" },
                    changePercent: { type: "number" },
                    volume: { type: "string" },
                    sector: { type: "string" },
                  },
                  required: ["symbol", "name", "price", "change", "changePercent", "volume", "sector"]
                }
              },
              sectorPerformance: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    change: { type: "number" },
                  },
                  required: ["name", "change"]
                }
              },
              fiftyTwoWeekHigh: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symbol: { type: "string" },
                    price: { type: "string" },
                  },
                  required: ["symbol", "price"]
                }
              },
              fiftyTwoWeekLow: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symbol: { type: "string" },
                    price: { type: "string" },
                  },
                  required: ["symbol", "price"]
                }
              },
              lastUpdated: { type: "string" },
            },
            required: ["stocks", "sectorPerformance", "lastUpdated"]
          }
        }
      }];

      const aiData = await callAI(systemPrompt, userPrompt, tools, { type: "function", function: { name: "refresh_stocks" } });
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
    }

    if (action === "summary") {
      const systemPrompt = `You are a senior market analyst at InvestingIQ, India's premier financial platform. Generate a professional, detailed market analysis summary. 

RULES:
- Write in professional financial analyst tone
- Include specific data points, percentages, sector names
- Structure with clear sections
- NO emojis
- Provide actionable insights
- Include risk factors
- Date: ${new Date().toISOString().split('T')[0]}`;

      const stocksList = stocksData?.slice(0, 20)?.map((s: any) => `${s.symbol}: ₹${s.price} (${s.change >= 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%)`).join(', ') || 'Market data not available';

      const userPrompt = `Analyze the current Indian stock market based on this data and generate a comprehensive market summary:

CURRENT STOCK DATA:
${stocksList}

Generate a detailed analysis with:
1. Market Overview (2-3 sentences on overall market direction)
2. Top Performing Sectors (which sectors are leading and why)
3. Key Movers (notable gainers and losers with reasons)
4. Technical Outlook (support/resistance levels for Nifty/Sensex)
5. FII/DII Activity (estimated flows)
6. Risk Factors (what could impact markets)
7. Investment Strategy (what should retail investors do today)
8. Market Sentiment (overall bullish/bearish/neutral with score 0-100)

Be specific with numbers, not vague. Reference actual stock names from the data.`;

      const tools = [{
        type: "function",
        function: {
          name: "market_summary",
          description: "Generate comprehensive market analysis",
          parameters: {
            type: "object",
            properties: {
              overview: { type: "string", description: "2-3 sentence market overview" },
              sentiment: { type: "string", enum: ["Bullish", "Bearish", "Neutral", "Cautiously Bullish", "Cautiously Bearish"] },
              sentimentScore: { type: "number", description: "0-100 score" },
              topSectors: { type: "string", description: "Analysis of top performing sectors" },
              keyMovers: { type: "string", description: "Notable gainers and losers with reasons" },
              technicalOutlook: { type: "string", description: "Nifty/Sensex support resistance levels" },
              fiiDiiActivity: { type: "string", description: "FII/DII flow analysis" },
              riskFactors: { type: "string", description: "Key risks to watch" },
              investmentStrategy: { type: "string", description: "What retail investors should do" },
              keyLevels: {
                type: "object",
                properties: {
                  niftySupport: { type: "string" },
                  niftyResistance: { type: "string" },
                  sensexSupport: { type: "string" },
                  sensexResistance: { type: "string" },
                }
              },
            },
            required: ["overview", "sentiment", "sentimentScore", "topSectors", "keyMovers", "technicalOutlook", "riskFactors", "investmentStrategy"]
          }
        }
      }];

      const aiData = await callAI(systemPrompt, userPrompt, tools, { type: "function", function: { name: "market_summary" } });
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
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-stock-refresh error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
