// Daily AI Strategy Coach: ranks every strategy, sends the faults to Lovable AI, turns its proposals
// into declarative rules, backtests them on unseen (out-of-sample) prices and adopts only winners.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { STRATEGIES, buildCtx, rankUniverse, marketRegime, simulate, type Ctx, type StrategyDef, type SimResult } from "../_shared/swing/strategies20.ts";
import { compileCustom, FIELDS, type CustomDef, type Group, type Cond } from "../_shared/swing/rules.ts";
import { SECTORS } from "../_shared/swing/robust.ts";

const MODEL = "openai/gpt-6-astra";
const MAX_PROPOSALS = 10;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const r2 = (n: number) => Math.round(n * 100) / 100;

const FIELD_KEYS = new Set(FIELDS.map((f) => f.key));
const SECTOR_SET = new Set(Object.values(SECTORS).concat("Other"));
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function cleanCond(x: any): Cond | null {
  if (!x || !FIELD_KEYS.has(x.left) || !["gt", "lt", "crossAbove", "crossBelow"].includes(x.op)) return null;
  const r = x.right ?? {};
  if (r.kind === "num" && Number.isFinite(Number(r.value))) return { type: "cond", left: x.left, op: x.op, right: { kind: "num", value: Number(r.value) } };
  if (r.kind === "field" && FIELD_KEYS.has(r.key)) return { type: "cond", left: x.left, op: x.op, right: { kind: "field", key: r.key, mult: num(r.mult ?? 1, 0.1, 10, 1) } };
  return null;
}
function cleanGroup(g: any, depth = 0): Group | null {
  if (!g || !Array.isArray(g.items) || depth > 3) return null;
  const items = g.items.slice(0, 12).map((x: any) => (x?.type === "group" ? cleanGroup(x, depth + 1) : cleanCond(x))).filter(Boolean);
  return items.length ? { type: "group", logic: g.logic === "OR" ? "OR" : "AND", items } : null;
}
function cleanDef(d: any): CustomDef | null {
  const entry = cleanGroup(d?.entry); if (!entry) return null;
  const regimes = (Array.isArray(d.regimes) ? d.regimes : []).filter((r: string) => ["bull", "sideways", "bear"].includes(r));
  const sectors = (Array.isArray(d.sectors) ? d.sectors : []).filter((s: string) => SECTOR_SET.has(s));
  return { entry, exit: d.exit ? cleanGroup(d.exit) : null, slAtr: num(d.slAtr, 0.5, 6, 2), tpAtr: num(d.tpAtr, 0.5, 15, 4), trailAtr: num(d.trailAtr, 0, 6, 0), maxHold: Math.round(num(d.maxHold, 0, 60, 0)), regimes: regimes.length ? regimes : ["bull"], ...(sectors.length ? { sectors } : {}) };
}

const m = (r: SimResult) => ({ ret: r2(r.netReturn), win: r2(r.winRate), dd: r2(r.maxDrawdown), trades: r.closedCount, pf: r2(Math.min(r.profitFactor, 99)), sharpe: r2(r.sharpe), exp: Math.round(r.expectancy) });
const score = (x: ReturnType<typeof m>) => (x.trades < 5 ? -999 + x.trades : x.ret - 0.5 * x.dd + 0.05 * x.win + 2 * Math.min(x.pf, 3));

async function callAI(input: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: MODEL, input: [{ role: "user", content: input }], stream: true, store: false, reasoning: { effort: "medium", summary: "auto" }, include: ["reasoning.encrypted_content"], text: { format: { type: "json_object" } } }),
  });
  if (!res.ok || !res.body) { const t = await res.text().catch(() => ""); const e: any = new Error(`AI request failed (${res.status}): ${t.slice(0, 300)}`); e.status = res.status; throw e; }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", out = "";
  for (;;) {
    const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
    let k; while ((k = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1); if (!line.startsWith("data:")) continue; const p = line.slice(5).trim(); if (p === "[DONE]") continue;
      try { const ev = JSON.parse(p); if (ev.type === "response.output_text.delta") out += ev.delta; else if (ev.type === "response.failed" || ev.type === "error") throw new Error(ev.response?.error?.message ?? ev.message ?? "AI stream failed"); } catch (e) { if (e instanceof SyntaxError) continue; throw e; } }
  }
  if (!out.trim()) throw new Error("AI returned no answer (refused or empty)");
  return JSON.parse(out);
}

