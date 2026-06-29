import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, BarChart3, Users, Shield, ArrowRight, Sparkles, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POPULAR_SEARCHES = [
  "NIFTY 50 Analysis",
  "Best Mutual Funds",
  "Gold Price Today",
  "IPO Calendar",
  "Tax Saving ELSS",
];

const STATS = [
  { icon: BarChart3, value: 50000, suffix: "+", label: "Active Investors", accent: "from-blue-500 to-cyan-400" },
  { icon: TrendingUp, value: 1200, suffix: "+", label: "Stock Reviews", accent: "from-emerald-500 to-teal-400" },
  { icon: Users, value: 95, suffix: "%", label: "Satisfaction", accent: "from-violet-500 to-fuchsia-400" },
  { icon: Shield, value: 0, suffix: "", label: "SEBI Compliant", accent: "from-amber-500 to-orange-400", display: "SEBI" },
];

function AnimatedStat({ stat, inView }: { stat: typeof STATS[0]; inView: boolean }) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    if (stat.display) { setDisplay(stat.display); return; }
    let start = 0;
    const target = stat.value;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    const stepTime = duration / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { start = target; clearInterval(timer); }
      setDisplay(Math.floor(start).toLocaleString("en-IN"));
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, stat]);

  const Icon = stat.icon;
  return (
    <div className="relative group">
      <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${stat.accent} opacity-0 group-hover:opacity-60 blur transition-opacity duration-500`} />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl px-4 py-4 text-center transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-primary/10">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.accent} flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="text-foreground font-extrabold text-[17px] number-font leading-none tracking-tight">
          {display}{stat.suffix}
        </div>
        <div className="text-muted-foreground text-[10.5px] font-medium mt-1.5 uppercase tracking-wider">{stat.label}</div>
      </div>
    </div>
  );
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
    if (query.trim()) navigate(`/news?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-[#0a1024] to-slate-950 text-white">
      {/* Animated mesh + conic glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[700px] h-[700px] conic-glow" />
        <div className="absolute -bottom-72 -right-48 w-[800px] h-[800px] conic-glow" style={{ animationDirection: "reverse", animationDuration: "30s" }} />
        <div className="absolute inset-0 mesh-bg opacity-80" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
            maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
          }}
        />
        {/* Floating orbs */}
        <div className="absolute top-[15%] left-[8%] w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_30px_8px_rgba(96,165,250,0.5)] animate-float-slow" />
        <div className="absolute top-[30%] right-[12%] w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_24px_6px_rgba(167,139,250,0.5)] animate-float-medium" />
        <div className="absolute bottom-[20%] left-[18%] w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_30px_8px_rgba(103,232,249,0.5)] animate-float-fast" />
        <div className="absolute bottom-[28%] right-[20%] w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_24px_6px_rgba(52,211,153,0.5)] animate-float-medium" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-4 pt-16 pb-16 sm:pt-24 sm:pb-20">
        {/* Badge */}
        <div className="flex justify-center mb-7">
          <div className="relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass-dark group cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <Sparkles className="h-3 w-3 text-blue-300" />
            <span className="text-[11px] font-semibold tracking-wide text-white/90">India's #1 AI-Powered Investment Platform</span>
            <ArrowRight className="h-3 w-3 text-white/60 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-7 max-w-4xl mx-auto">
          <h1 className="font-extrabold text-[2.4rem] sm:text-5xl lg:text-[4.25rem] leading-[1.05] tracking-tight mb-5">
            <span className="block text-white">Smart investing starts</span>
            <span className="block mt-1.5 bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              with better research.
            </span>
          </h1>
          <p className="text-white/65 text-[14px] sm:text-base max-w-xl mx-auto leading-relaxed">
            Real-time market data, expert analysis, and AI-powered insights —
            built for India's most ambitious investors.
          </p>
        </div>

        {/* Search Bar — glassmorphic */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-5">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 opacity-30 group-focus-within:opacity-70 blur-md transition-opacity duration-500" />
            <div className="relative flex items-center glass rounded-2xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-white/40">
              <Search className="absolute left-5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search stocks, news, mutual funds, IPOs..."
                className="w-full py-4 pl-14 pr-4 text-[14.5px] text-slate-900 bg-transparent outline-none placeholder:text-slate-500/70"
              />
              <button
                type="submit"
                className="shrink-0 mr-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-[13px] font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:scale-[1.03] active:scale-95"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Popular */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <span className="text-white/40 text-[11px] font-medium uppercase tracking-wider">Popular:</span>
          {POPULAR_SEARCHES.map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="text-[11px] font-medium text-white/70 glass-dark rounded-full px-3 py-1 transition-all hover:text-white hover:scale-105"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <button
            onClick={() => navigate("/stocks")}
            className="group relative inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-white text-slate-900 font-semibold text-[13.5px] shadow-2xl hover:shadow-white/20 hover:scale-[1.03] active:scale-95 transition-all"
          >
            Explore Markets
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate("/news")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-dark text-white font-medium text-[13.5px] hover:bg-white/10 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            Watch Demo
          </button>
        </div>

        {/* Animated Stats */}
        <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
          {STATS.map(stat => (
            <AnimatedStat key={stat.label} stat={stat} inView={statsInView} />
          ))}
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </section>
  );
}
