import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search, ArrowUp, ArrowDown, Filter, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

const MOCK_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", price: 1442, change: 1.2, pe: 28.4, mcap: "19.5L Cr", rating: "BUY" },
  { symbol: "TCS", name: "Tata Consultancy", sector: "IT", price: 2695, change: -0.4, pe: 32.1, mcap: "9.8L Cr", rating: "HOLD" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", price: 1712, change: 0.8, pe: 21.3, mcap: "12.9L Cr", rating: "BUY" },
  { symbol: "INFY", name: "Infosys", sector: "IT", price: 1854, change: -1.1, pe: 29.8, mcap: "7.7L Cr", rating: "HOLD" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", price: 1408, change: 1.5, pe: 18.6, mcap: "9.9L Cr", rating: "BUY" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", price: 2340, change: -0.3, pe: 54.2, mcap: "5.5L Cr", rating: "HOLD" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", price: 812, change: 2.1, pe: 9.8, mcap: "7.2L Cr", rating: "BUY" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", price: 1685, change: 0.6, pe: 76.4, mcap: "9.5L Cr", rating: "BUY" },
  { symbol: "ITC", name: "ITC Limited", sector: "FMCG", price: 458, change: -0.7, pe: 26.8, mcap: "5.7L Cr", rating: "HOLD" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", price: 1876, change: 0.3, pe: 22.4, mcap: "3.7L Cr", rating: "HOLD" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma", price: 1862, change: 1.8, pe: 38.5, mcap: "4.5L Cr", rating: "BUY" },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", price: 748, change: 2.4, pe: 8.2, mcap: "2.7L Cr", rating: "BUY" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", price: 12450, change: -0.5, pe: 34.6, mcap: "3.9L Cr", rating: "HOLD" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infra", price: 3542, change: 0.9, pe: 35.8, mcap: "4.9L Cr", rating: "BUY" },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", price: 298, change: -1.8, pe: 24.6, mcap: "1.6L Cr", rating: "SELL" },
];

const SECTORS = ["All", "Banking", "IT", "FMCG", "Energy", "Pharma", "Auto", "Infra", "Telecom"];
const RATINGS = ["All", "BUY", "HOLD", "SELL"];

export default function StockScreenerPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [rating, setRating] = useState("All");
  const [sortBy, setSortBy] = useState<"change" | "pe" | "price">("change");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = MOCK_STOCKS
    .filter(s => {
      if (query && !s.symbol.toLowerCase().includes(query.toLowerCase()) && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (sector !== "All" && s.sector !== sector) return false;
      if (rating !== "All" && s.rating !== rating) return false;
      return true;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * mul;
    });

  function toggleSort(key: "change" | "pe" | "price") {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
            <Search className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Stock Screener</h1>
            <p className="text-sm text-muted-foreground">Filter, sort, and discover stocks</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-card mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search stocks..." className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {SECTORS.map(s => (
              <button key={s} onClick={() => setSector(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  sector === s ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {RATINGS.map(r => (
              <button key={r} onClick={() => setRating(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  rating === r
                    ? r === "BUY" ? "bg-gain text-white border-gain" : r === "SELL" ? "bg-loss text-white border-loss" : "bg-primary text-white border-primary"
                    : "bg-muted text-muted-foreground border-border"
                }`}>{r}</button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stock</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sector</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("price")}>
                    Price {sortBy === "price" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("change")}>
                    Change % {sortBy === "change" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleSort("pe")}>
                    P/E {sortBy === "pe" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Market Cap</th>
                  <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.symbol} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">{s.symbol}</div>
                      <div className="text-[11px] text-muted-foreground">{s.name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.sector}</td>
                    <td className="px-4 py-3 text-right number-font font-bold text-foreground">₹{s.price.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 number-font font-bold text-sm ${s.change >= 0 ? "text-gain" : "text-loss"}`}>
                        {s.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {s.change >= 0 ? "+" : ""}{s.change}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right number-font text-muted-foreground">{s.pe}</td>
                    <td className="px-4 py-3 text-right number-font text-muted-foreground text-xs">{s.mcap}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        s.rating === "BUY" ? "badge-gain" : s.rating === "SELL" ? "badge-loss" : "badge-neutral"
                      }`}>{s.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No stocks match your filters</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
