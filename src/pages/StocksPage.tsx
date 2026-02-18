import { useState, useEffect } from "react";
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
import { TrendingUp, TrendingDown, Search, Filter, ArrowUp, ArrowDown, BarChart2 } from "lucide-react";

const SECTORS = [
  { name: "IT", change: 1.84, stocks: 42 },
  { name: "Banking", change: -0.42, stocks: 28 },
  { name: "Pharma", change: 0.95, stocks: 35 },
  { name: "Auto", change: 1.12, stocks: 24 },
  { name: "FMCG", change: -0.28, stocks: 31 },
  { name: "Realty", change: 2.34, stocks: 18 },
  { name: "Energy", change: -0.67, stocks: 22 },
  { name: "Metal", change: 0.73, stocks: 19 },
];

const FIFTY_TWO_WEEK_HIGH = [
  { symbol: "RELIANCE", price: "₹2,941", high: "₹2,941", up: true },
  { symbol: "INFY", price: "₹1,847", high: "₹1,847", up: true },
  { symbol: "MARUTI", price: "₹11,842", high: "₹11,842", up: true },
  { symbol: "SUNPHARMA", price: "₹1,342", high: "₹1,342", up: true },
  { symbol: "LT", price: "₹3,814", high: "₹3,814", up: true },
];

const FIFTY_TWO_WEEK_LOW = [
  { symbol: "PAYTM", price: "₹348", low: "₹348", up: false },
  { symbol: "ZOMATO", price: "₹112", low: "₹112", up: false },
  { symbol: "NYKAA", price: "₹142", low: "₹142", up: false },
  { symbol: "POLICYBAZAAR", price: "₹487", low: "₹487", up: false },
  { symbol: "DELHIVERY", price: "₹365", low: "₹365", up: false },
];

function SectionHeading({ icon: Icon, title }: { icon?: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 bg-red-600 rounded-full" />
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="font-bold text-base text-foreground">{title}</h2>
    </div>
  );
}

export default function StocksPage() {
  const [gainers, setGainers] = useState(TOP_GAINERS);
  const [search, setSearch] = useState("");
  const [reviewSymbols, setReviewSymbols] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch which symbols have published reviews
    supabase
      .from("stock_reviews" as any)
      .select("symbol")
      .eq("status", "published")
      .then(({ data }) => {
        if (data) setReviewSymbols(new Set((data as any[]).map(r => r.symbol)));
      });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setGainers(prev => prev.map(s => {
        const updated = getFluctuatedPrice(s.price, s.change);
        return { ...s, ...updated };
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredGainers = gainers.filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        <PageSectionsBanner pageKey="stocks" />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stocks</h1>
            <p className="text-sm text-muted-foreground mt-1">Gainers · Losers · 52W Highs/Lows · Screener</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by symbol or company name..."
            className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Sector Chart */}
        <section>
          <SectionHeading title="Sector Performance" />
          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SECTORS} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Change"]} />
                <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                  {SECTORS.map((s, i) => (
                    <Cell key={i} fill={s.change >= 0 ? "hsl(152,69%,31%)" : "hsl(4,90%,50%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Gainers & Losers */}
        <section>
        <SectionHeading icon={TrendingUp} title="Top Gainers & Losers" />
          <GainersLosers />
        </section>

        {/* Stock Table */}
        <section>
          <SectionHeading title="All Stocks" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Symbol", "Company", "Price", "Change", "% Change", "Volume", "Sector", "Analysis"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGainers.map((stock) => (
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
                        {reviewSymbols.has(stock.symbol) && (
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
                  ))}
                </tbody>
              </table>
            </div>
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
              {FIFTY_TWO_WEEK_HIGH.map((s) => (
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
              {FIFTY_TWO_WEEK_LOW.map((s) => (
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
