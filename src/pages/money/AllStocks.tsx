import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Globe2, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const db = supabase as any;
const f = (n: any, d = 2) => (n == null || !Number.isFinite(+n) ? "-" : (+n).toLocaleString("en-IN", { maximumFractionDigits: d }));
const tone = (n: any) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "");
const cr = (n: any) => (n == null ? "-" : "₹" + f(+n / 1e7, 0) + " Cr");
const PAGE = 50;

type Range = [string, string];
const NUMS: [string, string][] = [["price", "Price ₹"], ["change_pct", "Change %"], ["gap_pct", "Gap %"], ["vs_dma50", "% vs 50 DMA"], ["vs_dma200", "% vs 200 DMA"], ["from_hi52", "% from 52W high"], ["vol_ratio", "Volume / 3M avg"], ["market_cap", "Market cap (Cr)"], ["pe", "P/E"], ["pb", "P/B"], ["roe", "ROE %"], ["div_yield", "Dividend yield %"]];
const PRESETS: [string, Record<string, Range>][] = [
  ["Above 50 & 200 DMA", { vs_dma50: ["0", ""], vs_dma200: ["0", ""] }],
  ["Near 52W high", { from_hi52: ["-3", ""] }],
  ["Volume spike 2x", { vol_ratio: ["2", ""] }],
  ["Gap up > 2%", { gap_pct: ["2", ""] }],
  ["Gap down > 2%", { gap_pct: ["", "-2"] }],
  ["Value: P/E < 15, ROE > 15", { pe: ["0", "15"], roe: ["15", ""] }],
  ["Large caps (> ₹50,000 Cr)", { market_cap: ["50000", ""] }],
  ["High dividend > 3%", { div_yield: ["3", ""] }],
];

