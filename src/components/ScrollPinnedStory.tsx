import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Sparkles, Shield, Zap, LineChart } from "lucide-react";

const CARDS = [
  {
    icon: Activity,
    eyebrow: "Real-time market intelligence",
    title: "Live data from NSE, BSE & MCX",
    desc: "Stream prices, indices, FII/DII flows, and breadth indicators — updated every second, straight from the exchanges.",
    accent: "from-blue-500 to-cyan-400",
  },
  {
    icon: Sparkles,
    eyebrow: "AI-powered analysis",
    title: "Insights that explain the market",
    desc: "Our AI engine reads thousands of filings, news stories, and price actions to surface what actually matters for your portfolio.",
    accent: "from-violet-500 to-fuchsia-400",
  },
  {
    icon: LineChart,
    eyebrow: "Expert research, free",
    title: "Pro-grade stock reviews",
    desc: "Investment thesis, target prices, valuation models, and risks — distilled into reviews you can act on in under 90 seconds.",
    accent: "from-emerald-500 to-teal-400",
  },
  {
    icon: Shield,
    eyebrow: "SEBI-compliant. Always.",
    title: "Research you can trust",
    desc: "Every recommendation is sourced, dated, and disclosed. No paid promotions. No hidden interests. Just honest research.",
    accent: "from-amber-500 to-orange-400",
  },
];

export function ScrollPinnedStory() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

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
  // each card occupies a slice of progress
  const slice = 1 / n;
  const activeIdx = Math.min(n - 1, Math.floor(progress / slice));

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={{ height: `${n * 90}vh` }}
      aria-label="Why InvestingIQ — pinned scroll story"
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f1e] to-slate-900">
        {/* Animated background layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] conic-glow" />
          <div className="absolute -bottom-60 -right-40 w-[700px] h-[700px] conic-glow" style={{ animationDirection: "reverse" }} />
          <div className="absolute inset-0 mesh-bg opacity-60" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
          />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 w-full grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: sticky narrative */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-dark mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/80">
                Built for serious investors
              </span>
            </div>
            <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-5">
              One platform.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                Every edge you need.
              </span>
            </h2>
            <p className="text-white/60 text-sm sm:text-base max-w-md leading-relaxed mb-8">
              Scroll through the four pillars that make InvestingIQ the research workspace
              of 50,000+ Indian investors.
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-3">
              {CARDS.map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === activeIdx ? "w-10 bg-gradient-to-r from-blue-400 to-violet-400" : "w-5 bg-white/15"
                    }`}
                  />
                </div>
              ))}
              <span className="ml-2 text-[11px] font-mono text-white/40">
                {String(activeIdx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Right: stacked card stage */}
          <div className="relative h-[420px] sm:h-[460px]">
            {CARDS.map((card, i) => {
              const localStart = i * slice;
              const localEnd = (i + 1) * slice;
              const local = (progress - localStart) / slice;
              // States: below(>1) -> enter(0..0.5) -> hold(0.5..0.85) -> exit(0.85..1)
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
                // active card
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
                  <div className="relative h-full rounded-3xl overflow-hidden glass-dark p-7 sm:p-9 flex flex-col justify-between">
                    {/* Accent glow */}
                    <div
                      className={`absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br ${card.accent} opacity-30 blur-3xl`}
                    />
                    <div className="absolute inset-0 rounded-3xl pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(135deg, hsla(0,0%,100%,0.06), transparent 50%)",
                      }} />

                    <div className="relative">
                      <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${card.accent} items-center justify-center shadow-lg mb-6`}>
                        <Icon className="h-6 w-6 text-white" strokeWidth={2.2} />
                      </div>
                      <div className="text-[11px] uppercase tracking-widest font-semibold text-white/50 mb-2">
                        {card.eyebrow}
                      </div>
                      <h3 className="font-bold text-xl sm:text-2xl text-white leading-snug mb-3">
                        {card.title}
                      </h3>
                      <p className="text-white/65 text-sm leading-relaxed max-w-md">
                        {card.desc}
                      </p>
                    </div>

                    <div className="relative flex items-center justify-between pt-6 border-t border-white/10">
                      <div className="flex items-center gap-2 text-white/40 text-[11px] font-mono">
                        <Zap className="h-3 w-3" />
                        Pillar {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                      </div>
                      <BarChart3 className="h-4 w-4 text-white/30" />
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
