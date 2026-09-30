import { useMemo, useState } from "react";
import { Radio, Play } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { simulate, type Ctx, type RegimeDay, type StrategyDef } from "@/lib/swing/strategies20";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "./ExportButtons";
import { TRADE_HEAD, tradeRows, r2 } from "@/lib/swing/exportReport";

const inr = (n: number) => (n < 0 ? "-₹" : "₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");
const COLORS = ["--primary", "--gold", "--accent", "--gain", "--loss"];

/** Top-5 strategies (by full-history return) tested from a chosen date up to today's live bar, plus today's signals. */
export function LiveTest({ ctxs, regime, defs, onRealOrder }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[]; onRealOrder?: (symbol: string, price: number) => void }) {
  const last = ctxs[0]?.b.at(-1)?.date ?? "";
  const yearAgo = (() => { const d = new Date(last || Date.now()); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();
  const [cfg, setCfg] = useState({ capital: 100000, start: yearAgo, filter: true }); const [run, setRun] = useState(cfg);
  const top = useMemo(() => defs.map((def) => ({ def, r: (() => { const s = simulate(def, ctxs, { capital: 100000, regime }); return s.closedCount >= 5 ? s.netReturn : -1e9 + s.netReturn; })() })).sort((a, b) => b.r - a.r).slice(0, 5).map((x) => x.def), [defs, ctxs, regime]);
  const out = useMemo(() => top.map((def) => ({ def, res: simulate(def, ctxs, { capital: run.capital, startDate: run.start, regime: run.filter ? regime : null }) })), [top, ctxs, regime, run]);
  const eq = useMemo(() => (out[0]?.res.equity ?? []).map((e, i) => Object.fromEntries([["date", e.date], ...out.map((x) => [x.def.name, x.res.equity[i]?.value])])), [out]);
  const trades = out.flatMap((x) => x.res.trades).sort((a, b) => (b.entryDate > a.entryDate ? 1 : -1));
  const total = out.reduce((a, x) => a + x.res.finalEquity - x.res.startEquity, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-primary" />Live test: top 5 strategies up to today</CardTitle>
          <p className="text-xs text-muted-foreground">The 5 best strategies by return over all history (at least 5 closed trades), run from your start date up to the latest bar ({last}). During market hours today's bar uses live NSE prices, so results change as prices move. Charges and slippage are included.</p></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div><Label className="text-xs">Capital per strategy (₹)</Label><Input className="w-36" type="number" min={1000} step={1000} value={cfg.capital} onChange={(e) => setCfg({ ...cfg, capital: Math.max(1000, +e.target.value) })} /></div>
          <div><Label className="text-xs">Start date</Label><Input className="w-40" type="date" max={last} value={cfg.start} onChange={(e) => setCfg({ ...cfg, start: e.target.value })} /></div>
          <label className="flex items-center gap-2 pb-2 text-xs"><Switch checked={cfg.filter} onCheckedChange={(v) => setCfg({ ...cfg, filter: v })} />Market filter</label>
          <Button onClick={() => setRun(cfg)}><Play className="mr-1 h-4 w-4" />Run live test</Button>
          <div className="ml-auto"><ExportButtons title="Live test top 5" build={() => ({ meta: [`Top 5 strategies, ${inr(run.capital)} each, ${run.start} to ${last}, market filter ${run.filter ? "on" : "off"}`], sections: [
            { title: "Results", head: ["Strategy", "Return %", "Net P&L", "Max DD %", "Trades", "Closed", "Win rate %", "Profit factor", "Sharpe"], rows: out.map(({ def, res }) => [def.name, r2(res.netReturn), r2(res.finalEquity - res.startEquity), r2(res.maxDrawdown), res.trades.length, res.closedCount, r2(res.winRate), r2(res.profitFactor), r2(res.sharpe)]) },
            { title: "Today's signals", head: ["Strategy", "Symbol", "Close", "Stop loss", "TP1", "TP2", "Qty"], rows: out.flatMap(({ def, res }) => res.pending.map((p) => [def.name, p.symbol, r2(p.close), r2(p.stopLoss), r2(p.tp1), r2(p.tp2), p.qty])) },
            { title: "Trades", head: TRADE_HEAD, rows: tradeRows(trades) }] })} /></div>
        </CardContent>
      </Card>

      <div className="grid gap-2 md:grid-cols-5">{out.map(({ def, res }, i) => (
        <Card key={def.key}><CardContent className="space-y-1 p-3"><div className="flex items-center gap-1 text-xs text-muted-foreground"><Badge variant="outline">#{i + 1}</Badge><span className="truncate">{def.name}</span></div>
          <div className={"text-xl font-bold " + tone(res.netReturn)}>{pct(res.netReturn)}</div>
          <div className="text-xs"><span className={tone(res.finalEquity - res.startEquity)}>{inr(res.finalEquity - res.startEquity)}</span> · DD <span className="text-destructive">-{res.maxDrawdown.toFixed(1)}%</span></div>
          <div className="text-[11px] text-muted-foreground">{res.trades.length} trades · win {res.closedCount ? res.winRate.toFixed(0) + "%" : "-"} · {res.trades.filter((t) => t.open).length} open</div></CardContent></Card>))}</div>
      <div className="text-sm">Combined P&L of all 5: <b className={tone(total)}>{inr(total)}</b> on {inr(run.capital * out.length)}</div>

      <Card><CardContent className="h-72 pt-4"><ResponsiveContainer><LineChart data={eq}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => inr(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />{out.map((x, i) => <Line key={x.def.key} dataKey={x.def.name} dot={false} stroke={`hsl(var(${COLORS[i]}))`} strokeWidth={2} />)}</LineChart></ResponsiveContainer></CardContent></Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Today's signals (buy at next market open)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead>Strategy</TableHead><TableHead>Stock</TableHead><TableHead>Price</TableHead><TableHead>Stop loss</TableHead><TableHead>Target 1</TableHead><TableHead>Target 2</TableHead><TableHead>Qty</TableHead>{onRealOrder && <TableHead />}</TableRow></TableHeader>
          <TableBody>{out.every((x) => !x.res.pending.length) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No buy signals today from these 5 strategies.</TableCell></TableRow>}
            {out.flatMap(({ def, res }) => res.pending.map((p) => <TableRow key={def.key + p.symbol}><TableCell className="text-xs">{def.name}</TableCell><TableCell className="font-semibold">{p.symbol}</TableCell><TableCell>₹{p.close.toFixed(2)}</TableCell><TableCell className="text-destructive">₹{p.stopLoss.toFixed(2)}</TableCell><TableCell>{p.tp1 ? "₹" + p.tp1.toFixed(2) : "-"}</TableCell><TableCell>{p.tp2 ? "₹" + p.tp2.toFixed(2) : "-"}</TableCell><TableCell>{p.qty}</TableCell>
              {onRealOrder && <TableCell><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRealOrder(p.symbol, p.close)}>Real order</Button></TableCell>}</TableRow>))}</TableBody></Table></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Trades ({trades.length})</CardTitle></CardHeader>
        <CardContent className="max-h-[520px] overflow-auto p-0"><Table><TableHeader><TableRow><TableHead>Strategy</TableHead><TableHead>Stock</TableHead><TableHead>Bought</TableHead><TableHead>Buy price</TableHead><TableHead>Qty</TableHead><TableHead>Sold</TableHead><TableHead>Sell price</TableHead><TableHead>Reason</TableHead><TableHead>Net P&L</TableHead></TableRow></TableHeader>
          <TableBody>{trades.map((t, k) => <TableRow key={k}><TableCell className="text-xs">{t.strategy}</TableCell><TableCell className="font-semibold">{t.symbol}</TableCell><TableCell>{t.entryDate}</TableCell><TableCell>₹{t.entryPrice.toFixed(2)}</TableCell><TableCell>{t.quantity}</TableCell><TableCell>{t.open ? <Badge>Open</Badge> : t.exitDate}</TableCell><TableCell>{t.open ? `₹${t.lastPrice.toFixed(2)} (live)` : `₹${(t.exitPrice ?? 0).toFixed(2)}`}</TableCell><TableCell className="text-xs">{t.exitReason ?? "-"}</TableCell><TableCell className={tone(t.netPnl)}>{inr(t.netPnl)}</TableCell></TableRow>)}</TableBody></Table></CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground">Paper test on NSE daily prices with today's live price. Past results do not guarantee future returns. Not investment advice.</p>
    </div>
  );
}
