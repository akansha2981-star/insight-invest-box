import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Angel One SmartAPI endpoints
const AUTH_URL = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword";
const MARKET_DATA_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote";
const LOGOUT_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/logout";

const CACHE_TTL_MS = 60_000; // 60 seconds — reduces Angel One rate limiting

// In-memory cache
let cachedResponse: { quotes: any[]; source: string; live: boolean; cachedAt: number } | null = null;

function emptyPayload(reason: string) {
  return {
    quotes: [],
    source: "none",
    live: false,
    fallback: false,
    reason,
  };
}

// Token symbols mapped to Angel One exchange tokens
const STOCK_TOKENS: Record<string, { token: string; exchange: string; symbol: string; displayName: string }> = {
  "RELIANCE":  { token: "2885",  exchange: "NSE", symbol: "RELIANCE-EQ",  displayName: "RELIANCE" },
  "TCS":       { token: "11536", exchange: "NSE", symbol: "TCS-EQ",       displayName: "TCS" },
  "HDFCBANK":  { token: "1333",  exchange: "NSE", symbol: "HDFCBANK-EQ",  displayName: "HDFC BANK" },
  "INFY":      { token: "1594",  exchange: "NSE", symbol: "INFY-EQ",      displayName: "INFOSYS" },
  "ICICIBANK": { token: "4963",  exchange: "NSE", symbol: "ICICIBANK-EQ", displayName: "ICICI BANK" },
  "BHARTIARTL":{ token: "10604", exchange: "NSE", symbol: "BHARTIARTL-EQ",displayName: "AIRTEL" },
  "WIPRO":     { token: "3787",  exchange: "NSE", symbol: "WIPRO-EQ",     displayName: "WIPRO" },
  "AXISBANK":  { token: "5900",  exchange: "NSE", symbol: "AXISBANK-EQ",  displayName: "AXIS BANK" },
  "MARUTI":    { token: "10999", exchange: "NSE", symbol: "MARUTI-EQ",    displayName: "MARUTI" },
  "SUNPHARMA": { token: "3351",  exchange: "NSE", symbol: "SUNPHARMA-EQ", displayName: "SUN PHARMA" },
  "BAJFINANCE":{ token: "317",   exchange: "NSE", symbol: "BAJFINANCE-EQ",displayName: "BAJ FINANCE" },
  "LT":        { token: "11483", exchange: "NSE", symbol: "LT-EQ",        displayName: "L&T" },
  "ITC":       { token: "1660",  exchange: "NSE", symbol: "ITC-EQ",       displayName: "ITC" },
  "KOTAKBANK": { token: "1922",  exchange: "NSE", symbol: "KOTAKBANK-EQ", displayName: "KOTAK BANK" },
  "SBIN":      { token: "3045",  exchange: "NSE", symbol: "SBIN-EQ",      displayName: "SBI" },
  "HCLTECH":   { token: "7229",  exchange: "NSE", symbol: "HCLTECH-EQ",   displayName: "HCL TECH" },
  "TITAN":     { token: "3506",  exchange: "NSE", symbol: "TITAN-EQ",     displayName: "TITAN" },
  "ULTRACEMCO":{ token: "11532", exchange: "NSE", symbol: "ULTRACEMCO-EQ",displayName: "ULTRACEMCO" },
  "NESTLEIND": { token: "17963", exchange: "NSE", symbol: "NESTLEIND-EQ", displayName: "NESTLE INDIA" },
  "ASIANPAINT":{ token: "236",   exchange: "NSE", symbol: "ASIANPAINT-EQ",displayName: "ASIAN PAINTS" },
  "HINDUNILVR":{ token: "1394",  exchange: "NSE", symbol: "HINDUNILVR-EQ",displayName: "HIND UNILEVER" },
  "TECHM":     { token: "13538", exchange: "NSE", symbol: "TECHM-EQ",     displayName: "TECH MAHINDRA" },
  "TATASTEEL": { token: "3499",  exchange: "NSE", symbol: "TATASTEEL-EQ", displayName: "TATA STEEL" },
  "POWERGRID": { token: "14977", exchange: "NSE", symbol: "POWERGRID-EQ", displayName: "POWER GRID" },
  "NTPC":      { token: "11630", exchange: "NSE", symbol: "NTPC-EQ",      displayName: "NTPC" },
  "ONGC":      { token: "2475",  exchange: "NSE", symbol: "ONGC-EQ",      displayName: "ONGC" },
  "COALINDIA": { token: "20374", exchange: "NSE", symbol: "COALINDIA-EQ", displayName: "COAL INDIA" },
  "JSWSTEEL":  { token: "11723", exchange: "NSE", symbol: "JSWSTEEL-EQ",  displayName: "JSW STEEL" },
  "ADANIPORTS":{ token: "15083", exchange: "NSE", symbol: "ADANIPORTS-EQ",displayName: "ADANI PORTS" },
  "BAJAJFINSV":{ token: "16675", exchange: "NSE", symbol: "BAJAJFINSV-EQ",displayName: "BAJAJ FINSERV" },
  "DRREDDY":   { token: "881",   exchange: "NSE", symbol: "DRREDDY-EQ",   displayName: "DR REDDY" },
  "DIVISLAB":  { token: "10940", exchange: "NSE", symbol: "DIVISLAB-EQ",  displayName: "DIVIS LAB" },
  "HEROMOTOCO":{ token: "1348",  exchange: "NSE", symbol: "HEROMOTOCO-EQ",displayName: "HERO MOTOCORP" },
  "APOLLOHOSP":{ token: "157",   exchange: "NSE", symbol: "APOLLOHOSP-EQ",displayName: "APOLLO HOSP" },
  "CIPLA":     { token: "694",   exchange: "NSE", symbol: "CIPLA-EQ",     displayName: "CIPLA" },
  "EICHERMOT": { token: "910",   exchange: "NSE", symbol: "EICHERMOT-EQ", displayName: "EICHER MOTORS" },
  "SBILIFE":   { token: "21808", exchange: "NSE", symbol: "SBILIFE-EQ",   displayName: "SBI LIFE" },
  "BPCL":      { token: "526",   exchange: "NSE", symbol: "BPCL-EQ",      displayName: "BPCL" },
  "GRASIM":    { token: "1232",  exchange: "NSE", symbol: "GRASIM-EQ",    displayName: "GRASIM" },
  "ADANIENT":  { token: "25",    exchange: "NSE", symbol: "ADANIENT-EQ",  displayName: "ADANI ENT" },
  "BEL":       { token: "383",   exchange: "NSE", symbol: "BEL-EQ",       displayName: "BEL" },
  "M&M":       { token: "2031",  exchange: "NSE", symbol: "M&M-EQ",       displayName: "M&M" },
  "TRENT":     { token: "1964",  exchange: "NSE", symbol: "TRENT-EQ",     displayName: "TRENT" },
  "SHRIRAMFIN":{ token: "4306",  exchange: "NSE", symbol: "SHRIRAMFIN-EQ",displayName: "SHRIRAM FIN" },
  "HDFCLIFE":  { token: "467",   exchange: "NSE", symbol: "HDFCLIFE-EQ",  displayName: "HDFC LIFE" },
  "JIOFIN":    { token: "18143", exchange: "NSE", symbol: "JIOFIN-EQ",    displayName: "JIO FIN" },
  "TATACONSUM":{ token: "3432",  exchange: "NSE", symbol: "TATACONSUM-EQ",displayName: "TATA CONSUMER" },
  "INDUSINDBK":{ token: "5258",  exchange: "NSE", symbol: "INDUSINDBK-EQ",displayName: "INDUSIND BANK" },
  "NIFTY":     { token: "99926000", exchange: "NSE", symbol: "NIFTY",     displayName: "NIFTY 50" },
  "BANKNIFTY": { token: "99926009", exchange: "NSE", symbol: "BANKNIFTY", displayName: "BANK NIFTY" },
  "SENSEX":    { token: "99919000", exchange: "BSE", symbol: "SENSEX",    displayName: "SENSEX" },
  "NIFTYIT":   { token: "99926008", exchange: "NSE", symbol: "NIFTY IT",  displayName: "NIFTY IT" },
};

