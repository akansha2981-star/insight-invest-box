import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, ReferenceLine, Legend } from "recharts";
import { BarChart3, Layers } from "lucide-react";
import type { Ctx, RegimeDay } from "@/lib/swing/strategies20";
import { breadthAt, breadthHistory, sectorStats } from "@/lib/swing/robust";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const f = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "-");
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "");
const Kpi = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="rounded-md border border-border bg-muted/30 p-2"><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-semibold text-foreground">{v}</div></div>;

export function MarketView({ ctxs, regime, children }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; children?: React.ReactNode }) {
  const b = useMemo(() => breadthAt(ctxs), [ctxs]);
  const hist = useMemo(() => breadthHistory(ctxs), [ctxs]);
  const sec = useMemo(() => sectorStats(ctxs), [ctxs]);
  const idx = useMemo(() => (regime ? [...regime.values()].slice(-250).map((r) => ({ date: r.date, index: r.close, sma50: r.sma50, sma200: r.sma200 })) : []), [regime]);
  return (
    <div className="space-y-4">
      {children}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" />Market breadth · {b.date}</CardTitle>
          <p className="text-xs text-muted-foreground">Across {b.n} stocks in your universe, live NSE daily data.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Kpi l="Advances / declines" v={<><span className="text-emerald-600">{b.adv}</span> / <span className="text-destructive">{b.dec}</span></>} /><Kpi l="A/D ratio" v={f(b.adRatio, 2)} />
            <Kpi l="Above 20 DMA" v={b.a20 + "%"} /><Kpi l="Above 50 DMA" v={b.a50 + "%"} /><Kpi l="Above 200 DMA" v={b.a200 + "%"} />
            <Kpi l="New 52W highs" v={b.hi} /><Kpi l="New 52W lows" v={b.lo} /><Kpi l="Up volume share" v={b.upV + b.dnV ? Math.round((b.upV / (b.upV + b.dnV)) * 100) + "%" : "-"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-56"><ResponsiveContainer><LineChart data={hist}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="a50" name="% above 50 DMA" dot={false} stroke="hsl(var(--primary))" /><Line dataKey="a200" name="% above 200 DMA" dot={false} stroke="hsl(var(--gold))" /></LineChart></ResponsiveContainer></div>
            <div className="h-56"><ResponsiveContainer><LineChart data={idx}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="index" name="Equal-weight index" dot={false} stroke="hsl(var(--foreground))" /><Line dataKey="sma50" name="SMA 50" dot={false} stroke="hsl(var(--accent))" /><Line dataKey="sma200" name="SMA 200" dot={false} stroke="hsl(var(--loss))" /></LineChart></ResponsiveContainer></div>
          </div>
          <div className="h-40"><ResponsiveContainer><BarChart data={hist.slice(-120)}><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><ReferenceLine y={0} stroke="hsl(var(--border))" /><Bar dataKey="net" name="Advances minus declines">{hist.slice(-120).map((h, i) => <Cell key={i} fill={h.net >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar></BarChart></ResponsiveContainer></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4 text-primary" />Sector analysis</CardTitle>
          <p className="text-xs text-muted-foreground">Equal-weight averages of the stocks in each sector. Relative strength = sector 1-month return minus the universe average.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="h-56"><ResponsiveContainer><BarChart data={sec}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="sector" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} /><YAxis tick={{ fontSize: 10 }} unit="%" /><Tooltip formatter={(v: number) => v.toFixed(2) + "%"} /><Bar dataKey="m1" name="1-month return">{sec.map((s, i) => <Cell key={i} fill={s.m1 >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Sector</TableHead><TableHead>Stocks</TableHead><TableHead>Today</TableHead><TableHead>1M</TableHead><TableHead>3M</TableHead><TableHead>6M</TableHead><TableHead>Rel. strength</TableHead><TableHead>Above 50 DMA</TableHead><TableHead>Above 200 DMA</TableHead><TableHead>Volume ratio</TableHead></TableRow></TableHeader>
            <TableBody>{sec.map((s) => <TableRow key={s.sector}><TableCell className="font-semibold" title={s.members.join(", ")}>{s.sector}</TableCell><TableCell>{s.stocks}</TableCell><TableCell className={tone(s.d1)}>{f(s.d1, 2)}%</TableCell><TableCell className={tone(s.m1)}>{f(s.m1)}%</TableCell><TableCell className={tone(s.m3)}>{f(s.m3)}%</TableCell><TableCell className={tone(s.m6)}>{f(s.m6)}%</TableCell><TableCell className={tone(s.rs)}>{f(s.rs)}</TableCell><TableCell>{s.a50}%</TableCell><TableCell>{s.a200}%</TableCell><TableCell>{f(s.vol, 2)}x</TableCell></TableRow>)}</TableBody></Table></div>
        </CardContent>
      </Card>
    </div>
  );
}
