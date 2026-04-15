import { useState } from "react";
import { Search, TrendingUp, BarChart3, Users, Shield, ArrowRight, CandlestickChart, PieChart, Wallet, LineChart, Landmark, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POPULAR_SEARCHES = [
  "NIFTY 50 Analysis",
  "Best Mutual Funds",
  "Gold Price Today",
  "IPO Calendar",
  "Tax Saving ELSS",
];

const STATS = [
  { icon: BarChart3, value: "50,000+", label: "Active Investors" },
  { icon: TrendingUp, value: "1,200+", label: "Stock Reviews" },
  { icon: Users, value: "95%", label: "Satisfaction" },
  { icon: Shield, value: "SEBI", label: "Compliant" },
];

export function HomeHero() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/news?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      {/* 3D Floating finance icons — white, no blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left */}
        <div className="absolute top-6 left-[6%] w-11 h-11 rounded-xl bg-white/[0.08] rotate-12 border border-white/[0.12] flex items-center justify-center shadow-lg shadow-black/5">
          <CandlestickChart className="h-5 w-5 text-white/30" />
        </div>
        {/* Top right */}
        <div className="absolute top-10 right-[10%] w-13 h-13 rounded-2xl bg-white/[0.06] -rotate-6 border border-white/[0.10] flex items-center justify-center shadow-lg shadow-black/5">
          <PieChart className="h-5 w-5 text-white/25" />
        </div>
        {/* Mid left */}
        <div className="absolute top-1/2 left-[3%] -translate-y-1/2 w-10 h-10 rounded-lg bg-white/[0.07] rotate-[20deg] border border-white/[0.10] flex items-center justify-center">
          <Wallet className="h-4 w-4 text-white/25" />
        </div>
        {/* Mid right */}
        <div className="absolute top-1/2 right-[5%] -translate-y-1/2 w-12 h-12 rounded-xl bg-white/[0.06] -rotate-12 border border-white/[0.09] flex items-center justify-center">
          <LineChart className="h-5 w-5 text-white/25" />
        </div>
        {/* Bottom left */}
        <div className="absolute bottom-8 left-[12%] w-9 h-9 rounded-lg bg-white/[0.07] rotate-45 border border-white/[0.10] flex items-center justify-center">
          <Landmark className="h-4 w-4 text-white/25 -rotate-45" />
        </div>
        {/* Bottom right */}
        <div className="absolute bottom-10 right-[15%] w-10 h-10 rounded-xl bg-white/[0.06] -rotate-[15deg] border border-white/[0.09] flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-white/25 rotate-[15deg]" />
        </div>
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 pt-8 pb-7 sm:pt-12 sm:pb-10">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1 text-white/90">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium tracking-wide">India's Trusted Investment Research Platform</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        {/* Headline — compact */}
        <div className="text-center mb-5">
          <h1 className="font-bold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight tracking-tight mb-2">
            Smart Investing Starts
            <span className="text-white/75"> with Better Research</span>
          </h1>
          <p className="text-white/55 text-[13px] sm:text-sm max-w-md mx-auto leading-relaxed">
            Real-time market data, expert analysis, and AI-powered insights
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
          <div className="relative flex items-center bg-white rounded-2xl shadow-2xl shadow-black/15 overflow-hidden transition-all focus-within:ring-4 focus-within:ring-white/20">
            <Search className="absolute left-4 h-4.5 w-4.5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search stocks, news, mutual funds, IPOs..."
              className="w-full py-3 pr-4 text-[14px] text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60"
              style={{ paddingLeft: '2.75rem' }}
            />
            <button
              type="submit"
              className="shrink-0 mr-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
          <span className="text-white/35 text-[11px] font-medium">Popular:</span>
          {POPULAR_SEARCHES.map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="text-[10px] font-medium text-white/65 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full px-2.5 py-0.5 transition-all"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Stats — compact row */}
        <div className="grid grid-cols-4 gap-2 max-w-2xl mx-auto">
          {STATS.map(stat => (
            <div
              key={stat.label}
              className="bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-center hover:bg-white/15 transition-all group"
            >
              <stat.icon className="h-4 w-4 text-white/50 mx-auto mb-1 group-hover:text-white/70 transition-colors" />
              <div className="text-white font-bold text-[15px] number-font leading-none">{stat.value}</div>
              <div className="text-white/45 text-[10px] font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
