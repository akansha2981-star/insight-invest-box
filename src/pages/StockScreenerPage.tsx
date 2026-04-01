import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import {
  Search, ArrowUp, ArrowDown, Filter, SlidersHorizontal,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, BarChart3,
  Star, Target, Percent, Building2, Activity, X
} from "lucide-react";
import { Link } from "react-router-dom";

const MOCK_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", industry: "Oil & Gas Refining", price: 1442, change: 1.2, pe: 28.4, mcap: 1950000, mcapDisplay: "₹19.5L Cr", rating: "BUY", divYield: 0.35, eps: 50.8, high52: 1608, low52: 1220, beta: 0.92, roe: 9.8, debtToEquity: 0.38, pb: 2.5, volume: 12500000 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", industry: "IT Services", price: 2695, change: -0.4, pe: 32.1, mcap: 980000, mcapDisplay: "₹9.8L Cr", rating: "HOLD", divYield: 1.25, eps: 83.9, high52: 2850, low52: 2180, beta: 0.65, roe: 48.2, debtToEquity: 0.04, pb: 14.8, volume: 3200000 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", industry: "Private Banking", price: 1712, change: 0.8, pe: 21.3, mcap: 1290000, mcapDisplay: "₹12.9L Cr", rating: "BUY", divYield: 1.1, eps: 80.4, high52: 1880, low52: 1460, beta: 0.85, roe: 16.4, debtToEquity: 0, pb: 3.2, volume: 8900000 },
  { symbol: "INFY", name: "Infosys", sector: "IT", industry: "IT Services", price: 1854, change: -1.1, pe: 29.8, mcap: 770000, mcapDisplay: "₹7.7L Cr", rating: "HOLD", divYield: 2.1, eps: 62.2, high52: 1990, low52: 1380, beta: 0.72, roe: 31.5, debtToEquity: 0.06, pb: 8.9, volume: 6100000 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", industry: "Private Banking", price: 1408, change: 1.5, pe: 18.6, mcap: 990000, mcapDisplay: "₹9.9L Cr", rating: "BUY", divYield: 0.8, eps: 75.7, high52: 1520, low52: 980, beta: 0.95, roe: 17.2, debtToEquity: 0, pb: 3.5, volume: 9500000 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", industry: "Personal Products", price: 2340, change: -0.3, pe: 54.2, mcap: 550000, mcapDisplay: "₹5.5L Cr", rating: "HOLD", divYield: 1.7, eps: 43.2, high52: 2860, low52: 2172, beta: 0.45, roe: 20.1, debtToEquity: 0, pb: 10.5, volume: 2100000 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", industry: "Public Banking", price: 812, change: 2.1, pe: 9.8, mcap: 720000, mcapDisplay: "₹7.2L Cr", rating: "BUY", divYield: 1.6, eps: 82.9, high52: 912, low52: 600, beta: 1.18, roe: 20.5, debtToEquity: 0, pb: 1.9, volume: 18000000 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", industry: "Telecom Services", price: 1685, change: 0.6, pe: 76.4, mcap: 950000, mcapDisplay: "₹9.5L Cr", rating: "BUY", divYield: 0.5, eps: 22.1, high52: 1780, low52: 1200, beta: 0.62, roe: 15.8, debtToEquity: 1.45, pb: 8.2, volume: 4500000 },
  { symbol: "ITC", name: "ITC Limited", sector: "FMCG", industry: "Tobacco & FMCG", price: 458, change: -0.7, pe: 26.8, mcap: 570000, mcapDisplay: "₹5.7L Cr", rating: "HOLD", divYield: 3.2, eps: 17.1, high52: 510, low52: 398, beta: 0.58, roe: 27.6, debtToEquity: 0, pb: 7.4, volume: 11000000 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", industry: "Private Banking", price: 1876, change: 0.3, pe: 22.4, mcap: 370000, mcapDisplay: "₹3.7L Cr", rating: "HOLD", divYield: 0.1, eps: 83.7, high52: 2065, low52: 1650, beta: 0.78, roe: 14.1, debtToEquity: 0, pb: 3.1, volume: 3800000 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", industry: "Pharmaceuticals", price: 1862, change: 1.8, pe: 38.5, mcap: 450000, mcapDisplay: "₹4.5L Cr", rating: "BUY", divYield: 0.6, eps: 48.4, high52: 1960, low52: 1210, beta: 0.55, roe: 15.3, debtToEquity: 0.12, pb: 5.8, volume: 3400000 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", industry: "Automobile", price: 748, change: 2.4, pe: 8.2, mcap: 270000, mcapDisplay: "₹2.7L Cr", rating: "BUY", divYield: 0.4, eps: 91.2, high52: 1050, low52: 620, beta: 1.45, roe: 28.9, debtToEquity: 0.98, pb: 3.8, volume: 14000000 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", industry: "Automobile", price: 12450, change: -0.5, pe: 34.6, mcap: 390000, mcapDisplay: "₹3.9L Cr", rating: "HOLD", divYield: 0.7, eps: 359.8, high52: 13680, low52: 10200, beta: 0.82, roe: 14.6, debtToEquity: 0, pb: 5.2, volume: 950000 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infra", industry: "Engineering & Construction", price: 3542, change: 0.9, pe: 35.8, mcap: 490000, mcapDisplay: "₹4.9L Cr", rating: "BUY", divYield: 0.8, eps: 98.9, high52: 3850, low52: 2920, beta: 1.05, roe: 14.2, debtToEquity: 1.22, pb: 5.6, volume: 2800000 },
  { symbol: "WIPRO", name: "Wipro Limited", sector: "IT", industry: "IT Services", price: 298, change: -1.8, pe: 24.6, mcap: 160000, mcapDisplay: "₹1.6L Cr", rating: "SELL", divYield: 0.3, eps: 12.1, high52: 320, low52: 208, beta: 0.88, roe: 14.8, debtToEquity: 0.18, pb: 3.6, volume: 7200000 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "FMCG", industry: "Paints & Coatings", price: 2820, change: -1.4, pe: 58.7, mcap: 270000, mcapDisplay: "₹2.7L Cr", rating: "HOLD", divYield: 1.1, eps: 48.0, high52: 3420, low52: 2670, beta: 0.68, roe: 26.8, debtToEquity: 0.08, pb: 15.2, volume: 1800000 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", industry: "Diversified", price: 2950, change: 3.1, pe: 85.2, mcap: 340000, mcapDisplay: "₹3.4L Cr", rating: "HOLD", divYield: 0.05, eps: 34.6, high52: 3740, low52: 2140, beta: 1.65, roe: 8.2, debtToEquity: 1.12, pb: 7.8, volume: 8500000 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance", industry: "NBFC", price: 6890, change: 1.1, pe: 30.2, mcap: 425000, mcapDisplay: "₹4.25L Cr", rating: "BUY", divYield: 0.4, eps: 228.1, high52: 8192, low52: 6188, beta: 1.25, roe: 22.4, debtToEquity: 3.2, pb: 6.5, volume: 2200000 },
  { symbol: "NESTLEIND", name: "Nestlé India", sector: "FMCG", industry: "Packaged Foods", price: 2410, change: 0.2, pe: 72.5, mcap: 232000, mcapDisplay: "₹2.32L Cr", rating: "HOLD", divYield: 1.5, eps: 33.2, high52: 2770, low52: 2210, beta: 0.35, roe: 108.5, debtToEquity: 0, pb: 72.1, volume: 420000 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Labs", sector: "Pharma", industry: "Pharmaceuticals", price: 6540, change: 0.7, pe: 22.8, mcap: 108000, mcapDisplay: "₹1.08L Cr", rating: "BUY", divYield: 0.6, eps: 286.8, high52: 6890, low52: 5220, beta: 0.42, roe: 18.9, debtToEquity: 0.05, pb: 4.2, volume: 680000 },
];

const SECTORS = ["All", "Banking", "IT", "FMCG", "Energy", "Pharma", "Auto", "Infra", "Telecom", "Finance", "Conglomerate"];
const RATINGS = ["All", "BUY", "HOLD", "SELL"];

type SortKey = "change" | "pe" | "price" | "mcap" | "divYield" | "roe" | "beta" | "pb";

const MCAP_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Large Cap (>₹5L Cr)", min: 500000, max: Infinity },
  { label: "Mid Cap (₹1L-5L Cr)", min: 100000, max: 500000 },
  { label: "Small Cap (<₹1L Cr)", min: 0, max: 100000 },
];

