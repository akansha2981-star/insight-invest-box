import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Free tier: 25 req/day, 5 req/min. Fetch only 5 symbols to preserve quota.
// Indian stocks on Alpha Vantage use {SYMBOL}.BSE format
const SYMBOLS = [
  { avSymbol: "RELIANCE.BSE", displayName: "RELIANCE", mockSymbol: "RELIANCE" },
  { avSymbol: "TCS.BSE",      displayName: "TCS",      mockSymbol: "TCS" },
  { avSymbol: "HDFCBANK.BSE", displayName: "HDFC BANK",mockSymbol: "HDFCBANK" },
  { avSymbol: "INFY.BSE",     displayName: "INFOSYS",  mockSymbol: "INFY" },
  { avSymbol: "ICICIBANK.BSE",displayName: "ICICI BANK",mockSymbol: "ICICIBANK" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ALPHA_VANTAGE_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!ALPHA_VANTAGE_KEY) {
      return new Response(JSON.stringify({ error: "ALPHA_VANTAGE_API_KEY not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const sym of SYMBOLS) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym.avSymbol)}&apikey=${ALPHA_VANTAGE_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${sym.avSymbol}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Rate limit / info message check
      if (data["Information"] || data["Note"]) {
        console.warn("Alpha Vantage limit:", data["Information"] || data["Note"]);
        return new Response(JSON.stringify({ error: "api_limit", message: data["Information"] || data["Note"] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const quote = data["Global Quote"];
      if (!quote || !quote["05. price"]) {
        console.warn(`No quote data for ${sym.avSymbol}`, JSON.stringify(data));
        continue;
      }

      const price = parseFloat(quote["05. price"]) || 0;
      const prevClose = parseFloat(quote["08. previous close"]) || price;
      const change = +(price - prevClose).toFixed(2);
      const changePercent = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;

      results.push({
        symbol: sym.mockSymbol,
        displayName: sym.displayName,
        price,
        change,
        changePercent,
      });

      // Small delay between requests to respect 5 req/min rate limit
      await new Promise(r => setTimeout(r, 300));
    }

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "no_data", message: "No quotes returned from Alpha Vantage" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ quotes: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-ticker error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