// ---------- Phased runner: each invocation does one small step (server CPU limit), then hands off to the next ----------
const RANK_CHUNK = 7, EVAL_CHUNK = 3, MAX_DEPTH = 30;
type Admin = ReturnType<typeof createClient>;

async function loadMarket(admin: Admin) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) { const { data } = await admin.from("swing_prices").select("symbol,trade_date,open,high,low,close,volume").order("trade_date").order("symbol").range(from, from + 999); rows.push(...(data ?? [])); if (!data || data.length < 1000) break; }
  const g: Record<string, any[]> = {}; rows.forEach((r) => (g[r.symbol] ??= []).push({ date: r.trade_date, open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume }));
  const ctxs: Ctx[] = Object.entries(g).filter(([, b]) => b.length > 60).map(([s, b]) => buildCtx(s, b)); rankUniverse(ctxs); const regime = marketRegime(ctxs);
  const dates = [...new Set(ctxs.flatMap((c) => c.b.map((x) => x.date)))].sort().slice(200);
  return { ctxs, regime, dates, cut: dates[Math.floor(dates.length * 0.7)], base: { capital: 100000, regime } };
}
async function loadDefs(admin: Admin) {
  const { data: aiRows } = await admin.from("swing_ai_strategies").select("*").order("version");
  const latest = new Map<string, any>(); (aiRows ?? []).forEach((r: any) => latest.set(r.family_id, r));
  const { data: cRows } = await admin.from("swing_custom_strategies").select("*").order("version");
  const cl = new Map<string, any>(); (cRows ?? []).forEach((r: any) => cl.set(r.family_id, r));
  return [...STRATEGIES.map((d) => ({ def: d, source: "built-in", row: null as any })),
    ...[...latest.values()].map((r) => ({ def: { ...compileCustom(r.id, r.name, r.version, r.definition), key: `ai:${r.family_id}`, family: "AI" } as StrategyDef, source: "ai", row: r })),
    ...[...cl.values()].slice(0, 30).map((r) => ({ def: { ...compileCustom(r.id, r.name, r.version, r.definition), key: `custom:${r.family_id}` } as StrategyDef, source: "custom", row: r }))];
}

/** Saves an accepted change: custom parents get a new version of the owner's strategy; others a new AI strategy version. Old versions are never overwritten. */
async function applyChange(admin: Admin, parentKey: string | null, name: string, def: CustomDef, rec: any, runId: string | null): Promise<{ ai_strategy_id?: string }> {
  const note = `AI v-change: ${rec.change_summary ?? ""}`.slice(0, 1000);
  if (parentKey?.startsWith("custom:")) {
    const { data: p } = await admin.from("swing_custom_strategies").select("user_id,family_id,name,version").eq("family_id", parentKey.slice(7)).order("version", { ascending: false }).limit(1).maybeSingle();
    if (p) { await admin.from("swing_custom_strategies").insert({ user_id: p.user_id, family_id: p.family_id, name: p.name, version: p.version + 1, definition: def, ai_note: note }); return {}; }
  }
  let fam: any = null;
  if (parentKey?.startsWith("ai:")) { const { data } = await admin.from("swing_ai_strategies").select("family_id,name,version").eq("family_id", parentKey.slice(3)).order("version", { ascending: false }).limit(1).maybeSingle(); fam = data; }
  const { data: ins } = await admin.from("swing_ai_strategies").insert({ ...(fam ? { family_id: fam.family_id, version: fam.version + 1, name: fam.name } : { name: name.startsWith("AI ") ? name : `AI ${name}` }), parent_key: parentKey, definition: def, fault: rec.fault, change_summary: rec.change_summary, metrics: { train: rec.train, test: rec.test }, run_id: runId }).select("id").single();
  return { ai_strategy_id: ins?.id };
}

