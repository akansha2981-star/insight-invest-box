import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Ctx, RegimeDay, StrategyDef } from "@/lib/swing/strategies20";
import { liveSignalTrades, type LiveTrade } from "@/lib/swing/liveSignals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const db = supabase as any;
const inr = (n: number) => (n < 0 ? "-₹" : "₹") + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");
const ist = (s?: string | null) => (s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-");
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const STATUS: Record<string, "default" | "secondary" | "outline" | "destructive"> = { SIGNAL: "outline", OPEN: "default", RUNNING: "default", CLOSED: "secondary" };

/** Forward-only live trade tracker: every strategy signal from the tracking start date, ₹10,000 per trade, marked to live prices. */
export function LiveTrades({ ctxs, regime, defs }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[] }) {
  const [cfg, setCfg] = useState<{ start: string; capitalPerTrade: number } | null>(null);
  const [log, setLog] = useState<Map<string, { first_seen_at: string; closed_seen_at: string | null }>>(new Map());
  const [q, setQ] = useState(""); const [status, setStatus] = useState("ALL");
  const flash = useRef(new Map<string, number>()); const [, force] = useState(0);

  useEffect(() => { db.from("swing_settings").select("value").eq("key", "live_signals").maybeSingle().then(({ data }: any) => setCfg({ start: data?.value?.start ?? todayIst(), capitalPerTrade: +data?.value?.capitalPerTrade || 10000 })); }, []);
  const trades = useMemo(() => (cfg ? liveSignalTrades(defs, ctxs, cfg.start, regime, cfg.capitalPerTrade) : []), [cfg, defs, ctxs, regime]);

  // Record exact first-seen / closed times (shared, server timestamps)
  useEffect(() => {
    if (!cfg) return; let alive = true;
    (async () => {
      const { data } = await db.from("swing_signal_log").select("strategy_key,symbol,signal_date,first_seen_at,closed_seen_at").gte("signal_date", cfg.start).limit(5000);
      const m = new Map<string, any>((data ?? []).map((r: any) => [`${r.strategy_key}|${r.symbol}|${r.signal_date}`, r]));
      const missing = trades.filter((t) => !m.has(t.id));
      if (missing.length) await db.from("swing_signal_log").upsert(missing.map((t) => ({ strategy_key: t.strategyKey, strategy_name: t.strategy, symbol: t.symbol, signal_date: t.signalDate })), { onConflict: "strategy_key,symbol,signal_date", ignoreDuplicates: true });
      for (const t of trades.filter((t) => t.status === "CLOSED" && m.get(t.id)?.closed_seen_at == null && m.has(t.id)))
        await db.from("swing_signal_log").update({ closed_seen_at: new Date().toISOString() }).eq("strategy_key", t.strategyKey).eq("symbol", t.symbol).eq("signal_date", t.signalDate);
      if (missing.length || trades.some((t) => t.status === "CLOSED" && m.get(t.id)?.closed_seen_at == null)) {
        const { data: d2 } = await db.from("swing_signal_log").select("strategy_key,symbol,signal_date,first_seen_at,closed_seen_at").gte("signal_date", cfg.start).limit(5000);
        (d2 ?? []).forEach((r: any) => m.set(`${r.strategy_key}|${r.symbol}|${r.signal_date}`, r));
      }
      if (alive) setLog(m);
    })();
    return () => { alive = false; };
  }, [trades, cfg]);

  // Flash rows whose price moved
  const prev = useRef(new Map<string, number>());
  useEffect(() => { const now = Date.now(); trades.forEach((t) => { const p = prev.current.get(t.id); if (p !== undefined && p !== t.cmp) flash.current.set(t.id, now); prev.current.set(t.id, t.cmp); }); force((x) => x + 1); const id = setTimeout(() => force((x) => x + 1), 1600); return () => clearTimeout(id); }, [trades]);

  const traded = trades.filter((t) => t.status !== "SIGNAL");
  const closed = traded.filter((t) => t.status === "CLOSED"), open = traded.filter((t) => t.status !== "CLOSED");
  const wins = closed.filter((t) => t.netPnl > 0), losses = closed.filter((t) => t.netPnl <= 0);
  const td = todayIst(); const closedToday = closed.filter((t) => t.exitDate === td);
  const sum = (a: LiveTrade[], f: (t: LiveTrade) => number) => a.reduce((s, t) => s + f(t), 0);
  const invested = sum(traded, (t) => t.entryValue);
  const totalNet = sum(traded, (t) => t.netPnl);
  const cards: [string, string, number | null][] = [
    ["Today's net profit", inr(sum(closedToday.filter((t) => t.netPnl > 0), (t) => t.netPnl)), 1],
    ["Today's net loss", inr(sum(closedToday.filter((t) => t.netPnl <= 0), (t) => t.netPnl)), -1],
    ["Total gross profit", inr(sum(traded.filter((t) => t.grossPnl > 0), (t) => t.grossPnl)), 1],
    ["Total gross loss", inr(sum(traded.filter((t) => t.grossPnl < 0), (t) => t.grossPnl)), -1],
    ["Current running P&L", inr(sum(open, (t) => t.netPnl)), sum(open, (t) => t.netPnl)],
    ["Closed trades", String(closed.length), null], ["Open trades", String(open.length), null],
    ["Winning trades", String(wins.length), null], ["Losing trades", String(losses.length), null],
    ["Win rate", closed.length ? ((wins.length / closed.length) * 100).toFixed(1) + "%" : "-", null],
    ["Total return", invested ? ((totalNet / invested) * 100).toFixed(2) + "%" : "-", totalNet],
  ];

  const perf = useMemo(() => {
    const m = new Map<string, LiveTrade[]>(); traded.forEach((t) => m.set(t.strategy, [...(m.get(t.strategy) ?? []), t]));
    return [...m.entries()].map(([name, ts]) => { const c = ts.filter((t) => t.status === "CLOSED"); const w = c.filter((t) => t.netPnl > 0).length; const net = sum(ts, (t) => t.netPnl); const inv = sum(ts, (t) => t.entryValue);
      return { name, n: ts.length, wins: w, losses: c.length - w, winRate: c.length ? (w / c.length) * 100 : 0, net, ret: inv ? (net / inv) * 100 : 0 }; }).sort((a, b) => b.net - a.net);
  }, [traded]);
  const best = perf.filter((p) => p.net > 0).slice(0, 3), worst = perf.filter((p) => p.net < 0).reverse().slice(0, 3);

  const rows = trades.filter((t) => (status === "ALL" || t.status === status) && (!q || (t.symbol + t.strategy).toUpperCase().includes(q.toUpperCase())))
    .sort((a, b) => (log.get(b.id)?.first_seen_at ?? b.signalDate).localeCompare(log.get(a.id)?.first_seen_at ?? a.signalDate));
  const lastBar = ctxs[0]?.b.at(-1)?.date;

  return (
    <div className="space-y-4">
      <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 animate-pulse text-primary" />Live trades and signals</CardTitle>
        <p className="text-xs text-muted-foreground">Only signals from {cfg?.start ?? "-"} onward are tracked, nothing backdated. Each trade uses {inr(cfg?.capitalPerTrade ?? 10000)}; strategies auto-buy at the signal price and auto-sell on target, stop loss, exit rule or max holding; prices refresh every 30 seconds in market hours (latest bar {lastBar}). Charges included. Paper tracking only.</p></CardHeader></Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{cards.map(([l, v, s]) => (
        <Card key={l}><CardContent className="p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className={"text-lg font-bold tabular-nums " + (s === null ? "" : tone(s))}>{v}</div></CardContent></Card>))}</div>

      <div className="grid gap-3 md:grid-cols-2">
        {([["Top 3 most profitable strategies", best, TrendingUp], ["Top 3 loss-making strategies", worst, TrendingDown]] as const).map(([title, list, Icon], k) => (
          <Card key={title}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Icon className={"h-4 w-4 " + (k ? "text-destructive" : "text-emerald-600")} />{title}</CardTitle></CardHeader>
            <CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Strategy</TableHead><TableHead className="text-right">Trades</TableHead><TableHead className="text-right">{k ? "Losing" : "Winning"}</TableHead><TableHead className="text-right">Win rate</TableHead><TableHead className="text-right">{k ? "Total loss" : "Total profit"}</TableHead><TableHead className="text-right">Return</TableHead></TableRow></TableHeader>
              <TableBody>{!list.length && <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">No live results yet.</TableCell></TableRow>}
                {list.map((p) => <TableRow key={p.name}><TableCell className="text-xs">{p.name}</TableCell><TableCell className="text-right">{p.n}</TableCell><TableCell className="text-right">{k ? p.losses : p.wins}</TableCell><TableCell className="text-right">{p.winRate.toFixed(0)}%</TableCell><TableCell className={"text-right " + tone(p.net)}>{inr(p.net)}</TableCell><TableCell className={"text-right " + tone(p.ret)}>{p.ret.toFixed(2)}%</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 pb-2"><CardTitle className="mr-auto text-base">Trades ({rows.length})</CardTitle>
          {["ALL", "SIGNAL", "OPEN", "RUNNING", "CLOSED"].map((s) => <Badge key={s} variant={status === s ? "default" : "outline"} className="cursor-pointer" onClick={() => setStatus(s)}>{s}</Badge>)}
          <Input className="h-8 w-44" placeholder="Search stock or strategy" value={q} onChange={(e) => setQ(e.target.value)} /></CardHeader>
        <CardContent className="max-h-[640px] overflow-auto p-0"><Table>
          <TableHeader><TableRow>{["Strategy", "Stock", "Side", "Entry", "Target / exit", "CMP", "Qty", "Running P&L", "P&L %", "Gross profit", "Gross loss", "Charges", "Net P&L", "Status", "Signal seen (IST)", "Entry date", "Exit", "Exch"].map((h) => <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{!rows.length && <TableRow><TableCell colSpan={18} className="py-8 text-center text-muted-foreground">No live signals yet. New signals appear here automatically as strategies fire on live prices.</TableCell></TableRow>}
            {rows.map((t) => { const fl = Date.now() - (flash.current.get(t.id) ?? 0) < 1500; const lg = log.get(t.id); return (
              <TableRow key={t.id} className={"text-xs tabular-nums transition-colors " + (fl ? "bg-primary/10" : "")}>
                <TableCell className="max-w-[160px] truncate">{t.strategy}</TableCell><TableCell className="font-semibold">{t.symbol}</TableCell>
                <TableCell><Badge className="h-5 text-[10px]">{t.side}</Badge></TableCell>
                <TableCell>₹{t.entry.toFixed(2)}</TableCell><TableCell>{t.exitPrice ? `₹${t.exitPrice.toFixed(2)}` : t.target ? `₹${t.target.toFixed(2)}` : "-"}</TableCell>
                <TableCell className="font-semibold">₹{t.cmp.toFixed(2)}</TableCell><TableCell>{t.qty}</TableCell>
                <TableCell className={tone(t.status === "CLOSED" ? 0 : t.netPnl)}>{t.status === "CLOSED" || t.status === "SIGNAL" ? "-" : inr(t.netPnl)}</TableCell>
                <TableCell className={tone(t.pnlPct)}>{t.status === "SIGNAL" ? "-" : t.pnlPct.toFixed(2) + "%"}</TableCell>
                <TableCell className="text-emerald-600">{t.grossPnl > 0 ? inr(t.grossPnl) : "-"}</TableCell><TableCell className="text-destructive">{t.grossPnl < 0 ? inr(t.grossPnl) : "-"}</TableCell>
                <TableCell>{t.charges ? inr(t.charges) : "-"}</TableCell><TableCell className={"font-semibold " + tone(t.netPnl)}>{t.status === "SIGNAL" ? "-" : inr(t.netPnl)}</TableCell>
                <TableCell><Badge variant={STATUS[t.status]}>{t.status === "SIGNAL" ? "SIGNAL (buy next open)" : t.status}</Badge></TableCell>
                <TableCell className="whitespace-nowrap">{ist(lg?.first_seen_at)}</TableCell><TableCell>{t.entryDate ?? "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{t.exitDate ? `${t.exitDate}${lg?.closed_seen_at ? " · " + ist(lg.closed_seen_at) : ""}${t.reason ? " · " + t.reason : ""}` : "-"}</TableCell><TableCell>{t.exchange}</TableCell>
              </TableRow>); })}</TableBody></Table></CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground">Paper tracking on live NSE prices. Data unofficial, sourced from NSE/BSE via broker feed. Past or live results do not guarantee future returns. Not investment advice.</p>
    </div>
  );
}
