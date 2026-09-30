import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, ComposedChart, BarChart, Bar, Cell, ReferenceLine, Legend } from "recharts";
import { Swords, Shuffle, SplitSquareHorizontal, Play } from "lucide-react";
import { simulate, type Ctx, type RegimeDay, type StrategyDef } from "@/lib/swing/strategies20";
import { benchmark, defaultSplit, monteCarlo, rolling, sortino, walkForward, type Split } from "@/lib/swing/robust";
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
const Kpi = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="rounded-md border border-border bg-muted/30 p-2"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-semibold text-foreground">{v}</div></div>;

function Settings({ cfg, setCfg }: { cfg: { capital: number; filter: boolean }; setCfg: (c: { capital: number; filter: boolean }) => void }) {
  return <div className="flex flex-wrap items-end gap-3"><div><Label className="text-xs">Starting capital (₹)</Label><Input className="w-36" type="number" min={1000} step={1000} value={cfg.capital} onChange={(e) => setCfg({ ...cfg, capital: Math.max(1000, +e.target.value) })} /></div>
    <label className="flex items-center gap-2 pb-2 text-xs"><Switch checked={cfg.filter} onCheckedChange={(v) => setCfg({ ...cfg, filter: v })} />Market filter</label></div>;
}

/** Strategy Tournament: same stocks, dates, capital, costs and slippage. Ranked by a robustness score, not return alone. */
export function Tournament({ ctxs, regime, defs }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[] }) {
  const [cfg, setCfg] = useState({ capital: 100000, filter: true }); const [run, setRun] = useState(cfg);
  const split = useMemo(() => defaultSplit(ctxs), [ctxs]);
  const rows = useMemo(() => {
    const base = { capital: run.capital, regime: run.filter ? regime : null };
    const r = defs.map((def) => { const full = simulate(def, ctxs, { ...base, startDate: split.train[0] }); const oos = simulate(def, ctxs, { ...base, startDate: split.oos[0] }); return { def, full, oos, sortino: sortino(full.equity) }; });
    const rank = (key: (x: (typeof r)[number]) => number) => { const s = [...r].sort((a, b) => key(b) - key(a)); return new Map(s.map((x, i) => [x.def.key, 1 - i / Math.max(1, s.length - 1)])); };
    const active = (x: (typeof r)[number]) => x.full.closedCount >= 10;
    const rs = [rank((x) => x.full.sharpe), rank((x) => x.sortino), rank((x) => Math.min(x.full.profitFactor, 5)), rank((x) => -x.full.maxDrawdown), rank((x) => x.oos.netReturn), rank((x) => x.full.expectancy)];
    return r.map((x) => ({ ...x, score: active(x) ? Math.round((rs.reduce((a, m) => a + (m.get(x.def.key) ?? 0), 0) / rs.length) * 100) : 0 })).sort((a, b) => b.score - a.score);
  }, [ctxs, regime, defs, run, split]);
  const bm = regime ? benchmark(regime, split.train[0], split.oos[1]) : null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Swords className="h-4 w-4 text-primary" />Strategy tournament</CardTitle>
        <p className="text-xs text-muted-foreground">Every strategy runs on the same {ctxs.length} stocks, the same dates ({split.train[0]} to {split.oos[1]}), the same capital, charges and slippage. The robustness score (0-100) blends Sharpe, Sortino, profit factor, drawdown, expectancy and out-of-sample return (from {split.oos[0]}). Strategies with under 10 closed trades score 0 (too little evidence).</p></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2"><Settings cfg={cfg} setCfg={setCfg} /><Button className="mb-0.5" onClick={() => setRun(cfg)}><Play className="mr-1 h-4 w-4" />Run tournament</Button>
          <div className="ml-auto"><ExportButtons title="Strategy tournament" build={() => ({
            meta: [`${ctxs.length} stocks, ${split.train[0]} to ${split.oos[1]}, capital ${inr(run.capital)}, market filter ${run.filter ? "on" : "off"}, out-of-sample from ${split.oos[0]}`, bm ? `Benchmark (equal-weight index): return ${pct(bm.ret)}, max drawdown -${bm.dd.toFixed(1)}%` : ""],
            sections: [
              { title: "Ranking and risk metrics", head: ["#", "Strategy", "Score", "CAGR %", "Return %", "Excess %", "Max DD %", "Sharpe", "Sortino", "Profit factor", "Expectancy", "Win rate %", "Trades", "Net P&L", "OOS return %"], rows: rows.map((x, k) => [k + 1, x.def.name, x.score, r2(x.full.cagr), r2(x.full.netReturn), r2(x.full.netReturn - (bm?.ret ?? 0)), r2(x.full.maxDrawdown), r2(x.full.sharpe), r2(x.sortino), r2(x.full.profitFactor), r2(x.full.expectancy), r2(x.full.winRate), x.full.trades.length, r2(x.full.finalEquity - x.full.startEquity), r2(x.oos.netReturn)]) },
              { title: "All trades (full period)", head: TRADE_HEAD, rows: tradeRows(rows.flatMap((x) => x.full.trades)) },
            ],
          })} /></div></div>
        {bm && <div className="grid grid-cols-2 gap-2 md:grid-cols-4"><Kpi l="Benchmark (equal-weight index, buy and hold)" v={<span className={tone(bm.ret)}>{pct(bm.ret)}</span>} /><Kpi l="Benchmark max drawdown" v={<span className="text-destructive">-{bm.dd.toFixed(1)}%</span>} /><Kpi l="Cash" v="0.00%" /><Kpi l="Best strategy vs benchmark" v={rows[0] ? <span className={tone(rows[0].full.netReturn - bm.ret)}>{pct(rows[0].full.netReturn - bm.ret)} excess</span> : "-"} /></div>}
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead>Score</TableHead><TableHead>CAGR</TableHead><TableHead>Return</TableHead><TableHead>Excess vs index</TableHead><TableHead>Max DD</TableHead><TableHead>Sharpe</TableHead><TableHead>Sortino</TableHead><TableHead>Profit factor</TableHead><TableHead>Expectancy</TableHead><TableHead>Win rate</TableHead><TableHead>Trades</TableHead><TableHead>Avg hold</TableHead><TableHead>OOS return</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((x, k) => <TableRow key={x.def.key}><TableCell className="font-bold">{k + 1}</TableCell><TableCell><div className="font-semibold">{x.def.name}</div><div className="text-[11px] text-muted-foreground">{x.def.family}</div></TableCell>
            <TableCell><Badge variant={x.score >= 60 ? "default" : "outline"}>{x.score}</Badge></TableCell><TableCell className={tone(x.full.cagr)}>{pct(x.full.cagr)}</TableCell><TableCell className={tone(x.full.netReturn)}>{pct(x.full.netReturn)}</TableCell><TableCell className={tone(x.full.netReturn - (bm?.ret ?? 0))}>{pct(x.full.netReturn - (bm?.ret ?? 0))}</TableCell>
            <TableCell className="text-destructive">-{x.full.maxDrawdown.toFixed(1)}%</TableCell><TableCell>{x.full.sharpe.toFixed(2)}</TableCell><TableCell>{x.sortino.toFixed(2)}</TableCell><TableCell>{x.full.profitFactor.toFixed(2)}</TableCell><TableCell className={tone(x.full.expectancy)}>{inr(x.full.expectancy)}</TableCell><TableCell>{x.full.closedCount ? x.full.winRate.toFixed(0) + "%" : "-"}</TableCell><TableCell>{x.full.trades.length}</TableCell><TableCell>{x.full.avgHold.toFixed(1)}d</TableCell><TableCell className={tone(x.oos.netReturn)}>{pct(x.oos.netReturn)}</TableCell></TableRow>)}</TableBody></Table></div>
        <p className="text-[11px] text-muted-foreground">No strategy is guaranteed to be profitable. The benchmark is an equal-weight index of your scanned stocks, not the official Nifty.</p>
      </CardContent>
    </Card>
  );
}

