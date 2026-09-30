import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Bot, CircleStop, Play, Trash2, Trophy, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Bar } from "@/lib/swing/engine";
import { STRATEGIES, buildCtx, rankUniverse, simulate, strategyByKey, type SimResult, type StrategyDef, type Ctx } from "@/lib/swing/strategies20";
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

interface Deployment { id: string; strategy_key: string; capital: number; risk_pct: number; start_date: string; status: string; stopped_at: string | null; created_at: string }

export function StrategyLab({ bars, userId }: { bars: Record<string, Bar[]>; userId: string }) {
  const [ctxs, setCtxs] = useState<Ctx[]>([]);
  const [deps, setDeps] = useState<Deployment[]>([]);
  const [detail, setDetail] = useState<{ def: StrategyDef; res: SimResult; title: string } | null>(null);
  const [form, setForm] = useState({ key: STRATEGIES[11].key, capital: 50000, risk: 1, start: todayIST() });

  useEffect(() => { // build indicator context off the main render
    const id = setTimeout(() => { const c = Object.entries(bars).filter(([, b]) => b.length > 60).map(([s, b]) => buildCtx(s, b)); rankUniverse(c); setCtxs(c); }, 30);
    return () => clearTimeout(id);
  }, [bars]);

  const loadDeps = async () => { const { data } = await db.from("swing_deployments").select("*").order("created_at", { ascending: false }); setDeps(data ?? []); };
  useEffect(() => { loadDeps(); }, [userId]);

  const board = useMemo(() => ctxs.length ? STRATEGIES.map((def) => ({ def, res: simulate(def, ctxs, { capital: 50000 }) })).sort((a, b) => b.res.netReturn - a.res.netReturn) : [], [ctxs]);
  const live = useMemo(() => deps.map((d) => { const def = strategyByKey(d.strategy_key); return { d, def, res: def && ctxs.length ? simulate(def, ctxs, { capital: +d.capital, riskPct: +d.risk_pct, startDate: d.start_date, endDate: d.stopped_at ?? undefined }) : null }; }), [deps, ctxs]);
  const lastDate = ctxs[0]?.b.at(-1)?.date;

  const deploy = async () => {
    if (!(form.capital >= 1000)) return toast.error("Enter at least ₹1,000");
    const { error } = await db.from("swing_deployments").insert({ user_id: userId, strategy_key: form.key, capital: form.capital, risk_pct: form.risk, start_date: form.start });
    if (error) return toast.error(error.message); toast.success("Strategy started. It will auto buy and sell from " + form.start); loadDeps();
  };
  const stop = async (d: Deployment) => { await db.from("swing_deployments").update({ status: "stopped", stopped_at: todayIST() }).eq("id", d.id); loadDeps(); };
  const remove = async (d: Deployment) => { if (!confirm("Delete this auto-trading plan?")) return; await db.from("swing_deployments").delete().eq("id", d.id); loadDeps(); };

  if (!ctxs.length) return <p className="text-sm text-muted-foreground">Loading live NSE price history and computing indicators...</p>;

  return (
    <div className="space-y-6">
      {/* Auto-trade */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4 text-primary" />Auto-trade a strategy (paper)</CardTitle>
          <p className="text-xs text-muted-foreground">Pick a strategy, set an amount and a start date. From that day the strategy buys at the next open after a BUY signal and sells on its SL, TP, trailing stop or exit rule, using live NSE daily data. 1% risk per trade by default, max 5 positions, charges and slippage included.</p></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2"><Label className="text-xs">Strategy</Label>
            <Select value={form.key} onValueChange={(v) => setForm({ ...form, key: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STRATEGIES.map((s) => <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Amount (₹)</Label><Input type="number" min={1000} value={form.capital} onChange={(e) => setForm({ ...form, capital: +e.target.value })} /></div>
          <div><Label className="text-xs">Risk per trade (%)</Label><Input type="number" min={0.25} max={5} step={0.25} value={form.risk} onChange={(e) => setForm({ ...form, risk: Math.min(5, Math.max(0.25, +e.target.value)) })} /></div>
          <div><Label className="text-xs">Start date</Label><Input type="date" max={todayIST()} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
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
                  <div><CardTitle className="text-base">{def.name}</CardTitle><p className="text-xs text-muted-foreground">Started {d.start_date}{d.stopped_at ? ` · stopped ${d.stopped_at}` : ""} · data up to {lastDate} · risk {d.risk_pct}%/trade</p></div>
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
                  {openT.length === 0 && res.pending.length === 0 && <p className="text-xs text-muted-foreground">Waiting for a BUY signal. The strategy checks every stock after each live data update.</p>}
                  {openT.length > 0 && <TradeTable trades={openT} compact />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" />Best performing strategies</CardTitle>
          <p className="text-xs text-muted-foreground">All 20 strategies tested on live NSE daily data for {ctxs.length} stocks, {board[0]?.res.from} to {board[0]?.res.to}. ₹50,000 start, 1% risk per trade, max 5 positions, next-open entry, charges and slippage included. Past results do not guarantee future returns.</p></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table><TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead>Net return</TableHead><TableHead>CAGR</TableHead><TableHead>Final value</TableHead><TableHead>Win rate</TableHead><TableHead>Profit factor</TableHead><TableHead>Max DD</TableHead><TableHead>Trades</TableHead><TableHead>Avg R</TableHead><TableHead>Sharpe</TableHead><TableHead>Signals today</TableHead><TableHead />
          </TableRow></TableHeader>
            <TableBody>{board.map(({ def, res }, k) => (
              <TableRow key={def.key}>
                <TableCell className="font-bold">{k + 1}</TableCell>
                <TableCell><div className="font-semibold">{def.name}</div><div className="text-[11px] text-muted-foreground">{def.family}</div></TableCell>
                <TableCell className={"font-semibold " + tone(res.netReturn)}>{pct(res.netReturn)}</TableCell><TableCell className={tone(res.cagr)}>{pct(res.cagr)}</TableCell>
                <TableCell>{inr(res.finalEquity)}</TableCell><TableCell>{res.closedCount ? res.winRate.toFixed(0) + "%" : "-"}</TableCell><TableCell>{res.profitFactor.toFixed(2)}</TableCell>
                <TableCell className="text-destructive">-{res.maxDrawdown.toFixed(1)}%</TableCell><TableCell>{res.trades.length}</TableCell><TableCell className={tone(res.avgR)}>{res.avgR.toFixed(2)}R</TableCell><TableCell>{res.sharpe.toFixed(2)}</TableCell>
                <TableCell>{res.pending.length ? <Badge>{res.pending.length} BUY</Badge> : <span className="text-muted-foreground">-</span>}</TableCell>
                <TableCell className="whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => setDetail({ def, res, title: def.name })}>Details</Button>{" "}
                  <Button size="sm" onClick={() => { setForm({ ...form, key: def.key }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Auto-trade</Button></TableCell>
              </TableRow>))}</TableBody></Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
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
        <Rule t="Stop loss" v={def.slRule} /><Rule t="Take profit" v={def.tpRule + " · Position size = (Equity x Risk %) / (Entry - SL)"} />
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
