import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, Legend } from "recharts";
import { FileBarChart, Play, Radio, BookCheck, BookX, Bell, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { STRATEGIES, simulate, allowedRegimes, type Ctx, type RegimeDay, type SimResult, type SimTrade, type StrategyDef } from "@/lib/swing/strategies20";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LIMITS, type Limits } from "@/lib/swing/limits";
import { ExportButtons } from "./ExportButtons";
import { TRADE_HEAD, tradeRows, r2 } from "@/lib/swing/exportReport";

const inr = (n: number) => (n < 0 ? "-₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");
const px = (n: number | null | undefined) => (n == null ? "-" : "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");
const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const COLORS = ["--primary", "--gold", "--accent", "--gain", "--loss", "--secondary-foreground"];

export interface TradeEvent { id: string; date: string; kind: "BUY" | "SELL" | "PARTIAL"; strategy: string; symbol: string; price: number; qty: number; pnl?: number; reason?: string | null; source: string }

/** Turns simulated trades into buy / sell notification events. */
export function tradeEvents(trades: SimTrade[], source: string): TradeEvent[] {
  const ev: TradeEvent[] = [];
  trades.forEach((t) => {
    ev.push({ id: `${source}-${t.symbol}-${t.entryDate}-B`, date: t.entryDate, kind: "BUY", strategy: t.strategy, symbol: t.symbol, price: t.entryPrice, qty: t.quantity, source });
    if (!t.open && t.exitDate) ev.push({ id: `${source}-${t.symbol}-${t.entryDate}-S`, date: t.exitDate, kind: "SELL", strategy: t.strategy, symbol: t.symbol, price: t.exitPrice ?? 0, qty: t.quantity, pnl: t.netPnl, reason: t.exitReason, source });
  });
  return ev;
}

