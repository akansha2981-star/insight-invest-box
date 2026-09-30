import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, Minus, RefreshCw, Search, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runRule, type Bar as PriceBar } from "@/lib/swing/engine";
import { computeAll, readout, type IndicatorRow } from "@/lib/swing/indicators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface Instrument { exchange: "NSE" | "BSE"; token: string; symbol: string; name: string }
interface Quote { ltp: number; open: number; high: number; low: number; close: number; change: number; changePercent: number; volume: number; high52: number; low52: number; upperCircuit: number; lowerCircuit: number; buyQty: number; sellQty: number }
interface ChartData { daily: PriceBar[]; intraday: PriceBar[]; quote: Quote | null; fetchedAt: string }
interface StrategyLite { id: string; name: string; rule_type: string; params: any; is_active: boolean }

const REFRESH_MS = 15 * 60000;
const WL_KEY = "iq-money-watchlist";
const DEFAULT_WL: Instrument[] = [
  { exchange: "NSE", token: "2885", symbol: "RELIANCE-EQ", name: "RELIANCE" },
  { exchange: "NSE", token: "11536", symbol: "TCS-EQ", name: "TCS" },
  { exchange: "NSE", token: "1333", symbol: "HDFCBANK-EQ", name: "HDFCBANK" },
  { exchange: "NSE", token: "1594", symbol: "INFY-EQ", name: "INFY" },
  { exchange: "NSE", token: "4963", symbol: "ICICIBANK-EQ", name: "ICICIBANK" },
  { exchange: "NSE", token: "3045", symbol: "SBIN-EQ", name: "SBIN" },
];
const OVERLAYS = [
  { key: "sma20", label: "SMA20", color: "hsl(var(--gold))" },
  { key: "sma50", label: "SMA50", color: "hsl(var(--accent))" },
  { key: "sma200", label: "SMA200", color: "hsl(var(--muted-foreground))" },
  { key: "ema20", label: "EMA20", color: "hsl(var(--primary))" },
  { key: "bb", label: "Bollinger", color: "hsl(var(--secondary-foreground))" },
  { key: "vwap", label: "VWAP", color: "hsl(var(--orange-accent, 24 95% 53%))" },
  { key: "st", label: "Supertrend", color: "" },
] as const;

const fmt = (n?: number | null, d = 2) => (n === undefined || n === null || !Number.isFinite(n) ? "-" : n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }));
const istTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

async function fetchChart(i: Instrument): Promise<ChartData> {
  const { data, error } = await supabase.functions.invoke("swing-terminal", { body: { action: "chart", exchange: i.exchange, token: i.token, symbol: i.symbol } });
  if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Feed error");
  return data;
}

/** Merge the live quote into today's daily bar so indicators and strategies use the latest price. */
function withLive(daily: PriceBar[], q: Quote | null): PriceBar[] {
  if (!q?.ltp || !daily.length) return daily;
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); const last = daily.at(-1)!;
  const bar = { date: today, open: q.open || last.close, high: Math.max(q.high, q.ltp), low: Math.min(q.low || q.ltp, q.ltp), close: q.ltp, volume: q.volume || 0 };
  return last.date === today ? [...daily.slice(0, -1), bar] : [...daily, bar];
}

function Candle(props: any) {
  const { x, y, width, height, payload } = props;
  if (!payload || !Number.isFinite(y)) return null;
  const { open, close, high, low } = payload; const span = high - low || 1;
  const py = (v: number) => y + ((high - v) / span) * height;
  const up = close >= open; const color = up ? "hsl(var(--gain))" : "hsl(var(--loss))";
  const top = py(Math.max(open, close)), bot = py(Math.min(open, close)); const cx = x + width / 2;
  return <g><line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} /><rect x={x + width * 0.15} width={Math.max(1, width * 0.7)} y={top} height={Math.max(1, bot - top)} fill={color} /></g>;
}

