import { useMemo, useState } from "react";
import { Play, Sparkles, Wrench } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { simulate, type Ctx, type RegimeDay, type StrategyDef } from "@/lib/swing/strategies20";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "./ExportButtons";
import { TRADE_HEAD, tradeRows, r2 } from "@/lib/swing/exportReport";

const inr = (n: number) => (n < 0 ? "-₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const tone = (n: number) => (n > 0 ? "text-primary" : n < 0 ? "text-destructive" : "text-muted-foreground");
const COLORS = ["--primary", "--gold", "--accent", "--gain", "--loss", "--muted-foreground"];

/** AI strategies vs your custom strategies: backtest (any window) or live test (start date up to today's live bar). */
export function AIvsCustom({ ctxs, regime, defs, mode }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[]; mode: "backtest" | "live" }) {
  const last = ctxs[0]?.b.at(-1)?.date ?? "";
  const first = ctxs[0]?.b[200]?.date ?? "";
  const yearAgo = (() => { const d = new Date(last || Date.now()); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();
  const [cfg, setCfg] = useState({ capital: 100000, start: mode === "live" ? yearAgo : first, end: last }); const [run, setRun] = useState(cfg);
  const pool = useMemo(() => defs.filter((d) => d.family === "AI" || d.key.startsWith("custom:")), [defs]);
  const out = useMemo(() => pool.map((def) => ({ def, ai: def.family === "AI", res: simulate(def, ctxs, { capital: run.capital, startDate: run.start || undefined, endDate: mode === "backtest" ? run.end || undefined : undefined, regime }) }))
    .sort((a, b) => b.res.netReturn - a.res.netReturn), [pool, ctxs, regime, run, mode]);
  const shown = out.slice(0, 6);
  const eq = useMemo(() => (shown[0]?.res.equity ?? []).map((e, i) => Object.fromEntries([["date", e.date], ...shown.map((x) => [x.def.name, x.res.equity[i]?.value])])), [shown]);
  const trades = out.flatMap((x) => x.res.trades).sort((a, b) => (b.entryDate > a.entryDate ? 1 : -1));
  const side = (ai: boolean) => { const xs = out.filter((x) => x.ai === ai); return { n: xs.length, pnl: xs.reduce((a, x) => a + x.res.finalEquity - x.res.startEquity, 0), avg: xs.length ? xs.reduce((a, x) => a + x.res.netReturn, 0) / xs.length : 0 }; };
  const A = side(true), C = side(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{mode === "live" ? "Live test" : "Backtest"}: AI strategies vs your custom strategies</CardTitle>
          <p className="text-xs text-muted-foreground">{mode === "live" ? `Runs from your start date up to the latest bar (${last}); during market hours today's bar uses live NSE prices.` : "Runs over the window you pick."} Same money, charges and market filter for every strategy.</p></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div><Label className="text-xs">Capital per strategy (₹)</Label><Input className="w-36" type="number" min={1000} step={1000} value={cfg.capital} onChange={(e) => setCfg({ ...cfg, capital: Math.max(1000, +e.target.value) })} /></div>
          <div><Label className="text-xs">Start date</Label><Input className="w-40" type="date" max={last} value={cfg.start} onChange={(e) => setCfg({ ...cfg, start: e.target.value })} /></div>
          {mode === "backtest" && <div><Label className="text-xs">End date</Label><Input className="w-40" type="date" max={last} value={cfg.end} onChange={(e) => setCfg({ ...cfg, end: e.target.value })} /></div>}
          <Button onClick={() => setRun(cfg)}><Play className="mr-1 h-4 w-4" />Run</Button>
          <div className="ml-auto"><ExportButtons title={`AI vs custom ${mode}`} build={() => ({ meta: [`${inr(run.capital)} each, from ${run.start}${mode === "backtest" ? ` to ${run.end}` : " to today"}`], sections: [
            { title: "Results", head: ["Strategy", "Type", "Return %", "Net P&L", "Max DD %", "Closed", "Win rate %"], rows: out.map(({ def, ai, res }) => [def.name, ai ? "AI" : "Custom", r2(res.netReturn), r2(res.finalEquity - res.startEquity), r2(res.maxDrawdown), res.closedCount, r2(res.winRate)]) },
            { title: "Trades", head: TRADE_HEAD, rows: tradeRows(trades) }] })} /></div>
        </CardContent>
      </Card>

      {!pool.length ? <p className="text-sm text-muted-foreground">No AI or custom strategies yet. Build one in Strategy builder, or wait for the AI to adopt one.</p> : <>
      <div className="grid gap-3 sm:grid-cols-2">{[["AI strategies", A, Sparkles], ["Your custom strategies", C, Wrench]].map(([l, s, I]: any) => (
        <Card key={l}><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><I className="h-4 w-4" />{l} ({s.n})</div><div className={"mt-1 text-2xl font-bold " + tone(s.pnl)}>{inr(s.pnl)}</div><div className="text-xs text-muted-foreground">Average return {pct(s.avg)}</div></CardContent></Card>))}</div>

      <Card><CardContent className="overflow-x-auto p-0"><Table>
        <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead className="text-right">Return</TableHead><TableHead className="text-right">Net P&L</TableHead><TableHead className="text-right">Drawdown</TableHead><TableHead className="text-right">Trades</TableHead><TableHead className="text-right">Win rate</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader>
        <TableBody>{out.map(({ def, ai, res }, i) => <TableRow key={def.key}><TableCell>{i + 1}</TableCell><TableCell><span className="flex items-center gap-2">{def.name}<Badge variant={ai ? "secondary" : "outline"}>{ai ? "AI" : "Custom"}</Badge></span></TableCell><TableCell className={"text-right " + tone(res.netReturn)}>{pct(res.netReturn)}</TableCell><TableCell className={"text-right " + tone(res.finalEquity - res.startEquity)}>{inr(res.finalEquity - res.startEquity)}</TableCell><TableCell className="text-right text-destructive">-{res.maxDrawdown.toFixed(1)}%</TableCell><TableCell className="text-right">{res.closedCount}</TableCell><TableCell className="text-right">{res.closedCount ? res.winRate.toFixed(0) + "%" : "-"}</TableCell><TableCell className="text-right">{res.trades.filter((t) => t.open).length}</TableCell></TableRow>)}</TableBody>
      </Table></CardContent></Card>

      <Card><CardHeader className="pb-0"><CardTitle className="text-sm">Money over time (top 6)</CardTitle></CardHeader><CardContent className="h-72 pt-4"><ResponsiveContainer><LineChart data={eq}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => inr(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />{shown.map((x, i) => <Line key={x.def.key} dataKey={x.def.name} dot={false} stroke={`hsl(var(${COLORS[i]}))`} strokeWidth={2} />)}</LineChart></ResponsiveContainer></CardContent></Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Every trade ({trades.length})</CardTitle></CardHeader>
        <CardContent className="max-h-[520px] overflow-auto p-0"><Table><TableHeader><TableRow><TableHead>Strategy</TableHead><TableHead>Stock</TableHead><TableHead>Bought</TableHead><TableHead>Buy price</TableHead><TableHead>Qty</TableHead><TableHead>Sold</TableHead><TableHead>Sell price</TableHead><TableHead>Reason</TableHead><TableHead>Net P&L</TableHead></TableRow></TableHeader>
          <TableBody>{trades.map((t, k) => <TableRow key={k}><TableCell className="text-xs">{t.strategy}</TableCell><TableCell className="font-semibold">{t.symbol}</TableCell><TableCell>{t.entryDate}</TableCell><TableCell>₹{t.entryPrice.toFixed(2)}</TableCell><TableCell>{t.quantity}</TableCell><TableCell>{t.open ? <Badge>Open</Badge> : t.exitDate}</TableCell><TableCell>{t.open ? `₹${t.lastPrice.toFixed(2)} (live)` : `₹${(t.exitPrice ?? 0).toFixed(2)}`}</TableCell><TableCell className="text-xs">{t.exitReason ?? "-"}</TableCell><TableCell className={tone(t.netPnl)}>{inr(t.netPnl)}</TableCell></TableRow>)}</TableBody></Table></CardContent>
      </Card></>}
      <p className="text-[11px] text-muted-foreground">Paper test on NSE daily prices. Past results do not guarantee future returns. Not investment advice.</p>
    </div>
  );
}
