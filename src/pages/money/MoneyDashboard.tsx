import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, ArrowDownRight, ArrowUpRight, LogOut, Minus, Play, Plus, Power, Upload, Wallet, TrendingUp, ShieldAlert, LayoutDashboard, Globe2, LineChart as LineIcon, ScanSearch, Bot, Wrench, FlaskConical, Swords, Trophy, Gauge, Bell, SplitSquareHorizontal, ListChecks, GitCompare, GitCompareArrows, Star, ShieldCheck, Radio, Sparkles } from "lucide-react";
import { STRATEGIES, buildCtx, rankUniverse, marketRegime, type Ctx, type RegimeDay, type StrategyDef } from "@/lib/swing/strategies20";
import { compileCustom } from "@/lib/swing/rules";
import { StrategyLab, MarketCard, UniversePanel, type LabView } from "./StrategyLab";
import { Scanner } from "./Scanner";
import { MarketView } from "./MarketView";
import { StrategyBuilder, type CustomRow } from "./StrategyBuilder";
import { RobustnessLab, Tournament } from "./Robustness";
import { StrategyCompare } from "./StrategyCompare";
import { Watchlists } from "./Watchlists";
import { AdminControls } from "./AdminControls";
import { LiveTest } from "./LiveTest";
import { Leaderboard } from "./Leaderboard";
import { RealTrading } from "./RealTrading";
import { AIvsCustom } from "./AIvsCustom";
import { RealOrderDialog, type RealOrderReq } from "./RealOrderDialog";
import { DEFAULT_CONTROLS, type Controls } from "@/lib/swing/limits";
import { supabase } from "@/integrations/supabase/client";
import { fetchLiveMarketQuotes } from "@/lib/liveMarketData";
import { Terminal } from "./Terminal";
import { RULES, runRule, backtest, parseCsv, type Bar, type BacktestResult } from "@/lib/swing/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu as MenuIcon } from "lucide-react";

interface Strategy { id: string; name: string; description: string | null; rule_type: string; params: any; is_active: boolean; updated_at: string }
interface Trade { id: string; strategy_id: string | null; symbol: string; quantity: number; entry_price: number; entry_date: string; exit_price: number | null; exit_date: string | null; status: string }

const db = supabase as any;
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

