import { useState, useEffect, useRef } from "react";
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
  { icon: BarChart3, value: "50,000", suffix: "+", label: "Active Investors", color: "text-blue-600 bg-blue-50 border-blue-100" },
  { icon: TrendingUp, value: "1,200", suffix: "+", label: "Stock Reviews", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { icon: Users, value: "95", suffix: "%", label: "Satisfaction", color: "text-violet-600 bg-violet-50 border-violet-100" },
  { icon: Shield, value: "SEBI", suffix: "", label: "Compliant", color: "text-amber-600 bg-amber-50 border-amber-100" },
];

function useCountUp(target: string, inView: boolean) {
  const [display, setDisplay] = useState("0");
  const numeric = parseInt(target.replace(/,/g, ""));

  useEffect(() => {
    if (!inView || isNaN(numeric)) {
      if (isNaN(numeric)) setDisplay(target);
      return;
    }
    let start = 0;
    const duration = 1800;
    const steps = 60;
    const increment = numeric / steps;
    const stepTime = duration / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= numeric) {
        start = numeric;
        clearInterval(timer);
      }
      setDisplay(Math.floor(start).toLocaleString("en-IN"));
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, numeric, target]);

  return display;
}

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [statsInView, setStatsInView] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsInView(true); },
      { threshold: 0.3 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/news?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-card border-b border-border/40">
      {/* Subtle gradient mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-50/80 via-transparent to-transparent rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-50/60 via-transparent to-transparent rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-violet-50/30 via-transparent to-amber-50/30 rounded-full blur-3xl" />
      </div>

      {/* Floating 3D finance icons with bob animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-6 left-[6%] animate-float-slow">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-white rotate-12 border border-blue-100/60 flex items-center justify-center shadow-lg shadow-blue-100/30">
            <CandlestickChart className="h-5 w-5 text-blue-400" />
          </div>
        </div>
        <div className="absolute top-10 right-[10%] animate-float-medium">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-50 to-white -rotate-6 border border-emerald-100/60 flex items-center justify-center shadow-lg shadow-emerald-100/30">
            <PieChart className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <div className="absolute top-1/2 left-[3%] -translate-y-1/2 animate-float-fast">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-50 to-white rotate-[20deg] border border-violet-100/60 flex items-center justify-center shadow-md shadow-violet-100/20">
            <Wallet className="h-4 w-4 text-violet-400" />
          </div>
        </div>
        <div className="absolute top-1/2 right-[5%] -translate-y-1/2 animate-float-slow">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-white -rotate-12 border border-amber-100/60 flex items-center justify-center shadow-md shadow-amber-100/20">
            <LineChart className="h-5 w-5 text-amber-400" />
          </div>
        </div>
        <div className="absolute bottom-8 left-[12%] animate-float-medium">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-50 to-white rotate-45 border border-rose-100/60 flex items-center justify-center shadow-md shadow-rose-100/20">
            <Landmark className="h-4 w-4 text-rose-400 -rotate-45" />
          </div>
        </div>
        <div className="absolute bottom-10 right-[15%] animate-float-fast">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-50 to-white -rotate-[15deg] border border-cyan-100/60 flex items-center justify-center shadow-md shadow-cyan-100/20">
            <DollarSign className="h-4 w-4 text-cyan-400 rotate-[15deg]" />
          </div>
        </div>
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 pt-10 pb-8 sm:pt-14 sm:pb-10">
        {/* Badge */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/15 rounded-full px-4 py-1.5 text-primary">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wide">India's Trusted Investment Research Platform</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-6">
          <h1 className="font-extrabold text-2xl sm:text-3xl lg:text-[2.5rem] text-foreground leading-tight tracking-tight mb-2.5">
            Smart Investing Starts
            <span className="bg-gradient-to-r from-primary via-blue-600 to-violet-600 bg-clip-text text-transparent"> with Better Research</span>
          </h1>
          <p className="text-muted-foreground text-[13px] sm:text-sm max-w-md mx-auto leading-relaxed">
            Real-time market data, expert analysis, and AI-powered insights
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-5">
          <div className="relative flex items-center bg-card rounded-2xl shadow-xl shadow-black/[0.06] border border-border/60 overflow-hidden transition-all focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/30">
            <Search className="absolute left-4 h-4.5 w-4.5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search stocks, news, mutual funds, IPOs..."
              className="w-full py-3.5 pr-4 text-[14px] text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50"
              style={{ paddingLeft: '2.75rem' }}
            />
            <button
              type="submit"
              className="shrink-0 mr-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-semibold px-5 py-2 rounded-xl transition-colors shadow-md shadow-primary/20"
            >
              Search
            </button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-7">
          <span className="text-muted-foreground/50 text-[11px] font-medium">Popular:</span>
          {POPULAR_SEARCHES.map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="text-[10px] font-medium text-muted-foreground bg-muted/50 hover:bg-muted border border-border/50 rounded-full px-2.5 py-0.5 transition-all hover:text-foreground"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Animated Stats */}
        <div ref={statsRef} className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
          {STATS.map(stat => {
            const count = useCountUp(stat.value, statsInView);
            return (
              <div
                key={stat.label}
                className="bg-card border border-border/50 rounded-2xl px-3 py-3 text-center hover:shadow-lg hover:shadow-black/[0.04] transition-all group hover:-translate-y-1 duration-300"
              >
                <div className={`w-8 h-8 rounded-xl ${stat.color} border flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="text-foreground font-bold text-[15px] number-font leading-none">
                  {count}{stat.suffix}
                </div>
                <div className="text-muted-foreground text-[10px] font-medium mt-0.5">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