export function Terminal({ strategies, onPaperBuy, onQuote }: { strategies: StrategyLite[]; onPaperBuy: (symbol: string, strategyId: string, price: number) => void; onQuote?: (symbol: string, price: number) => void }) {
  const [watch, setWatch] = useState<Instrument[]>(() => { try { return JSON.parse(localStorage.getItem(WL_KEY) ?? "") || DEFAULT_WL; } catch { return DEFAULT_WL; } });
  const [sel, setSel] = useState<Instrument>(watch[0] ?? DEFAULT_WL[0]);
  const [charts, setCharts] = useState<Record<string, ChartData>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [tf, setTf] = useState<"1D" | "15m">("1D");
  const [on, setOn] = useState<Record<string, boolean>>({ sma20: true, sma50: true, bb: false, vwap: false, st: true, sma200: false, ema20: false });
  const [q, setQ] = useState(""); const [results, setResults] = useState<Instrument[]>([]); const [searching, setSearching] = useState(false);
  const [nextAt, setNextAt] = useState(Date.now() + REFRESH_MS); const [, force] = useState(0);
  const key = (i: Instrument) => `${i.exchange}:${i.token}`;
  const onQuoteRef = useRef(onQuote); onQuoteRef.current = onQuote;

  useEffect(() => localStorage.setItem(WL_KEY, JSON.stringify(watch)), [watch]);

  const load = useCallback(async (i: Instrument) => {
    setLoadingKey(key(i));
    try { const d = await fetchChart(i); setCharts((p) => ({ ...p, [key(i)]: d })); const px = d.quote?.ltp || d.daily.at(-1)?.close; if (px) onQuoteRef.current?.(i.name, px); }
    catch (e: any) { toast.error(`${i.name}: ${e.message}`); }
    finally { setLoadingKey(null); }
  }, []);

  const refreshAll = useCallback(async () => {
    setNextAt(Date.now() + REFRESH_MS);
    const list = [sel, ...watch.filter((w) => key(w) !== key(sel))];
    for (const i of list) await load(i);
  }, [sel, watch, load]);

  const refreshRef = useRef(refreshAll); refreshRef.current = refreshAll;
  useEffect(() => { refreshRef.current(); const id = setInterval(() => refreshRef.current(), REFRESH_MS); const t = setInterval(() => force((n) => n + 1), 30000); return () => { clearInterval(id); clearInterval(t); }; }, []);
  useEffect(() => { if (!charts[key(sel)]) load(sel); }, [sel]); // eslint-disable-line

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.functions.invoke("swing-terminal", { body: { action: "search", q } });
      setSearching(false); setResults(data?.results ?? []);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const cur = charts[key(sel)];
  const daily = useMemo(() => withLive(cur?.daily ?? [], cur?.quote ?? null), [cur]);
  const rows: IndicatorRow[] = useMemo(() => (tf === "1D" ? computeAll(daily, false).slice(-130) : computeAll(cur?.intraday ?? [], true).slice(-150)), [daily, cur, tf]);
  const plot = rows.map((r) => ({ ...r, range: [r.low, r.high] as [number, number], label: tf === "1D" ? r.date.slice(5) : r.date.slice(5, 16) }));
  const verdicts = useMemo(() => readout(rows), [rows]);
  const score = verdicts.reduce((a, v) => a + v.tone, 0);
  const signals = strategies.filter((s) => s.is_active).map((s) => ({ s, sig: runRule(s.rule_type, daily, s.params).at(-1) ?? 0 }));
  const qt = cur?.quote; const last = rows.at(-1);
  const minsLeft = Math.max(0, Math.round((nextAt - Date.now()) / 60000));

  const addWatch = (i: Instrument) => { if (!watch.some((w) => key(w) === key(i))) setWatch([...watch, i]); };
  const inWatch = watch.some((w) => key(w) === key(sel));

  return (
    <div className="terminal rounded-lg border border-border bg-background p-2 text-foreground">
      {/* Command bar */}
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any NSE / BSE stock" className="h-9 bg-card pl-8 font-mono text-sm" aria-label="Search stocks" />
          {(results.length > 0 || searching) && (
            <div className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
              {searching && <div className="px-3 py-2 text-xs text-muted-foreground">Searching exchange list</div>}
              {results.map((r) => (
                <button key={key(r)} className="flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm hover:bg-muted" onClick={() => { setSel(r); setQ(""); setResults([]); }}>
                  <span>{r.name}</span><span className="text-xs text-muted-foreground">{r.exchange} · {r.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex rounded-md border border-border">
          {(["1D", "15m"] as const).map((t) => <button key={t} onClick={() => setTf(t)} className={"px-3 py-1.5 font-mono text-xs " + (tf === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>)}
        </div>
        <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Activity className={"h-3.5 w-3.5 " + (loadingKey ? "animate-pulse text-primary" : "text-gain")} />NSE/BSE live feed</span>
          {cur && <span>Updated {istTime(cur.fetchedAt)} IST</span>}
          <span>Next refresh {minsLeft}m</span>
          <Button size="sm" variant="outline" className="h-7 border-border bg-card" disabled={!!loadingKey} onClick={() => refreshAll()}><RefreshCw className="mr-1 h-3 w-3" />Refresh</Button>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-12">
        {/* Watchlist */}
        <Panel title="Watchlist" className="lg:col-span-2">
          <div className="divide-y divide-border">
            {watch.map((w) => { const c = charts[key(w)]?.quote; const up = (c?.change ?? 0) >= 0; return (
              <div key={key(w)} className={"group flex cursor-pointer items-center justify-between px-2 py-1.5 font-mono text-xs " + (key(w) === key(sel) ? "bg-muted" : "hover:bg-muted/60")} onClick={() => setSel(w)}>
                <div><div className="font-semibold">{w.name}</div><div className="text-[10px] text-muted-foreground">{w.exchange}</div></div>
                <div className="text-right"><div>{fmt(c?.ltp)}</div><div className={up ? "text-gain" : "text-loss"}>{c ? `${up ? "+" : ""}${fmt(c.changePercent)}%` : "-"}</div></div>
                <button aria-label={`Remove ${w.name}`} className="ml-1 hidden text-muted-foreground group-hover:block" onClick={(e) => { e.stopPropagation(); setWatch(watch.filter((x) => key(x) !== key(w))); }}><X className="h-3 w-3" /></button>
              </div>
            ); })}
          </div>
        </Panel>

        {/* Charts */}
        <div className="space-y-2 lg:col-span-7">
          <Panel title={<span className="flex items-center gap-2">{sel.name} <span className="text-muted-foreground">{sel.exchange}</span>{!inWatch && <button onClick={() => addWatch(sel)} className="flex items-center gap-1 text-primary"><Star className="h-3 w-3" />Add</button>}</span>}
            right={<div className="flex flex-wrap gap-1">{OVERLAYS.map((o) => <button key={o.key} onClick={() => setOn({ ...on, [o.key]: !on[o.key] })} className={"rounded px-1.5 py-0.5 font-mono text-[10px] " + (on[o.key] ? "bg-secondary text-foreground" : "text-muted-foreground")}>{o.label}</button>)}</div>}>
            <div className="h-80">
              {plot.length ? (
                <ResponsiveContainer>
                  <ComposedChart data={plot} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} minTickGap={30} />
                    <YAxis domain={["auto", "auto"]} orientation="right" width={60} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} formatter={(v: any, n: string) => [Array.isArray(v) ? `${fmt(v[0])} - ${fmt(v[1])}` : fmt(v), n === "range" ? "Low - High" : n]} />
                    <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} />
                    {on.bb && <Line dataKey="bbUpper" stroke="hsl(var(--secondary-foreground))" strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
                    {on.bb && <Line dataKey="bbLower" stroke="hsl(var(--secondary-foreground))" strokeDasharray="3 3" dot={false} isAnimationActive={false} />}
                    {on.sma20 && <Line dataKey="sma20" stroke="hsl(var(--gold))" dot={false} isAnimationActive={false} />}
                    {on.sma50 && <Line dataKey="sma50" stroke="hsl(var(--accent))" dot={false} isAnimationActive={false} />}
                    {on.sma200 && <Line dataKey="sma200" stroke="hsl(var(--muted-foreground))" dot={false} isAnimationActive={false} />}
                    {on.ema20 && <Line dataKey="ema20" stroke="hsl(var(--primary))" dot={false} isAnimationActive={false} />}
                    {on.vwap && <Line dataKey="vwap" stroke="hsl(var(--orange-accent))" strokeDasharray="4 2" dot={false} isAnimationActive={false} />}
                    {on.st && <Line dataKey="stUp" stroke="hsl(var(--gain))" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />}
                    {on.st && <Line dataKey="stDown" stroke="hsl(var(--loss))" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <Empty busy={loadingKey === key(sel)} />}
            </div>
          </Panel>
          <div className="grid gap-2 md:grid-cols-3">
            <Panel title="Volume"><Mini data={plot}><Bar dataKey="volume" isAnimationActive={false}>{plot.map((p, i) => <Cell key={i} fill={p.upDay ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar></Mini></Panel>
            <Panel title={`RSI 14 · ${fmt(last?.rsi)}`}><Mini data={plot} domain={[0, 100]}><ReferenceLine y={70} stroke="hsl(var(--loss))" strokeDasharray="3 3" /><ReferenceLine y={30} stroke="hsl(var(--gain))" strokeDasharray="3 3" /><Line dataKey="rsi" stroke="hsl(var(--accent))" dot={false} isAnimationActive={false} /></Mini></Panel>
            <Panel title={`MACD · ${fmt(last?.macdHist)}`}><Mini data={plot}><ReferenceLine y={0} stroke="hsl(var(--border))" /><Bar dataKey="macdHist" isAnimationActive={false}>{plot.map((p, i) => <Cell key={i} fill={(p.macdHist ?? 0) >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"} />)}</Bar><Line dataKey="macd" stroke="hsl(var(--primary))" dot={false} isAnimationActive={false} /><Line dataKey="macdSignal" stroke="hsl(var(--gold))" dot={false} isAnimationActive={false} /></Mini></Panel>
          </div>
        </div>

        {/* Quote, indicators, signals */}
        <div className="space-y-2 lg:col-span-3">
          <Panel title="Quote">
            <div className="p-2 font-mono">
              <div className="flex items-baseline justify-between"><span className="text-2xl font-bold">{fmt(qt?.ltp ?? last?.close)}</span>
                {qt && <span className={qt.change >= 0 ? "text-gain" : "text-loss"}>{qt.change >= 0 ? "+" : ""}{fmt(qt.change)} ({fmt(qt.changePercent)}%)</span>}</div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {[["Open", qt?.open], ["Prev close", qt?.close], ["High", qt?.high], ["Low", qt?.low], ["52W high", qt?.high52], ["52W low", qt?.low52], ["Upper circuit", qt?.upperCircuit], ["Lower circuit", qt?.lowerCircuit]].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span>{fmt(v as number)}</span></div>))}
                <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span>{fmt(qt?.volume, 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bid/Ask qty</span><span>{fmt(qt?.buyQty, 0)}/{fmt(qt?.sellQty, 0)}</span></div>
              </div>
            </div>
          </Panel>
          <Panel title="Indicators" right={<span className={"font-mono text-[11px] font-semibold " + (score > 1 ? "text-gain" : score < -1 ? "text-loss" : "text-gold")}>{score > 1 ? "BULLISH" : score < -1 ? "BEARISH" : "NEUTRAL"} {score > 0 ? "+" : ""}{score}/{verdicts.length}</span>}>
            <div className="divide-y divide-border">
              {verdicts.map((v) => (
                <div key={v.name} className="px-2 py-1.5 font-mono text-[11px]" title={v.text}>
                  <div className="flex justify-between"><span>{v.name}</span><span className={v.tone > 0 ? "text-gain" : v.tone < 0 ? "text-loss" : "text-muted-foreground"}>{v.view}</span></div>
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>{v.text}</span><span>{v.value}</span></div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Strategy signals (daily)">
            <div className="divide-y divide-border">
              {signals.length === 0 && <div className="p-2 text-xs text-muted-foreground">No active strategies</div>}
              {signals.map(({ s, sig }) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 font-mono text-[11px]">
                  <span className="truncate">{s.name}</span>
                  <span className="flex items-center gap-2">
                    {sig === 1 ? <span className="flex items-center text-gain"><ArrowUpRight className="h-3 w-3" />BUY</span> : sig === -1 ? <span className="flex items-center text-loss"><ArrowDownRight className="h-3 w-3" />SELL</span> : <span className="flex items-center text-muted-foreground"><Minus className="h-3 w-3" />HOLD</span>}
                    {sig === 1 && (qt?.ltp || last?.close) && <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => onPaperBuy(sel.name, s.id, qt?.ltp ?? last!.close)}>Paper buy</Button>}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">Prices from the NSE/BSE feed via Angel One, refreshed every 15 minutes. Unofficial data, paper trading only, not investment advice.</p>
    </div>
  );
}

function Panel({ title, right, children, className = "" }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={"overflow-hidden rounded-md border border-border bg-card " + className}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-primary">{title}{right}</div>
      {children}
    </section>
  );
}
function Mini({ data, children, domain }: { data: any[]; children: React.ReactNode; domain?: [number, number] }) {
  return <div className="h-32">{data.length ? <ResponsiveContainer><ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}><XAxis dataKey="label" hide /><YAxis domain={domain ?? ["auto", "auto"]} orientation="right" width={44} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }} formatter={(v: any) => fmt(v)} />{children}</ComposedChart></ResponsiveContainer> : <Empty />}</div>;
}
function Empty({ busy }: { busy?: boolean }) {
  return <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground"><Activity className={"mr-2 h-4 w-4 " + (busy ? "animate-pulse text-primary" : "")} />{busy ? "Connecting to NSE/BSE feed" : "No data"}</div>;
}
