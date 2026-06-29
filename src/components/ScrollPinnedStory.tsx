import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Sparkles, Shield, Zap, LineChart, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { fetchLiveMarketQuotes, type LiveMarketQuote } from "@/lib/liveMarketData";

const CARDS = [
  {
    icon: Activity,
    eyebrow: "Real-time market intelligence",
    title: "Live data from NSE, BSE & MCX",
    desc: "Stream prices, indices, FII/DII flows, and breadth indicators — updated every second, straight from the exchanges.",
    accent: "from-sky-300 to-cyan-200",
    iconAccent: "from-sky-400 to-cyan-300",
    stat: { label: "Quotes / sec", value: "12,400+" },
  },
  {
    icon: Sparkles,
    eyebrow: "AI-powered analysis",
    title: "Insights that explain the market",
    desc: "Our AI engine reads thousands of filings, news stories, and price actions to surface what actually matters for your portfolio.",
    accent: "from-violet-300 to-fuchsia-200",
    iconAccent: "from-violet-400 to-fuchsia-300",
    stat: { label: "Filings analysed", value: "2.1M" },
  },
  {
    icon: LineChart,
    eyebrow: "Expert research, free",
    title: "Pro-grade stock reviews",
    desc: "Investment thesis, target prices, valuation models, and risks — distilled into reviews you can act on in under 90 seconds.",
    accent: "from-emerald-300 to-teal-200",
    iconAccent: "from-emerald-400 to-teal-300",
    stat: { label: "Stocks covered", value: "850+" },
  },
  {
    icon: Shield,
    eyebrow: "SEBI-compliant. Always.",
    title: "Research you can trust",
    desc: "Every recommendation is sourced, dated, and disclosed. No paid promotions. No hidden interests. Just honest research.",
    accent: "from-amber-200 to-orange-200",
    iconAccent: "from-amber-300 to-orange-300",
    stat: { label: "Trusted by", value: "50K+ investors" },
  },
];