const PE_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Under 15", min: 0, max: 15 },
  { label: "15 - 25", min: 15, max: 25 },
  { label: "25 - 40", min: 25, max: 40 },
  { label: "Above 40", min: 40, max: Infinity },
];

const DIV_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "> 2%", min: 2, max: Infinity },
  { label: "1% - 2%", min: 1, max: 2 },
  { label: "< 1%", min: 0, max: 1 },
];

function formatMcap(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L Cr`;
  return `₹${(v / 1000).toFixed(0)}K Cr`;
}

function pctFrom52Low(price: number, low52: number) {
  return ((price - low52) / low52 * 100).toFixed(1);
}

function pctFrom52High(price: number, high52: number) {
  return ((price - high52) / high52 * 100).toFixed(1);
}

export default function StockScreenerPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [rating, setRating] = useState("All");
  const [mcapIdx, setMcapIdx] = useState(0);
  const [peIdx, setPeIdx] = useState(0);
  const [divIdx, setDivIdx] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("mcap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = [
    sector !== "All" ? 1 : 0,
    rating !== "All" ? 1 : 0,
    mcapIdx !== 0 ? 1 : 0,
    peIdx !== 0 ? 1 : 0,
    divIdx !== 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const filtered = useMemo(() => {
    const mcap = MCAP_RANGES[mcapIdx];
    const pe = PE_RANGES[peIdx];
    const div = DIV_RANGES[divIdx];

    return MOCK_STOCKS
      .filter(s => {
        if (query && !s.symbol.toLowerCase().includes(query.toLowerCase()) && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (sector !== "All" && s.sector !== sector) return false;
        if (rating !== "All" && s.rating !== rating) return false;
        if (s.mcap < mcap.min || s.mcap >= mcap.max) return false;
        if (s.pe < pe.min || s.pe >= pe.max) return false;
        if (s.divYield < div.min || s.divYield >= div.max) return false;
        return true;
      })
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        return ((a[sortBy] as number) - (b[sortBy] as number)) * mul;
      });
  }, [query, sector, rating, mcapIdx, peIdx, divIdx, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  }

  function clearFilters() {
    setQuery(""); setSector("All"); setRating("All"); setMcapIdx(0); setPeIdx(0); setDivIdx(0);
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ChevronDown className="h-3 w-3 opacity-30 inline ml-0.5" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-primary inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 text-primary inline ml-0.5" />;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Stock Screener – InsightInvest",
    description: "Advanced stock screening tool with filters for market cap, P/E ratio, dividend yield, 52-week range and more.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>Stock Screener – Filter & Discover Stocks | InsightInvest</title>
        <meta name="description" content="Screen Indian stocks with advanced filters for market cap, P/E ratio, dividend yield, 52-week performance, ROE, beta and analyst ratings. Free stock screener tool." />
        <link rel="canonical" href="https://insight-invest-box.lovable.app/tools/screener" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Header />
      <main className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(221,75%,32%)] to-[hsl(250,60%,28%)] text-white p-8 md:p-10 mb-8">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Stock Screener</h1>
                <p className="text-sm text-white/70">Filter, sort & discover winning stocks across NSE & BSE</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-5 text-xs text-white/60">
              <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {MOCK_STOCKS.length} Stocks</span>
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {SECTORS.length - 1} Sectors</span>
              <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Real-time Data</span>
            </div>
          </div>
        </div>

        {/* Search + Quick Filters */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-card mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by stock name or symbol..."
                className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                showAdvanced || activeFilterCount > 0
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-white/20 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">{activeFilterCount}</span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-2.5 rounded-lg text-xs font-semibold text-loss border border-loss/20 bg-loss/5 hover:bg-loss/10 transition-colors">
                <X className="h-3 w-3" /> Clear All
              </button>
            )}
          </div>

          {/* Sector pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {SECTORS.map(s => (
              <button key={s} onClick={() => setSector(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  sector === s ? "bg-primary text-white border-primary shadow-sm" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card mb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Market Cap */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
                  <Building2 className="h-3 w-3" /> Market Cap
                </label>
                <div className="space-y-1">
                  {MCAP_RANGES.map((r, i) => (
                    <button key={r.label} onClick={() => setMcapIdx(i)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        mcapIdx === i ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted text-muted-foreground"
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>

              {/* P/E Ratio */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
                  <Target className="h-3 w-3" /> P/E Ratio
                </label>
                <div className="space-y-1">
                  {PE_RANGES.map((r, i) => (
                    <button key={r.label} onClick={() => setPeIdx(i)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        peIdx === i ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted text-muted-foreground"
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>

              {/* Dividend Yield */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
                  <Percent className="h-3 w-3" /> Dividend Yield
                </label>
                <div className="space-y-1">
                  {DIV_RANGES.map((r, i) => (
                    <button key={r.label} onClick={() => setDivIdx(i)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        divIdx === i ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted text-muted-foreground"
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
                  <Star className="h-3 w-3" /> Analyst Rating
                </label>
                <div className="space-y-1">
                  {RATINGS.map(r => (
                    <button key={r} onClick={() => setRating(r)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        rating === r
                          ? r === "BUY" ? "bg-[hsl(var(--gain))]/10 text-[hsl(var(--gain))] border border-[hsl(var(--gain))]/20"
                            : r === "SELL" ? "bg-[hsl(var(--loss))]/10 text-[hsl(var(--loss))] border border-[hsl(var(--loss))]/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-muted text-muted-foreground"
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-muted-foreground font-medium">
            Showing <span className="text-foreground font-bold">{filtered.length}</span> of {MOCK_STOCKS.length} stocks
          </p>
          <p className="text-[10px] text-muted-foreground">Click column headers to sort</p>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/50 z-10">Stock</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sector</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("price")}>
                    Price <SortIcon col="price" />
                  </th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("change")}>
                    Chg% <SortIcon col="change" />
                  </th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("mcap")}>
                    MCap <SortIcon col="mcap" />
                  </th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("pe")}>
                    P/E <SortIcon col="pe" />
                  </th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("divYield")}>
                    Div% <SortIcon col="divYield" />
                  </th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("roe")}>
                    ROE <SortIcon col="roe" />
                  </th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort("beta")}>
                    Beta <SortIcon col="beta" />
                  </th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">52W Range</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const pct52 = ((s.price - s.low52) / (s.high52 - s.low52)) * 100;
                  return (
                    <tr key={s.symbol} className={`border-b border-border/40 hover:bg-primary/[0.03] transition-colors group ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors text-[13px]">{s.symbol}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight">{s.name}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">{s.sector}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-foreground text-[13px]">₹{s.price.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-mono font-bold text-[12px] ${s.change >= 0 ? "text-[hsl(var(--gain))]" : "text-[hsl(var(--loss))]"}`}>
                          {s.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {s.change >= 0 ? "+" : ""}{s.change}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-muted-foreground text-xs">{s.mcapDisplay}</td>
                      <td className="px-3 py-3 text-right font-mono text-muted-foreground text-xs">{s.pe}</td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        <span className={s.divYield >= 2 ? "text-[hsl(var(--gain))] font-semibold" : "text-muted-foreground"}>{s.divYield}%</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        <span className={s.roe >= 20 ? "text-[hsl(var(--gain))] font-semibold" : "text-muted-foreground"}>{s.roe}%</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-muted-foreground text-xs">{s.beta}</td>
                      <td className="px-3 py-3">
                        <div className="w-24 mx-auto">
                          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mb-0.5">
                            <span>₹{s.low52.toLocaleString("en-IN")}</span>
                            <span>₹{s.high52.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct52 > 70 ? "bg-[hsl(var(--gain))]" : pct52 < 30 ? "bg-[hsl(var(--loss))]" : "bg-[hsl(var(--gold))]"}`}
                              style={{ width: `${Math.max(2, Math.min(100, pct52))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          s.rating === "BUY"
                            ? "bg-[hsl(var(--gain-light))] text-[hsl(var(--gain))] border-[hsl(var(--gain-mid))]"
                            : s.rating === "SELL"
                            ? "bg-[hsl(var(--loss-light))] text-[hsl(var(--loss))] border-[hsl(var(--loss-mid))]"
                            : "bg-muted text-muted-foreground border-border"
                        }`}>{s.rating}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-semibold text-foreground mb-1">No stocks match your filters</p>
              <p className="text-xs">Try adjusting your filter criteria</p>
              <button onClick={clearFilters} className="mt-3 text-xs text-primary font-semibold hover:underline">Clear all filters</button>
            </div>
          )}
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Avg P/E Ratio</div>
            <div className="text-xl font-black text-foreground font-mono">{filtered.length > 0 ? (filtered.reduce((a, b) => a + b.pe, 0) / filtered.length).toFixed(1) : "–"}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Avg Div Yield</div>
            <div className="text-xl font-black text-foreground font-mono">{filtered.length > 0 ? (filtered.reduce((a, b) => a + b.divYield, 0) / filtered.length).toFixed(2) : "–"}%</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">BUY Rated</div>
            <div className="text-xl font-black text-[hsl(var(--gain))] font-mono">{filtered.filter(s => s.rating === "BUY").length}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Avg ROE</div>
            <div className="text-xl font-black text-foreground font-mono">{filtered.length > 0 ? (filtered.reduce((a, b) => a + b.roe, 0) / filtered.length).toFixed(1) : "–"}%</div>
          </div>
        </div>

        {/* SEO FAQ Section */}
        <section className="mt-12 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: "What is a stock screener?", a: "A stock screener is a tool that lets investors filter stocks based on fundamental and technical criteria like P/E ratio, market capitalization, dividend yield, and more to find investment opportunities matching their strategy." },
              { q: "How to use P/E ratio for screening stocks?", a: "P/E ratio compares a stock's price to its earnings. Lower P/E may indicate undervaluation, while higher P/E suggests growth expectations. Use our P/E filter to find value stocks (under 15) or growth stocks (above 40)." },
              { q: "What does 52-week range tell about a stock?", a: "The 52-week range shows the highest and lowest prices over the past year. A stock near its 52-week high may indicate strong momentum, while one near its low could be a value opportunity or facing challenges." },
              { q: "How is dividend yield calculated?", a: "Dividend yield is calculated by dividing the annual dividend per share by the stock's current price, expressed as a percentage. Higher yields (above 2%) are attractive for income-focused investors." },
            ].map(faq => (
              <details key={faq.q} className="bg-card border border-border rounded-lg group">
                <summary className="px-5 py-3.5 cursor-pointer text-sm font-semibold text-foreground list-none flex items-center justify-between">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