/** Every NSE + BSE share with prices and company figures, filtered and sorted on the server. */
export function AllStocks() {
  const [q, setQ] = useState(""); const [ex, setEx] = useState("ALL");
  const [rng, setRng] = useState<Record<string, Range>>({}); const [applied, setApplied] = useState<{ q: string; ex: string; rng: Record<string, Range> }>({ q: "", ex: "ALL", rng: {} });
  const [sort, setSort] = useState<[string, boolean]>(["value_traded", false]); const [page, setPage] = useState(0);
  const [rows, setRows] = useState<any[]>([]); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ nse: number; bse: number; fresh: string | null }>({ nse: 0, bse: 0, fresh: null });
  const [open, setOpen] = useState<any | null>(null);

  useEffect(() => { (async () => {
    const c = async (e: string) => (await db.from("swing_market_snapshot").select("symbol", { count: "exact", head: true }).eq("exchange", e).not("price", "is", null)).count ?? 0;
    const { data } = await db.from("swing_market_snapshot").select("quoted_at").not("price", "is", null).order("quoted_at", { ascending: false }).limit(1).maybeSingle();
    setStats({ nse: await c("NSE"), bse: await c("BSE"), fresh: data?.quoted_at ?? null });
  })(); }, []);

  useEffect(() => { let live = true; (async () => {
    setLoading(true);
    let qb = db.from("swing_market_screen").select("*", { count: "exact" }).eq("is_index", false).not("price", "is", null);
    if (applied.ex !== "ALL") qb = qb.eq("exchange", applied.ex);
    if (applied.q.trim()) { const s = applied.q.trim().replace(/[%,()]/g, ""); qb = qb.or(`symbol.ilike.%${s}%,name.ilike.%${s}%`); }
    Object.entries(applied.rng).forEach(([k, [lo, hi]]) => { const m = k === "market_cap" ? 1e7 : 1; if (lo !== "") qb = qb.gte(k, +lo * m); if (hi !== "") qb = qb.lte(k, +hi * m); });
    const { data, count } = await qb.order(sort[0], { ascending: sort[1], nullsFirst: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (!live) return; setRows(data ?? []); setTotal(count ?? 0); setLoading(false);
  })(); return () => { live = false; }; }, [applied, sort, page]);

  const apply = (r = rng) => { setApplied({ q, ex, rng: r }); setPage(0); };
  const reset = () => { setQ(""); setEx("ALL"); setRng({}); setApplied({ q: "", ex: "ALL", rng: {} }); setPage(0); };
  const head = (k: string, l: string) => <th className="cursor-pointer whitespace-nowrap px-2 py-1 text-right" onClick={() => { setSort([k, sort[0] === k ? !sort[1] : false]); setPage(0); }}>{l}{sort[0] === k && (sort[1] ? <ArrowUp className="ml-0.5 inline h-3 w-3" /> : <ArrowDown className="ml-0.5 inline h-3 w-3" />)}</th>;

  return (
    <div className="space-y-3">
      <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Globe2 className="h-4 w-4 text-primary" />All NSE and BSE stocks</CardTitle>
        <p className="text-xs text-muted-foreground">{f(stats.nse, 0)} NSE and {f(stats.bse, 0)} BSE-only shares with prices. Last update {stats.fresh ? new Date(stats.fresh).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "-"} IST. Prices refresh in rotating batches every 2 minutes in market hours (each share about every 25 minutes, quotes delayed ~15 min). Company figures are unofficial public data; ROE is estimated as earnings per share / book value per share. Not investment advice.</p></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search symbol or company" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} className="h-8 w-56" />
            {["ALL", "NSE", "BSE"].map((e) => <Badge key={e} variant={ex === e ? "default" : "outline"} className="cursor-pointer" onClick={() => setEx(e)}>{e}</Badge>)}
          </div>
          <div className="flex flex-wrap gap-1">{PRESETS.map(([l, r]) => <Badge key={l} variant="outline" className="cursor-pointer" onClick={() => { setRng(r); apply(r); }}>{l}</Badge>)}</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
            {NUMS.map(([k, l]) => <div key={k} className="text-[11px]"><div className="text-muted-foreground">{l}</div><div className="flex gap-1">
              {[0, 1].map((j) => <Input key={j} placeholder={j ? "max" : "min"} className="h-7 px-1 text-xs" value={rng[k]?.[j] ?? ""} onChange={(e) => { const cur: Range = [...(rng[k] ?? ["", ""])] as Range; cur[j] = e.target.value.replace(/[^0-9.-]/g, ""); setRng({ ...rng, [k]: cur }); }} />)}
            </div></div>)}
          </div>
          <div className="flex gap-2"><Button size="sm" onClick={() => apply()}>Apply filters</Button><Button size="sm" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-3 w-3" />Reset</Button><span className="self-center text-xs text-muted-foreground">{loading ? "Loading..." : `${f(total, 0)} matches`}</span></div>
        </CardContent></Card>

      <Card><CardContent className="overflow-auto p-0">
        <table className="w-full text-xs tabular-nums"><thead className="bg-muted/50 text-muted-foreground"><tr>
          <th className="px-2 py-1 text-left">Stock</th>{head("price", "Price")}{head("change_pct", "Chg %")}{head("gap_pct", "Gap %")}{head("volume", "Volume")}{head("vol_ratio", "Vol x")}{head("value_traded", "Value")}{head("vs_dma50", "vs 50D")}{head("vs_dma200", "vs 200D")}{head("from_hi52", "From 52W hi")}{head("market_cap", "Mkt cap")}{head("pe", "P/E")}{head("pb", "P/B")}{head("roe", "ROE %")}{head("div_yield", "Div %")}<th className="px-2 py-1 text-right">Updated</th>
        </tr></thead><tbody>
          {rows.map((r) => <tr key={r.exchange + r.symbol} className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => setOpen(r)}>
            <td className="px-2 py-1"><b>{r.symbol}</b> <Badge variant="outline" className="ml-1 text-[9px]">{r.exchange}</Badge><div className="max-w-[180px] truncate text-[10px] text-muted-foreground">{r.name}</div></td>
            <td className="px-2 text-right">₹{f(r.price)}</td><td className={"px-2 text-right " + tone(r.change_pct)}>{f(r.change_pct)}</td><td className={"px-2 text-right " + tone(r.gap_pct)}>{f(r.gap_pct)}</td>
            <td className="px-2 text-right">{f(r.volume, 0)}</td><td className="px-2 text-right">{f(r.vol_ratio, 1)}</td><td className="px-2 text-right">{cr(r.value_traded)}</td>
            <td className={"px-2 text-right " + tone(r.vs_dma50)}>{f(r.vs_dma50, 1)}</td><td className={"px-2 text-right " + tone(r.vs_dma200)}>{f(r.vs_dma200, 1)}</td><td className="px-2 text-right">{f(r.from_hi52, 1)}</td>
            <td className="px-2 text-right">{cr(r.market_cap)}</td><td className="px-2 text-right">{f(r.pe, 1)}</td><td className="px-2 text-right">{f(r.pb, 1)}</td><td className="px-2 text-right">{f(r.roe, 1)}</td><td className="px-2 text-right">{f(r.div_yield, 1)}</td>
            <td className="px-2 text-right text-muted-foreground">{r.quote_time ? new Date(r.quote_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
          </tr>)}
          {!rows.length && !loading && <tr><td colSpan={16} className="p-4 text-center text-muted-foreground">No stocks match these filters.</td></tr>}
        </tbody></table>
      </CardContent></Card>
      <div className="flex items-center justify-end gap-2 text-xs"><Button size="sm" variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE))}</span><Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next</Button></div>
      {open && <StockSheet row={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function StockSheet({ row, onClose }: { row: any; onClose: () => void }) {
  const [bars, setBars] = useState<any[] | null>(null);
  useEffect(() => { supabase.functions.invoke("swing-market", { body: { action: "chart", yahoo: row.yahoo } }).then(({ data }) => setBars(data?.bars ?? [])); }, [row.yahoo]);
  const ret = (n: number) => (bars && bars.length > n ? (bars.at(-1).close / bars[bars.length - 1 - n].close - 1) * 100 : NaN);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{row.symbol} <span className="text-sm font-normal text-muted-foreground">{row.name} · {row.exchange}</span></DialogTitle></DialogHeader>
      <div className="h-56">{bars === null ? <p className="text-xs text-muted-foreground">Loading chart...</p> : !bars.length ? <p className="text-xs text-muted-foreground">No price history available for this share.</p> :
        <ResponsiveContainer><LineChart data={bars}><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={50} /><Tooltip /><Line dataKey="close" dot={false} stroke="hsl(var(--primary))" strokeWidth={1.5} /></LineChart></ResponsiveContainer>}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
        {[["Price", "₹" + f(row.price)], ["Change", f(row.change_pct) + "%"], ["Day range", `${f(row.low)} - ${f(row.high)}`], ["52W range", `${f(row.lo52)} - ${f(row.hi52)}`], ["50 DMA", f(row.dma50)], ["200 DMA", f(row.dma200)], ["Volume", f(row.volume, 0)], ["Avg vol 3M", f(row.avg_vol_3m, 0)], ["Market cap", cr(row.market_cap)], ["P/E", f(row.pe, 1)], ["Forward P/E", f(row.forward_pe, 1)], ["P/B", f(row.pb, 1)], ["EPS", f(row.eps)], ["Book value", f(row.book_value)], ["ROE (est.)", f(row.roe, 1) + "%"], ["Dividend yield", f(row.div_yield, 2) + "%"], ["1M return", f(ret(21), 1) + "%"], ["3M return", f(ret(63), 1) + "%"], ["6M return", f(ret(126), 1) + "%"], ["1Y return", f(ret(bars ? bars.length - 1 : 0), 1) + "%"]].map(([l, v]) =>
          <div key={l} className="flex justify-between border-b border-border py-1"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>)}
      </div>
      <p className="text-[11px] text-muted-foreground">Unofficial public data, may be delayed. Sourced from NSE/BSE listings. Not investment advice.</p>
    </DialogContent></Dialog>
  );
}
