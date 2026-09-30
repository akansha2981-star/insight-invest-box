import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };
const BASE = "https://apiconnect.angelone.in/rest";

async function generateTOTP(secret: string): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits: number[] = [];
  for (const c of secret.toUpperCase().replace(/[^A-Z2-7]/g, "")) { const v = chars.indexOf(c); for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1); }
  const key = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < key.length; i++) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j]; key[i] = b; }
  let t = Math.floor(Date.now() / 30000); const ctr = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) { ctr[i] = t & 0xff; t = Math.floor(t / 256); }
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, ctr));
  const o = s[s.length - 1] & 0x0f;
  return String((((s[o] & 0x7f) << 24) | (s[o + 1] << 16) | (s[o + 2] << 8) | s[o + 3]) % 1000000).padStart(6, "0");
}

let session: { jwt: string; at: number } | null = null;
const headers = (apiKey: string, jwt?: string) => ({
  "Content-Type": "application/json", Accept: "application/json", "X-UserType": "USER", "X-SourceID": "WEB",
  "X-ClientLocalIP": "127.0.0.1", "X-ClientPublicIP": "127.0.0.1", "X-MACAddress": "00:00:00:00:00:00", "X-PrivateKey": apiKey,
  ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
});

let pending: Promise<string> | null = null;
function getJwt(apiKey: string): Promise<string> {
  if (session && Date.now() - session.at < 4 * 3600_000) return Promise.resolve(session.jwt);
  pending ??= login(apiKey).finally(() => { pending = null; });
  return pending;
}
async function login(apiKey: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/angelbroking/user/v1/loginByPassword`, {
    method: "POST", headers: headers(apiKey),
    body: JSON.stringify({ clientcode: Deno.env.get("ANGELONE_CLIENT_ID"), password: Deno.env.get("ANGELONE_PIN"), totp: await generateTOTP(Deno.env.get("ANGELONE_TOTP_SECRET")!) }),
  });
  const d = await res.json().catch(() => null);
  if (!d?.data?.jwtToken) throw new Error(`Market feed login failed: ${d?.message ?? res.status}`);
  session = { jwt: d.data.jwtToken, at: Date.now() };
  return session.jwt;
}

const fmt = (d: Date) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16).replace("T", " ");

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("search"), q: z.string().trim().min(1).max(40) }),
  z.object({ action: z.literal("chart"), exchange: z.enum(["NSE", "BSE"]), token: z.string().regex(/^\d{1,10}$/), symbol: z.string().max(60) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sign in required" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const apiKey = Deno.env.get("ANGELONE_API_KEY");
    if (!apiKey) return json({ error: "Market feed credentials missing" }, 500);
    const call = async (path: string, body: unknown) => {
      const jwt = await getJwt(apiKey);
      let r = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(apiKey, jwt), body: JSON.stringify(body) });
      let d = await r.json().catch(() => null);
      if (d && d.status === false && /token|session|invalid/i.test(d.message ?? "")) {
        session = null; const j2 = await getJwt(apiKey);
        r = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(apiKey, j2), body: JSON.stringify(body) });
        d = await r.json().catch(() => null);
      }
      return d;
    };

    const p = parsed.data;
    if (p.action === "search") {
      const out: any[] = [];
      for (const exchange of ["NSE", "BSE"]) {
        const d = await call("/secure/angelbroking/order/v1/searchScrip", { exchange, searchscrip: p.q.toUpperCase() });
        if (!Array.isArray(d?.data)) console.log("search", exchange, JSON.stringify(d)?.slice(0, 300));
        (d?.data ?? []).forEach((s: any) => {
          const sym = String(s.tradingsymbol ?? "");
          if (exchange === "NSE" && !sym.endsWith("-EQ")) return;
          out.push({ exchange, token: String(s.symboltoken), symbol: sym, name: sym.replace(/-EQ$/, "") });
        });
      }
      return json({ results: out.slice(0, 25) });
    }

    const now = new Date();
    const [daily, intra, quote] = await Promise.all([
      call("/secure/angelbroking/historical/v1/getCandleData", { exchange: p.exchange, symboltoken: p.token, interval: "ONE_DAY", fromdate: fmt(new Date(now.getTime() - 400 * 86400000)), todate: fmt(now) }),
      call("/secure/angelbroking/historical/v1/getCandleData", { exchange: p.exchange, symboltoken: p.token, interval: "FIFTEEN_MINUTE", fromdate: fmt(new Date(now.getTime() - 10 * 86400000)), todate: fmt(now) }),
      call("/secure/angelbroking/market/v1/quote/", { mode: "FULL", exchangeTokens: { [p.exchange]: [p.token] } }),
    ]);
    const toBars = (d: any, intraday: boolean) => (Array.isArray(d?.data) ? d.data : []).map((c: any[]) => ({
      date: intraday ? String(c[0]).slice(0, 16).replace("T", " ") : String(c[0]).slice(0, 10), open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: Math.round(+c[5] || 0),
    }));
    const q = quote?.data?.fetched?.[0];
    return json({
      symbol: p.symbol, exchange: p.exchange, fetchedAt: now.toISOString(),
      daily: toBars(daily, false), intraday: toBars(intra, true),
      quote: q ? { ltp: +q.ltp, open: +q.open, high: +q.high, low: +q.low, close: +q.close, change: +q.netChange, changePercent: +q.percentChange, volume: +q.tradeVolume, high52: +q["52WeekHigh"], low52: +q["52WeekLow"], upperCircuit: +q.upperCircuit, lowerCircuit: +q.lowerCircuit, buyQty: +q.totBuyQuan, sellQty: +q.totSellQuan } : null,
      errors: [daily?.status === false && daily.message, intra?.status === false && intra.message, quote?.status === false && quote.message].filter(Boolean),
    });
  } catch (e) {
    console.error(e); return json({ error: String(e) }, 500);
  }
});
