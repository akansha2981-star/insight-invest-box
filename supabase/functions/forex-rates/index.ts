// Forex rates edge function — fetches latest + historical from Frankfurter (ECB), caches in DB
// Source: https://api.frankfurter.app (free, no key)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED = ["USD","EUR","GBP","INR","JPY","AUD","CAD","CHF","CNY","HKD","SGD","NZD","SEK","NOK","DKK","ZAR","MXN","BRL","KRW","TRY","AED","SAR","THB","IDR","MYR","PHP","PLN","CZK","HUF","ILS","RON","RUB","BGN","ISK"];
const FALLBACK_CCYS = ["AED","SAR","ZAR","MXN","HKD","SGD","KRW","BRL","INR","CNY","JPY","GBP","EUR","CHF","NZD","AUD","CAD","TRY","RUB","NOK","SEK","DKK","PLN","THB","IDR","MYR","PHP","CZK","HUF","ILS","RON","BGN","ISK"];

const FRANK = "https://api.frankfurter.app";

async function fetchLatestUSD() {
  // Frankfurter base must be among supported; USD is supported
  const r = await fetch(`${FRANK}/latest?from=USD`);
  if (!r.ok) throw new Error(`frankfurter latest failed ${r.status}`);
  const d = await r.json();
  return d.rates as Record<string, number>;
}

async function fetchHistoryUSD(from: string, to: string) {
  const r = await fetch(`${FRANK}/${from}..${to}?from=USD`);
  if (!r.ok) throw new Error(`frankfurter history failed ${r.status}`);
  return await r.json() as { rates: Record<string, Record<string, number>> };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* GET */ }
  const url = new URL(req.url);
  const action = body.action ?? url.searchParams.get("action") ?? "rates";

  try {
    // ───────── Public: read latest rates ─────────
    if (action === "rates") {
      const { data } = await admin.from("forex_rates").select("*");
      if (!data || data.length === 0) {
        // bootstrap on first call
        await refreshAll(admin, "auto-bootstrap");
        const { data: d2 } = await admin.from("forex_rates").select("*");
        return Response.json({ rates: d2 ?? [] }, { headers: corsHeaders });
      }
      return Response.json({ rates: data }, { headers: corsHeaders });
    }

    // ───────── Public: read history for a pair ─────────
    if (action === "history") {
      const from = (body.from ?? url.searchParams.get("from") ?? "USD").toUpperCase();
      const to = (body.to ?? url.searchParams.get("to") ?? "INR").toUpperCase();
      const days = Math.min(Number(body.days ?? url.searchParams.get("days") ?? 365), 3650);
      const startDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

      const { data: rows } = await admin.from("forex_history")
        .select("date, code, rate_usd")
        .in("code", [from, to])
        .gte("date", startDate)
        .order("date", { ascending: true });

      // If we have insufficient data for the requested range, fetch from Frankfurter
      const havePoints = (rows ?? []).length;
      const needed = days * 2 * 0.5; // weekdays only
      if (havePoints < needed) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const hist = await fetchHistoryUSD(startDate, today);
          const inserts: any[] = [];
          for (const [date, ratesObj] of Object.entries(hist.rates)) {
            for (const code of [from, to]) {
              if (code === "USD") { inserts.push({ date, code: "USD", rate_usd: 1 }); continue; }
              const r = (ratesObj as any)[code];
              if (typeof r === "number") inserts.push({ date, code, rate_usd: r });
            }
          }
          if (inserts.length) await admin.from("forex_history").upsert(inserts, { onConflict: "date,code" });
          const { data: rows2 } = await admin.from("forex_history")
            .select("date, code, rate_usd")
            .in("code", [from, to])
            .gte("date", startDate)
            .order("date", { ascending: true });
          return Response.json({ history: rows2 ?? [], from, to, days }, { headers: corsHeaders });
        } catch (_) { /* fall through with what we have */ }
      }

      return Response.json({ history: rows ?? [], from, to, days }, { headers: corsHeaders });
    }

    // ───────── Admin: refresh ─────────
    if (action === "refresh") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      const user = userRes?.user;
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      if (!roles?.length) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

      const r = await refreshAll(admin, "manual");
      return Response.json(r, { headers: corsHeaders });
    }

    // ───────── Cron / unauthenticated server refresh ─────────
    if (action === "cron") {
      const r = await refreshAll(admin, "cron");
      return Response.json(r, { headers: corsHeaders });
    }

    // ───────── Admin: list logs ─────────
    if (action === "logs") {
      const { data } = await admin.from("forex_logs").select("*").order("started_at", { ascending: false }).limit(30);
      return Response.json({ logs: data ?? [] }, { headers: corsHeaders });
    }

    return Response.json({ error: "Unknown action" }, { status: 400, headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500, headers: corsHeaders });
  }
});

async function refreshAll(admin: any, triggerType: string) {
  const { data: logRow } = await admin.from("forex_logs").insert({
    trigger_type: triggerType, status: "running", source: "frankfurter",
  }).select("id").single();

  try {
    const rates = await fetchLatestUSD();
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const upserts: any[] = [{ code: "USD", rate_usd: 1, updated_at: now, source: "frankfurter" }];
    const historyRows: any[] = [{ date: today, code: "USD", rate_usd: 1 }];

    for (const code of SUPPORTED) {
      if (code === "USD") continue;
      const r = rates[code];
      if (typeof r === "number" && r > 0) {
        upserts.push({ code, rate_usd: r, updated_at: now, source: "frankfurter" });
        historyRows.push({ date: today, code, rate_usd: r });
      }
    }

    // Fallback currencies not in Frankfurter (AED, SAR, HKD, etc.) — use exchangerate.host
    const missing = FALLBACK_CCYS.filter(c => !upserts.some(u => u.code === c));
    if (missing.length) {
      try {
        const r2 = await fetch(`https://open.er-api.com/v6/latest/USD`);
        if (r2.ok) {
          const d2 = await r2.json();
          for (const code of missing) {
            const v = d2?.rates?.[code];
            if (typeof v === "number" && v > 0) {
              upserts.push({ code, rate_usd: v, updated_at: now, source: "open.er-api" });
              historyRows.push({ date: today, code, rate_usd: v });
            }
          }
        }
      } catch (_) { /* ignore */ }
    }

    await admin.from("forex_rates").upsert(upserts, { onConflict: "code" });
    await admin.from("forex_history").upsert(historyRows, { onConflict: "date,code" });

    await admin.from("forex_logs").update({
      status: "success", completed_at: now,
      rates_updated: upserts.length, history_rows: historyRows.length,
    }).eq("id", logRow.id);

    return { ok: true, rates_updated: upserts.length, history_rows: historyRows.length };
  } catch (e) {
    await admin.from("forex_logs").update({
      status: "error", completed_at: new Date().toISOString(),
      error: e instanceof Error ? e.message : "unknown",
    }).eq("id", logRow.id);
    throw e;
  }
}
