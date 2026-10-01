import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Full NSE/BSE universe snapshot (prices + company figures) from Yahoo Finance's public quote feed (unofficial, ~15 min delayed),
// plus daily history for major indices. Refreshed in rotating batches by a scheduled job.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const INDICES: [string, string][] = [["NIFTY 50", "^NSEI"], ["BANK NIFTY", "^NSEBANK"], ["SENSEX", "^BSESN"], ["NIFTY IT", "^CNXIT"], ["FIN NIFTY", "NIFTY_FIN_SERVICE.NS"]];
const BATCH = 1500, PER_REQ = 100, PARALLEL = 5;

async function crumb(): Promise<{ cookie: string; crumb: string } | null> {
  const r = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual" });
  const raw = r.headers.get("set-cookie") ?? ""; await r.body?.cancel();
  const cookie = raw.split(/,(?=[^;]+=)/).map((c) => c.split(";")[0].trim()).filter(Boolean).join("; ");
  if (!cookie) return null;
  const c = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie } });
  const t = (await c.text()).trim();
  return t && t.length < 40 && !t.includes("<") ? { cookie, crumb: t } : null;
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "refresh";
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const user = async () => (token ? (await admin.auth.getUser(token)).data.user : null);

    if (action === "seed") {
      const u = await user(); if (!u) return json({ error: "Sign in required" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Admins only" }, 403);
      const rows = Array.isArray(body.rows) ? body.rows.slice(0, 3000) : [];
      const clean = rows.filter((r: any) => ["NSE", "BSE", "INDEX"].includes(r?.exchange) && typeof r.symbol === "string" && r.symbol.length <= 60 && typeof r.yahoo === "string" && r.yahoo.length <= 60)
        .map((r: any) => ({ exchange: r.exchange, symbol: r.symbol, token: r.token ?? null, name: String(r.name ?? r.symbol).slice(0, 120), yahoo: r.yahoo, is_index: r.exchange === "INDEX" }));
      const { error } = await admin.from("swing_market_snapshot").upsert(clean, { onConflict: "exchange,symbol" });
      return error ? json({ error: error.message }, 500) : json({ seeded: clean.length });
    }

    if (action === "chart") {
      if (!(await user())) return json({ error: "Sign in required" }, 401);
      const y = String(body.yahoo ?? ""); if (!/^[\^A-Z0-9&_.-]{1,40}$/i.test(y)) return json({ error: "Bad symbol" }, 400);
      const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?range=1y&interval=1d`, { headers: { "User-Agent": UA } });
      const d = await r.json().catch(() => null); const res = d?.chart?.result?.[0];
      if (!res) return json({ bars: [] });
      const q = res.indicators.quote[0];
      const bars = (res.timestamp ?? []).map((t: number, i: number) => ({ date: new Date((t + 19800) * 1000).toISOString().slice(0, 10), open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] })).filter((b: any) => b.close != null);
      return json({ bars });
    }

    // refresh: rotate through the oldest-quoted rows
    const { data: rows } = await admin.from("swing_market_snapshot").select("exchange,symbol,yahoo").order("quoted_at", { ascending: true, nullsFirst: true }).limit(BATCH);
    const cr = await crumb(); if (!cr) return json({ error: "Quote source unavailable" }, 502);
    const list = rows ?? []; const chunks: any[][] = [];
    for (let i = 0; i < list.length; i += PER_REQ) chunks.push(list.slice(i, i + PER_REQ));
    const now = new Date().toISOString(); let updated = 0, missing = 0;
    for (let i = 0; i < chunks.length; i += PARALLEL) {
      await Promise.all(chunks.slice(i, i + PARALLEL).map(async (ch) => {
        const by = new Map(ch.map((r) => [r.yahoo, r]));
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ch.map((r) => encodeURIComponent(r.yahoo)).join(",")}&crumb=${encodeURIComponent(cr.crumb)}`;
        const d = await fetch(url, { headers: { "User-Agent": UA, Cookie: cr.cookie } }).then((r) => r.json()).catch(() => null);
        const got = new Map<string, any>(((d?.quoteResponse?.result ?? []) as any[]).map((q) => [q.symbol, q]));
        const up = ch.map((r) => {
          const q = got.get(r.yahoo); if (!q) { missing++; return { exchange: r.exchange, symbol: r.symbol, yahoo: r.yahoo, quoted_at: now }; }
          const eps = num(q.epsTrailingTwelveMonths), bv = num(q.bookValue);
          const dy = num(q.trailingAnnualDividendYield) != null ? q.trailingAnnualDividendYield * 100 : num(q.dividendYield);
          return {
            exchange: r.exchange, symbol: r.symbol, yahoo: r.yahoo, quoted_at: now,
            price: num(q.regularMarketPrice), prev_close: num(q.regularMarketPreviousClose), open: num(q.regularMarketOpen), high: num(q.regularMarketDayHigh), low: num(q.regularMarketDayLow),
            change_pct: num(q.regularMarketChangePercent), volume: num(q.regularMarketVolume), avg_vol_10d: num(q.averageDailyVolume10Day), avg_vol_3m: num(q.averageDailyVolume3Month),
            dma50: num(q.fiftyDayAverage), dma200: num(q.twoHundredDayAverage), hi52: num(q.fiftyTwoWeekHigh), lo52: num(q.fiftyTwoWeekLow),
            market_cap: num(q.marketCap), pe: num(q.trailingPE), forward_pe: num(q.forwardPE), pb: num(q.priceToBook), eps, book_value: bv,
            roe: eps != null && bv != null && bv > 0 ? (eps / bv) * 100 : null, div_yield: dy,
            quote_time: q.regularMarketTime ? new Date(q.regularMarketTime * 1000).toISOString() : null,
          };
        });
        const { error } = await admin.from("swing_market_snapshot").upsert(up, { onConflict: "exchange,symbol" });
        if (error) console.error(error.message); else updated += up.length - 0;
        void by;
      }));
    }

    // index daily history, at most every 30 minutes
    const { data: lastIdx } = await admin.from("swing_index_prices").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    let idxRows = 0;
    if (!lastIdx || Date.now() - new Date(lastIdx.created_at).getTime() > 30 * 60000) {
      for (const [name, y] of INDICES) {
        const d = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?range=2y&interval=1d`, { headers: { "User-Agent": UA } }).then((r) => r.json()).catch(() => null);
        const res = d?.chart?.result?.[0]; if (!res) continue; const q = res.indicators.quote[0];
        const b = (res.timestamp ?? []).map((t: number, i: number) => ({ symbol: name, trade_date: new Date((t + 19800) * 1000).toISOString().slice(0, 10), open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], created_at: now })).filter((x: any) => x.close != null);
        const { error } = await admin.from("swing_index_prices").upsert(b, { onConflict: "symbol,trade_date" }); if (!error) idxRows += b.length;
      }
    }
    return json({ updated, missing, indexRows: idxRows });
  } catch (e) {
    console.error(e); return json({ error: String(e) }, 500);
  }
});