export function RobustnessLab({ ctxs, regime, defs }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[] }) {
  const [key, setKey] = useState(defs[0]?.key); const def = defs.find((d) => d.key === key) ?? defs[0];
  const [split, setSplit] = useState<Split>(() => defaultSplit(ctxs));
  const [cfg, setCfg] = useState({ capital: 100000, filter: true }); const [months, setMonths] = useState(6);
  const [run, setRun] = useState<{ def: StrategyDef; split: Split; cfg: typeof cfg; months: number } | null>(null);
  const out = useMemo(() => {
    if (!run) return null; const base = { capital: run.cfg.capital, regime: run.cfg.filter ? regime : null };
    const wf = walkForward(run.def, ctxs, run.split, base); const roll = rolling(run.def, ctxs, run.months, base);
    const full = simulate(run.def, ctxs, { ...base, startDate: run.split.train[0], endDate: run.split.oos[1] });
    return { wf, roll, full, mc: monteCarlo(full) };
  }, [run, ctxs, regime]);
  const dateIn = (label: string, v: string, on: (s: string) => void) => <div><Label className="text-[11px]">{label}</Label><Input type="date" className="h-8 w-36 text-xs" value={v} onChange={(e) => on(e.target.value)} /></div>;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><SplitSquareHorizontal className="h-4 w-4 text-primary" />Walk-forward and Monte Carlo testing</CardTitle>
          <p className="text-xs text-muted-foreground">Split history into training, validation and out-of-sample periods to see if a strategy still works on data it was not tuned on. Then replay its trades in random order 1,000 times to see the range of outcomes.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div><Label className="text-xs">Strategy</Label><select aria-label="Strategy" className="h-9 w-64 rounded-md border border-border bg-background px-2 text-sm" value={def?.key} onChange={(e) => setKey(e.target.value)}>{defs.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}</select></div>
            <Settings cfg={cfg} setCfg={setCfg} />
            <div><Label className="text-xs">Rolling window (months)</Label><Input className="w-24" type="number" min={2} max={12} value={months} onChange={(e) => setMonths(Math.min(12, Math.max(2, +e.target.value)))} /></div>
          </div>
          <div className="flex flex-wrap gap-3 rounded-md border border-border p-2">
            <div className="flex gap-1"><span className="self-center text-xs font-semibold">Training</span>{dateIn("From", split.train[0], (s) => setSplit({ ...split, train: [s, split.train[1]] }))}{dateIn("To", split.train[1], (s) => setSplit({ ...split, train: [split.train[0], s], valid: [s, split.valid[1]] }))}</div>
            <div className="flex gap-1"><span className="self-center text-xs font-semibold">Validation</span>{dateIn("From", split.valid[0], (s) => setSplit({ ...split, valid: [s, split.valid[1]] }))}{dateIn("To", split.valid[1], (s) => setSplit({ ...split, valid: [split.valid[0], s], oos: [s, split.oos[1]] }))}</div>
            <div className="flex gap-1"><span className="self-center text-xs font-semibold">Out-of-sample</span>{dateIn("From", split.oos[0], (s) => setSplit({ ...split, oos: [s, split.oos[1]] }))}{dateIn("To", split.oos[1], (s) => setSplit({ ...split, oos: [split.oos[0], s] }))}</div>
          </div>
          <Button disabled={!def} onClick={() => setRun({ def, split, cfg, months })}><Play className="mr-1 h-4 w-4" />Run tests</Button>
        </CardContent>
      </Card>
      {out && run && <>
        <Card>
          <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex flex-wrap items-center gap-2 text-base">{run.def.name}: walk-forward result <Badge variant={out.wf.verdict === "Robust" ? "default" : out.wf.verdict === "Mixed" ? "secondary" : "destructive"}>{out.wf.verdict}</Badge></CardTitle>
            <ExportButtons title={`Robustness report ${run.def.name}`} build={() => ({
              meta: [`Strategy: ${run.def.name} (${run.def.family}). Capital ${inr(run.cfg.capital)}, market filter ${run.cfg.filter ? "on" : "off"}. Walk-forward verdict: ${out.wf.verdict}.`, `Training ${run.split.train.join(" to ")}, validation ${run.split.valid.join(" to ")}, out-of-sample ${run.split.oos.join(" to ")}.`],
              sections: [
                { title: "Walk-forward periods", head: ["Period", "From", "To", "Return %", "Trades", "Win rate %", "Profit factor", "Max DD %", "Sharpe", "Expectancy"], rows: ([["Training", out.wf.train, run.split.train], ["Validation", out.wf.valid, run.split.valid], ["Out-of-sample", out.wf.oos, run.split.oos]] as const).map(([l, x, p]) => [l, p[0], p[1], r2(x.netReturn), x.trades.length, r2(x.winRate), r2(x.profitFactor), r2(x.maxDrawdown), r2(x.sharpe), r2(x.expectancy)]) },
                { title: `Rolling ${run.months}-month windows`, head: ["From", "To", "Return %"], rows: out.roll.map((w: any) => [w.from, w.to, r2(w.ret)]) },
                ...(out.mc ? [{ title: "Monte Carlo (bootstrap, simulation not prediction)", head: ["Runs", "Trades", "Final 5%", "Final median", "Final 95%", "DD median %", "DD bad 5% %", "Streak median", "Streak bad 5%", "P(loss) %", "P(DD>20%) %"], rows: [[out.mc.runs, out.mc.trades, r2(out.mc.final.p5), r2(out.mc.final.p50), r2(out.mc.final.p95), r2(out.mc.dd.p50), r2(out.mc.dd.p95), out.mc.streak.p50, out.mc.streak.p95, r2(out.mc.probLoss), r2(out.mc.probDd20)]] }] : []),
                { title: "Full-period risk metrics", head: ["Return %", "CAGR %", "Max DD %", "Sharpe", "Profit factor", "Win rate %", "Expectancy", "Net P&L", "Charges"], rows: [[r2(out.full.netReturn), r2(out.full.cagr), r2(out.full.maxDrawdown), r2(out.full.sharpe), r2(out.full.profitFactor), r2(out.full.winRate), r2(out.full.expectancy), r2(out.full.finalEquity - out.full.startEquity), r2(out.full.totalCharges)]] },
                { title: "All trades", head: TRADE_HEAD, rows: tradeRows(out.full.trades) },
              ],
            })} /></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">{([["Training", out.wf.train, run.split.train], ["Validation", out.wf.valid, run.split.valid], ["Out-of-sample", out.wf.oos, run.split.oos]] as const).map(([l, r, p]) => (
              <div key={l} className="rounded-md border border-border p-3"><div className="text-xs font-bold uppercase text-muted-foreground">{l}</div><div className="text-[11px] text-muted-foreground">{p[0]} to {p[1]}</div>
                <div className={"text-xl font-bold " + tone(r.netReturn)}>{pct(r.netReturn)}</div><div className="text-xs text-muted-foreground">{r.trades.length} trades · win {r.winRate.toFixed(0)}% · PF {r.profitFactor.toFixed(2)} · DD -{r.maxDrawdown.toFixed(1)}% · Sharpe {r.sharpe.toFixed(2)}</div></div>))}</div>
            <div className="text-xs text-muted-foreground">Rolling {run.months}-month windows: {out.roll.filter((w) => w.ret > 0).length} of {out.roll.length} profitable.</div>
            <div className="h-48"><ResponsiveContainer><BarChart data={out.roll}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="from" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} unit="%" /><Tooltip formatter={(v: number) => v + "%"} labelFormatter={(l, p) => `${l} to ${p?.[0]?.payload?.to ?? ""}`} /><ReferenceLine y={0} stroke="hsl(var(--border))" /><Bar dataKey="ret" name="Window return">{out.roll.map((w, i) => <Cell key={i} fill={w.ret >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar></BarChart></ResponsiveContainer></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Shuffle className="h-4 w-4 text-primary" />Monte Carlo simulation</CardTitle>
            <p className="text-xs text-muted-foreground">Simulation, not a prediction. The {out.mc?.trades ?? 0} closed trades from {run.split.train[0]} to {run.split.oos[1]} are drawn in random order (with repeats) {out.mc?.runs ?? 0} times to show how lucky or unlucky the sequence could have been.</p></CardHeader>
          <CardContent className="space-y-3">
            {!out.mc ? <p className="text-sm text-muted-foreground">Needs at least 5 closed trades.</p> : <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                <Kpi l="Final value (5% / median / 95%)" v={`${inr(out.mc.final.p5)} / ${inr(out.mc.final.p50)} / ${inr(out.mc.final.p95)}`} />
                <Kpi l="Max drawdown (median)" v={<span className="text-destructive">-{out.mc.dd.p50.toFixed(1)}%</span>} /><Kpi l="Max drawdown (bad 5%)" v={<span className="text-destructive">-{out.mc.dd.p95.toFixed(1)}%</span>} />
                <Kpi l="Losing streak (median / bad 5%)" v={`${out.mc.streak.p50} / ${out.mc.streak.p95} trades`} />
                <Kpi l="Chance of ending below start" v={out.mc.probLoss.toFixed(1) + "%"} /><Kpi l="Chance of drawdown above 20%" v={out.mc.probDd20.toFixed(1) + "%"} />
              </div>
              <div className="h-56"><ResponsiveContainer><ComposedChart data={out.mc.band}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="trade" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} /><Tooltip formatter={(v: number) => inr(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Area dataKey="p95" name="Best 5%" stroke="hsl(var(--gain))" fill="hsl(var(--gain))" fillOpacity={0.08} /><Area dataKey="p5" name="Worst 5%" stroke="hsl(var(--loss))" fill="hsl(var(--background))" fillOpacity={1} /><Line dataKey="p50" name="Median" dot={false} stroke="hsl(var(--primary))" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div>
            </>}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}
