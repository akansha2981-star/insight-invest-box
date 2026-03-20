import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Angel One SmartAPI endpoints
const AUTH_URL = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword";
const MARKET_DATA_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote";
const LOGOUT_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/logout";

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
  "NIFTY":     { token: "99926000", exchange: "NSE", symbol: "NIFTY",     displayName: "NIFTY 50" },
  "BANKNIFTY": { token: "99926009", exchange: "NSE", symbol: "BANKNIFTY", displayName: "BANK NIFTY" },
  "SENSEX":    { token: "99919000", exchange: "BSE", symbol: "SENSEX",    displayName: "SENSEX" },
};

// Generate TOTP using the secret key (RFC 6238)
async function generateTOTP(secret: string): Promise<string> {
  // Base32 decode
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

  // Time counter (30-second window)
  const counter = Math.floor(Date.now() / 30000);
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  // HMAC-SHA1
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));

  // Dynamic truncation
  const offset = sig[sig.length - 1] & 0x0f;
  const code = ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3];
  return String(code % 1000000).padStart(6, "0");
}

async function angelOneLogin(apiKey: string, clientId: string, pin: string, totpSecret: string): Promise<string | null> {
  const totp = await generateTOTP(totpSecret);
  console.log("Generated TOTP, attempting Angel One login for client:", clientId);

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": "127.0.0.1",
      "X-ClientPublicIP": "127.0.0.1",
      "X-MACAddress": "00:00:00:00:00:00",
      "X-PrivateKey": apiKey,
    },
    body: JSON.stringify({ clientcode: clientId, password: pin, totp }),
  });

  const data = await res.json();
  if (data?.data?.jwtToken) {
    console.log("Angel One login successful");
    return data.data.jwtToken;
  }
  console.error("Angel One login failed:", data?.message || JSON.stringify(data));
  return null;
}

async function fetchMarketQuotes(apiKey: string, jwtToken: string): Promise<any[]> {
  const exchangeTokens: Record<string, string[]> = {};
  for (const info of Object.values(STOCK_TOKENS)) {
    if (!exchangeTokens[info.exchange]) exchangeTokens[info.exchange] = [];
    exchangeTokens[info.exchange].push(info.token);
  }

  const res = await fetch(MARKET_DATA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": "127.0.0.1",
      "X-ClientPublicIP": "127.0.0.1",
      "X-MACAddress": "00:00:00:00:00:00",
      "X-PrivateKey": apiKey,
      "Authorization": `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({
      mode: "FULL",
      exchangeTokens,
    }),
  });

  const data = await res.json();
  if (!data?.data?.fetched || !Array.isArray(data.data.fetched)) {
    console.error("Market data fetch failed:", data?.message || JSON.stringify(data));
    return [];
  }

  const results: any[] = [];
  for (const item of data.data.fetched) {
    const token = item.symbolToken;
    // Find our mapping
    const entry = Object.entries(STOCK_TOKENS).find(([, v]) => v.token === token);
    if (!entry) continue;

    const [symbol, info] = entry;
    const ltp = parseFloat(item.ltp) || 0;
    const close = parseFloat(item.close) || ltp;
    const change = +(ltp - close).toFixed(2);
    const changePercent = close ? +((change / close) * 100).toFixed(2) : 0;
    const high = parseFloat(item.high) || 0;
    const low = parseFloat(item.low) || 0;
    const open = parseFloat(item.open) || 0;

    results.push({
      symbol,
      displayName: info.displayName,
      price: ltp,
      change,
      changePercent,
      high,
      low,
      open,
      exchange: info.exchange,
    });
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANGELONE_API_KEY");
    const clientId = Deno.env.get("ANGELONE_CLIENT_ID");
    const pin = Deno.env.get("ANGELONE_PIN");
    const totpSecret = Deno.env.get("ANGELONE_TOTP_SECRET");

    if (!apiKey || !clientId || !pin || !totpSecret) {
      return new Response(
        JSON.stringify({ error: "missing_config", message: "Angel One API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate
    const jwtToken = await angelOneLogin(apiKey, clientId, pin, totpSecret);
    if (!jwtToken) {
      return new Response(
        JSON.stringify({ error: "auth_failed", message: "Angel One authentication failed. Check credentials." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch quotes
    const quotes = await fetchMarketQuotes(apiKey, jwtToken);

    // Best-effort logout
    try {
      await fetch(LOGOUT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PrivateKey": apiKey,
          "Authorization": `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ clientcode: clientId }),
      });
    } catch { /* ignore logout errors */ }

    if (quotes.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_data", message: "Could not fetch live data from Angel One. Market may be closed." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ quotes, source: "angelone", live: true }), {
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