async function generateTOTP(secret: string): Promise<string> {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const upperSecret = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bits: number[] = [];
  for (const c of upperSecret) {
    const val = base32Chars.indexOf(c);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) bits.push((val >> i) & 1);
  }
  const keyBytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
    keyBytes[i] = byte;
  }
  const counter = Math.floor(Date.now() / 30000);
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = sig[sig.length - 1] & 0x0f;
  const code = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return String(code % 1000000).padStart(6, "0");
}

async function angelOneLogin(apiKey: string, clientId: string, pin: string, totpSecret: string): Promise<string | null> {
  const totp = await generateTOTP(totpSecret);
  console.log("Generated TOTP for client:", clientId);
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "Accept": "application/json",
      "X-UserType": "USER", "X-SourceID": "WEB",
      "X-ClientLocalIP": "127.0.0.1", "X-ClientPublicIP": "127.0.0.1",
      "X-MACAddress": "00:00:00:00:00:00", "X-PrivateKey": apiKey,
    },
    body: JSON.stringify({ clientcode: clientId, password: pin, totp }),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data?.data?.jwtToken) { console.log("Angel One login successful"); return data.data.jwtToken; }
    console.error("Angel One login failed:", data?.message);
  } catch { console.error("Angel One non-JSON response:", text.substring(0, 300)); }
  return null;
}

