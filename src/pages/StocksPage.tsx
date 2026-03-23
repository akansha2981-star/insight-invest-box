import { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { GainersLosers } from "@/components/GainersLosers";
import { Footer } from "@/components/Footer";
import { PageSectionsBanner } from "@/components/PageSectionsBanner";
import { TOP_GAINERS, TOP_LOSERS, getFluctuatedPrice } from "@/data/mockStocks";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Search, ArrowUp, ArrowDown, BarChart2,
  SlidersHorizontal, ChevronDown, X, RefreshCw, Sparkles, Lock,
  Loader2, Brain, Shield, Activity, Target, AlertTriangle, Lightbulb, Clock
} from "lucide-react";

const SECTOR_CHART_DEFAULT = [
  { name: "IT", change: 1.84 },
  { name: "Banking", change: -0.42 },
  { name: "Pharma", change: 0.95 },
  { name: "Auto", change: 1.12 },
  { name: "FMCG", change: -0.28 },
  { name: "Realty", change: 2.34 },
  { name: "Energy", change: -0.67 },
  { name: "Metal", change: 0.73 },
];

const ALL_STOCKS = [...TOP_GAINERS, ...TOP_LOSERS];

const SECTOR_OPTIONS = ["All", "IT", "Banking", "Pharma", "Auto", "FMCG", "Energy", "Finance", "Infra", "Telecom", "Realty", "Metal"];
const CHANGE_OPTIONS = ["All", "Gainers", "Losers"];
const RATING_OPTIONS = ["All", "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];

const FIFTY_TWO_WEEK_HIGH_DEFAULT = [
  { symbol: "RELIANCE", price: "₹2,941" },
  { symbol: "INFY", price: "₹1,847" },
  { symbol: "MARUTI", price: "₹11,842" },
  { symbol: "SUNPHARMA", price: "₹1,342" },
  { symbol: "LT", price: "₹3,814" },
];

const FIFTY_TWO_WEEK_LOW_DEFAULT = [
  { symbol: "PAYTM", price: "₹348" },
  { symbol: "ZOMATO", price: "₹112" },
  { symbol: "NYKAA", price: "₹142" },
  { symbol: "POLICYBAZAAR", price: "₹487" },
  { symbol: "DELHIVERY", price: "₹365" },
];

/* ── Helpers ── */
function canUseToday(key: string): boolean {
  const last = localStorage.getItem(key);
  if (!last) return true;
  const today = new Date().toISOString().split("T")[0];
  return last !== today;
}

function markUsedToday(key: string) {
  localStorage.setItem(key, new Date().toISOString().split("T")[0]);
}

function SectionHeading({ icon: Icon, title }: { icon?: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 bg-loss rounded-full" />
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="font-bold text-base text-foreground">{title}</h2>
    </div>
  );
}

function FilterDropdown({
  label, value, options, onChange
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
          value !== "All"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-white border-border text-foreground hover:bg-muted"
        }`}
      >
        <span className="text-xs font-semibold">{label}: {value}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-border rounded-xl shadow-lg z-50 min-w-[150px] py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                value === opt
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sentiment Badge ── */
function SentimentBadge({ sentiment, score }: { sentiment: string; score: number }) {
  const color = sentiment.includes("Bull") ? "text-gain bg-gain/10 border-gain/30"
    : sentiment.includes("Bear") ? "text-loss bg-loss/10 border-loss/30"
    : "text-amber-600 bg-amber-50 border-amber-200";
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${color}`}>
      <Activity className="h-4 w-4" />
      {sentiment} · {score}/100
    </div>
  );
}