async function step(admin: Admin, run: any): Promise<boolean> { // returns true when more work remains
  const st = run.state ?? {}; const today = run.run_date;
  const save = (patch: Record<string, unknown>) => admin.from("swing_ai_runs").update({ ...patch, lease_until: new Date(Date.now() + 5 * 60000).toISOString() }).eq("id", run.id);

  if (run.phase === "rank") {
    const mk = await loadMarket(admin); const defs = await loadDefs(admin); const cur = st.cursor ?? 0;
    const evals = st.evals ?? [];
    for (const { def, source } of defs.slice(cur, cur + RANK_CHUNK)) {
      const full = simulate(def, mk.ctxs, mk.base), test = simulate(def, mk.ctxs, { ...mk.base, startDate: mk.cut });
      const closed = full.trades.filter((t) => !t.open); const exits: Record<string, number> = {}; closed.forEach((t) => (exits[t.exitReason ?? "?"] = (exits[t.exitReason ?? "?"] ?? 0) + 1));
      const lossByRegime: Record<string, number> = {}; closed.filter((t) => t.netPnl <= 0).forEach((t) => { const rg = mk.regime.get(t.entryDate)?.regime ?? "?"; lossByRegime[rg] = (lossByRegime[rg] ?? 0) + 1; });
      const worst = [...closed].sort((a, b) => a.netPnl - b.netPnl).slice(0, 3).map((t) => ({ sym: t.symbol, in: t.entryDate, days: t.holdDays, r: t.rMultiple, exit: t.exitReason }));
      evals.push({ key: def.key, name: def.name, source, buy: def.buyRule, sell: def.sellRule, sl: def.slRule, tp: def.tpRule, full: m(full), test: m(test), exits, lossByRegime, worst, avgHold: r2(full.avgHold) });
    }
    const next = cur + RANK_CHUNK; const done = next >= defs.length;
    if (done) {
      evals.sort((a: any, b: any) => score(b.full) - score(a.full));
      await admin.from("swing_leaderboard_snapshots").upsert(evals.map((e: any, i: number) => ({ snap_date: today, strategy_key: e.key, name: e.name, source: e.source, rank: i + 1, score: r2(score(e.full)), metrics: { full: e.full, test: e.test } })), { onConflict: "snap_date,strategy_key" });
    }
    await save({ phase: done ? "ai" : "rank", state: { ...st, evals, cursor: done ? 0 : next, meta: { symbols: mk.ctxs.length, from: mk.dates[0], to: mk.dates.at(-1), cut: mk.cut, regime: [...mk.regime.values()].at(-1)?.regime } } });
    return true;
  }

  if (run.phase === "ai") {
    const { data: history } = await admin.from("swing_ai_proposals").select("name,parent_key,change_summary,adopted,reason,test").order("created_at", { ascending: false }).limit(25);
    const mt = st.meta ?? {};
    const prompt = `You are a quantitative swing-trading researcher improving long-only daily NSE strategies. Reply with a single json object only.
Data: ${mt.symbols} NSE stocks, ${mt.from} to ${mt.to}. The unseen test period starts ${mt.cut}. Capital 100000, 1% risk per trade, max 5 positions, Indian delivery charges and slippage included. Today's market regime: ${mt.regime}.
Your proposals are adopted automatically ONLY if they beat the parent on the unseen test period with enough trades, so avoid overfitting: prefer simple, robust logic.

STRATEGY RESULTS (full = whole history, test = unseen period; ret %, win %, dd = max drawdown %, pf = profit factor, exp = avg Rs per trade):
${JSON.stringify(st.evals)}

YOUR PAST ATTEMPTS (learn from rejections):
${JSON.stringify(history ?? [])}

RULE LANGUAGE (the only format the software can run):
definition = { "entry": Group, "exit": Group|null, "slAtr": 0.5-6, "tpAtr": 0.5-15 (final target in ATR; first target is half), "trailAtr": 0-6 (0 = none, trails after first target), "maxHold": 0-60 sessions (0 = none), "regimes": subset of ["bull","sideways","bear"], "sectors": optional subset of ${JSON.stringify([...SECTOR_SET])} }
Group = { "type":"group", "logic":"AND"|"OR", "items":[Cond|Group] }
Cond = { "type":"cond", "left": FIELD, "op": "gt"|"lt"|"crossAbove"|"crossBelow", "right": {"kind":"num","value":number} | {"kind":"field","key":FIELD,"mult":number} }
FIELD one of: ${FIELDS.map((f) => `${f.key} (${f.label})`).join(", ")}
Tip: plain "gt" conditions stay true for many days; use at least one crossAbove/crossBelow or a tight threshold so entries are fresh signals.

TASK:
1. Diagnose the actual fault of each weak or losing strategy (be specific, cite the numbers).
2. Propose up to ${MAX_PROPOSALS} proposals: "improve" (parent_key = an existing key above; rebuild its logic with your fix) or "new" (your own original idea, parent_key null). Include at least 2 new ideas.
Return json: { "summary": string, "diagnosis": [{ "key": string, "fault": string, "fix": string }], "proposals": [{ "kind": "improve"|"new", "parent_key": string|null, "name": string (short, no version), "fault": string, "change_summary": string, "definition": definition }] }`;
    const ai = await callAI(prompt);
    const proposals = (Array.isArray(ai.proposals) ? ai.proposals : []).slice(0, MAX_PROPOSALS);
    await save({ phase: "eval", summary: String(ai.summary ?? "").slice(0, 3000), diagnosis: Array.isArray(ai.diagnosis) ? ai.diagnosis.slice(0, 40) : [], proposals_count: proposals.length, state: { ...st, proposals, cursor: 0 } });
    return proposals.length > 0 || (await finishRun(admin, run.id, 0), false);
  }

  if (run.phase === "eval") {
    const mk = await loadMarket(admin); const cur = st.cursor ?? 0; const props = st.proposals ?? [];
    const byKey = new Map((st.evals ?? []).map((e: any) => [e.key, e]));
    let adopted = st.adopted ?? 0;
    for (const p of props.slice(cur, cur + EVAL_CHUNK)) {
      const name = String(p.name ?? "AI idea").slice(0, 60); const def = cleanDef(p.definition);
      const parent: any = p.kind === "improve" && p.parent_key ? byKey.get(String(p.parent_key)) : undefined;
      const rec: any = { run_id: run.id, kind: parent ? "improve" : "new", parent_key: parent?.key ?? null, name, fault: String(p.fault ?? "").slice(0, 1000), change_summary: String(p.change_summary ?? "").slice(0, 1000), definition: def };
      if (!def) { await admin.from("swing_ai_proposals").insert({ ...rec, reason: "Rules could not be run by the software (invalid format)" }); continue; }
      const cd = compileCustom("candidate", name, 1, def);
      const train = m(simulate(cd, mk.ctxs, { ...mk.base, endDate: mk.cut })), test = m(simulate(cd, mk.ctxs, { ...mk.base, startDate: mk.cut }));
      const barRet = parent?.test.ret ?? 0;
      let reason = "";
      if (train.trades < 5) reason = `Too few trades in training (${train.trades})`;
      else if (test.trades < 3) reason = `Too few trades in unseen test (${test.trades})`;
      else if (test.ret <= 0) reason = `Lost money on unseen test (${test.ret}%)`;
      else if (test.ret <= barRet) reason = `Did not beat current version on unseen test (${test.ret}% vs ${barRet}%)`;
      else if (parent && test.dd > Math.max(parent.test.dd * 1.3, parent.test.dd + 3)) reason = `Drawdown too high (${test.dd}% vs ${parent.test.dd}%)`;
      const ok = !reason; Object.assign(rec, { train, test, parent_test: parent?.test ?? null, adopted: ok });
      rec.reason = ok ? (parent ? `Beat ${parent.name} on unseen test: ${test.ret}% vs ${barRet}%` : `Profitable on unseen test: ${test.ret}%, ${test.trades} trades`) : reason;
      if (ok) {
        const r = await applyChange(admin, parent?.key ?? null, name, def, rec, run.id);
        if (r.ai_strategy_id) rec.ai_strategy_id = r.ai_strategy_id; adopted++;
      }
      await admin.from("swing_ai_proposals").insert(rec);
    }
    const next = cur + EVAL_CHUNK;
    if (next >= props.length) { await finishRun(admin, run.id, adopted); return false; }
    await save({ state: { ...st, cursor: next, adopted } });
    return true;
  }
  return false;
}
async function finishRun(admin: Admin, id: string, adopted: number) {
  await admin.from("swing_ai_runs").update({ status: "done", adopted_count: adopted, state: {}, lease_until: null, completed_at: new Date().toISOString() }).eq("id", id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, SRK);
  const body = await req.json().catch(() => ({}));
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const internal = !!body?.run_id && token === SRK;
  const selfUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/swing-ai-coach`;

  let run: any;
  if (internal) {
    const { data } = await admin.from("swing_ai_runs").select("*").eq("id", body.run_id).maybeSingle();
    if (!data || data.status !== "running") return json({ skipped: "Run not active" });
    run = data;
  } else if (body?.approve_id) {
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Sign in required" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Only admins can approve AI changes" }, 403);
    const { data: p } = await admin.from("swing_ai_proposals").select("*").eq("id", String(body.approve_id)).maybeSingle();
    if (!p) return json({ error: "Change not found" }, 404);
    if (p.adopted) return json({ error: "This change is already applied" }, 400);
    const def = cleanDef(p.definition); if (!def) return json({ error: "This change cannot be run by the software" }, 400);
    const r = await applyChange(admin, p.parent_key, p.name, def, p, p.run_id);
    await admin.from("swing_ai_proposals").update({ adopted: true, approved_at: new Date().toISOString(), approved_by: u.user.id, ai_strategy_id: r.ai_strategy_id ?? p.ai_strategy_id, reason: `${p.reason ?? ""} · Approved manually by admin`.slice(0, 1000) }).eq("id", p.id);
    return json({ ok: true });
  } else {
    let force = false, trigger = "cron";
    if (body?.force) {
      const { data: u } = await admin.auth.getUser(token);
      if (!u?.user) return json({ error: "Sign in required" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Only admins can run the AI coach manually" }, 403);
      force = true; trigger = "manual";
    }
    const { data: setting } = await admin.from("swing_settings").select("value").eq("key", "ai_coach").maybeSingle();
    if (setting?.value?.enabled === false) return json({ skipped: "AI coach is switched off in Desk controls" });
    const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
    const { data: recent } = await admin.from("swing_ai_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (recent?.status === "running" && recent.lease_until && new Date(recent.lease_until) > new Date()) return json({ skipped: "A run is already in progress" });
    if (!force && recent?.run_date === today && recent.status === "done") return json({ skipped: "Already ran today" });
    if (!force && recent?.status === "paused") return json({ skipped: "Paused: " + recent.error });
    const { data, error } = await admin.from("swing_ai_runs").insert({ run_date: today, trigger_type: trigger, lease_until: new Date(Date.now() + 5 * 60000).toISOString() }).select().single();
    if (error) return json({ error: error.message }, 500);
    run = data;
  }
  const depth = internal ? Number(body.depth ?? 0) : MAX_DEPTH;
  if (depth <= 0) { await admin.from("swing_ai_runs").update({ status: "failed", error: "Step budget used up", lease_until: null, completed_at: new Date().toISOString() }).eq("id", run.id); return json({ error: "Step budget used up" }); }

  try {
    const more = await step(admin, run);
    if (more) {
      // @ts-ignore EdgeRuntime is provided by the runtime
      EdgeRuntime.waitUntil((async () => { await new Promise((r) => setTimeout(r, 1500));
        await fetch(selfUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` }, body: JSON.stringify({ run_id: run.id, depth: depth - 1 }) }).catch(async (e) => {
          await admin.from("swing_ai_runs").update({ status: "failed", error: "Next step failed to start: " + e.message, lease_until: null }).eq("id", run.id); }); })());
    }
    return json({ ok: true, run: run.id, phase: run.phase, more });
  } catch (e: any) {
    const paused = [402, 403].includes(e?.status);
    await admin.from("swing_ai_runs").update({ status: paused ? "paused" : "failed", error: String(e?.message ?? e).slice(0, 1000), lease_until: null, completed_at: new Date().toISOString() }).eq("id", run.id);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
