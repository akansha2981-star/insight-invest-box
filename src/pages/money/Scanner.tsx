import { useMemo, useState } from "react";
import { ScanSearch, ArrowUpDown, Zap, Filter, Loader2, Search } from "lucide-react";
import type { Ctx } from "@/lib/swing/strategies20";
import { PRESETS, describe, evalCond, evalGroup, newGroup, type Group, type Cond } from "@/lib/swing/rules";
import { sectorOf } from "@/lib/swing/robust";
import { RuleEditor } from "./RuleEditor";
import { ExportButtons } from "./ExportButtons";
import { r2 } from "@/lib/swing/exportReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const f2 = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "-" : n.toLocaleString("en-IN", { maximumFractionDigits: d }));
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "");

/** How many top-level conditions pass (for "near matches"). */
function score(c: Ctx, i: number, g: Group) { const n = g.items.length; const ok = g.items.filter((x) => (x.type === "cond" ? evalCond(c, i, x as Cond) : evalGroup(c, i, x as Group))).length; return { ok, n }; }

function strength(c: Ctx, i: number) {
  const b = c.b[i], r = c.r[i] as any; let s = 0;
  if (r.sma50 && b.close > r.sma50) s++; if (r.sma200 && b.close > r.sma200) s++; if (r.rsi > 50 && r.rsi < 70) s++;
  if (r.macd > r.macdSignal) s++; if (r.adx > 20 && r.pdi > r.mdi) s++; if (c.volRatio[i] > 1.2) s++;
  if (r.stUp != null) s++; if (c.ret63[i] > 0) s++;
  return s; // 0-8
}

function Spark({ v }: { v: number[] }) {
  if (v.length < 2) return null; const lo = Math.min(...v), hi = Math.max(...v), w = 80, h = 24;
  const pts = v.map((x, k) => `${(k / (v.length - 1)) * w},${h - ((x - lo) / (hi - lo || 1)) * h}`).join(" ");
  return <svg width={w} height={h} className={v.at(-1)! >= v[0] ? "text-emerald-600" : "text-destructive"}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>;
}

type SortKey = "sym" | "close" | "chg" | "rsi" | "adx" | "vol" | "m1" | "m6" | "fromHi" | "str";
const COLS: [SortKey, string][] = [["close", "Close"], ["chg", "Today"], ["rsi", "RSI"], ["adx", "ADX"], ["vol", "Vol ratio"], ["m1", "1M"], ["m6", "6M"], ["fromHi", "From 52W high"], ["str", "Strength"]];