export function StrategyReport({ ctxs, regime, defs, onKeepLive, limits = LIMITS }: { limits?: Limits; ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[]; onKeepLive: (keys: string[], capital: number, start: string, filter: boolean) => Promise<void> }) {
  const firstDate = ctxs[0]?.b[Math.min(200, (ctxs[0]?.b.length ?? 1) - 1)]?.date ?? "2024-01-01";
  const [cfg, setCfg] = useState({ capital: 100000, start: firstDate, risk: limits.defaultRisk, maxPos: Math.min(5, limits.maxPositions), filter: true });
  const [pick, setPick] = useState<string[]>(defs.map((s) => s.key));
  const [run, setRun] = useState(cfg);
  const [runPick, setRunPick] = useState(pick);

  const results = useMemo(() => defs.filter((s) => runPick.includes(s.key)).map((def) => ({ def, res: simulate(def, ctxs, { capital: run.capital, riskPct: run.risk, startDate: run.start, maxPositions: run.maxPos, regime: run.filter ? regime : null }) })), [ctxs, regime, run, runPick, defs]);

  const r = useMemo(() => {
    const all = results.flatMap((x) => x.res.trades.map((t) => ({ ...t, key: x.def.key })));
    const closed = all.filter((t) => !t.open); const wins = closed.filter((t) => t.netPnl > 0), losses = closed.filter((t) => t.netPnl <= 0);
    const ranked = [...results].sort((a, b) => b.res.netReturn - a.res.netReturn);
    const byFamily = new Map<string, { n: number; ret: number; trades: number }>();
    results.forEach(({ def, res }) => { const f = byFamily.get(def.family) ?? { n: 0, ret: 0, trades: 0 }; f.n++; f.ret += res.netReturn; f.trades += res.trades.length; byFamily.set(def.family, f); });
    const bySymbol = new Map<string, number>(); closed.forEach((t) => bySymbol.set(t.symbol, (bySymbol.get(t.symbol) ?? 0) + t.netPnl));
    const months = new Map<string, number>(); closed.forEach((t) => { const m = t.exitDate!.slice(0, 7); months.set(m, (months.get(m) ?? 0) + t.netPnl); });
    const top = ranked.slice(0, 5); const eq: Record<string, any>[] = [];
    const dates = top[0]?.res.equity.map((e) => e.date) ?? [];
    dates.forEach((d, i) => { const row: Record<string, any> = { date: d }; top.forEach((x) => (row[x.def.name] = x.res.equity[i]?.value)); eq.push(row); });
    const reasons = new Map<string, number>(); closed.forEach((t) => reasons.set(t.exitReason ?? "Other", (reasons.get(t.exitReason ?? "Other") ?? 0) + 1));
    return {
      all, closed, wins, losses, ranked, open: all.filter((t) => t.open),
      netPnl: closed.reduce((a, t) => a + t.netPnl, 0) + all.filter((t) => t.open).reduce((a, t) => a + t.netPnl, 0),
      grossProfit: wins.reduce((a, t) => a + t.netPnl, 0), grossLoss: losses.reduce((a, t) => a + t.netPnl, 0),
      charges: all.reduce((a, t) => a + t.charges, 0), avgHold: closed.length ? closed.reduce((a, t) => a + t.holdDays, 0) / closed.length : 0,
      families: [...byFamily.entries()].map(([k, v]) => ({ family: k, avgReturn: +(v.ret / v.n).toFixed(2), trades: v.trades })),
      symbols: [...bySymbol.entries()].sort((a, b) => b[1] - a[1]), months: [...months.entries()].sort().map(([m, v]) => ({ month: m, pnl: Math.round(v) })),
      eq, top, reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]),
      from: results[0]?.res.from, to: results[0]?.res.to, days: results[0]?.res.equity.length ?? 0,
    };
  }, [results]);

  const best = r.ranked[0];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><FileBarChart className="h-4 w-4 text-primary" />Strategy test lab</CardTitle>
          <p className="text-xs text-muted-foreground">Choose how much money to test with and the date the test starts. Every chosen strategy runs from that date up to today on live NSE daily prices. Press "Keep running live" and the test continues on its own with each price update.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-6">
            <div><Label className="text-xs">Test amount (₹)</Label><Input type="number" min={1000} step={1000} value={cfg.capital} onChange={(e) => setCfg({ ...cfg, capital: Math.max(1000, +e.target.value) })} /></div>
            <div><Label className="text-xs">Test start date</Label><Input type="date" min={ctxs[0]?.b[60]?.date} max={todayIST()} value={cfg.start} onChange={(e) => setCfg({ ...cfg, start: e.target.value })} /></div>
            <div><Label className="text-xs">Risk per trade (%)</Label><Input type="number" min={0.25} max={limits.maxRisk} step={0.25} value={cfg.risk} onChange={(e) => setCfg({ ...cfg, risk: Math.min(limits.maxRisk, Math.max(0.25, +e.target.value)) })} /></div>
            <div><Label className="text-xs">Max open stocks</Label><Input type="number" min={1} max={limits.maxPositions} value={cfg.maxPos} onChange={(e) => setCfg({ ...cfg, maxPos: Math.min(limits.maxPositions, Math.max(1, +e.target.value)) })} /></div>
            <div><Label className="text-xs">Timeframe</Label><Input value="Daily (1D)" disabled /></div>
            <div className="flex items-end gap-2 pb-2"><Switch id="tf" checked={cfg.filter} onCheckedChange={(v) => setCfg({ ...cfg, filter: v })} /><Label htmlFor="tf" className="text-xs">Market filter</Label></div>
          </div>
          <details className="rounded-md border border-border p-2 text-sm"><summary className="cursor-pointer text-xs font-semibold">Strategies in the test ({pick.length} of {defs.length})</summary>
            <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => setPick(defs.map((s) => s.key))}>All</Button><Button size="sm" variant="outline" onClick={() => setPick([])}>None</Button></div>
            <div className="mt-2 grid gap-1 md:grid-cols-3">{defs.map((s) => <label key={s.key} className="flex items-center gap-2 text-xs"><Checkbox checked={pick.includes(s.key)} onCheckedChange={(v) => setPick(v ? [...pick, s.key] : pick.filter((k) => k !== s.key))} />{s.name}</label>)}</div>
          </details>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!pick.length} onClick={() => { setRun(cfg); setRunPick(pick); }}><Play className="mr-1 h-4 w-4" />Run test</Button>
            <Button variant="outline" disabled={!runPick.length} onClick={() => onKeepLive(runPick, run.capital, run.start, run.filter)}><Radio className="mr-1 h-4 w-4" />Keep running live</Button>
          </div>
        </CardContent>
      </Card>

      {/* Report */}
      <Card>
        <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">Test report</CardTitle>
          <ExportButtons title="Backtest report" build={() => ({
            meta: [`${runPick.length} strategies, ${inr(run.capital)} each, ${r.from} to ${r.to} (${r.days} trading days), Daily (1D), ${ctxs.length} stocks, risk ${run.risk}%, max ${run.maxPos} stocks, market filter ${run.filter ? "on" : "off"}`],
            sections: [
              { title: "Summary", head: ["Total trades", "Avg trades / strategy", "Closed", "Open", "Win rate %", "Net P&L", "Profit booked", "Loss booked", "Charges", "Avg hold days"], rows: [[r.all.length, r2(r.all.length / (runPick.length || 1)), r.closed.length, r.open.length, r.closed.length ? r2((r.wins.length / r.closed.length) * 100) : "", r2(r.netPnl), r2(r.grossProfit), r2(r.grossLoss), r2(r.charges), r2(r.avgHold)]] },
              { title: "Strategy ranking and risk metrics", head: ["#", "Strategy", "Style", "Net return %", "CAGR %", "Final value", "Trades", "Win rate %", "Profit factor", "Max DD %", "Sharpe", "Expectancy", "Avg R", "Avg hold", "Charges"], rows: r.ranked.map(({ def, res }, k) => [k + 1, def.name, def.family, r2(res.netReturn), r2(res.cagr), r2(res.finalEquity), res.trades.length, res.closedCount ? r2(res.winRate) : "", r2(res.profitFactor), r2(res.maxDrawdown), r2(res.sharpe), r2(res.expectancy), r2(res.avgR), r2(res.avgHold), r2(res.totalCharges)]) },
              { title: "Monthly booked P&L", head: ["Month", "Net P&L"], rows: r.months.map((m) => [m.month, m.pnl]) },
              { title: "P&L by stock", head: ["Symbol", "Net P&L"], rows: r.symbols.map(([s, v]) => [s, r2(v)]) },
              { title: "All trades", head: TRADE_HEAD, rows: tradeRows(r.all) },
            ],
          })} /></div>
          <p className="text-xs text-muted-foreground">{runPick.length} strategies · {inr(run.capital)} each · {r.from} to {r.to} ({r.days} trading days) · timeframe Daily (1D) · {ctxs.length} stocks · risk {run.risk}% · max {run.maxPos} stocks · market filter {run.filter ? "on" : "off"}</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
            <Kpi l="Total trades" v={r.all.length} /><Kpi l="Avg trades / strategy" v={(r.all.length / (runPick.length || 1)).toFixed(1)} />
            <Kpi l="Closed / open" v={`${r.closed.length} / ${r.open.length}`} /><Kpi l="Win rate" v={r.closed.length ? ((r.wins.length / r.closed.length) * 100).toFixed(0) + "%" : "-"} />
            <Kpi l="Total net P&L" v={<span className={tone(r.netPnl)}>{inr(r.netPnl)}</span>} /><Kpi l="Profit booked" v={<span className="text-emerald-600">{inr(r.grossProfit)}</span>} />
            <Kpi l="Loss booked" v={<span className="text-destructive">{inr(r.grossLoss)}</span>} /><Kpi l="Charges paid" v={inr(r.charges)} />
          </div>
          {best && <div className="grid gap-2 md:grid-cols-3">
            <Highlight t="Best performing strategy" name={best.def.name} res={best.res} def={best.def} />
            {r.ranked[1] && <Highlight t="Runner-up" name={r.ranked[1].def.name} res={r.ranked[1].res} def={r.ranked[1].def} />}
            <Highlight t="Weakest strategy" name={r.ranked.at(-1)!.def.name} res={r.ranked.at(-1)!.res} def={r.ranked.at(-1)!.def} />
          </div>}

          <Tabs defaultValue="rank">
            <TabsList className="flex h-auto flex-wrap"><TabsTrigger value="rank">Ranking</TabsTrigger><TabsTrigger value="equity">Money growth</TabsTrigger><TabsTrigger value="month">Monthly P&L</TabsTrigger><TabsTrigger value="family">By style</TabsTrigger><TabsTrigger value="profit">Profit book ({r.wins.length})</TabsTrigger><TabsTrigger value="loss">Loss book ({r.losses.length})</TabsTrigger><TabsTrigger value="stocks">By stock</TabsTrigger></TabsList>
            <TabsContent value="rank" className="overflow-x-auto">
              <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead>Timeframe</TableHead><TableHead>Market</TableHead><TableHead>Net return</TableHead><TableHead>Final value</TableHead><TableHead>Trades</TableHead><TableHead>Win rate</TableHead><TableHead>Profit factor</TableHead><TableHead>Max DD</TableHead><TableHead>Avg hold</TableHead><TableHead>Sharpe</TableHead></TableRow></TableHeader>
                <TableBody>{r.ranked.map(({ def, res }, k) => <TableRow key={def.key}><TableCell className="font-bold">{k + 1}</TableCell><TableCell className="font-semibold">{def.name}<div className="text-[11px] font-normal text-muted-foreground">{def.family}</div></TableCell><TableCell>1D</TableCell><TableCell className="text-xs">{allowedRegimes(def).join(" + ")}</TableCell>
                  <TableCell className={"font-semibold " + tone(res.netReturn)}>{pct(res.netReturn)}</TableCell><TableCell>{inr(res.finalEquity)}</TableCell><TableCell>{res.trades.length}</TableCell><TableCell>{res.closedCount ? res.winRate.toFixed(0) + "%" : "-"}</TableCell><TableCell>{res.profitFactor.toFixed(2)}</TableCell><TableCell className="text-destructive">-{res.maxDrawdown.toFixed(1)}%</TableCell><TableCell>{res.avgHold.toFixed(1)}d</TableCell><TableCell>{res.sharpe.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table>
            </TabsContent>
            <TabsContent value="equity"><div className="h-72"><ResponsiveContainer><LineChart data={r.eq}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => inr(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />{r.top.map((x, i) => <Line key={x.def.key} dataKey={x.def.name} dot={false} stroke={`hsl(var(${COLORS[i]}))`} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div><p className="text-xs text-muted-foreground">Top 5 strategies by return.</p></TabsContent>
            <TabsContent value="month"><div className="h-64"><ResponsiveContainer><BarChart data={r.months}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => inr(v)} /><Bar dataKey="pnl">{r.months.map((m, i) => <Cell key={i} fill={m.pnl >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar></BarChart></ResponsiveContainer></div><p className="text-xs text-muted-foreground">Booked profit/loss per month, all strategies combined. Exit reasons: {r.reasons.map(([k, v]) => `${k} ${v}`).join(" · ")}</p></TabsContent>
            <TabsContent value="family"><div className="h-64"><ResponsiveContainer><BarChart data={r.families}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="family" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} unit="%" /><Tooltip /><Bar dataKey="avgReturn" name="Avg return %">{r.families.map((f, i) => <Cell key={i} fill={f.avgReturn >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar></BarChart></ResponsiveContainer></div></TabsContent>
            <TabsContent value="profit"><Book trades={r.wins} /></TabsContent>
            <TabsContent value="loss"><Book trades={r.losses} /></TabsContent>
            <TabsContent value="stocks" className="grid gap-4 md:grid-cols-2">
              <StockList t="Most profitable stocks" rows={r.symbols.slice(0, 10)} /><StockList t="Biggest losing stocks" rows={[...r.symbols].reverse().slice(0, 10)} />
            </TabsContent>
          </Tabs>
          <p className="text-[11px] text-muted-foreground">Paper test on past and live data. Not investment advice. Past results do not guarantee future returns.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationFeed({ events, lastSeen, onSeen }: { events: TradeEvent[]; lastSeen: string; onSeen: () => void }) {
  const [filter, setFilter] = useState<"all" | "BUY" | "SELL">("all");
  const list = events.filter((e) => filter === "all" || e.kind === filter).slice(0, 200);
  const unread = events.filter((e) => e.date > lastSeen).length;
  const sells = events.filter((e) => e.kind === "SELL"); const prof = sells.filter((e) => (e.pnl ?? 0) > 0), loss = sells.filter((e) => (e.pnl ?? 0) <= 0);
  return (
    <Card>
      <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" />Trade notifications {unread > 0 && <Badge>{unread} new</Badge>}</CardTitle>
        <div className="flex gap-1">{(["all", "BUY", "SELL"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "BUY" ? "Buys" : "Sells"}</Button>)}{unread > 0 && <Button size="sm" variant="ghost" onClick={onSeen}>Mark read</Button>}</div>
      </div>
        <p className="text-xs text-muted-foreground">Every buy and sell made by your running strategies. Profit booked {inr(prof.reduce((a, e) => a + (e.pnl ?? 0), 0))} on {prof.length} sells · Loss booked {inr(loss.reduce((a, e) => a + (e.pnl ?? 0), 0))} on {loss.length} sells.</p></CardHeader>
      <CardContent className="max-h-96 space-y-1 overflow-y-auto">
        {!list.length && <p className="text-sm text-muted-foreground">No trades yet. Start a strategy and alerts appear here after each buy or sell.</p>}
        {list.map((e) => (
          <div key={e.id} className={"flex items-start gap-2 rounded-md border p-2 text-xs " + (e.date > lastSeen ? "border-primary/40 bg-primary/5" : "border-border")}>
            {e.kind === "BUY" ? <ArrowUpRight className="mt-0.5 h-4 w-4 text-emerald-600" /> : <ArrowDownRight className={"mt-0.5 h-4 w-4 " + ((e.pnl ?? 0) > 0 ? "text-emerald-600" : "text-destructive")} />}
            <div className="flex-1"><div className="font-semibold text-foreground">{e.kind === "BUY" ? "Bought" : "Sold"} {e.qty} {e.symbol} at {px(e.price)}{e.kind === "SELL" && <span className={"ml-2 " + tone(e.pnl ?? 0)}>{(e.pnl ?? 0) > 0 ? "Profit booked" : "Loss booked"} {inr(e.pnl ?? 0)}</span>}</div>
              <div className="text-muted-foreground">{e.strategy} · {e.date}{e.reason ? ` · ${e.reason}` : ""}</div></div>
          </div>))}
      </CardContent>
    </Card>
  );
}

function Book({ trades }: { trades: (SimTrade & { key: string })[] }) {
  if (!trades.length) return <p className="text-sm text-muted-foreground">No trades.</p>;
  const sorted = [...trades].sort((a, b) => (b.exitDate ?? "").localeCompare(a.exitDate ?? ""));
  return (
    <div className="max-h-96 overflow-auto rounded-md border border-border">
      <Table><TableHeader><TableRow><TableHead>Exit date</TableHead><TableHead>Strategy</TableHead><TableHead>Stock</TableHead><TableHead>Qty</TableHead><TableHead>Buy</TableHead><TableHead>Sell</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead><TableHead>Charges</TableHead><TableHead>Net P&L</TableHead><TableHead>R</TableHead></TableRow></TableHeader>
        <TableBody>{sorted.map((t, k) => <TableRow key={k}><TableCell className="whitespace-nowrap">{t.exitDate}</TableCell><TableCell className="text-xs">{t.strategy}</TableCell><TableCell className="font-semibold">{t.symbol}</TableCell><TableCell>{t.quantity}</TableCell><TableCell>{px(t.entryPrice)}<div className="text-[10px] text-muted-foreground">{t.entryDate}</div></TableCell><TableCell>{px(t.exitPrice)}</TableCell><TableCell>{t.holdDays}</TableCell><TableCell className="text-xs">{t.exitReason}</TableCell><TableCell>{inr(t.charges)}</TableCell><TableCell className={"font-semibold " + tone(t.netPnl)}>{inr(t.netPnl)}</TableCell><TableCell className={tone(t.rMultiple)}>{t.rMultiple.toFixed(2)}</TableCell></TableRow>)}</TableBody></Table>
    </div>
  );
}
const StockList = ({ t, rows }: { t: string; rows: [string, number][] }) => <div><div className="mb-1 text-xs font-bold uppercase text-muted-foreground">{t}</div>{rows.map(([s, v]) => <div key={s} className="flex justify-between border-b border-border py-1 text-sm"><span>{s}</span><span className={tone(v)}>{inr(v)}</span></div>)}</div>;
const Highlight = ({ t, name, res, def }: { t: string; name: string; res: SimResult; def: StrategyDef }) => (
  <div className="rounded-md border border-border bg-muted/30 p-3"><div className="flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground">{t.startsWith("Weak") ? <BookX className="h-3 w-3" /> : <BookCheck className="h-3 w-3" />}{t}</div>
    <div className="font-semibold text-foreground">{name}</div><div className="text-xs text-muted-foreground">{def.family} · Daily (1D) · {res.trades.length} trades · win {res.winRate.toFixed(0)}% · max DD -{res.maxDrawdown.toFixed(1)}%</div>
    <div className={"text-lg font-bold " + tone(res.netReturn)}>{pct(res.netReturn)} <span className="text-sm font-normal">({inr(res.finalEquity - res.startEquity)})</span></div></div>
);
const Kpi = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="rounded-md border border-border bg-muted/30 p-2"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-semibold text-foreground">{v}</div></div>;
