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
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await loginOnce(apiKey); } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 1200 * (i + 1))); }
  }
  throw lastErr;
}
async function loginOnce(apiKey: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/angelbroking/user/v1/loginByPassword`, {
    method: "POST", headers: headers(apiKey),
    body: JSON.stringify({ clientcode: Deno.env.get("ANGELONE_CLIENT_ID"), password: Deno.env.get("ANGELONE_PIN"), totp: await generateTOTP(Deno.env.get("ANGELONE_TOTP_SECRET")!) }),
  });
  const d = await res.json().catch(() => null);
  if (!d?.data?.jwtToken) throw new Error(`Market feed login failed: ${d?.message ?? res.status}`);
  session = { jwt: d.data.jwtToken, at: Date.now() };
  return session.jwt;
}

const Body = z.object({
  symbol: z.string().trim().min(1).max(30).regex(/^[A-Z0-9&\-]+$/),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().min(1).max(100000),
  price: z.number().positive().max(10_000_000),
  confirm: z.literal(true),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sign in required" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "Only admins can place real orders." });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const p = parsed.data; const value = p.quantity * p.price;
    const log = (status: string, message: string, broker_order_id: string | null = null) =>
      admin.from("swing_live_orders").insert({ user_id: u.user.id, symbol: p.symbol, side: p.side, quantity: p.quantity, price: p.price, order_value: value, status, message, broker_order_id });

    const { data: cfgRow } = await admin.from("swing_settings").select("value").eq("key", "live_orders").maybeSingle();
    const cfg = { enabled: false, maxOrderValue: 10000, dailyLimit: 25000, ...(cfgRow?.value ?? {}) };
    if (!cfg.enabled) { await log("BLOCKED", "Real orders are switched off"); return json({ ok: false, error: "Real orders are switched off in Desk controls." }); }
    if (value > cfg.maxOrderValue) { await log("BLOCKED", "Above per-order limit"); return json({ ok: false, error: `Order value ₹${Math.round(value)} is above the ₹${cfg.maxOrderValue} per-order limit.` }); }
    const dayStart = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10) + "T00:00:00+05:30";
    const { data: today } = await admin.from("swing_live_orders").select("order_value").eq("status", "PLACED").gte("created_at", dayStart);
    const used = (today ?? []).reduce((a: number, r: any) => a + +r.order_value, 0);
    if (used + value > cfg.dailyLimit) { await log("BLOCKED", "Daily limit reached"); return json({ ok: false, error: `Daily limit ₹${cfg.dailyLimit} would be exceeded (₹${Math.round(used)} used today).` }); }

    const { data: inst } = await admin.from("swing_instruments").select("token,symbol").eq("exchange", "NSE").eq("symbol", `${p.symbol}-EQ`).maybeSingle();
    if (!inst) { await log("REJECTED", "Unknown NSE symbol"); return json({ ok: false, error: `${p.symbol} is not a known NSE share.` }); }

    const apiKey = Deno.env.get("ANGELONE_API_KEY");
    if (!apiKey) return json({ ok: false, error: "Broker credentials missing" });
    const jwt = await getJwt(apiKey);
    const r = await fetch(`${BASE}/secure/angelbroking/order/v1/placeOrder`, { method: "POST", headers: headers(apiKey, jwt), body: JSON.stringify({
      variety: "NORMAL", tradingsymbol: inst.symbol, symboltoken: inst.token, transactiontype: p.side, exchange: "NSE",
      ordertype: "LIMIT", producttype: "DELIVERY", duration: "DAY", price: p.price.toFixed(2), quantity: String(p.quantity),
    }) });
    const d = await r.json().catch(() => null);
    if (!d?.status || !d?.data?.orderid) { const msg = d?.message ?? `Broker returned ${r.status}`; await log("REJECTED", msg); return json({ ok: false, error: `Broker rejected the order: ${msg}` }); }
    await log("PLACED", "Limit order sent to Angel One", d.data.orderid);
    return json({ ok: true, orderId: d.data.orderid });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Could not reach the broker. No order was placed." });
  }
});