export function ScrollPinnedStory() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [quotes, setQuotes] = useState<LiveMarketQuote[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetchLiveMarketQuotes();
      if (cancelled) return;
      setQuotes(res.quotes.slice(0, 6));
      setIsLive(res.live);
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = el.offsetHeight - vh;
        const scrolled = Math.min(Math.max(-rect.top, 0), total);
        setProgress(total > 0 ? scrolled / total : 0);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const n = CARDS.length;
  const slice = 1 / n;
  const activeIdx = Math.min(n - 1, Math.floor(progress / slice));

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ height: `${n * 90}vh` }}
      aria-label="Why InvestingIQ — pinned scroll story"
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden light-mesh-bg">
        {/* Advanced light-theme background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Aurora blobs */}
          <div className="aurora-blob aurora-blob-slow -top-32 -left-32 w-[520px] h-[520px] bg-gradient-to-br from-violet-300/60 via-fuchsia-200/50 to-transparent" />
          <div className="aurora-blob top-1/4 -right-40 w-[560px] h-[560px] bg-gradient-to-br from-sky-300/55 via-cyan-200/45 to-transparent" style={{ animationDelay: "-4s" }} />
          <div className="aurora-blob aurora-blob-slow -bottom-40 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-emerald-200/55 via-teal-200/40 to-transparent" style={{ animationDelay: "-8s" }} />
          <div className="aurora-blob top-2/3 right-1/4 w-[360px] h-[360px] bg-gradient-to-br from-rose-200/45 to-amber-200/30" style={{ animationDelay: "-12s" }} />

          {/* Animated grid */}
          <div className="absolute inset-0 light-grid" />

          {/* Floating glass chips */}
          <div className="hidden lg:block absolute top-[14%] left-[8%] float-y" style={{ ['--r' as any]: '-6deg' }}>
            <div className="px-3 py-2 rounded-xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_10px_30px_-12px_rgba(99,102,241,0.35)] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-wider text-slate-700">NIFTY · LIVE</span>
            </div>
          </div>
          <div className="hidden lg:block absolute top-[22%] right-[6%] float-y" style={{ ['--r' as any]: '5deg', animationDelay: '-2s' }}>
            <div className="px-3 py-2 rounded-xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_10px_30px_-12px_rgba(16,185,129,0.35)]">
              <span className="text-[10px] font-mono font-bold text-emerald-600">+0.84%</span>
            </div>
          </div>
          <div className="hidden lg:block absolute bottom-[14%] left-[10%] float-y" style={{ ['--r' as any]: '4deg', animationDelay: '-3.5s' }}>
            <div className="px-3 py-2 rounded-xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_10px_30px_-12px_rgba(139,92,246,0.35)] flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <span className="text-[10px] font-bold tracking-wider text-slate-700">AI INSIGHT</span>
            </div>
          </div>
          <div className="hidden lg:block absolute bottom-[22%] right-[10%] float-y" style={{ ['--r' as any]: '-5deg', animationDelay: '-5s' }}>
            <div className="px-3 py-2 rounded-xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_10px_30px_-12px_rgba(56,189,248,0.35)] flex items-center gap-2">
              <BarChart3 className="h-3 w-3 text-sky-500" />
              <span className="text-[10px] font-mono font-bold text-slate-700">2,147 stocks</span>
            </div>
          </div>

          {/* Soft vignette */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.5) 100%)" }} />
        </div>


        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 w-full grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: sticky narrative */}
          <div className="text-slate-900">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-slate-200 shadow-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-700">
                Built for serious investors
              </span>
            </div>
            <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-5">
              One platform.
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
                Every edge you need.
              </span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-md leading-relaxed mb-6">
              Scroll through the four pillars that make InvestingIQ the research workspace
              of 50,000+ Indian investors.
            </p>

            {/* Live market ticker strip */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200 shadow-sm p-3 mb-6 overflow-hidden">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={`relative flex h-2 w-2`}>
                    <span className={`absolute inline-flex h-full w-full rounded-full ${isLive ? "bg-emerald-400" : "bg-amber-400"} opacity-75 animate-ping`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    {isLive ? "Live market" : "Market snapshot"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">NSE · BSE</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(quotes.length ? quotes : Array(4).fill(null)).slice(0, 4).map((q, i) => {
                  if (!q) {
                    return (
                      <div key={i} className="h-10 rounded-lg bg-slate-100/70 animate-pulse" />
                    );
                  }
                  const up = q.changePercent >= 0;
                  return (
                    <div key={q.symbol} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-white to-slate-50 border border-slate-100">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-800 truncate">{q.displayName || q.symbol}</div>
                        <div className="text-[10px] font-mono text-slate-500">₹{q.price.toFixed(2)}</div>
                      </div>
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? "+" : ""}{q.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-3">
              {CARDS.map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === activeIdx ? "w-10 bg-gradient-to-r from-violet-500 to-sky-400" : "w-5 bg-slate-300"
                    }`}
                  />
                </div>
              ))}
              <span className="ml-2 text-[11px] font-mono text-slate-500">
                {String(activeIdx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Right: stacked card stage */}
          <div className="relative h-[460px] sm:h-[480px]">
            {CARDS.map((card, i) => {
              const localStart = i * slice;
              const localEnd = (i + 1) * slice;
              const local = (progress - localStart) / slice;
              let opacity = 1;
              let translateY = 0;
              let scale = 1;
              let rotate = 0;

              if (progress < localStart) {
                opacity = 0;
                translateY = 60;
                scale = 0.94;
              } else if (progress > localEnd && i < n - 1) {
                opacity = 0;
                translateY = -40;
                scale = 0.96;
                rotate = -2;
              } else {
                if (local < 0.25) {
                  const t = local / 0.25;
                  opacity = t;
                  translateY = (1 - t) * 60;
                  scale = 0.94 + t * 0.06;
                }
              }

              const Icon = card.icon;
              const z = i === activeIdx ? 20 : 10 - Math.abs(i - activeIdx);

              return (
                <div
                  key={i}
                  className="pin-stage-card absolute inset-0"
                  style={{
                    opacity,
                    transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                    zIndex: z,
                  }}
                >
                  <div className="relative h-full rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl border border-white shadow-[0_20px_60px_-15px_rgba(99,102,241,0.25)] p-7 sm:p-9 flex flex-col justify-between">
                    {/* Accent glow */}
                    <div
                      className={`absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br ${card.accent} opacity-70 blur-3xl`}
                    />
                    <div
                      className={`absolute -bottom-32 -left-20 w-56 h-56 rounded-full bg-gradient-to-br ${card.accent} opacity-40 blur-3xl`}
                    />
                    <div className="absolute inset-0 rounded-3xl pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(135deg, hsla(0,0%,100%,0.6), transparent 50%)",
                      }} />

                    <div className="relative">
                      <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${card.iconAccent} items-center justify-center shadow-lg mb-6`}>
                        <Icon className="h-6 w-6 text-white" strokeWidth={2.2} />
                      </div>
                      <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-500 mb-2">
                        {card.eyebrow}
                      </div>
                      <h3 className="font-bold text-xl sm:text-2xl text-slate-900 leading-snug mb-3">
                        {card.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed max-w-md">
                        {card.desc}
                      </p>

                      <div className="mt-5 inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-200">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{card.stat.label}</div>
                        <div className="text-sm font-bold text-slate-900 font-mono">{card.stat.value}</div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    </div>

                    <div className="relative flex items-center justify-between pt-6 border-t border-slate-200/70">
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono">
                        <Zap className="h-3 w-3" />
                        Pillar {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                      </div>
                      <BarChart3 className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