export default function MoneyDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [bars, setBars] = useState<Record<string, Bar[]>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [capital, setCapital] = useState(50000);
  const [live, setLive] = useState<Record<string, number>>({});
  const [termPx, setTermPx] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, BacktestResult>>({});
  const [viewing, setViewing] = useState<Strategy | null>(null);
  const [editing, setEditing] = useState<Partial<Strategy> | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const currentLabel = MENU.flatMap((g) => g.items).find(([v]) => v === tab)?.[1] ?? "Dashboard";
  const [ctxs, setCtxs] = useState<Ctx[]>([]);
  const [regime, setRegime] = useState<Map<string, RegimeDay> | null>(null);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [aiRows, setAiRows] = useState<any[]>([]);
  const loadAi = async () => { const { data } = await db.from("swing_ai_strategies").select("*").order("version"); setAiRows(data ?? []); };
  const [unread, setUnread] = useState(0);
  const [realReq, setRealReq] = useState<RealOrderReq | null>(null);
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const loadControls = async () => { const { data } = await db.from("swing_settings").select("value").eq("key", "controls").maybeSingle(); if (data?.value) setControls({ ...DEFAULT_CONTROLS, ...data.value }); };
  useEffect(() => { loadControls(); }, []);
  const loadCustom = async () => { const { data: u } = await supabase.auth.getUser(); if (!u.user) return; const { data } = await db.from("swing_custom_strategies").select("*").eq("user_id", u.user.id).order("created_at"); setCustomRows(data ?? []); };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { navigate("/login?next=/money"); return; }
      setUserId(data.user.id);
      const { data: admin } = await db.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      setIsAdmin(!!admin);
    });
  }, [navigate]);

  const loadAll = async (uid: string) => {
    const [s, p, t, pf] = await Promise.all([
      db.from("swing_strategies").select("*").order("created_at"),
      (async () => {
        const all: any[] = [];
        for (let from = 0; ; from += 1000) {
          const { data } = await db.from("swing_prices").select("symbol,trade_date,open,high,low,close,volume").order("trade_date").order("symbol").range(from, from + 999);
          all.push(...(data ?? [])); if (!data || data.length < 1000) break;
        }
        return { data: all };
      })(),
      db.from("swing_trades").select("*").order("created_at", { ascending: false }),
      db.from("swing_portfolios").select("capital").eq("user_id", uid).maybeSingle(),
    ]);
    setStrategies(s.data ?? []);
    const grouped: Record<string, Bar[]> = {};
    (p.data ?? []).forEach((r: any) => (grouped[r.symbol] ??= []).push({ date: r.trade_date, open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume }));
    setBars(grouped);
    setTrades(t.data ?? []);
    if (pf.data) setCapital(+pf.data.capital); else await db.from("swing_portfolios").insert({ user_id: uid });
  };

  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncFeed = async (force = false) => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("swing-sync", { body: { force } });
    setSyncing(false);
    if (error || data?.error) { if (force) toast.error("Live feed sync failed. Try again shortly."); return; }
    setLastSync(data?.lastSync ?? new Date().toISOString());
    if (!data?.skipped) { if (force) toast.success(`Synced ${data.symbols} stocks from NSE`); loadAll(userId!); }
  };

  useEffect(() => { if (userId) { loadAll(userId).then(() => syncFeed()); } }, [userId]);
  useEffect(() => { if (!userId) return; const id = setInterval(() => syncFeed(), 15 * 60000); return () => clearInterval(id); }, [userId]);
  useEffect(() => {
    const tick = () => fetchLiveMarketQuotes().then((r) => setLive(Object.fromEntries(r.quotes.map((q) => [q.symbol.toUpperCase(), q.price]))));
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, []);


  const priceOf = (sym: string) => live[sym] ?? termPx[sym] ?? bars[sym]?.at(-1)?.close ?? 0;

  const liveBars = useMemo(() => {
    const ist = new Date(Date.now() + 330 * 60000); const today = ist.toISOString().slice(0, 10);
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes(); const sessionOpen = ist.getUTCDay() > 0 && ist.getUTCDay() < 6 && mins >= 555; // after 9:15 IST, Mon-Fri
    const out: Record<string, Bar[]> = {};
    Object.entries(bars).forEach(([sym, b]) => {
      const px = live[sym]; const last = b.at(-1);
      if (!px || !last) { out[sym] = b; return; }
      out[sym] = last.date === today
        ? [...b.slice(0, -1), { ...last, close: px, high: Math.max(last.high, px), low: Math.min(last.low, px) }]
        : !sessionOpen ? b : [...b, { date: today, open: last.close, high: Math.max(last.close, px), low: Math.min(last.close, px), close: px, volume: last.volume }];
    });
    return out;
  }, [bars, live]);

  useEffect(() => { // shared indicator context for every research page
    const id = setTimeout(() => { const c = Object.entries(liveBars).filter(([, b]) => b.length > 60).map(([s, b]) => buildCtx(s, b)); rankUniverse(c); setRegime(marketRegime(c)); setCtxs(c); }, 30);
    return () => clearTimeout(id);
  }, [liveBars]);
  useEffect(() => { if (userId) { loadCustom(); loadAi(); } }, [userId]);
  const defs: StrategyDef[] = useMemo(() => {
    const latest = new Map<string, CustomRow>(); customRows.forEach((r) => { const p = latest.get(r.family_id); if (!p || r.version > p.version) latest.set(r.family_id, r); });
    const aiLatest = new Map<string, any>(); aiRows.forEach((r) => aiLatest.set(r.family_id, r));
    const ai = [...aiLatest.values()].map((r) => ({ ...compileCustom(r.id, r.name, r.version, r.definition), key: `ai:${r.family_id}`, family: "AI" } as StrategyDef));
    const all = [...STRATEGIES, ...ai, ...customRows.map((r) => compileCustom(r.id, r.name, r.version, r.definition))];
    return isAdmin ? all : all.filter((d) => !controls.disabled.includes(d.key));
  }, [customRows, aiRows, controls, isAdmin]);
  const today = regime ? [...regime.values()].at(-1) : undefined;

  // Backtest every strategy automatically when data changes
  useEffect(() => {
    const r: Record<string, BacktestResult> = {};
    strategies.forEach((s) => (r[s.id] = backtest(s.rule_type, s.params, liveBars, 50000)));
    setResults(r);
  }, [strategies, liveBars]);

  const signals = useMemo(() => strategies.filter((s) => s.is_active).flatMap((s) =>
    Object.entries(liveBars).map(([sym, b]) => {
      const sig = runRule(s.rule_type, b, s.params); const last = sig.at(-1) ?? 0;
      return { strategy: s, symbol: sym, signal: last, price: priceOf(sym), date: b.at(-1)?.date };
    })), [strategies, liveBars, live]);

  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status === "closed");
  const invested = open.reduce((a, t) => a + t.entry_price * t.quantity, 0);
  const realized = closed.reduce((a, t) => a + ((t.exit_price ?? 0) - t.entry_price) * t.quantity, 0);
  const marketVal = open.reduce((a, t) => a + (priceOf(t.symbol) || t.entry_price) * t.quantity, 0);
  const cash = capital - invested + realized;
  const value = cash + marketVal;
  const pnl = value - capital;

  const buy = async (symbol: string, strategyId: string, price: number) => {
    const qty = Math.floor(Math.min(cash, capital * 0.2) / price);
    if (qty < 1) return toast.error("Not enough virtual cash");
    const { error } = await db.from("swing_trades").insert({ user_id: userId, strategy_id: strategyId, symbol, quantity: qty, entry_price: price });
    if (error) return toast.error(error.message);
    toast.success(`Paper-bought ${qty} ${symbol}`); loadAll(userId!);
  };
  const sell = async (t: Trade) => {
    const { error } = await db.from("swing_trades").update({ status: "closed", exit_price: priceOf(t.symbol) || t.entry_price, exit_date: new Date().toISOString().slice(0, 10) }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`Closed ${t.symbol}`); loadAll(userId!);
  };
  const toggle = async (s: Strategy) => { await db.from("swing_strategies").update({ is_active: !s.is_active }).eq("id", s.id); loadAll(userId!); };
  const saveStrategy = async () => {
    if (!editing?.name || !editing.rule_type) return toast.error("Name and rule are required");
    const row = { name: editing.name, description: editing.description, rule_type: editing.rule_type, params: editing.params ?? {} };
    const { error } = editing.id ? await db.from("swing_strategies").update(row).eq("id", editing.id) : await db.from("swing_strategies").insert({ ...row, created_by: userId });
    if (error) return toast.error(error.message);
    setEditing(null); loadAll(userId!);
  };
  const uploadCsv = async (file: File) => {
    try {
      const rows = parseCsv(await file.text());
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from("swing_prices").upsert(rows.slice(i, i + 500), { onConflict: "symbol,trade_date" });
        if (error) throw error;
      }
      toast.success(`Imported ${rows.length} price rows`); loadAll(userId!);
    } catch (e: any) { toast.error(e.message); }
  };

  if (!userId) return null;
  const stratName = (id: string | null) => strategies.find((s) => s.id === id)?.name ?? "Manual";
  const noData = Object.keys(bars).length === 0;

  return (
    <div className="min-h-screen bg-muted/40">
      <Helmet><title>Swing Trading Desk | InvestingIQ Money</title><meta name="robots" content="noindex" /></Helmet>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><Link to="/money" className="flex items-center gap-2 font-black text-foreground"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><TrendingUp className="h-4 w-4" /></span><span className="hidden sm:inline">InvestingIQ Money</span></Link><span className="truncate border-l border-border pl-3 text-sm font-semibold text-foreground">{currentLabel}</span><span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex"><span className={"h-2 w-2 rounded-full " + (Object.keys(live).length ? "bg-primary animate-pulse" : "bg-muted-foreground")} />{Object.keys(live).length ? "Live" : "Market closed"}</span></div>
          <div className="flex items-center gap-2">
            {isAdmin && <Badge variant="secondary">Admin</Badge>}
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/login?next=/money"); }}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
          </div>
        </div>
      </header>

      <RealOrderDialog req={realReq} onClose={() => setRealReq(null)} />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {MOBILE_TABS.map(([v, l, I]) => (
            <button key={v} onClick={() => { setTab(v); window.scrollTo({ top: 0 }); }} className={"flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium " + (tab === v ? "text-primary" : "text-muted-foreground")}><I className="h-5 w-5" />{l}</button>
          ))}
          <button onClick={() => setMoreOpen(true)} className={"flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium " + (!MOBILE_TABS.some(([v]) => v === tab) ? "text-primary" : "text-muted-foreground")}><MenuIcon className="h-5 w-5" />More</button>
        </div>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader><SheetTitle>All sections</SheetTitle></SheetHeader>
          {MENU.filter((g) => g.group !== "Admin" || isAdmin).map((g) => (
            <div key={g.group} className="mt-3"><div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</div>
              <div className="grid grid-cols-3 gap-2">{g.items.map(([v, l, I]) => (
                <button key={v} onClick={() => { setTab(v); setMoreOpen(false); window.scrollTo({ top: 0 }); }} className={"flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-xs " + (tab === v ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground")}><I className="h-5 w-5" /><span className="leading-tight">{l}</span></button>
              ))}</div></div>
          ))}
        </SheetContent>
      </Sheet>
      <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 md:flex-row md:gap-6">
        <aside className="hidden md:block md:w-60 md:shrink-0">
          <TabsList className="flex h-auto w-full flex-row flex-wrap justify-start gap-0.5 rounded-lg border border-border bg-background p-2 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:flex-col md:flex-nowrap md:items-stretch md:overflow-y-auto">
            {MENU.filter((g) => g.group !== "Admin" || isAdmin).map((g) => (
              <div key={g.group} className="contents md:block">
                <div className="hidden px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:block">{g.group}</div>
                {g.items.map(([v, l, I]) => (
                  <TabsTrigger key={v} value={v} className="w-auto justify-start gap-2 px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground md:w-full">
                    <I className="h-4 w-4 shrink-0" /><span className="truncate">{l}</span>{v === "alerts" && unread > 0 && <Badge className="ml-auto h-4 px-1 text-[10px]">{unread}</Badge>}
                  </TabsTrigger>
                ))}
              </div>
            ))}
          </TabsList>
        </aside>
        <main className="min-w-0 flex-1 space-y-6 pb-24 md:pb-0">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Paper trading and research only. Real broker orders are admin-only and switched off unless enabled in Desk controls. Not investment advice; data is unofficial and sourced from NSE/BSE.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Activity className={"h-4 w-4 " + (Object.keys(live).length ? "text-primary" : "")} />
            {Object.keys(live).length ? `Live NSE/BSE prices for ${Object.keys(live).length} symbols, updating every 30s` : "Live feed idle (market closed or connecting); using last close"}
            {lastSync && <> · Daily history synced {new Date(lastSync).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</>}
          </span>
          <Button size="sm" variant="outline" disabled={syncing} onClick={() => syncFeed(true)}>{syncing ? "Syncing..." : "Sync now"}</Button>
        </div>

        {(tab === "dashboard" || tab === "portfolio") && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Virtual Capital", inr(capital)], ["Current Value", inr(value)], ["Total Invested", inr(invested)], ["Available Cash", inr(cash)],
            ["Total Profit/Loss", inr(pnl)], ["Overall Return", pct((pnl / capital) * 100)], ["Open Positions", open.length], ["Closed Trades", closed.length],
          ].map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 text-xl font-bold text-foreground">{v}</div></CardContent></Card>
          ))}
        </div>}

          {!ctxs.length && tab !== "stocks" && <p className="text-sm text-muted-foreground">Preparing live NSE price history and indicators...</p>}
          {ctxs.length > 0 && LAB_TABS[tab] && <StrategyLab ctxs={ctxs} regime={regime} defs={defs} userId={userId} limits={controls} view={LAB_TABS[tab]} onUnread={setUnread} quiet onUniverseChange={() => loadAll(userId)} />}
          {ctxs.length > 0 && tab !== "alerts" && !LAB_TABS[tab] && <span className="hidden"><StrategyLab ctxs={ctxs} regime={regime} defs={defs} userId={userId} view="alerts" onUnread={setUnread} /></span>}

          <TabsContent value="dashboard" className="space-y-4">
            {today && regime && <MarketCard today={today} regime={regime} />}
            <div className="grid gap-3 md:grid-cols-3">{MENU.slice(1, 4).flatMap((g) => g.items).filter(([v]) => v !== "dashboard").map(([v, l, I, d]) => (
              <button key={v} onClick={() => setTab(v)} className="rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary">
                <div className="flex items-center gap-2 font-semibold text-foreground"><I className="h-4 w-4 text-primary" />{l}</div><div className="mt-1 text-xs text-muted-foreground">{d}</div></button>))}</div>
          </TabsContent>
          <TabsContent value="markets">{ctxs.length > 0 && <MarketView ctxs={ctxs} regime={regime} />}</TabsContent>
          <TabsContent value="scanner"><Scanner ctxs={ctxs} /></TabsContent>
          <TabsContent value="builder">{ctxs.length > 0 && <StrategyBuilder ctxs={ctxs} regime={regime} userId={userId} rows={customRows} onSaved={loadCustom} />}</TabsContent>
          <TabsContent value="robust">{ctxs.length > 0 && <RobustnessLab ctxs={ctxs} regime={regime} defs={defs} />}</TabsContent>
          <TabsContent value="livetest">{ctxs.length > 0 && <LiveTest ctxs={ctxs} regime={regime} defs={defs} onRealOrder={isAdmin ? (symbol, price) => setRealReq({ symbol, price }) : undefined} />}</TabsContent>
          <TabsContent value="comparison">{ctxs.length > 0 && <StrategyCompare ctxs={ctxs} regime={regime} defs={defs} />}</TabsContent>
          <TabsContent value="aicoach"><Leaderboard isAdmin={isAdmin} onStrategiesChanged={() => { loadAi(); loadCustom(); }} /></TabsContent>
          <TabsContent value="aibacktest">{ctxs.length > 0 && <AIvsCustom ctxs={ctxs} regime={regime} defs={defs} mode="backtest" />}</TabsContent>
          <TabsContent value="ailive">{ctxs.length > 0 && <AIvsCustom ctxs={ctxs} regime={regime} defs={defs} mode="live" />}</TabsContent>
          {isAdmin && <TabsContent value="realtrading"><RealTrading ctxs={ctxs} onOrder={setRealReq} /></TabsContent>}
          <TabsContent value="watchlists">{userId && <Watchlists ctxs={ctxs} userId={userId} />}</TabsContent>
          {isAdmin && <TabsContent value="controls"><AdminControls controls={controls} onSaved={loadControls} /></TabsContent>}
          <TabsContent value="tournament">{ctxs.length > 0 && <Tournament ctxs={ctxs} regime={regime} defs={defs} />}</TabsContent>

          <TabsContent value="stocks">
            <Terminal strategies={strategies} onPaperBuy={buy} onRealOrder={isAdmin ? (symbol, price) => setRealReq({ symbol, price }) : undefined} onQuote={(sym, px) => setTermPx((p) => ({ ...p, [sym]: px }))} />
          </TabsContent>

          <TabsContent value="compare" className="space-y-3">
            <h2 className="pt-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Simple rule strategies</h2>
            {isAdmin && <Button onClick={() => setEditing({ rule_type: "ma_cross", params: {} })}><Plus className="mr-1 h-4 w-4" />New strategy</Button>}
            {noData && <p className="text-sm text-muted-foreground">Fetching daily price history from NSE. This takes about 30 seconds on first load.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {strategies.map((s) => {
                const r = results[s.id]; const cur = signals.filter((x) => x.strategy.id === s.id && x.signal !== 0).length;
                const period = r?.equity.length ? `${r.equity[0].date} to ${r.equity.at(-1)!.date}` : "No data";
                return (
                  <Card key={s.id}>
                    <CardHeader className="pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">{s.name}</CardTitle><Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "Active" : "Inactive"}</Badge></div>
                      <p className="text-xs text-muted-foreground">{s.description}</p></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <Stat l="Trades" v={r?.trades.length ?? 0} /><Stat l="Win rate" v={(r?.winRate ?? 0).toFixed(0) + "%"} /><Stat l="Return" v={pct(r?.totalReturn ?? 0)} />
                        <Stat l="Max drawdown" v={"-" + (r?.maxDrawdown ?? 0).toFixed(1) + "%"} /><Stat l="Signals now" v={cur} /><Stat l="Updated" v={new Date(s.updated_at).toLocaleDateString("en-IN")} />
                      </div>
                      <div className="text-xs text-muted-foreground">Backtest period: {period}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewing(s)}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => { setResults((p) => ({ ...p, [s.id]: backtest(s.rule_type, s.params, liveBars) })); toast.success("Backtest complete"); }}><Play className="mr-1 h-3 w-3" />Run Backtest</Button>
                        {isAdmin && <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>}
                        {isAdmin && <Button size="sm" variant="outline" onClick={() => toggle(s)}><Power className="mr-1 h-3 w-3" />{s.is_active ? "Deactivate" : "Activate"}</Button>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="signals">
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead>Strategy</TableHead><TableHead>Signal</TableHead><TableHead>Price</TableHead><TableHead>As of</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {signals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No signals yet</TableCell></TableRow>}
                  {signals.sort((a, b) => Math.abs(b.signal) - Math.abs(a.signal)).map((x) => (
                    <TableRow key={x.strategy.id + x.symbol}>
                      <TableCell className="font-semibold">{x.symbol}</TableCell><TableCell>{x.strategy.name}</TableCell>
                      <TableCell><SignalBadge s={x.signal} /></TableCell><TableCell>{inr(x.price)}{live[x.symbol] && <span className="ml-1 text-xs text-primary">live</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{x.date}</TableCell>
                      <TableCell>{x.signal === 1 && <Button size="sm" onClick={() => buy(x.symbol, x.strategy.id, x.price)}>Paper buy</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead>Strategy</TableHead><TableHead>Qty</TableHead><TableHead>Entry</TableHead><TableHead>Current / Exit</TableHead><TableHead>P&L</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {trades.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No virtual trades yet. Paper-buy from the Signals tab.</TableCell></TableRow>}
                  {trades.map((t) => {
                    const px = t.status === "open" ? (priceOf(t.symbol) || t.entry_price) : t.exit_price ?? 0; const p = (px - t.entry_price) * t.quantity;
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-semibold">{t.symbol}</TableCell><TableCell className="text-xs">{stratName(t.strategy_id)}</TableCell><TableCell>{t.quantity}</TableCell>
                        <TableCell>{inr(t.entry_price)}<div className="text-xs text-muted-foreground">{t.entry_date}</div></TableCell>
                        <TableCell>{inr(px)}<div className="text-xs text-muted-foreground">{t.status === "open" ? "open" : t.exit_date}</div></TableCell>
                        <TableCell className={p >= 0 ? "text-primary font-semibold" : "text-destructive font-semibold"}>{inr(p)}</TableCell>
                        <TableCell>{t.status === "open" && <Button size="sm" variant="outline" onClick={() => sell(t)}>Close</Button>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody></Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="compare">
            <Card className="mt-3"><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Strategy</TableHead><TableHead>Trades</TableHead><TableHead>Win rate</TableHead><TableHead>Return</TableHead><TableHead>Max drawdown</TableHead><TableHead>Final value</TableHead></TableRow></TableHeader>
                <TableBody>{[...strategies].sort((a, b) => (results[b.id]?.totalReturn ?? 0) - (results[a.id]?.totalReturn ?? 0)).map((s) => { const r = results[s.id]; return (
                  <TableRow key={s.id}><TableCell className="font-semibold">{s.name}</TableCell><TableCell>{r?.trades.length ?? 0}</TableCell><TableCell>{(r?.winRate ?? 0).toFixed(0)}%</TableCell><TableCell>{pct(r?.totalReturn ?? 0)}</TableCell><TableCell>-{(r?.maxDrawdown ?? 0).toFixed(1)}%</TableCell><TableCell>{inr(r?.finalValue ?? 50000)}</TableCell></TableRow>
                ); })}</TableBody></Table>
            </CardContent></Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="data">
              <Card><CardContent className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">Upload daily price history as CSV with columns: <code>symbol,date,open,high,low,close,volume</code>. Existing dates are updated.</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <Upload className="h-4 w-4" /> Choose CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCsv(e.target.files[0])} />
                </label>
                <div className="flex flex-wrap gap-2">{Object.entries(bars).map(([s, b]) => <Badge key={s} variant="outline">{s} · {b.length} days</Badge>)}</div>
                <p className="text-xs text-muted-foreground">Live NSE/BSE prices from the existing market feed are used automatically for current value and signal prices when a symbol matches.</p>
              </CardContent></Card>
            </TabsContent>
          )}
        </main>
      </Tabs>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{viewing?.name}</DialogTitle></DialogHeader>
          {viewing && (() => { const r = results[viewing.id]; return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{viewing.description}</p>
              <div className="flex flex-wrap gap-2">{Object.entries(viewing.params ?? {}).map(([k, v]) => <Badge key={k} variant="secondary">{k}: {String(v)}</Badge>)}</div>
              <div className="h-56">{r?.equity.length ? (
                <ResponsiveContainer><LineChart data={r.equity}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" hide /><YAxis width={70} tickFormatter={(v) => inr(v)} /><Tooltip formatter={(v: number) => inr(v)} /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><Activity className="mr-2 h-4 w-4" />No price history to backtest</div>}</div>
              <div className="max-h-56 overflow-auto"><Table><TableHeader><TableRow><TableHead>Symbol</TableHead><TableHead>Entry</TableHead><TableHead>Exit</TableHead><TableHead>P&L</TableHead></TableRow></TableHeader>
                <TableBody>{r?.trades.map((t, i) => <TableRow key={i}><TableCell>{t.symbol}</TableCell><TableCell>{t.entryDate} @ {t.entry.toFixed(2)}</TableCell><TableCell>{t.open ? "open" : `${t.exitDate} @ ${t.exit.toFixed(2)}`}</TableCell><TableCell className={t.pnl >= 0 ? "text-primary" : "text-destructive"}>{inr(t.pnl)}</TableCell></TableRow>)}</TableBody></Table></div>
            </div>
          ); })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit strategy" : "New strategy"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Rule</Label>
                <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editing.rule_type} onChange={(e) => setEditing({ ...editing, rule_type: e.target.value, params: {} })}>
                  {Object.entries(RULES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-2">{RULES[editing.rule_type!]?.params.map((p) => (
                <div key={p.key}><Label>{p.label}</Label><Input type="number" step="any" value={editing.params?.[p.key] ?? p.default} onChange={(e) => setEditing({ ...editing, params: { ...editing.params, [p.key]: Number(e.target.value) } })} /></div>
              ))}</div>
              <Button className="w-full" onClick={saveStrategy}><Wallet className="mr-1 h-4 w-4" />Save strategy</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: React.ReactNode }) {
  return <div className="rounded-md bg-muted/60 p-2"><div className="text-[10px] uppercase text-muted-foreground">{l}</div><div className="font-semibold text-foreground">{v}</div></div>;
}
function SignalBadge({ s }: { s: number }) {
  if (s === 1) return <Badge className="gap-1"><ArrowUpRight className="h-3 w-3" />Buy</Badge>;
  if (s === -1) return <Badge variant="destructive" className="gap-1"><ArrowDownRight className="h-3 w-3" />Sell</Badge>;
  return <Badge variant="outline" className="gap-1"><Minus className="h-3 w-3" />Hold</Badge>;
}

const LAB_TABS: Record<string, LabView> = { strategies: "live", backtest: "lab", alerts: "alerts", performance: "board", regime: "market" };
const MENU: { group: string; items: [string, string, any, string][] }[] = [
  { group: "Overview", items: [["dashboard", "Dashboard", LayoutDashboard, ""]] },
  { group: "Market", items: [["markets", "Markets and sectors", Globe2, "Breadth, advances/declines, sector strength"], ["stocks", "Stock terminal", LineIcon, "Live charts with 20+ indicators"], ["scanner", "Scanner", ScanSearch, "Find stocks matching any rule"], ["watchlists", "Watchlists", Star, "Your saved stock lists"]] },
  { group: "Strategies", items: [["strategies", "Auto-trading", Bot, "Run strategies live from any date"], ["builder", "Strategy builder", Wrench, "Create versioned strategies without code"], ["aicoach", "AI dashboard", Sparkles, "AI analysis, faults, changes and approvals"], ["performance", "Leaderboard", Trophy, "All strategies ranked"]] },
  { group: "Research", items: [["backtest", "Backtest and report", FlaskConical, "Any amount, any start date, full report"], ["robust", "Robustness tests", SplitSquareHorizontal, "Out-of-sample and reshuffle tests"], ["livetest", "Live test (top 5)", Radio, "Top 5 strategies up to today, plus today's signals"], ["aibacktest", "AI vs custom backtest", FlaskConical, "AI strategies against yours"], ["ailive", "AI vs custom live test", Radio, "AI vs yours up to today"], ["comparison", "Timeframe comparison", GitCompareArrows, "Rank strategies across periods"], ["tournament", "Tournament", Swords, "Same conditions, robustness score"], ["regime", "Market regime", Gauge, "Bull, sideways or bear; stocks scanned"]] },
  { group: "Trading", items: [["signals", "Paper signals", ListChecks, ""], ["portfolio", "Portfolio", Wallet, ""], ["alerts", "Alerts", Bell, ""], ["compare", "Rule comparison", GitCompare, ""]] },
  { group: "Admin", items: [["realtrading", "Real trading", ShieldAlert, ""], ["controls", "Desk controls", ShieldCheck, ""], ["data", "Price data", Upload, ""]] },
];

const MOBILE_TABS: [string, string, any][] = [["dashboard", "Home", LayoutDashboard], ["stocks", "Terminal", LineIcon], ["aicoach", "AI", Sparkles], ["strategies", "Auto", Bot]];
