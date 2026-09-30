import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
const AUTH_URL = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword";
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

const CANDLE_URL = "https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData";
const fmt = (d: Date) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16).replace("T", " ");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sign in required" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    // Add a searched stock to the strategy universe, then fetch its full history right away
    let only: Record<string, { token: string; exchange: string }> | null = null;
    if (body?.add) {
      const a = body.add;
      if (typeof a.token !== "string" || !/^\d{1,10}$/.test(a.token) || typeof a.symbol !== "string" || !/^[A-Z0-9&-]{1,40}-EQ$/.test(a.symbol)) return json({ error: "Only NSE equity shares (symbol ending in -EQ) can be added" }, 400);
      const { data: inst } = await admin.from("swing_instruments").select("exchange,token,symbol,name").eq("exchange", "NSE").eq("token", a.token).maybeSingle();
      if (!inst || inst.symbol !== a.symbol) return json({ error: "Stock not found in the NSE list" }, 400);
      const key = inst.symbol.replace(/-EQ$/, "");
      const { count } = await admin.from("swing_universe").select("symbol", { count: "exact", head: true });
      if (!STOCK_TOKENS[key] && (count ?? 0) >= 150) return json({ error: "Strategy list is full (150 extra stocks). Remove one first." }, 400);
      if (!STOCK_TOKENS[key]) await admin.from("swing_universe").upsert({ symbol: key, exchange: "NSE", token: inst.token, name: inst.name, added_by: u.user.id }, { onConflict: "symbol" });
      only = { [key]: { token: inst.token, exchange: "NSE" } };
    }

    // Throttle: skip if synced in the last 15 minutes
    const { data: last } = await admin.from("swing_prices").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!only && !force && last && Date.now() - new Date(last.created_at).getTime() < 15 * 60000) return json({ skipped: true, lastSync: last.created_at });

    const apiKey = Deno.env.get("ANGELONE_API_KEY"), clientId = Deno.env.get("ANGELONE_CLIENT_ID"), pin = Deno.env.get("ANGELONE_PIN"), totp = Deno.env.get("ANGELONE_TOTP_SECRET");
    if (!apiKey || !clientId || !pin || !totp) return json({ error: "Market feed credentials missing" }, 500);
    const jwt = await angelOneLogin(apiKey, clientId, pin, totp);
    if (!jwt) return json({ error: "Market feed login failed" }, 502);

    const to = new Date(), full = new Date(Date.now() - 1100 * 86400000), recent = new Date(Date.now() - 20 * 86400000);
    let targets: Record<string, { token: string; exchange: string; full: boolean }> = {};
    if (only) Object.entries(only).forEach(([k, v]) => (targets[k] = { ...v, full: true }));
    else {
      Object.entries(STOCK_TOKENS).forEach(([k, v]) => (targets[k] = { token: v.token, exchange: v.exchange, full: force }));
      const { data: extra } = await admin.from("swing_universe").select("symbol,token,exchange").limit(150);
      (extra ?? []).forEach((e: any) => { if (!targets[e.symbol]) targets[e.symbol] = { token: e.token, exchange: e.exchange, full: force }; });
    }
    let rows = 0; const failed: string[] = [];
    for (const [key, t] of Object.entries(targets)) {
      const from = t.full ? full : recent;
      const res = await fetch(CANDLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-UserType": "USER", "X-SourceID": "WEB", "X-ClientLocalIP": "127.0.0.1", "X-ClientPublicIP": "127.0.0.1", "X-MACAddress": "00:00:00:00:00:00", "X-PrivateKey": apiKey, Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ exchange: t.exchange, symboltoken: t.token, interval: "ONE_DAY", fromdate: fmt(from), todate: fmt(to) }),
      });
      const d = await res.json().catch(() => null);
      if (!Array.isArray(d?.data)) { failed.push(key); console.error(key, d?.message); await sleep(400); continue; }
      const batch = d.data.map((c: any[]) => ({ symbol: key, trade_date: String(c[0]).slice(0, 10), open: c[1], high: c[2], low: c[3], close: c[4], volume: Math.round(c[5] ?? 0), created_at: new Date().toISOString() }));
      const { error } = await admin.from("swing_prices").upsert(batch, { onConflict: "symbol,trade_date" });
      if (error) failed.push(key); else rows += batch.length;
      await sleep(400); // candle API rate limit ~3/sec
    }
    return json({ synced: rows, symbols: Object.keys(targets).length - failed.length, failed });
  } catch (e) {
    console.error(e); return json({ error: String(e) }, 500);
  }
});