export function Scanner({ ctxs }: { ctxs: Ctx[] }) {
  const [g, setG] = useState<Group>(PRESETS[0].g);
  const [run, setRun] = useState<{ g: Group; name: string }>({ g: PRESETS[0].g, name: PRESETS[0].name });
  const [f, setF] = useState({ q: "", sector: "All", minPx: 0, maxPx: 0, rsiLo: 0, rsiHi: 100, minVol: 0, above200: false, useRule: true });
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "str", dir: -1 });
  const sectors = useMemo(() => ["All", ...[...new Set(ctxs.map((c) => sectorOf(c.sym)))].sort()], [ctxs]);

  const rows = useMemo(() => ctxs.map((c) => {
    const i = c.b.length - 1, b = c.b[i], r = c.r[i] as any;
    return { c, i, sym: c.sym, sector: sectorOf(c.sym), date: b.date, close: b.close, chg: i ? (b.close / c.b[i - 1].close - 1) * 100 : 0, rsi: r.rsi as number, adx: r.adx as number, vol: c.volRatio[i], m1: c.ret21[i], m6: c.ret126[i], fromHi: c.hi252[i] ? (b.close / c.hi252[i] - 1) * 100 : NaN, above200: r.sma200 ? b.close > r.sma200 : false, str: strength(c, i), spark: c.b.slice(-30).map((x) => x.close) };
  }), [ctxs]);

  const counts = useMemo(() => PRESETS.map((p) => rows.filter((x) => evalGroup(x.c, x.i, p.g)).length), [rows]);
  const passFilters = (x: (typeof rows)[number]) => (f.sector === "All" || x.sector === f.sector) && (!f.q || x.sym.includes(f.q.toUpperCase())) && (!f.minPx || x.close >= f.minPx) && (!f.maxPx || x.close <= f.maxPx)
    && (!Number.isFinite(x.rsi) || (x.rsi >= f.rsiLo && x.rsi <= f.rsiHi)) && (!f.minVol || x.vol >= f.minVol) && (!f.above200 || x.above200);
  const hits = useMemo(() => {
    const out = rows.filter((x) => passFilters(x) && (!f.useRule || evalGroup(x.c, x.i, run.g)));
    const val = (x: any) => (sort.k === "sym" ? x.sym : Number.isFinite(x[sort.k]) ? x[sort.k] : -Infinity);
    return out.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [rows, run, f, sort]);
  const near = useMemo(() => (!f.useRule || hits.length >= 5 ? [] : rows.filter((x) => passFilters(x) && !evalGroup(x.c, x.i, run.g)).map((x) => ({ x, s: score(x.c, x.i, run.g) })).filter((y) => y.s.ok > 0).sort((a, b) => b.s.ok - a.s.ok).slice(0, 8)), [rows, run, f, hits.length]);

  if (!ctxs.length) return <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading live NSE price history for the scanner...</CardContent></Card>;
  const pick = (k: number) => { setG(PRESETS[k].g); setRun({ g: PRESETS[k].g, name: PRESETS[k].name }); setF({ ...f, useRule: true }); };
  const th = (k: SortKey, l: string) => <TableHead key={k}><button className="flex items-center gap-1 whitespace-nowrap" onClick={() => setSort({ k, dir: sort.k === k ? (-sort.dir as 1 | -1) : -1 })}>{l}<ArrowUpDown className={"h-3 w-3 " + (sort.k === k ? "text-primary" : "opacity-40")} /></button></TableHead>;
  const bull = rows.filter((x) => x.chg > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[["Stocks scanned", rows.length], ["Up today / down", `${bull} / ${rows.length - bull}`], ["Above 200 DMA", `${rows.filter((x) => x.above200).length}`], ["Latest bar", rows[0]?.date ?? "-"]].map(([l, v]) => <Card key={l as string}><CardContent className="p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className="text-lg font-bold text-foreground">{v}</div></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" />Ready scans, live match counts</CardTitle><p className="text-xs text-muted-foreground">Every ready scan runs on all {rows.length} stocks at once. Click one to see the stocks.</p></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          {PRESETS.map((p, k) => <button key={p.name} onClick={() => pick(k)} className={"rounded-lg border p-2 text-left transition-colors hover:border-primary " + (run.name === p.name ? "border-primary bg-primary/5" : "border-border")}>
            <div className="text-2xl font-bold text-foreground">{counts[k]}</div><div className="text-[11px] leading-tight text-muted-foreground">{p.name}</div></button>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ScanSearch className="h-4 w-4 text-primary" />Custom rule builder</CardTitle><p className="text-xs text-muted-foreground">Combine any of 45 indicators with AND / OR and nested groups.</p></CardHeader>
        <CardContent className="space-y-3">
          <RuleEditor g={g} onChange={setG} />
          <div className="flex flex-wrap gap-2"><Button onClick={() => { setRun({ g, name: "Custom scan" }); setF({ ...f, useRule: true }); }}><ScanSearch className="mr-1 h-4 w-4" />Scan now</Button><Button variant="ghost" onClick={() => setG(newGroup())}>Start blank</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4 text-primary" />Quick filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <div className="col-span-2"><Label className="text-xs">Search stock</Label><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-7" placeholder="e.g. HDFC" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value.slice(0, 20) })} /></div></div>
          <div><Label className="text-xs">Sector</Label><select aria-label="Sector" className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })}>{sectors.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><Label className="text-xs">Min price (₹)</Label><Input type="number" min={0} value={f.minPx || ""} onChange={(e) => setF({ ...f, minPx: Math.max(0, +e.target.value) })} /></div>
          <div><Label className="text-xs">Max price (₹)</Label><Input type="number" min={0} value={f.maxPx || ""} onChange={(e) => setF({ ...f, maxPx: Math.max(0, +e.target.value) })} /></div>
          <div><Label className="text-xs">RSI from / to</Label><div className="flex gap-1"><Input type="number" min={0} max={100} value={f.rsiLo} onChange={(e) => setF({ ...f, rsiLo: Math.min(100, Math.max(0, +e.target.value)) })} /><Input type="number" min={0} max={100} value={f.rsiHi} onChange={(e) => setF({ ...f, rsiHi: Math.min(100, Math.max(0, +e.target.value)) })} /></div></div>
          <div><Label className="text-xs">Min volume ratio</Label><Input type="number" min={0} step={0.1} value={f.minVol || ""} onChange={(e) => setF({ ...f, minVol: Math.max(0, +e.target.value) })} /></div>
          <div className="flex flex-col justify-end gap-1.5 text-xs"><label className="flex items-center gap-2"><Switch checked={f.above200} onCheckedChange={(v) => setF({ ...f, above200: v })} />Above 200 DMA</label><label className="flex items-center gap-2"><Switch checked={f.useRule} onCheckedChange={(v) => setF({ ...f, useRule: v })} />Apply scan rule</label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{hits.length} matches <Badge variant="outline" className="ml-2">{f.useRule ? run.name : "Filters only"}</Badge></CardTitle>
          <ExportButtons title="Scanner results" build={() => ({ meta: [`Scan: ${f.useRule ? `${run.name} (${describe(run.g)})` : "filters only"}. Bar date ${rows[0]?.date}. ${rows.length} stocks scanned.`], sections: [{ title: "Matches", head: ["Stock", "Sector", "Close", "Today %", "RSI", "ADX", "Vol ratio", "1M %", "6M %", "From 52W high %", "Strength /8"], rows: hits.map((h) => [h.sym, h.sector, r2(h.close), r2(h.chg), r2(h.rsi), r2(h.adx), r2(h.vol), r2(h.m1), r2(h.m6), r2(h.fromHi), h.str]) }] })} />
        </div>{f.useRule && <p className="text-xs text-muted-foreground">Rule: {describe(run.g)}</p>}</CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table><TableHeader><TableRow>{th("sym", "Stock")}<TableHead>Sector</TableHead><TableHead>30 days</TableHead>{COLS.map(([k, l]) => th(k, l))}</TableRow></TableHeader>
            <TableBody>{!hits.length && <TableRow><TableCell colSpan={12} className="py-6 text-center text-muted-foreground">No stock matches every condition right now.{near.length ? " Closest stocks are listed below." : " Try another ready scan or loosen the filters."}</TableCell></TableRow>}
              {hits.map((h) => <TableRow key={h.sym}><TableCell className="font-semibold">{h.sym}</TableCell><TableCell className="text-xs">{h.sector}</TableCell><TableCell><Spark v={h.spark} /></TableCell><TableCell>₹{f2(h.close)}</TableCell><TableCell className={tone(h.chg)}>{f2(h.chg)}%</TableCell>
                <TableCell className={h.rsi > 70 ? "text-destructive" : h.rsi < 30 ? "text-emerald-600" : ""}>{f2(h.rsi, 1)}</TableCell><TableCell>{f2(h.adx, 1)}</TableCell><TableCell className={h.vol > 1.5 ? "font-semibold text-primary" : ""}>{f2(h.vol)}x</TableCell><TableCell className={tone(h.m1)}>{f2(h.m1, 1)}%</TableCell><TableCell className={tone(h.m6)}>{f2(h.m6, 1)}%</TableCell><TableCell>{f2(h.fromHi, 1)}%</TableCell>
                <TableCell><div className="flex items-center gap-1.5"><div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(h.str / 8) * 100}%` }} /></div><span className="text-xs">{h.str}/8</span></div></TableCell></TableRow>)}</TableBody></Table>
        </CardContent>
      </Card>

      {near.length > 0 && <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Near matches</CardTitle><p className="text-xs text-muted-foreground">Stocks that meet most, but not all, of the scan's conditions.</p></CardHeader>
        <CardContent className="flex flex-wrap gap-2">{near.map(({ x, s }) => <div key={x.sym} className="rounded-md border border-border px-3 py-2 text-sm"><span className="font-semibold">{x.sym}</span> <span className="text-xs text-muted-foreground">{s.ok} of {s.n} conditions · ₹{f2(x.close)}</span></div>)}</CardContent>
      </Card>}
      <p className="text-[11px] text-muted-foreground">Strength counts 8 bullish checks: above 50 and 200 DMA, RSI 50-70, MACD above signal, ADX trend up, volume above average, SuperTrend up, 3-month gain. Research only, not a buy recommendation.</p>
    </div>
  );
}
