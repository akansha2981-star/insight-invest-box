import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Bot, CircleStop, Play, Trash2, Trophy, ArrowUpRight, ArrowDownRight, Clock, Gauge, Plus, Search, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIMITS, type Limits } from "@/lib/swing/limits";
import { StrategyReport, NotificationFeed, tradeEvents } from "./StrategyReport";
import { supabase } from "@/integrations/supabase/client";
import type { Bar } from "@/lib/swing/engine";
import { STRATEGIES, buildCtx, rankUniverse, simulate, strategyByKey, marketRegime, allowedRegimes, type SimResult, type StrategyDef, type Ctx, type RegimeDay, type Regime } from "@/lib/swing/strategies20";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const db = supabase as any;
const inr = (n: number) => (n < 0 ? "-₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");
const px = (n: number | null | undefined) => (n === null || n === undefined ? "-" : "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");
const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

interface Deployment { id: string; strategy_key: string; capital: number; risk_pct: number; start_date: string; status: string; stopped_at: string | null; created_at: string; market_filter: boolean }
const REGIME_LABEL: Record<Regime, string> = { bull: "Strong Bull", sideways: "Sideways", bear: "Bear" };
const regimeList = (def: StrategyDef) => allowedRegimes(def).map((r) => REGIME_LABEL[r]).join(" + ");

