import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Database, Radio, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { Ctx, RegimeDay, StrategyDef } from "@/lib/swing/strategies20";
import { liveSignalTrades } from "@/lib/swing/liveSignals";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const db = supabase as any;
const f2 = (n: number, d = 2) => (Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: d }) : "-");
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");
const istNow = () => new Date(Date.now() + 330 * 60000);
const marketOpen = () => { const d = istNow(); const m = d.getUTCHours() * 60 + d.getUTCMinutes(); return d.getUTCDay() > 0 && d.getUTCDay() < 6 && m >= 555 && m <= 930; };
const fmt = (t: number | string) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

interface Ev { t: number; kind: string; text: string; tone: number }

/** Live overview: status, health, breadth, movers, signals, open trades and an activity feed. */
export function LiveDashboard({ ctxs, regime, defs, liveCount, lastSync }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[]; liveCount: number; lastSync: string | null }) {
  const [tick, setTick] = useState(Date.now()); const [start, setStart] = useState<string | null>(null);
  const [feed, setFeed] = useState<Ev[]>([]); const prev = useRef<Map<string, number> | null>(null); const seen = useRef(new Set<string>());
  const [, clock] = useState(0);
  useEffect(() => { setTick(Date.now()); }, [ctxs]);
  useEffect(() => { const id = setInterval(() => clock((x) => x + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { db.from("swing_settings").select("value").eq("key", "live_signals").maybeSingle().then(({ data }: any) => setStart(data?.value?.start ?? istNow().toISOString().slice(0, 10))); }, []);

  const latest = useMemo(() => ctxs.reduce((m, c) => (c.b.at(-1)!.date > m ? c.b.at(-1)!.date : m), ""), [ctxs]);
  const rows = useMemo(() => ctxs.map((c) => { const i = c.b.length - 1, b = c.b[i], p = c.b[i - 1]; return { c, sym: c.sym, close: b.close, chg: p ? (b.close / p.close - 1) * 100 : 0, value: b.close * b.volume, volume: b.volume, volRatio: c.volRatio[i], date: b.date, hi20: c.hi20[i], hi252: c.hi252[i] }; }), [ctxs]);
  const stale = rows.filter((r) => r.date < latest);
  const adv = rows.filter((r) => r.chg > 0).length, dec = rows.filter((r) => r.chg < 0).length;
  const idx = regime ? [...regime.values()].slice(-2) : [];
  const idxChg = idx.length === 2 ? (idx[1].close / idx[0].close - 1) * 100 : NaN;
  const gainers = [...rows].sort((a, b) => b.chg - a.chg).slice(0, 5), losers = [...rows].sort((a, b) => a.chg - b.chg).slice(0, 5), active = [...rows].sort((a, b) => b.value - a.value).slice(0, 5);
  const trades = useMemo(() => (start ? liveSignalTrades(defs, ctxs, start, regime) : []), [start, defs, ctxs, regime]);
  const openT = trades.filter((t) => t.status === "OPEN" || t.status === "RUNNING"), signals = trades.filter((t) => t.status === "SIGNAL");
  const running = openT.reduce((a, t) => a + t.netPnl, 0);
  const isOpen = marketOpen();

  // Build the activity feed from real changes between refreshes
  useEffect(() => {
    if (!ctxs.length) return; const now = Date.now(); const ev: Ev[] = [];
    const add = (key: string, kind: string, text: string, tn = 0) => { if (seen.current.has(key)) return; seen.current.add(key); ev.push({ t: now, kind, text, tone: tn }); };
    trades.forEach((t) => {
      if (t.status === "SIGNAL") add(`sig|${t.id}`, "BUY signal", `${t.strategy}: BUY ${t.symbol} near ₹${f2(t.close ?? t.entry)} (fills next open)`, 1);
      if (t.status !== "SIGNAL") add(`open|${t.id}`, "Trade OPEN", `${t.symbol} entered at ₹${f2(t.entry)} by ${t.strategy}`, 1);
      if (t.status === "CLOSED") add(`close|${t.id}`, t.reason === "Target hit" ? "Target reached" : t.reason === "Stop loss" ? "Stop-loss hit" : "Trade closed", `${t.symbol} (${t.strategy}) closed at ₹${f2(t.exitPrice ?? 0)}, net ₹${f2(t.netPnl, 0)}`, t.netPnl);
    });
    rows.forEach((r) => {
      if (r.date !== latest) return;
      if (r.volRatio > 2) add(`vol|${r.sym}|${r.date}`, "Volume spike", `${r.sym} volume ${f2(r.volRatio, 1)}x its 20-day average`, 0);
      if (r.close > r.hi252 * 0.999) add(`b52|${r.sym}|${r.date}`, "Breakout", `${r.sym} at a 52-week high, ₹${f2(r.close)}`, 1);
      else if (r.close > r.hi20) add(`b20|${r.sym}|${r.date}`, "Breakout", `${r.sym} above its 20-day high, ₹${f2(r.close)}`, 1);
    });
    const p = prev.current;
    if (p) rows.forEach((r) => { const o = p.get(r.sym); if (o && Math.abs(r.close / o - 1) >= 0.005) ev.push({ t: now, kind: "Price move", text: `${r.sym} ${r.close > o ? "up" : "down"} ${f2(Math.abs(r.close / o - 1) * 100)}% to ₹${f2(r.close)} since last refresh`, tone: r.close - o }); });
    prev.current = new Map(rows.map((r) => [r.sym, r.close]));
    if (ev.length) setFeed((f) => [...ev, ...f].slice(0, 200));
  }, [rows, trades, latest, ctxs.length]);

  const age = Math.round((Date.now() - tick) / 1000);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {[
          ["Market", isOpen ? "LIVE" : "CLOSED", isOpen ? 1 : -1],
          ["Market index (equal-weight)", Number.isFinite(idxChg) ? (idxChg >= 0 ? "+" : "") + f2(idxChg) + "%" : "-", idxChg],
          ["Advancers / decliners", `${adv} / ${dec}`, adv - dec],
          ["Breadth (above 50 DMA)", idx[1] ? f2(idx[1].breadth, 0) + "%" : "-", 0],
          ["Total value traded", "₹" + f2(rows.reduce((a, r) => a + r.value, 0) / 1e7, 0) + " Cr", 0],
          ["New buy signals", String(signals.length), signals.length],
          ["Open trades", String(openT.length), 0],
          ["Running P&L", "₹" + f2(running, 0), running],
        ].map(([l, v, s]) => <Card key={l as string}><CardContent className="p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className={"text-lg font-bold tabular-nums " + (s ? tone(s as number) : "text-foreground")}>{l === "Market" && <span className={"mr-1 inline-block h-2 w-2 rounded-full " + (isOpen ? "animate-pulse bg-primary" : "bg-muted-foreground")} />}{v}</div></CardContent></Card>)}
      </div>

      <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-primary" />Data health</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
          {[
            ["NSE data", liveCount > 0 ? "Connected (live)" : isOpen ? "Disconnected" : "Market closed, last close"],
            ["BSE data", "Not connected (no BSE live feed)"],
            ["Data source", "Angel One SmartAPI (NSE)"],
            ["Refresh interval", "Live prices 30s · history 15 min"],
            ["Last refresh seen", `${fmt(tick)} (${age}s ago)`],
            ["Last history sync", lastSync ? fmt(lastSync) : "-"],
            ["Stocks updated", `${rows.length - stale.length} of ${rows.length}`],
            ["Stocks failed / stale", stale.length ? `${stale.length}: ${stale.slice(0, 6).map((s) => s.sym).join(", ")}${stale.length > 6 ? "..." : ""}` : "0"],
            ["Live quotes received", String(liveCount)],
            ["Latest bar date", latest || "-"],
            ["Auto refresh", "On"],
            ["Data delay", liveCount > 0 ? "~30 seconds" : "End of day"],
          ].map(([l, v]) => <div key={l} className="flex justify-between gap-2 border-b border-border py-1"><span className="text-muted-foreground">{l}</span><span className="text-right font-medium">{v}</span></div>)}
        </CardContent></Card>

      <div className="grid gap-3 lg:grid-cols-3">
        {([["Top gainers", gainers, TrendingUp], ["Top losers", losers, TrendingDown], ["Most active (value)", active, Zap]] as const).map(([t, list, I]) => (
          <Card key={t}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><I className="h-4 w-4 text-primary" />{t}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">{list.map((r) => <div key={r.sym} className="flex justify-between tabular-nums"><span className="font-semibold">{r.sym}</span><span>₹{f2(r.close)} <span className={tone(r.chg)}>{r.chg >= 0 ? "+" : ""}{f2(r.chg)}%</span>{t.startsWith("Most") && <span className="ml-2 text-muted-foreground">₹{f2(r.value / 1e7, 1)} Cr</span>}</span></div>)}</CardContent></Card>))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Radio className="h-4 w-4 text-primary" />Strategy signals and open trades</CardTitle></CardHeader>
          <CardContent className="max-h-80 space-y-1 overflow-auto text-xs">{![...signals, ...openT].length && <p className="text-muted-foreground">No live signals or open trades yet. They appear here as soon as a strategy fires.</p>}
            {[...signals, ...openT].map((t) => <div key={t.id} className="flex items-center justify-between gap-2 border-b border-border py-1"><span className="truncate"><Badge variant={t.status === "SIGNAL" ? "outline" : "default"} className="mr-1 text-[10px]">{t.status}</Badge><b>{t.symbol}</b> <span className="text-muted-foreground">{t.strategy}</span></span><span className={"tabular-nums " + tone(t.netPnl)}>{t.status === "SIGNAL" ? `₹${f2(t.entry)}` : `₹${f2(t.netPnl, 0)} (${f2(t.pnlPct)}%)`}</span></div>)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 animate-pulse text-primary" />Live activity feed</CardTitle></CardHeader>
          <CardContent className="max-h-80 space-y-1 overflow-auto text-xs">{!feed.length && <p className="text-muted-foreground">Waiting for market events...</p>}
            {feed.map((e, k) => <div key={k} className="flex gap-2 border-b border-border py-1"><span className="shrink-0 tabular-nums text-muted-foreground">{fmt(e.t)}</span><Badge variant="outline" className={"shrink-0 text-[10px] " + tone(e.tone)}>{e.kind}</Badge><span>{e.text}</span></div>)}</CardContent></Card>
      </div>
      <p className="text-[11px] text-muted-foreground">Feed times are when this screen saw the event. Market index is an equal-weight average of the scanned stocks (no NIFTY feed connected). Unofficial data via broker feed, sourced from NSE. Not investment advice.</p>
    </div>
  );
}
