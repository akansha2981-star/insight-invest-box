import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Symbols to fetch: NSE stocks use BSE:SYMBOL format, indices use their Alpha Vantage names
const SYMBOLS = [
  { symbol: "BSE:SENSEX", displayName: "SENSEX", isIndex: true },
  { symbol: "NSE:NIFTY50", displayName: "NIFTY", isIndex: true },
  { symbol: "NSE:RELIANCE", displayName: "RELIANCE", isIndex: false },
  { symbol: "NSE:TCS", displayName: "TCS", isIndex: false },
  { symbol: "NSE:HDFCBANK", displayName: "HDFC BANK", isIndex: false },
  { symbol: "NSE:INFY", displayName: "INFOSYS", isIndex: false },
  { symbol: "NSE:ICICIBANK", displayName: "ICICI BANK", isIndex: false },
  { symbol: "NSE:BHARTIARTL", displayName: "AIRTEL", isIndex: false },
  { symbol: "NSE:WIPRO", displayName: "WIPRO", isIndex: false },
  { symbol: "NSE:AXISBANK", displayName: "AXIS BANK", isIndex: false },
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

    // Fetch a batch quote for multiple symbols using BATCH_STOCK_QUOTES endpoint
    // Alpha Vantage free tier: 25 requests/day, so we batch
    const symbolList = SYMBOLS.map(s => s.symbol).join(",");
    const url = `https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${encodeURIComponent(symbolList)}&apikey=${ALPHA_VANTAGE_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed: ${response.status}`);
    }

    const data = await response.json();

    // Check for API limit message
    if (data["Information"] || data["Note"]) {
      console.warn("Alpha Vantage limit:", data["Information"] || data["Note"]);
      return new Response(JSON.stringify({ error: "api_limit", message: data["Information"] || data["Note"] }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quotes = data["Stock Quotes"] as Array<{
      "1. symbol": string;
      "2. price": string;
      "3. volume": string;
      "4. timestamp": string;
    }> | undefined;

    if (!quotes || quotes.length === 0) {
      throw new Error("No quotes returned from Alpha Vantage");
    }

    // Map quotes back to our display format
    const result = quotes.map(q => {
      const sym = SYMBOLS.find(s => s.symbol === q["1. symbol"]);
      const price = parseFloat(q["2. price"]) || 0;
      // Alpha Vantage BATCH_STOCK_QUOTES doesn't return previous close for change calculation
      // We'll return raw price and let the frontend calculate simulated change from prev session
      return {
        symbol: q["1. symbol"],
        displayName: sym?.displayName ?? q["1. symbol"],
        price,
        volume: q["3. volume"],
      };
    });

    return new Response(JSON.stringify({ quotes: result }), {
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