export type LabView = "live" | "lab" | "alerts" | "board" | "market";
export function StrategyLab({ ctxs, regime, defs, userId, onUniverseChange, view, onUnread, quiet, limits = LIMITS }: { limits?: Limits; ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[]; userId: string; onUniverseChange?: () => void; view: LabView; onUnread?: (n: number) => void; quiet?: boolean }) {
  const strategyByKey = (k: string) => defs.find((d) => d.key === k);
  const [boardFilter, setBoardFilter] = useState(true);
  const [deps, setDeps] = useState<Deployment[]>([]);
  const [detail, setDetail] = useState<{ def: StrategyDef; res: SimResult; title: string } | null>(null);
  const [form, setForm] = useState({ key: defs[11]?.key ?? defs[0]?.key, capital: 50000, risk: limits.defaultRisk, start: todayIST(), filter: true });


  const loadDeps = async () => { const { data } = await db.from("swing_deployments").select("*").order("created_at", { ascending: false }); setDeps(data ?? []); };
  useEffect(() => { loadDeps(); }, [userId]);

  const board = useMemo(() => ctxs.length && view === "board" ? defs.map((def) => ({ def, res: simulate(def, ctxs, { capital: 50000, regime: boardFilter ? regime : null }) })).sort((a, b) => (b.res.trades.length ? 1 : 0) - (a.res.trades.length ? 1 : 0) || b.res.netReturn - a.res.netReturn) : [], [ctxs, regime, boardFilter, defs, view]);
  const live = useMemo(() => deps.map((d) => { const def = strategyByKey(d.strategy_key); return { d, def, res: def && ctxs.length ? simulate(def, ctxs, { capital: +d.capital, riskPct: +d.risk_pct, startDate: d.start_date, endDate: d.stopped_at ?? undefined, regime: d.market_filter === false ? null : regime, liveEntry: true }) : null }; }), [deps, ctxs, regime, defs]);
  const today = regime ? [...regime.values()].at(-1) : undefined;
  const seenKey = `swing-notif-seen-${userId}`;
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(seenKey) ?? "0000");
  const events = useMemo(() => live.filter((x) => x.res).flatMap((x) => tradeEvents(x.res!.trades, x.d.id)).sort((a, b) => b.date.localeCompare(a.date)), [live]);
  const markSeen = () => { const d = events[0]?.date ?? todayIST(); localStorage.setItem(seenKey, d); setLastSeen(d); };
  const unread = events.filter((e) => e.date > lastSeen).length;
  useEffect(() => { onUnread?.(unread); }, [unread]);
  const toasted = useRef(false);
  useEffect(() => {
    if (quiet || toasted.current || !events.length) return; toasted.current = true;
    events.filter((e) => e.date > lastSeen).slice(0, 5).forEach((e) => e.kind === "BUY" ? toast.info(`BUY ${e.qty} ${e.symbol} @ ₹${e.price} · ${e.strategy}`) : (e.pnl ?? 0) > 0 ? toast.success(`SELL ${e.symbol} · Profit booked ${inr(e.pnl ?? 0)} · ${e.strategy}`) : toast.error(`SELL ${e.symbol} · Loss booked ${inr(e.pnl ?? 0)} · ${e.strategy}`));
  }, [events, lastSeen]);
  const totals = live.reduce((a, x) => { if (!x.res) return a; a.inv += x.res.startEquity; a.val += x.res.finalEquity; a.open += x.res.trades.filter((t) => t.open).length; a.closed += x.res.closedCount; return a; }, { inv: 0, val: 0, open: 0, closed: 0 });
  const keepLive = async (keys: string[], capital: number, start: string, filter: boolean) => {
    const { error } = await db.from("swing_deployments").insert(keys.map((k) => ({ user_id: userId, strategy_key: k, capital, risk_pct: form.risk, start_date: start, market_filter: filter })));
    if (error) { toast.error(error.message); return; } toast.success(`${keys.length} strategies now running live from ${start}`); loadDeps();
  };
  const lastDate = ctxs[0]?.b.at(-1)?.date;

  const deploy = async () => {
    if (!(form.capital >= 1000)) return toast.error("Enter at least ₹1,000");
    const { error } = await db.from("swing_deployments").insert({ user_id: userId, strategy_key: form.key, capital: form.capital, risk_pct: form.risk, start_date: form.start, market_filter: form.filter });
    if (error) return toast.error(error.message); toast.success("Strategy started. It will auto buy and sell from " + form.start); loadDeps();
  };
  const stop = async (d: Deployment) => { await db.from("swing_deployments").update({ status: "stopped", stopped_at: todayIST() }).eq("id", d.id); loadDeps(); };
  const remove = async (d: Deployment) => { if (!confirm("Delete this auto-trading plan?")) return; await db.from("swing_deployments").delete().eq("id", d.id); loadDeps(); };

  if (!ctxs.length || !form.key) return <p className="text-sm text-muted-foreground">Loading live NSE price history and computing indicators...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <Kpi l="Running strategies" v={deps.filter((d) => d.status === "active").length} /><Kpi l="Money in strategies" v={inr(totals.inv)} />
        <Kpi l="Current value" v={inr(totals.val)} /><Kpi l="Net P&L" v={<span className={tone(totals.val - totals.inv)}>{inr(totals.val - totals.inv)}</span>} />
        <Kpi l="Open / closed trades" v={`${totals.open} / ${totals.closed}`} /><Kpi l="Market today" v={today ? REGIME_LABEL[today.regime] : "-"} />
      </div>
      <Tabs value={view}>
        <TabsContent value="lab"><StrategyReport limits={limits} ctxs={ctxs} regime={regime} defs={defs} onKeepLive={keepLive} /></TabsContent>
        <TabsContent value="alerts"><NotificationFeed events={events} lastSeen={lastSeen} onSeen={markSeen} /></TabsContent>
        <TabsContent value="live" className="space-y-4">
      {/* Auto-trade */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4 text-primary" />Auto-trade a strategy (paper)</CardTitle>
          <p className="text-xs text-muted-foreground">Pick a strategy, set an amount and a start date. From that day the strategy buys automatically at the live price as soon as a BUY signal appears and sells on its SL, TP, trailing stop or exit rule, using live NSE daily data. 1% risk per trade by default, max 5 positions, charges and slippage included.</p></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2"><Label className="text-xs">Strategy</Label>
            <Select value={form.key} onValueChange={(v) => setForm({ ...form, key: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{defs.map((s) => <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Amount (₹)</Label><Input type="number" min={1000} value={form.capital} onChange={(e) => setForm({ ...form, capital: +e.target.value })} /></div>
          <div><Label className="text-xs">Risk per trade (%)</Label><Input type="number" min={0.25} max={limits.maxRisk} step={0.25} value={form.risk} onChange={(e) => setForm({ ...form, risk: Math.min(limits.maxRisk, Math.max(0.25, +e.target.value)) })} /></div>
          <div><Label className="text-xs">Start date</Label><Input type="date" max={todayIST()} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
          <div className="flex items-center gap-2 md:col-span-5"><Switch id="mf" checked={form.filter} onCheckedChange={(v) => setForm({ ...form, filter: v })} /><Label htmlFor="mf" className="text-xs">Market condition filter: only buy when the market suits this strategy ({regimeList(strategyByKey(form.key)!)})</Label></div>
          <div className="md:col-span-5"><Button onClick={deploy}><Play className="mr-1 h-4 w-4" />Start auto-trading</Button></div>
        </CardContent>
      </Card>


      {live.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">My running strategies</h2>
          {live.map(({ d, def, res }) => {
            if (!def || !res) return null; const openT = res.trades.filter((t) => t.open); const pnl = res.finalEquity - res.startEquity;
            return (
              <Card key={d.id}>
                <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2">
                  <div><CardTitle className="text-base">{def.name}</CardTitle><p className="text-xs text-muted-foreground">Started {d.start_date}{d.stopped_at ? ` · stopped ${d.stopped_at}` : ""} · data up to {lastDate} · risk {d.risk_pct}%/trade · market filter {d.market_filter === false ? "off" : "on (" + regimeList(def) + ")"}</p></div>
                  <div className="flex items-center gap-2"><Badge variant={d.status === "active" ? "default" : "outline"}>{d.status === "active" ? "Running" : "Stopped"}</Badge>
                    {d.status === "active" && <Button size="sm" variant="outline" onClick={() => stop(d)}><CircleStop className="mr-1 h-3 w-3" />Stop</Button>}
                    <Button size="sm" variant="outline" onClick={() => setDetail({ def, res, title: `${def.name} — live since ${d.start_date}` })}>Details</Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(d)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></div>
                </div></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
                    <Kpi l="Invested amount" v={inr(res.startEquity)} /><Kpi l="Current value" v={inr(res.finalEquity)} /><Kpi l="Net P&L" v={<span className={tone(pnl)}>{inr(pnl)} ({pct(res.netReturn)})</span>} />
                    <Kpi l="Open positions" v={openT.length} /><Kpi l="Closed trades" v={res.closedCount} /><Kpi l="Win rate" v={res.closedCount ? res.winRate.toFixed(0) + "%" : "-"} />
                  </div>
                  {d.status === "active" && res.pending.length > 0 && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-foreground"><Clock className="h-3 w-3" />Will BUY at next market open</div>
                      {res.pending.map((p) => <div key={p.symbol}>{p.symbol}: signal close {px(p.close)} · SL {px(p.stopLoss)} · TP1 {px(p.tp1)} · TP2 {px(p.tp2)} · approx qty {p.qty} · {p.note}</div>)}
                    </div>)}
                  {openT.length === 0 && res.pending.length === 0 && <p className="text-xs text-muted-foreground">{d.market_filter !== false && today && !allowedRegimes(def).includes(today.regime) ? `Paused: the market is ${REGIME_LABEL[today.regime]}, and this strategy only buys in ${regimeList(def)}. Open trades are still managed.` : "Waiting for a BUY signal. The strategy checks every stock after each live data update."}</p>}
                  {openT.length > 0 && <TradeTable trades={openT} compact />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

        </TabsContent>
        <TabsContent value="market" className="space-y-4">
          {today && <MarketCard today={today} regime={regime!} />}
          <UniversePanel count={ctxs.length} onAdded={onUniverseChange} />
        </TabsContent>
        <TabsContent value="board">
      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" />Best performing strategies</CardTitle>
          <p className="text-xs text-muted-foreground">All {defs.length} strategies tested on live NSE daily data for {ctxs.length} stocks, {board[0]?.res.from} to {board[0]?.res.to}. ₹50,000 start, 1% risk per trade, max 5 positions, next-open entry, charges and slippage included. Past results do not guarantee future returns.</p>
          <div className="flex items-center gap-2 pt-1"><Switch id="bf" checked={boardFilter} onCheckedChange={setBoardFilter} /><Label htmlFor="bf" className="text-xs">Apply market condition filter</Label></div></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table><TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead>Net return</TableHead><TableHead>CAGR</TableHead><TableHead>Final value</TableHead><TableHead>Win rate</TableHead><TableHead>Profit factor</TableHead><TableHead>Max DD</TableHead><TableHead>Trades</TableHead><TableHead>Avg R</TableHead><TableHead>Sharpe</TableHead><TableHead>Signals today</TableHead><TableHead />
          </TableRow></TableHeader>
            <TableBody>{board.map(({ def, res }, k) => (
              <TableRow key={def.key}>
                <TableCell className="font-bold">{k + 1}</TableCell>
                <TableCell><div className="font-semibold">{def.name}</div><div className="text-[11px] text-muted-foreground">{def.family} · buys in {regimeList(def)}</div></TableCell>
                <TableCell className={"font-semibold " + tone(res.netReturn)}>{pct(res.netReturn)}</TableCell><TableCell className={tone(res.cagr)}>{pct(res.cagr)}</TableCell>
                <TableCell>{inr(res.finalEquity)}</TableCell><TableCell>{res.closedCount ? res.winRate.toFixed(0) + "%" : "-"}</TableCell><TableCell>{res.profitFactor.toFixed(2)}</TableCell>
                <TableCell className="text-destructive">-{res.maxDrawdown.toFixed(1)}%</TableCell><TableCell>{res.trades.length}</TableCell><TableCell className={tone(res.avgR)}>{res.avgR.toFixed(2)}R</TableCell><TableCell>{res.sharpe.toFixed(2)}</TableCell>
                <TableCell>{res.pending.length ? <Badge>{res.pending.length} BUY</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell className="whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => setDetail({ def, res, title: def.name })}>Details</Button>{" "}
                  <Button size="sm" onClick={() => { setForm({ ...form, key: def.key }); toast.info(`${def.name} selected. Open "Strategies" to start it.`); }}>Auto-trade</Button></TableCell>
              </TableRow>))}</TableBody></Table>
        </CardContent>
      </Card>

        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto [&>*]:min-w-0">
          {detail && <><DialogHeader><DialogTitle>{detail.title}</DialogTitle></DialogHeader><StrategyDetail def={detail.def} res={detail.res} /></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StrategyDetail({ def, res }: { def: StrategyDef; res: SimResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Rule t="When to BUY" v={def.buyRule} icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />} />
        <Rule t="When to SELL" v={def.sellRule} icon={<ArrowDownRight className="h-4 w-4 text-destructive" />} />
        <Rule t="Market condition" v={`Buys only in ${regimeList(def)} market (when the filter is on). Strong Bull: index above SMA200, SMA50 above SMA200, ADX above 20. Bear: index below SMA200 and SMA50 below SMA200. Otherwise Sideways.`} /><Rule t="Stop loss" v={def.slRule} /><Rule t="Take profit" v={def.tpRule + " · Position size = (Equity x Risk %) / (Entry - SL)"} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
        <Kpi l="Net return" v={<span className={tone(res.netReturn)}>{pct(res.netReturn)}</span>} /><Kpi l="Final value" v={inr(res.finalEquity)} /><Kpi l="Win rate" v={res.winRate.toFixed(0) + "%"} />
        <Kpi l="Profit factor" v={res.profitFactor.toFixed(2)} /><Kpi l="Max drawdown" v={"-" + res.maxDrawdown.toFixed(1) + "%"} /><Kpi l="Expectancy/trade" v={inr(res.expectancy)} />
        <Kpi l="Avg R" v={res.avgR.toFixed(2) + "R"} /><Kpi l="Avg hold" v={res.avgHold.toFixed(1) + " days"} /><Kpi l="Sharpe" v={res.sharpe.toFixed(2)} />
        <Kpi l="Closed trades" v={res.closedCount} /><Kpi l="Open trades" v={res.trades.length - res.closedCount} /><Kpi l="Total charges" v={inr(res.totalCharges)} />
      </div>
      {res.equity.length > 1 && <div className="h-56"><ResponsiveContainer><LineChart data={res.equity}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => inr(v)} /><Line type="monotone" dataKey="value" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer></div>}
      {res.pending.length > 0 && <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs"><b>Today's BUY signals (execute next open):</b> {res.pending.map((p) => `${p.symbol} @ ${px(p.close)} SL ${px(p.stopLoss)} TP1 ${px(p.tp1)} TP2 ${px(p.tp2)}`).join(" · ")}</div>}
      <TradeTable trades={[...res.trades].reverse()} />
    </div>
  );
}

function TradeTable({ trades, compact }: { trades: SimResult["trades"]; compact?: boolean }) {
  if (!trades.length) return <p className="text-sm text-muted-foreground">No trades in this period.</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table><TableHeader><TableRow>
        <TableHead>Symbol</TableHead><TableHead>Entry</TableHead><TableHead>Qty</TableHead><TableHead>Stop loss</TableHead><TableHead>TP1</TableHead><TableHead>TP2</TableHead><TableHead>Trailing</TableHead><TableHead>Risk</TableHead><TableHead>Position</TableHead>
        <TableHead>{compact ? "Live price" : "Exit"}</TableHead>{!compact && <TableHead>Exit reason</TableHead>}<TableHead>Gross</TableHead><TableHead>Charges</TableHead><TableHead>Slippage</TableHead><TableHead>Net P&L</TableHead><TableHead>R</TableHead>{!compact && <TableHead>Equity before / after</TableHead>}
      </TableRow></TableHeader>
        <TableBody>{trades.map((t, k) => (
          <TableRow key={t.symbol + t.entryDate + k}>
            <TableCell><div className="font-semibold">{t.symbol}</div><div className="text-[10px] text-muted-foreground">{t.exchange} · {t.timeframe} · {t.note}</div></TableCell>
            <TableCell className="whitespace-nowrap">{px(t.entryPrice)}<div className="text-[10px] text-muted-foreground">{t.entryDate}</div></TableCell>
            <TableCell>{t.quantity}</TableCell><TableCell>{px(t.stopLoss)}</TableCell><TableCell>{px(t.tp1)}</TableCell><TableCell>{px(t.tp2)}</TableCell><TableCell>{px(t.trailingStop)}</TableCell>
            <TableCell>{inr(t.riskAmount)}</TableCell><TableCell>{inr(t.positionValue)}</TableCell>
            <TableCell className="whitespace-nowrap">{t.open ? <>{px(t.lastPrice)} <Badge variant="outline" className="ml-1">Open</Badge></> : <>{px(t.exitPrice)}<div className="text-[10px] text-muted-foreground">{t.exitDate}</div></>}</TableCell>
            {!compact && <TableCell className="text-xs">{t.exitReason ?? "-"}</TableCell>}
            <TableCell className={tone(t.grossPnl)}>{inr(t.grossPnl)}</TableCell><TableCell>{inr(t.charges)}</TableCell><TableCell>{inr(t.slippage)}</TableCell>
            <TableCell className={"font-semibold " + tone(t.netPnl)}>{inr(t.netPnl)}</TableCell><TableCell className={tone(t.rMultiple)}>{t.rMultiple.toFixed(2)}</TableCell>
            {!compact && <TableCell className="whitespace-nowrap text-xs">{inr(t.equityBefore)} / {t.equityAfter ? inr(t.equityAfter) : "-"}</TableCell>}
          </TableRow>))}</TableBody></Table>
    </div>
  );
}

const Kpi = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="rounded-md border border-border bg-muted/30 p-2"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-semibold text-foreground">{v}</div></div>;
const Rule = ({ t, v, icon }: { t: string; v: string; icon?: React.ReactNode }) => <div className="rounded-md border border-border p-3"><div className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{icon}{t}</div><div className="text-sm text-foreground">{v}</div></div>;

export function MarketCard({ today, regime }: { today: RegimeDay; regime: Map<string, RegimeDay> }) {
  const hist = [...regime.values()].slice(-250); const n = (r: Regime) => hist.filter((h) => h.regime === r).length;
  const variant = today.regime === "bull" ? "default" : today.regime === "bear" ? "destructive" : "secondary";
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex flex-wrap items-center gap-2 text-base"><Gauge className="h-4 w-4 text-primary" />Market condition today<Badge variant={variant as any}>{REGIME_LABEL[today.regime]}</Badge><span className="text-xs font-normal text-muted-foreground">as of {today.date}</span></CardTitle>
        <p className="text-xs text-muted-foreground">Measured on an equal-weight index of all stocks the strategies scan, from live NSE daily prices.</p></CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm md:grid-cols-6">
        <Kpi l="Index vs SMA200" v={<span className={tone(today.close - (today.sma200 ?? today.close))}>{today.sma200 ? pct(((today.close - today.sma200) / today.sma200) * 100) : "-"}</span>} />
        <Kpi l="SMA50 vs SMA200" v={today.sma50 && today.sma200 ? (today.sma50 > today.sma200 ? "Above" : "Below") : "-"} />
        <Kpi l="ADX (trend strength)" v={today.adx?.toFixed(1) ?? "-"} />
        <Kpi l="Stocks above SMA200" v={today.breadth + "%"} />
        <Kpi l="Last 250 days" v={`${n("bull")} bull · ${n("sideways")} side · ${n("bear")} bear`} />
        <Kpi l="Built-in strategies allowed" v={STRATEGIES.filter((s) => allowedRegimes(s).includes(today.regime)).length + " of 20"} />
      </CardContent>
    </Card>
  );
}

interface Inst { exchange: string; token: string; symbol: string; name: string }
export function UniversePanel({ count, onAdded }: { count: number; onAdded?: () => void }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState<Inst[]>([]); const [busy, setBusy] = useState<string | null>(null);
  const [extra, setExtra] = useState<{ symbol: string; name: string }[]>([]);
  const loadExtra = async () => { const { data } = await db.from("swing_universe").select("symbol,name").order("created_at", { ascending: false }); setExtra(data ?? []); };
  useEffect(() => { loadExtra(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const id = setTimeout(async () => { const { data } = await supabase.functions.invoke("swing-terminal", { body: { action: "search", q } }); setRes(((data?.results ?? []) as Inst[]).filter((r) => r.exchange === "NSE" && r.symbol.endsWith("-EQ")).slice(0, 8)); }, 300);
    return () => clearTimeout(id);
  }, [q]);
  const add = async (i: Inst) => {
    setBusy(i.token);
    const { data, error } = await supabase.functions.invoke("swing-sync", { body: { add: { token: i.token, symbol: i.symbol } } });
    setBusy(null);
    if (error || data?.error || data?.failed?.length) return toast.error(data?.error ?? "Could not fetch this stock's prices. Try again shortly.");
    toast.success(`${i.name} added. Strategies now scan it with ${data.synced} days of live prices.`); setQ(""); setRes([]); loadExtra(); onAdded?.();
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4 text-primary" />Stocks the strategies scan ({count})</CardTitle>
        <p className="text-xs text-muted-foreground">48 large NSE stocks are always included. Search any NSE share and add it; its 3-year live price history is downloaded and every strategy starts checking it. Up to 150 extra stocks.</p></CardHeader>
      <CardContent className="space-y-2">
        <div className="relative max-w-md"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search an NSE stock to add" className="pl-8" aria-label="Search stock to add" />
          {res.length > 0 && <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">{res.map((r) => (
            <button key={r.token} disabled={!!busy} onClick={() => add(r)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"><span>{r.name}</span>{busy === r.token ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs text-muted-foreground">{r.symbol} · Add</span>}</button>))}</div>}
        </div>
        {extra.length > 0 && <div className="flex flex-wrap gap-1">{extra.map((e) => <Badge key={e.symbol} variant="outline">{e.symbol}</Badge>)}</div>}
      </CardContent>
    </Card>
  );
}
