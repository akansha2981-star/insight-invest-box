import { useState } from "react";
import { Search, TrendingUp, BarChart3, Users, Shield, ArrowRight } from "lucide-react";
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
  { icon: Users, value: "95%", label: "Satisfaction Rate" },
  { icon: Shield, value: "SEBI", label: "Compliant Data" },
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
    <section className="relative overflow-hidden">
      {/* Background with depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
      
      {/* Subtle 3D decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-2xl" />
        
        {/* Floating geometric shapes for 3D depth */}
        <div className="absolute top-16 left-[8%] w-12 h-12 rounded-xl bg-white/[0.06] rotate-12 backdrop-blur-sm border border-white/[0.08]" />
        <div className="absolute top-28 right-[12%] w-16 h-16 rounded-2xl bg-white/[0.04] -rotate-6 backdrop-blur-sm border border-white/[0.06]" />
        <div className="absolute bottom-24 left-[15%] w-10 h-10 rounded-lg bg-white/[0.05] rotate-45 backdrop-blur-sm border border-white/[0.07]" />
        <div className="absolute bottom-16 right-[20%] w-14 h-14 rounded-xl bg-white/[0.04] -rotate-12 backdrop-blur-sm border border-white/[0.06]" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 pt-14 pb-12 sm:pt-20 sm:pb-16">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 text-white/90">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-medium tracking-wide">India's Trusted Investment Research Platform</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight tracking-tight mb-3">
            Smart Investing Starts
            <br />
            <span className="text-white/80">with Better Research</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Real-time market data, expert analysis, and AI-powered insights to make informed investment decisions
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
          <div className="relative flex items-center bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden transition-all focus-within:ring-4 focus-within:ring-white/20">
            <Search className="absolute left-5 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search stocks, news, mutual funds, IPOs..."
              className="w-full py-4 pl-13 pr-4 text-[15px] text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60"
              style={{ paddingLeft: '3.25rem' }}
            />
            <button
              type="submit"
              className="shrink-0 mr-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <span className="text-white/40 text-[12px] font-medium">Popular:</span>
          {POPULAR_SEARCHES.map(tag => (
            <button
              key={tag}
              onClick={() => { setQuery(tag); }}
              className="text-[11px] font-medium text-white/70 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1 transition-all"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {STATS.map(stat => (
            <div
              key={stat.label}
              className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-4 text-center hover:bg-white/15 transition-all group"
            >
              <stat.icon className="h-5 w-5 text-white/60 mx-auto mb-2 group-hover:text-white/80 transition-colors" />
              <div className="text-white font-bold text-lg number-font">{stat.value}</div>
              <div className="text-white/50 text-[11px] font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
