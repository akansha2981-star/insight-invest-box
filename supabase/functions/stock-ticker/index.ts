import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// NSE India public API - no key required
// Indices: https://www.nseindia.com/api/allIndices
// Stock quote: https://www.nseindia.com/api/quote-equity?symbol=RELIANCE

const STOCK_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"];

const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.nseindia.com/",
  "Connection": "keep-alive",
  "Cookie": "",
};

async function fetchNSEWithCookie() {
  // Step 1: Get cookies from NSE homepage (required for API calls)
  const homeRes = await fetch("https://www.nseindia.com/", { headers: NSE_HEADERS });
  const cookies = homeRes.headers.get("set-cookie") ?? "";
  const cookieHeader = cookies.split(",").map(c => c.split(";")[0].trim()).join("; ");
  
  const apiHeaders = { ...NSE_HEADERS, "Cookie": cookieHeader };

  const results: any[] = [];

  // Step 2: Fetch stock quotes
  for (const symbol of STOCK_SYMBOLS) {
    try {
      const res = await fetch(`https://www.nseindia.com/api/quote-equity?symbol=${symbol}`, {
        headers: apiHeaders,
      });
      if (!res.ok) continue;
      const data = await res.json();
      const pd = data?.priceInfo;
      if (!pd) continue;
      const price = pd.lastPrice ?? pd.close ?? 0;
      const prevClose = pd.previousClose ?? price;
      const change = +(price - prevClose).toFixed(2);
      const changePercent = prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;
      results.push({ symbol, displayName: symbol, price, change, changePercent });
      await new Promise(r => setTimeout(r, 200));
    } catch {
      continue;
    }
  }

  // Step 3: Fetch indices (Sensex from BSE, Nifty from NSE)
  try {
    const indRes = await fetch("https://www.nseindia.com/api/allIndices", { headers: apiHeaders });
    if (indRes.ok) {
      const indData = await indRes.json();
      const nifty = indData?.data?.find((d: any) => d.index === "NIFTY 50");
      if (nifty) {
        results.push({
          symbol: "NIFTY",
          displayName: "NIFTY 50",
          price: +nifty.last.toFixed(2),
          change: +nifty.change.toFixed(2),
          changePercent: +nifty.percentChange.toFixed(2),
        });
      }
      const bankNifty = indData?.data?.find((d: any) => d.index === "NIFTY BANK");
      if (bankNifty) {
        results.push({
          symbol: "BANKNIFTY",
          displayName: "BANK NIFTY",
          price: +bankNifty.last.toFixed(2),
          change: +bankNifty.change.toFixed(2),
          changePercent: +bankNifty.percentChange.toFixed(2),
        });
      }
    }
  } catch {
    // indices fetch failed
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const quotes = await fetchNSEWithCookie();

    if (quotes.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_data", message: "Could not fetch live data from NSE. Market may be closed." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ quotes, source: "nse_india", live: true }), {
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