/* ══════════════════════════════
   MAIN PAGE
══════════════════════════════ */
export default function StocksPage() {
  const [stocks, setStocks] = useState(ALL_STOCKS);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [changeFilter, setChangeFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [reviewData, setReviewData] = useState<Record<string, { symbol: string; rating: string }>>({});
  const [sectorChart, setSectorChart] = useState(SECTOR_CHART_DEFAULT);
  const [w52High, setW52High] = useState(FIFTY_TWO_WEEK_HIGH_DEFAULT);
  const [w52Low, setW52Low] = useState(FIFTY_TWO_WEEK_LOW_DEFAULT);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Auth state
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // AI states
  const [refreshing, setRefreshing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    supabase
      .from("stock_reviews" as any)
      .select("symbol, rating")
      .eq("status", "published")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { symbol: string; rating: string }> = {};
          (data as any[]).forEach(r => { map[r.symbol] = r; });
          setReviewData(map);
        }
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setStocks(prev => prev.map(s => {
        const updated = getFluctuatedPrice(s.price, s.change);
        return { ...s, ...updated };
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const activeFilters = [sectorFilter, changeFilter, ratingFilter].filter(f => f !== "All").length;

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      const matchSearch = !search || s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase());
      const matchSector = sectorFilter === "All" || s.sector === sectorFilter;
      const matchChange = changeFilter === "All" || (changeFilter === "Gainers" ? s.change >= 0 : s.change < 0);
      const review = reviewData[s.symbol];
      const matchRating = ratingFilter === "All" || (review && review.rating?.toLowerCase() === ratingFilter.toLowerCase());
      return matchSearch && matchSector && matchChange && matchRating;
    });
  }, [stocks, search, sectorFilter, changeFilter, ratingFilter, reviewData]);

  function clearFilters() {
    setSectorFilter("All");
    setChangeFilter("All");
    setRatingFilter("All");
    setSearch("");
  }

  /* ── AI Refresh ── */
  async function handleAIRefresh() {
    if (!user) return;
    if (!canUseToday("iq_stock_refresh")) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-stock-refresh", {
        body: { action: "refresh", stocksData: stocks.slice(0, 40) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.stocks?.length) {
        setStocks(data.stocks);
      }
      if (data?.sectorPerformance?.length) {
        setSectorChart(data.sectorPerformance);
      }
      if (data?.fiftyTwoWeekHigh?.length) {
        setW52High(data.fiftyTwoWeekHigh);
      }
      if (data?.fiftyTwoWeekLow?.length) {
        setW52Low(data.fiftyTwoWeekLow);
      }
      setLastUpdated(data?.lastUpdated || new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
      markUsedToday("iq_stock_refresh");
    } catch (e) {
      console.error("AI Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }

  /* ── AI Summary ── */
  async function handleAISummary() {
    if (!user) return;
    if (!canUseToday("iq_stock_summary")) return;
    setSummarizing(true);
    setShowSummary(true);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-stock-refresh", {
        body: { action: "summary", stocksData: stocks.slice(0, 20) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data);
      markUsedToday("iq_stock_summary");
    } catch (e) {
      console.error("AI Summary error:", e);
      setSummary({ error: true });
    } finally {
      setSummarizing(false);
    }
  }

  const canRefresh = user && canUseToday("iq_stock_refresh");
  const canSummarize = user && canUseToday("iq_stock_summary");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        <PageSectionsBanner pageKey="stocks" />

        {/* Title + AI Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stocks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gainers · Losers · 52W Highs/Lows · Screener
              {lastUpdated && (
                <span className="ml-2 text-xs text-primary font-medium">
                  · Last AI Refresh: {lastUpdated}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Refresh Button */}
            {!user ? (
              <Link to="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                <Lock className="h-4 w-4" /> Login for AI Refresh
              </Link>
            ) : (
              <button
                onClick={handleAIRefresh}
                disabled={refreshing || !canRefresh}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  canRefresh
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
                title={!canRefresh ? "You've already used AI Refresh today. Come back tomorrow!" : "Refresh all stock data with AI"}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {refreshing ? "Refreshing..." : !canRefresh ? "Refreshed Today" : "AI Refresh"}
              </button>
            )}

            {/* AI Summary Button */}
            {!user ? (
              <Link to="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors">
                <Lock className="h-4 w-4" /> Login for AI Summary
              </Link>
            ) : (
              <button
                onClick={handleAISummary}
                disabled={summarizing || !canSummarize}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  canSummarize
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-violet-600/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
                title={!canSummarize ? "You've already used AI Summary today. Come back tomorrow!" : "Get AI analysis of all market data"}
              >
                {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {summarizing ? "Analyzing..." : !canSummarize ? "Summarized Today" : "AI Market Summary"}
              </button>
            )}
          </div>
        </div>

        {/* ═══ AI MARKET SUMMARY PANEL ═══ */}
        {showSummary && (
          <section className="relative">
            <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-6 sm:p-8 text-white border border-white/10 shadow-xl">
              <button onClick={() => setShowSummary(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-lg">AI Market Intelligence</h2>
                  <p className="text-white/40 text-xs">Powered by InvestingIQ AI · {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              {summarizing ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    <Sparkles className="h-6 w-6 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 font-medium">AI is analyzing market data...</p>
                    <p className="text-white/30 text-xs mt-1">Reading {stocks.length} stocks, sector data, and market indicators</p>
                  </div>
                </div>
              ) : summary?.error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="text-white/70">AI analysis temporarily unavailable. Please try again later.</p>
                </div>
              ) : summary ? (
                <div className="space-y-6">
                  {/* Sentiment + Overview */}
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <SentimentBadge sentiment={summary.sentiment} score={summary.sentimentScore || 50} />
                    <p className="text-white/70 text-sm leading-relaxed flex-1">{summary.overview}</p>
                  </div>

                  {/* Key Levels */}
                  {summary.keyLevels && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Nifty Support", value: summary.keyLevels.niftySupport },
                        { label: "Nifty Resistance", value: summary.keyLevels.niftyResistance },
                        { label: "Sensex Support", value: summary.keyLevels.sensexSupport },
                        { label: "Sensex Resistance", value: summary.keyLevels.sensexResistance },
                      ].filter(l => l.value).map(level => (
                        <div key={level.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                          <div className="text-[10px] text-white/40 font-bold uppercase tracking-wide">{level.label}</div>
                          <div className="number-font text-lg font-black text-white mt-1">{level.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Analysis Sections */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: TrendingUp, title: "Top Sectors", content: summary.topSectors, color: "from-emerald-500/20 to-emerald-500/5" },
                      { icon: Activity, title: "Key Movers", content: summary.keyMovers, color: "from-blue-500/20 to-blue-500/5" },
                      { icon: Target, title: "Technical Outlook", content: summary.technicalOutlook, color: "from-amber-500/20 to-amber-500/5" },
                      { icon: Shield, title: "FII/DII Activity", content: summary.fiiDiiActivity, color: "from-cyan-500/20 to-cyan-500/5" },
                      { icon: AlertTriangle, title: "Risk Factors", content: summary.riskFactors, color: "from-red-500/20 to-red-500/5" },
                      { icon: Lightbulb, title: "Investment Strategy", content: summary.investmentStrategy, color: "from-violet-500/20 to-violet-500/5" },
                    ].filter(s => s.content).map(section => (
                      <div key={section.title} className={`bg-gradient-to-br ${section.color} border border-white/10 rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          <section.icon className="h-4 w-4 text-white/60" />
                          <h3 className="font-bold text-sm text-white">{section.title}</h3>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed">{section.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Disclaimer */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-white/30 text-[10px]">
                      This AI-generated analysis is for informational purposes only and does not constitute investment advice.
                      Always consult a SEBI-registered financial advisor before making investment decisions. Data may not reflect real-time market conditions.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Search + Screener filters */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Stock Screener</span>
            {activeFilters > 0 && (
              <span className="text-[10px] bg-primary text-white rounded-full px-2 py-0.5 font-bold">{activeFilters} active</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search symbol or company..."
                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>

            <FilterDropdown label="Sector" value={sectorFilter} options={SECTOR_OPTIONS} onChange={setSectorFilter} />
            <FilterDropdown label="Direction" value={changeFilter} options={CHANGE_OPTIONS} onChange={setChangeFilter} />
            <FilterDropdown label="Rating" value={ratingFilter} options={RATING_OPTIONS} onChange={setRatingFilter} />

            {activeFilters > 0 && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted">
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of {stocks.length} stocks
            {ratingFilter !== "All" && (
              <span className="ml-2 text-primary font-medium">· Filtered by review rating: <span className="font-bold">{ratingFilter}</span></span>
            )}
          </div>
        </div>

        {/* Sector Chart */}
        <section>
          <SectionHeading title="Sector Performance" />
          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectorChart} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Change"]} />
                <Bar dataKey="change" radius={[4, 4, 0, 0]}
                  onClick={(d) => setSectorFilter(d.name === sectorFilter ? "All" : d.name)}
                  style={{ cursor: "pointer" }}>
                  {sectorChart.map((s, i) => (
                    <Cell key={i}
                      fill={s.change >= 0 ? "hsl(var(--gain))" : "hsl(var(--loss))"}
                      opacity={sectorFilter === "All" || sectorFilter === s.name ? 1 : 0.35} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Click a bar to filter stocks by sector</p>
          </div>
        </section>

        {/* Gainers & Losers */}
        <section>
          <SectionHeading icon={TrendingUp} title="Top Gainers & Losers" />
          <GainersLosers />
        </section>

        {/* Stock Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeading title="All Stocks" />
          </div>
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No stocks match your filters</p>
                <button onClick={clearFilters} className="mt-2 text-sm text-primary hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      {["Symbol", "Company", "Price", "Change", "% Change", "Volume", "Sector", "Rating", "Analysis"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((stock) => {
                      const review = reviewData[stock.symbol];
                      return (
                        <tr key={stock.symbol} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-foreground">{stock.symbol}</span>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground max-w-[160px] truncate">{stock.name}</td>
                          <td className="px-5 py-3.5 number-font font-semibold text-foreground">
                            ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-5 py-3.5 number-font font-bold ${stock.change >= 0 ? "text-gain" : "text-loss"}`}>
                            {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`flex items-center gap-0.5 text-xs font-bold ${stock.changePercent >= 0 ? "text-gain" : "text-loss"}`}>
                              {stock.changePercent >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {Math.abs(stock.changePercent).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">{stock.volume}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">{stock.sector}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            {review ? (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                review.rating?.includes("BUY") ? "badge-gain" :
                                review.rating?.includes("SELL") ? "badge-loss" : "badge-neutral"
                              }`}>{review.rating}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {review && (
                              <Link
                                to={`/stocks/review/${stock.symbol.toLowerCase()}`}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors whitespace-nowrap"
                              >
                                <BarChart2 className="h-3 w-3" />
                                View Analysis
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* 52-week highs & lows */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gain" />
              <span className="font-bold text-sm text-foreground">52-Week Highs</span>
            </div>
            <div className="divide-y divide-border">
              {w52High.map((s) => (
                <div key={s.symbol} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <span className="font-bold text-foreground">{s.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="number-font text-sm font-semibold">{s.price}</span>
                    <span className="text-xs text-gain font-bold badge-gain px-2 py-0.5 rounded">ATH</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-loss" />
              <span className="font-bold text-sm text-foreground">52-Week Lows</span>
            </div>
            <div className="divide-y divide-border">
              {w52Low.map((s) => (
                <div key={s.symbol} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <span className="font-bold text-foreground">{s.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="number-font text-sm font-semibold">{s.price}</span>
                    <span className="text-xs text-loss font-bold badge-loss px-2 py-0.5 rounded">52L</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
