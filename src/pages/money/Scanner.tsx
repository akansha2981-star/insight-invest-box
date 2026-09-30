import { useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";
import type { Ctx } from "@/lib/swing/strategies20";
import { PRESETS, describe, evalGroup, newGroup, type Group } from "@/lib/swing/rules";
import { sectorOf } from "@/lib/swing/robust";
import { RuleEditor } from "./RuleEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const f2 = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "-" : n.toLocaleString("en-IN", { maximumFractionDigits: d }));
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "");

export function Scanner({ ctxs }: { ctxs: Ctx[] }) {
  const [g, setG] = useState<Group>(PRESETS[0].g);
  const [run, setRun] = useState<Group>(PRESETS[0].g);
  const [sector, setSector] = useState("All");
  const sectors = ["All", ...new Set(ctxs.map((c) => sectorOf(c.sym)))].sort();
  const hits = useMemo(() => ctxs.filter((c) => (sector === "All" || sectorOf(c.sym) === sector) && evalGroup(c, c.b.length - 1, run)).map((c) => {
    const i = c.b.length - 1, b = c.b[i], r = c.r[i];
    return { sym: c.sym, sector: sectorOf(c.sym), date: b.date, close: b.close, chg: i ? (b.close / c.b[i - 1].close - 1) * 100 : 0, rsi: r.rsi, adx: r.adx, vol: c.volRatio[i], m1: c.ret21[i], m6: c.ret126[i], fromHi: c.hi252[i] ? (b.close / c.hi252[i] - 1) * 100 : NaN };
  }).sort((a, b) => b.m1 - a.m1), [ctxs, run, sector]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ScanSearch className="h-4 w-4 text-primary" />InvestingIQ Scanner</CardTitle>
          <p className="text-xs text-muted-foreground">Scans all {ctxs.length} stocks in your universe on the latest live daily bar. Pick a ready scan or build your own rules.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">{PRESETS.map((p) => <Button key={p.name} size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setG(p.g); setRun(p.g); }}>{p.name}</Button>)}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setG(newGroup())}>Start blank</Button></div>
          <RuleEditor g={g} onChange={setG} />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setRun(g)}>Scan now</Button>
            <select aria-label="Sector" className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={sector} onChange={(e) => setSector(e.target.value)}>{sectors.map((s) => <option key={s}>{s}</option>)}</select>
            <span className="text-xs text-muted-foreground">Active scan: {describe(run)}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{hits.length} matches <Badge variant="outline" className="ml-2">{hits[0]?.date ?? "-"}</Badge></CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table><TableHeader><TableRow><TableHead>Stock</TableHead><TableHead>Sector</TableHead><TableHead>Close</TableHead><TableHead>Today</TableHead><TableHead>RSI</TableHead><TableHead>ADX</TableHead><TableHead>Vol ratio</TableHead><TableHead>1M</TableHead><TableHead>6M</TableHead><TableHead>From 52W high</TableHead></TableRow></TableHeader>
            <TableBody>{!hits.length && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No stock matches right now.</TableCell></TableRow>}
              {hits.map((h) => <TableRow key={h.sym}><TableCell className="font-semibold">{h.sym}</TableCell><TableCell className="text-xs">{h.sector}</TableCell><TableCell>₹{f2(h.close)}</TableCell><TableCell className={tone(h.chg)}>{f2(h.chg)}%</TableCell><TableCell>{f2(h.rsi, 1)}</TableCell><TableCell>{f2(h.adx, 1)}</TableCell><TableCell>{f2(h.vol)}x</TableCell><TableCell className={tone(h.m1)}>{f2(h.m1, 1)}%</TableCell><TableCell className={tone(h.m6)}>{f2(h.m6, 1)}%</TableCell><TableCell>{f2(h.fromHi, 1)}%</TableCell></TableRow>)}</TableBody></Table>
        </CardContent>
      </Card>
    </div>
  );
}