async function fetchMarketQuotes(apiKey: string, jwtToken: string): Promise<any[]> {
  const exchangeTokens: Record<string, string[]> = {};
  for (const info of Object.values(STOCK_TOKENS)) {
    if (!exchangeTokens[info.exchange]) exchangeTokens[info.exchange] = [];
    if (!exchangeTokens[info.exchange].includes(info.token)) exchangeTokens[info.exchange].push(info.token);
  }
  const res = await fetch(MARKET_DATA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "Accept": "application/json",
      "X-UserType": "USER", "X-SourceID": "WEB",
      "X-ClientLocalIP": "127.0.0.1", "X-ClientPublicIP": "127.0.0.1",
      "X-MACAddress": "00:00:00:00:00:00", "X-PrivateKey": apiKey,
      "Authorization": `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ mode: "FULL", exchangeTokens }),
  });
  const data = await res.json();
  if (!data?.data?.fetched || !Array.isArray(data.data.fetched)) {
    console.error("Market data fetch failed:", data?.message || JSON.stringify(data));
    return [];
  }
  const results: any[] = [];
  for (const item of data.data.fetched) {
    const entry = Object.entries(STOCK_TOKENS).find(([, v]) => v.token === item.symbolToken);
    if (!entry) continue;
    const [symbol, info] = entry;
    const ltp = parseFloat(item.ltp) || 0;
    const close = parseFloat(item.close) || ltp;
    const change = +(ltp - close).toFixed(2);
    const changePercent = close ? +((change / close) * 100).toFixed(2) : 0;
    results.push({
      symbol, displayName: info.displayName, price: ltp, change, changePercent,
      high: parseFloat(item.high) || 0, low: parseFloat(item.low) || 0,
      open: parseFloat(item.open) || 0, exchange: info.exchange,
    });
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Return cached data if fresh
    if (cachedResponse && (Date.now() - cachedResponse.cachedAt) < CACHE_TTL_MS) {
      console.log("Returning cached data, age:", Math.round((Date.now() - cachedResponse.cachedAt) / 1000), "s");
      return new Response(JSON.stringify({ quotes: cachedResponse.quotes, source: cachedResponse.source, live: cachedResponse.live, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANGELONE_API_KEY");
    const clientId = Deno.env.get("ANGELONE_CLIENT_ID");
    const pin = Deno.env.get("ANGELONE_PIN");
    const totpSecret = Deno.env.get("ANGELONE_TOTP_SECRET");

    if (!apiKey || !clientId || !pin || !totpSecret) {
      return new Response(
        JSON.stringify(emptyPayload("missing_config")),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwtToken = await angelOneLogin(apiKey, clientId, pin, totpSecret);
    if (!jwtToken) {
      // If we have stale cache, return it instead of failing
      if (cachedResponse) {
        console.log("Auth failed, returning stale cache");
        return new Response(JSON.stringify({ quotes: cachedResponse.quotes, source: cachedResponse.source, live: cachedResponse.live, cached: true, stale: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify(emptyPayload("auth_failed")),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quotes = await fetchMarketQuotes(apiKey, jwtToken);

    // Best-effort logout
    try {
      await fetch(LOGOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-PrivateKey": apiKey, "Authorization": `Bearer ${jwtToken}` },
        body: JSON.stringify({ clientcode: clientId }),
      });
    } catch { /* ignore */ }

    if (quotes.length === 0) {
      if (cachedResponse) {
        return new Response(JSON.stringify({ quotes: cachedResponse.quotes, source: cachedResponse.source, live: cachedResponse.live, cached: true, stale: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify(emptyPayload("no_data")),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update cache
    cachedResponse = { quotes, source: "angelone", live: true, cachedAt: Date.now() };
    console.log("Cache updated with", quotes.length, "quotes");

    return new Response(JSON.stringify({ quotes, source: "angelone", live: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-ticker error:", e);
    if (cachedResponse) {
      return new Response(JSON.stringify({ quotes: cachedResponse.quotes, source: cachedResponse.source, live: cachedResponse.live, cached: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
