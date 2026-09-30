import { useMemo, useState } from "react";
import { GitCompareArrows, Play, Trophy } from "lucide-react";
import { simulate, type Ctx, type RegimeDay, type StrategyDef, type SimResult } from "@/lib/swing/strategies20";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "./ExportButtons";
import { r2 } from "@/lib/swing/exportReport";

const TF: { key: string; label: string; months: number | null }[] = [
  { key: "1m", label: "1 month", months: 1 }, { key: "3m", label: "3 months", months: 3 }, { key: "6m", label: "6 months", months: 6 },
  { key: "1y", label: "1 year", months: 12 }, { key: "2y", label: "2 years", months: 24 }, { key: "all", label: "All history", months: null },
];
type Metric = "ret" | "win" | "dd" | "trades";
const METRICS: { key: Metric; label: string; get: (r: SimResult) => number; better: 1 | -1; fmt: (n: number) => string }[] = [
  { key: "ret", label: "Net return", get: (r) => r.netReturn, better: 1, fmt: (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%" },
  { key: "win", label: "Win rate", get: (r) => (r.closedCount ? r.winRate : 0), better: 1, fmt: (n) => n.toFixed(0) + "%" },
  { key: "dd", label: "Max drawdown", get: (r) => r.maxDrawdown, better: -1, fmt: (n) => "-" + n.toFixed(1) + "%" },
  { key: "trades", label: "Trade count", get: (r) => r.trades.length, better: 1, fmt: (n) => String(n) },
];
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");

export function StrategyCompare({ ctxs, regime, defs }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; defs: StrategyDef[] }) {
  const last = ctxs[0]?.b.at(-1)?.date ?? new Date().toISOString().slice(0, 10);
  const first = ctxs[0]?.b[Math.min(200, (ctxs[0]?.b.length ?? 1) - 1)]?.date ?? "2024-01-01";
  const [tfs, setTfs] = useState(["3m", "6m", "1y", "all"]);
  const [pick, setPick] = useState<string[]>(defs.map((d) => d.key));
  const [cfg, setCfg] = useState({ capital: 100000, filter: true });
  const [metric, setMetric] = useState<Metric>("ret");
  const [run, setRun] = useState<{ tfs: string[]; pick: string[]; cfg: typeof cfg } | null>(null);

  const startOf = (m: number | null) => { if (m == null) return first; const d = new Date(last); d.setMonth(d.getMonth() - m); const s = d.toISOString().slice(0, 10); return s < first ? first : s; };
  const data = useMemo(() => {
    if (!run) return null;
    const periods = TF.filter((t) => run.tfs.includes(t.key)).map((t) => ({ ...t, start: startOf(t.months) }));
    const rows = defs.filter((d) => run.pick.includes(d.key)).map((def) => ({ def, res: Object.fromEntries(periods.map((p) => [p.key, simulate(def, ctxs, { capital: run.cfg.capital, startDate: p.start, regime: run.cfg.filter ? regime : null })])) as Record<string, SimResult> }));
    // Rank per timeframe per metric (1 = best)
    const rank: Record<string, Record<Metric, Map<string, number>>> = {};
    periods.forEach((p) => { rank[p.key] = {} as any; METRICS.forEach((m) => { const s = [...rows].sort((a, b) => m.better * (m.get(b.res[p.key]) - m.get(a.res[p.key]))); rank[p.key][m.key] = new Map(s.map((x, i) => [x.def.key, i + 1])); }); });
    return { periods, rows, rank };
  }, [run, ctxs, regime, defs]);

  const M = METRICS.find((m) => m.key === metric)!;
  const sorted = useMemo(() => {
    if (!data) return [];
    const avg = (k: string, mk: Metric) => data.periods.reduce((a, p) => a + (data.rank[p.key][mk].get(k) ?? 0), 0) / (data.periods.length || 1);
    return data.rows.map((x) => ({ ...x, avgRank: avg(x.def.key, metric), overall: METRICS.reduce((a, m) => a + avg(x.def.key, m.key), 0) / METRICS.length })).sort((a, b) => a.avgRank - b.avgRank);
  }, [data, metric]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><GitCompareArrows className="h-4 w-4 text-primary" />Strategy comparison across timeframes</CardTitle>
          <p className="text-xs text-muted-foreground">Each strategy is tested over each chosen period ending on the latest trading day ({last}), with the same stocks, capital, charges and slippage. Then it is ranked per period by return, win rate, drawdown and number of trades.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <div><Label className="text-xs">Capital per strategy (₹)</Label><Input className="w-36" type="number" min={1000} step={1000} value={cfg.capital} onChange={(e) => setCfg({ ...cfg, capital: Math.max(1000, +e.target.value) })} /></div>
            <label className="flex items-center gap-2 pb-2 text-xs"><Switch checked={cfg.filter} onCheckedChange={(v) => setCfg({ ...cfg, filter: v })} />Market filter</label>
          </div>
          <div><div className="mb-1 text-xs font-semibold">Timeframes</div><div className="flex flex-wrap gap-3">{TF.map((t) => <label key={t.key} className="flex items-center gap-1.5 text-xs"><Checkbox checked={tfs.includes(t.key)} onCheckedChange={(v) => setTfs(v ? [...tfs, t.key] : tfs.filter((k) => k !== t.key))} />{t.label}</label>)}</div></div>
          <details className="rounded-md border border-border p-2 text-sm"><summary className="cursor-pointer text-xs font-semibold">Strategies ({pick.length} of {defs.length})</summary>
            <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => setPick(defs.map((s) => s.key))}>All</Button><Button size="sm" variant="outline" onClick={() => setPick(defs.filter((d) => d.family === "Custom").map((d) => d.key))}>Only my custom</Button><Button size="sm" variant="outline" onClick={() => setPick([])}>None</Button></div>
            <div className="mt-2 grid gap-1 md:grid-cols-3">{defs.map((s) => <label key={s.key} className="flex items-center gap-2 text-xs"><Checkbox checked={pick.includes(s.key)} onCheckedChange={(v) => setPick(v ? [...pick, s.key] : pick.filter((k) => k !== s.key))} />{s.name}</label>)}</div>
          </details>
          <Button disabled={!tfs.length || !pick.length} onClick={() => setRun({ tfs, pick, cfg })}><Play className="mr-1 h-4 w-4" />Compare</Button>
        </CardContent>
      </Card>

      {data && <Card>
        <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-primary" />Ranking by {M.label.toLowerCase()}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">{METRICS.map((m) => <Button key={m.key} size="sm" variant={metric === m.key ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setMetric(m.key)}>{m.label}</Button>)}</div>
            <ExportButtons title="Strategy comparison" build={() => ({
              meta: [`${data.rows.length} strategies, capital ${cfg.capital}, market filter ${run!.cfg.filter ? "on" : "off"}, periods ending ${last}: ${data.periods.map((p) => `${p.label} (from ${p.start})`).join(", ")}`],
              sections: [
                { title: "Overall ranking (average rank across all four metrics and periods)", head: ["#", "Strategy", "Overall avg rank", ...METRICS.map((m) => `Avg rank: ${m.label}`)], rows: [...sorted].sort((a, b) => a.overall - b.overall).map((x, k) => [k + 1, x.def.name, r2(x.overall), ...METRICS.map((m) => r2(data.periods.reduce((a, p) => a + (data.rank[p.key][m.key].get(x.def.key) ?? 0), 0) / data.periods.length))]) },
                ...data.periods.map((p) => ({ title: `${p.label} (${p.start} to ${last})`, head: ["Strategy", "Net return %", "Win rate %", "Max DD %", "Trades", "Profit factor", "Sharpe", "Net P&L", "Rank return", "Rank win", "Rank DD", "Rank trades"], rows: data.rows.map((x) => { const r = x.res[p.key]; return [x.def.name, r2(r.netReturn), r2(r.closedCount ? r.winRate : 0), r2(r.maxDrawdown), r.trades.length, r2(r.profitFactor), r2(r.sharpe), r2(r.finalEquity - r.startEquity), ...METRICS.map((m) => data.rank[p.key][m.key].get(x.def.key))]; }) })),
              ],
            })} />
          </div></div>
          <p className="text-xs text-muted-foreground">Rank 1 is best. For drawdown, smaller is better. The small number under each value is its rank in that period.</p></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead>Avg rank</TableHead>{data.periods.map((p) => <TableHead key={p.key}>{p.label}</TableHead>)}<TableHead>Overall (all metrics)</TableHead></TableRow></TableHeader>
            <TableBody>{sorted.map((x, k) => <TableRow key={x.def.key}><TableCell className="font-bold">{k + 1}</TableCell><TableCell><div className="font-semibold">{x.def.name}</div><div className="text-[11px] text-muted-foreground">{x.def.family}</div></TableCell>
              <TableCell><Badge variant={k < 3 ? "default" : "outline"}>{x.avgRank.toFixed(1)}</Badge></TableCell>
              {data.periods.map((p) => { const v = M.get(x.res[p.key]); return <TableCell key={p.key}><div className={"font-semibold " + (metric === "ret" ? tone(v) : metric === "dd" ? "text-destructive" : "")}>{M.fmt(v)}</div><div className="text-[10px] text-muted-foreground">#{data.rank[p.key][metric].get(x.def.key)} · {x.res[p.key].trades.length} trades</div></TableCell>; })}
              <TableCell>{x.overall.toFixed(1)}</TableCell></TableRow>)}</TableBody></Table>
          <p className="mt-2 text-[11px] text-muted-foreground">Paper test on daily NSE prices. No strategy is guaranteed to be profitable; short periods have few trades and are easily driven by luck.</p>
        </CardContent>
      </Card>}
    </div>
  );
}
