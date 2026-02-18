import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { MarketIndices } from "@/components/MarketIndices";
import { GainersLosers } from "@/components/GainersLosers";
import { NewsCard, NewsCardHero, NewsCardSmall } from "@/components/NewsCard";
import { Footer } from "@/components/Footer";
import {
  RefreshCw, ArrowUp, ArrowDown, TrendingUp,
  Flame, Star, Globe, BarChart3, Zap, ChevronRight, Clock,
  Building2, Landmark, Leaf, Cpu, Pill, Car, Home, ShoppingBag,
  ChevronLeft, Play, Pause, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; tags: string[] | null; category: string | null;
  published_at: string | null; author_name: string | null; views_count: number | null;
}

/* ── Static data ─────────────────────────────────────────────────── */
const MARKET_STATS = [
  { label: "Advances", value: "2,184", color: "text-gain", bg: "bg-[hsl(var(--gain-light))]", border: "border-[hsl(var(--gain-mid))]" },
  { label: "Declines",  value: "873",   color: "text-loss", bg: "bg-[hsl(var(--loss-light))]", border: "border-[hsl(var(--loss-mid))]" },
  { label: "Unchanged", value: "146",  color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
  { label: "52W Highs", value: "483",  color: "text-gain", bg: "bg-[hsl(var(--gain-light))]", border: "border-[hsl(var(--gain-mid))]" },
  { label: "52W Lows",  value: "127",  color: "text-loss", bg: "bg-[hsl(var(--loss-light))]", border: "border-[hsl(var(--loss-mid))]" },
  { label: "Traded Vol", value: "₹94,238 Cr", color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
];

const COMMODITIES = [
  { name: "Gold (MCX)", price: "₹84,250", change: "+0.38%", chgAbs: "+₹320", up: true, emoji: "🥇" },
  { name: "Silver (MCX)", price: "₹96,840", change: "+0.22%", chgAbs: "+₹212", up: true, emoji: "⚪" },
  { name: "Crude Oil (MCX)", price: "₹6,248", change: "-0.82%", chgAbs: "-₹52", up: false, emoji: "🛢️" },
  { name: "Natural Gas", price: "₹224.60", change: "+1.14%", chgAbs: "+₹2.54", up: true, emoji: "🔥" },
  { name: "Copper", price: "₹812.40", change: "-0.41%", chgAbs: "-₹3.36", up: false, emoji: "🔶" },
];

const CURRENCIES = [
  { pair: "USD / INR", rate: "86.82", change: "-0.12", up: false, flag: "🇺🇸" },
  { pair: "EUR / INR", rate: "90.45", change: "+0.18", up: true, flag: "🇪🇺" },
  { pair: "GBP / INR", rate: "108.34", change: "-0.29", up: false, flag: "🇬🇧" },
  { pair: "JPY / INR", rate: "0.5612", change: "+0.01", up: true, flag: "🇯🇵" },
  { pair: "AED / INR", rate: "23.64", change: "-0.04", up: false, flag: "🇦🇪" },
];

const GLOBAL_MARKETS = [
  { name: "Dow Jones",     value: "38,654", change: "+0.76%", up: true,  country: "🇺🇸" },
  { name: "S&P 500",       value: "5,137",  change: "+0.82%", up: true,  country: "🇺🇸" },
  { name: "NASDAQ",        value: "16,214", change: "+1.03%", up: true,  country: "🇺🇸" },
  { name: "FTSE 100",      value: "7,728",  change: "-0.15%", up: false, country: "🇬🇧" },
  { name: "Nikkei 225",    value: "38,487", change: "+0.62%", up: true,  country: "🇯🇵" },
  { name: "Hang Seng",     value: "16,512", change: "-0.44%", up: false, country: "🇭🇰" },
  { name: "Shanghai",      value: "3,054",  change: "+0.31%", up: true,  country: "🇨🇳" },
  { name: "DAX",           value: "17,842", change: "+0.55%", up: true,  country: "🇩🇪" },
];

const SECTORS = [
  { name: "IT",      change: "+1.84%", up: true,  icon: Cpu },
  { name: "Banking", change: "-0.42%", up: false, icon: Landmark },
  { name: "Pharma",  change: "+0.95%", up: true,  icon: Pill },
  { name: "Auto",    change: "+1.12%", up: true,  icon: Car },
  { name: "FMCG",    change: "-0.28%", up: false, icon: ShoppingBag },
  { name: "Realty",  change: "+2.34%", up: true,  icon: Home },
  { name: "Energy",  change: "-0.67%", up: false, icon: Zap },
  { name: "Metal",   change: "+0.73%", up: true,  icon: Building2 },
];

const EXPERT_PICKS = [
  { stock: "RELIANCE",    reco: "BUY",  target: "₹1,620", cmp: "₹1,440", upside: "+12.5%", analyst: "Motilal Oswal" },
  { stock: "ICICIBANK",   reco: "BUY",  target: "₹1,580", cmp: "₹1,408", upside: "+12.2%", analyst: "Kotak Securities" },
  { stock: "HDFCBANK",    reco: "BUY",  target: "₹2,100", cmp: "₹1,923", upside: "+9.2%",  analyst: "ICICI Direct" },
  { stock: "TCS",         reco: "HOLD", target: "₹2,800", cmp: "₹2,690", upside: "+4.1%",  analyst: "Jefferies" },
  { stock: "SUNPHARMA",   reco: "BUY",  target: "₹1,900", cmp: "₹1,748", upside: "+8.7%",  analyst: "HDFC Securities" },
];

const IPO_DATA = [
  { company: "Bajaj Housing Finance", price: "₹70",  band: "₹70–78",   gmp: "₹12", status: "Open",     sub: "2.3x" },
  { company: "Premier Energies",      price: "₹450", band: "₹445–455", gmp: "₹38", status: "Upcoming", sub: "—" },
  { company: "Ola Electric",          price: "₹76",  band: "₹72–76",   gmp: "₹5",  status: "Listed",   sub: "4.27x" },
  { company: "Vibhor Steel Tubes",    price: "₹141", band: "₹138–141", gmp: "₹22", status: "Listed",   sub: "312x" },
];

const BREAKING_NEWS = [
  "🔴 SENSEX rises 423 pts; NIFTY holds above 22,800",
  "📊 RBI holds repo rate at 6.5% for sixth consecutive time",
  "💰 Rupee at 86.82 against USD; mild pressure from crude",
  "🏦 HDFC Bank Q3 net profit rises 2.7% YoY",
  "🌍 US Fed signals two rate cuts possible in 2025",
  "📈 Reliance Industries up 1.2%; energy sector leads",
];

const TOOLS = [
  { name: "SIP Calculator",    emoji: "💰", desc: "Plan your investments", color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { name: "EMI Calculator",    emoji: "🏠", desc: "Home & auto loans",    color: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { name: "Stock Screener",    emoji: "🔍", desc: "Filter & sort stocks", color: "bg-purple-50 border-purple-200 hover:bg-purple-100" },
  { name: "Portfolio Tracker", emoji: "📊", desc: "Track your returns",   color: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { name: "Tax Calculator",    emoji: "📋", desc: "Capital gains tax",    color: "bg-rose-50 border-rose-200 hover:bg-rose-100" },
  { name: "FD Returns",        emoji: "🏦", desc: "Fixed deposit yields", color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100" },
];

/* ── Helper components ─────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title, link, linkLabel = "View All" }: {
  icon?: any; title: string; link?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 bg-red-600 rounded-full" />
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-bold text-base md:text-lg text-foreground">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group">
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

/* ── News Carousel ────────────────────────────────────────────── */
function NewsCarousel({ posts }: { posts: BlogPost[] }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number) => {
    setCurrent((idx + posts.length) % posts.length);
  }, [posts.length]);

  useEffect(() => {
    if (!playing || posts.length <= 1) return;
    timerRef.current = setInterval(() => go(current + 1), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, playing, go, posts.length]);

  if (!posts.length) return <div className="h-[420px] md:h-[480px] bg-muted rounded-2xl animate-pulse" />;

  const post = posts[current];
  const EMOJI_MAP: Record<string, string> = { Markets: '📊', Economy: '🏛️', Stocks: '📈', Commodities: '🥇', default: '📰' };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg group border border-border">
      {/* Main image / gradient backdrop */}
      <Link to={`/news/${post.slug}`} className="block relative h-[320px] sm:h-[400px] md:h-[480px] bg-gradient-to-br from-slate-800 to-slate-900">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[120px] opacity-10">
            {EMOJI_MAP[post.category ?? ''] ?? EMOJI_MAP.default}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-white border-white/30 bg-white/10 backdrop-blur-sm`}>
              {post.category ?? 'News'}
            </span>
            <span className="text-white/50 text-[11px] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.published_at ? timeAgo(post.published_at) : 'Just now'}
            </span>
          </div>
          <h2 className="font-bold text-xl sm:text-2xl md:text-3xl leading-tight mb-2 md:mb-3 line-clamp-3 group-hover:text-yellow-300 transition-colors">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="text-white/70 text-sm line-clamp-2 mb-4 hidden sm:block">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span className="font-medium text-white/80">{post.author_name}</span>
            {post.views_count != null && <><span>·</span><span>{post.views_count.toLocaleString()} views</span></>}
          </div>
        </div>
      </Link>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setPlaying(p => !p)}
          className="bg-black/40 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/60 transition-colors"
        >
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
      </div>

      {/* Prev / Next */}
      <button
        onClick={() => go(current - 1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => go(current + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 right-5 flex items-center gap-1.5">
        {posts.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function Index() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [breakingIdx, setBreakingIdx] = useState(0);

  useEffect(() => {
    fetchPosts();
    const newsTimer = setInterval(() => setBreakingIdx(i => (i + 1) % BREAKING_NEWS.length), 4500);
    const refreshTimer = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => { clearInterval(newsTimer); clearInterval(refreshTimer); };
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,tags,category,published_at,author_name,views_count")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(16);
    setPosts(data ?? []);
    setLoading(false);
  }

  const carouselPosts = posts.slice(0, 5);
  const stackPosts    = posts.slice(0, 4);
  const gridPosts     = posts.slice(5, 9);
  const latestPosts   = posts.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      {/* ─── Breaking news bar ─── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 py-2 flex items-center gap-3">
          <div className="shrink-0 flex items-center gap-2">
            <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider animate-pulse">
              BREAKING
            </span>
          </div>
          <div className="overflow-hidden flex-1 relative h-5">
            <p className="text-sm text-foreground font-medium truncate">
              {BREAKING_NEWS[breakingIdx]}
            </p>
          </div>
          <div className="shrink-0 hidden sm:flex text-xs text-muted-foreground items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 py-5 space-y-8">

        {/* ═══════════════════════════════════════════
            BLOCK 1 — Market Indices
        ═══════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gain animate-pulse inline-block" />
                <span className="text-xs font-semibold text-gain">Markets Open</span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">· Auto-refreshing every 5 min</span>
            </div>
            <button
              onClick={() => setLastUpdated(new Date())}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <MarketIndices />
        </section>

        {/* ═══════════════════════════════════════════
            BLOCK 2 — Market Breadth + Sector Heatmap
        ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Breadth stats */}
          <div className="lg:col-span-2 space-y-3">
            <SectionHeading icon={BarChart3} title="Market Breadth — NSE" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {MARKET_STATS.map(s => (
                <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-3 text-center`}>
                  <div className={`number-font text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-tight">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sector heatmap */}
            <div className="mt-4">
              <SectionHeading icon={BarChart3} title="Sector Performance" link="/markets" />
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {SECTORS.map(sec => (
                  <div
                    key={sec.name}
                    className={`rounded-xl p-3 text-center border cursor-pointer transition-all hover:scale-105 ${
                      sec.up
                        ? 'bg-[hsl(var(--gain-light))] border-[hsl(var(--gain-mid))]'
                        : 'bg-[hsl(var(--loss-light))] border-[hsl(var(--loss-mid))]'
                    }`}
                  >
                    <sec.icon className={`h-4 w-4 mx-auto mb-1.5 ${sec.up ? 'text-gain' : 'text-loss'}`} />
                    <div className="text-[11px] font-bold text-foreground">{sec.name}</div>
                    <div className={`text-[11px] font-semibold mt-0.5 ${sec.up ? 'text-gain' : 'text-loss'}`}>{sec.change}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Global Markets mini card */}
          <div>
            <SectionHeading icon={Globe} title="Global Markets" link="/markets" />
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              {GLOBAL_MARKETS.map((m, i) => (
                <div key={m.name} className={`flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer ${i < GLOBAL_MARKETS.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{m.country}</span>
                    <span className="text-[12px] font-medium text-foreground">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="number-font text-xs font-bold text-foreground">{m.value}</div>
                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${m.up ? 'text-gain' : 'text-loss'}`}>
                      {m.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                      {m.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            BLOCK 3 — Top Stories: Carousel + Stack
        ═══════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Flame} title="Top Stories" link="/news" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Carousel spans 2 cols on desktop */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="h-[320px] sm:h-[400px] md:h-[480px] bg-muted rounded-2xl animate-pulse" />
              ) : (
                <NewsCarousel posts={carouselPosts} />
              )}
            </div>

            {/* Right stack of 4 articles */}
            <div className="flex flex-col gap-3">
              {loading
                ? [1, 2, 3, 4].map(i => <div key={i} className="h-[88px] bg-muted rounded-xl animate-pulse" />)
                : stackPosts.map(post => (
                    <Link
                      key={post.id}
                      to={`/news/${post.slug}`}
                      className="group flex gap-3 bg-white border border-border rounded-xl p-3 hover:shadow-md hover:border-primary/20 transition-all card-hover"
                    >
                      <div className="w-[72px] h-[72px] rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center text-2xl">
                        {post.cover_image_url
                          ? <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                          : <span>{({ Markets: '📊', Economy: '🏛️', Stocks: '📈', Commodities: '🥇' } as any)[post.category ?? ''] ?? '📰'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {post.category ?? 'News'}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {post.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {post.published_at ? timeAgo(post.published_at) : 'Just now'}
                        </p>
                      </div>
                    </Link>
                  ))
              }
              <Link to="/news" className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors">
                All News <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BLOCK 4 — News Grid + Right Sidebar
        ═══════════════════════════════════════════ */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: 4-column grid of news */}
            <div className="lg:col-span-3 space-y-5">
              <SectionHeading title="Latest News" link="/news" linkLabel="More Stories" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loading
                  ? [1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)
                  : gridPosts.map(post => <NewsCard key={post.id} post={post} featured />)
                }
              </div>

              {/* Market Movers below */}
              <div className="mt-2">
                <SectionHeading icon={TrendingUp} title="Market Movers" link="/stocks" />
                <GainersLosers />
              </div>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-5">
              {/* Expert Picks */}
              <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-border px-4 py-3 flex items-center gap-2 bg-muted/30">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-sm text-foreground">Expert Picks</span>
                </div>
                <div className="divide-y divide-border/60">
                  {EXPERT_PICKS.map(pick => (
                    <div key={pick.stock} className="px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-foreground">{pick.stock}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          pick.reco === 'BUY' ? 'badge-gain' : pick.reco === 'SELL' ? 'badge-loss' : 'badge-neutral'
                        }`}>{pick.reco}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{pick.analyst}</span>
                        <span className={`number-font font-bold ${pick.upside.startsWith('+') ? 'text-gain' : 'text-loss'}`}>
                          {pick.upside}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>CMP: <span className="text-foreground font-semibold">{pick.cmp}</span></span>
                        <span>→</span>
                        <span>Target: <span className="text-foreground font-semibold">{pick.target}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest News widget */}
              <div className="bg-white border border-border rounded-xl shadow-sm">
                <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted/30">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> Latest
                  </span>
                  <Link to="/news" className="text-xs font-semibold text-primary">All →</Link>
                </div>
                <div className="p-4">
                  {loading
                    ? [1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded mb-3 animate-pulse" />)
                    : latestPosts.map(post => <NewsCardSmall key={post.id} post={post} />)
                  }
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BLOCK 5 — Commodities & Currencies (horizontal)
        ═══════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Globe} title="Commodities & Currencies" link="/markets" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Commodities */}
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3 bg-muted/30 font-bold text-sm text-foreground">
                🥇 Commodities (MCX)
              </div>
              <div className="divide-y divide-border/50">
                {COMMODITIES.map(c => (
                  <div key={c.name} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{c.emoji}</span>
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="number-font text-sm font-bold text-foreground">{c.price}</div>
                      <div className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${c.up ? 'text-gain' : 'text-loss'}`}>
                        {c.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                        {c.change} · {c.chgAbs}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Currencies */}
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3 bg-muted/30 font-bold text-sm text-foreground">
                💱 Currency Rates (vs INR)
              </div>
              <div className="divide-y divide-border/50">
                {CURRENCIES.map(c => (
                  <div key={c.pair} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-sm font-semibold text-foreground">{c.pair}</span>
                    </div>
                    <div className="text-right">
                      <div className="number-font text-base font-bold text-foreground">₹{c.rate}</div>
                      <div className={`text-[11px] font-semibold ${c.up ? 'text-gain' : 'text-loss'}`}>
                        {c.up ? '+' : ''}{c.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BLOCK 6 — IPO Corner
        ═══════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Star} title="IPO Corner" link="/markets" linkLabel="All IPOs" />
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Mobile: card layout */}
            <div className="sm:hidden divide-y divide-border/60">
              {IPO_DATA.map(ipo => (
                <div key={ipo.company} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-foreground">{ipo.company}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ipo.status === 'Open' ? 'badge-gain' :
                      ipo.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>{ipo.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>Price: <span className="text-foreground font-semibold number-font">{ipo.price}</span></span>
                    <span>GMP: <span className="text-gain font-semibold number-font">{ipo.gmp}</span></span>
                    <span>Sub: <span className="text-primary font-semibold number-font">{ipo.sub}</span></span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Company", "Issue Price", "Price Band", "GMP", "Status", "Subscription"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {IPO_DATA.map(ipo => (
                    <tr key={ipo.company} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{ipo.company}</td>
                      <td className="px-5 py-3.5 number-font font-bold">{ipo.price}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{ipo.band}</td>
                      <td className="px-5 py-3.5 number-font font-semibold text-gain">{ipo.gmp}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          ipo.status === 'Open' ? 'badge-gain' :
                          ipo.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>{ipo.status}</span>
                      </td>
                      <td className="px-5 py-3.5 number-font font-bold text-primary">{ipo.sub}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BLOCK 7 — More News (full width grid)
        ═══════════════════════════════════════════ */}
        {!loading && posts.length > 5 && (
          <section>
            <SectionHeading icon={Flame} title="More From MarketPulse" link="/news" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {posts.slice(9, 13).map(post => (
                <NewsCard key={post.id} post={post} featured />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════
            BLOCK 8 — Tools & Calculators
        ═══════════════════════════════════════════ */}
        <section>
          <SectionHeading title="Tools & Calculators" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOOLS.map(tool => (
              <div key={tool.name} className={`${tool.color} border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer text-center group`}>
                <div className="text-3xl mb-2">{tool.emoji}</div>
                <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{tool.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{tool.desc}</div>
              </div>
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
