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
  ChevronLeft, Play, Pause, ArrowRight, Activity, Wallet,
  TrendingDown, DollarSign, PieChart, Calculator, Eye,
  AlertCircle, Newspaper, Radio, BookOpen, Search
} from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; tags: string[] | null; category: string | null;
  published_at: string | null; author_name: string | null; views_count: number | null;
}

/* ── Static data ─────────────────────────────────────────────────── */
const MARKET_STATS = [
  { label: "Advances", value: "2,184", sub: "NSE", color: "text-gain", bg: "bg-[hsl(var(--gain-light))]", border: "border-[hsl(var(--gain-mid))]", icon: ArrowUp },
  { label: "Declines",  value: "873",   sub: "NSE", color: "text-loss", bg: "bg-[hsl(var(--loss-light))]", border: "border-[hsl(var(--loss-mid))]", icon: ArrowDown },
  { label: "Unchanged", value: "146",  sub: "NSE", color: "text-muted-foreground", bg: "bg-muted", border: "border-border", icon: Activity },
  { label: "52W Highs", value: "483",  sub: "today", color: "text-gain", bg: "bg-[hsl(var(--gain-light))]", border: "border-[hsl(var(--gain-mid))]", icon: TrendingUp },
  { label: "52W Lows",  value: "127",  sub: "today", color: "text-loss", bg: "bg-[hsl(var(--loss-light))]", border: "border-[hsl(var(--loss-mid))]", icon: TrendingDown },
  { label: "Volume", value: "₹94,238 Cr", sub: "traded", color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", icon: BarChart3 },
];

const COMMODITIES = [
  { name: "Gold", sub: "MCX Feb", price: "₹84,250", change: "+0.38%", chgAbs: "+₹320", up: true, emoji: "🥇", hi: "₹84,410", lo: "₹83,820" },
  { name: "Silver", sub: "MCX Mar", price: "₹96,840", change: "+0.22%", chgAbs: "+₹212", up: true, emoji: "⚪", hi: "₹97,100", lo: "₹96,400" },
  { name: "Crude Oil", sub: "MCX Feb", price: "₹6,248", change: "-0.82%", chgAbs: "-₹52", up: false, emoji: "🛢️", hi: "₹6,318", lo: "₹6,220" },
  { name: "Natural Gas", sub: "MCX Feb", price: "₹224.60", change: "+1.14%", chgAbs: "+₹2.54", up: true, emoji: "🔥", hi: "₹226.80", lo: "₹221.40" },
  { name: "Copper", sub: "MCX Feb", price: "₹812.40", change: "-0.41%", chgAbs: "-₹3.36", up: false, emoji: "🔶", hi: "₹817.00", lo: "₹809.50" },
];

const CURRENCIES = [
  { pair: "USD/INR", rate: "86.82", change: "-0.12", pct: "-0.14%", up: false, flag: "🇺🇸", name: "US Dollar" },
  { pair: "EUR/INR", rate: "90.45", change: "+0.18", pct: "+0.20%", up: true,  flag: "🇪🇺", name: "Euro" },
  { pair: "GBP/INR", rate: "108.34", change: "-0.29", pct: "-0.27%", up: false, flag: "🇬🇧", name: "British Pound" },
  { pair: "JPY/INR", rate: "0.5612", change: "+0.01", pct: "+0.18%", up: true,  flag: "🇯🇵", name: "Japanese Yen" },
  { pair: "AED/INR", rate: "23.64", change: "-0.04", pct: "-0.17%", up: false, flag: "🇦🇪", name: "UAE Dirham" },
];

const GLOBAL_MARKETS = [
  { name: "Dow Jones",  value: "38,654", change: "+0.76%", chgPt: "+291", up: true,  country: "🇺🇸", region: "US" },
  { name: "S&P 500",    value: "5,137",  change: "+0.82%", chgPt: "+42",  up: true,  country: "🇺🇸", region: "US" },
  { name: "NASDAQ",     value: "16,214", change: "+1.03%", chgPt: "+166", up: true,  country: "🇺🇸", region: "US" },
  { name: "FTSE 100",   value: "7,728",  change: "-0.15%", chgPt: "-12",  up: false, country: "🇬🇧", region: "UK" },
  { name: "Nikkei 225", value: "38,487", change: "+0.62%", chgPt: "+238", up: true,  country: "🇯🇵", region: "Asia" },
  { name: "Hang Seng",  value: "16,512", change: "-0.44%", chgPt: "-73",  up: false, country: "🇭🇰", region: "Asia" },
  { name: "Shanghai",   value: "3,054",  change: "+0.31%", chgPt: "+9",   up: true,  country: "🇨🇳", region: "Asia" },
  { name: "DAX",        value: "17,842", change: "+0.55%", chgPt: "+98",  up: true,  country: "🇩🇪", region: "EU" },
];

const SECTORS = [
  { name: "IT",      change: "+1.84%", up: true,  icon: Cpu,         points: "+312" },
  { name: "Banking", change: "-0.42%", up: false, icon: Landmark,    points: "-186" },
  { name: "Pharma",  change: "+0.95%", up: true,  icon: Pill,        points: "+88"  },
  { name: "Auto",    change: "+1.12%", up: true,  icon: Car,         points: "+144" },
  { name: "FMCG",    change: "-0.28%", up: false, icon: ShoppingBag, points: "-38"  },
  { name: "Realty",  change: "+2.34%", up: true,  icon: Home,        points: "+521" },
  { name: "Energy",  change: "-0.67%", up: false, icon: Zap,         points: "-92"  },
  { name: "Metal",   change: "+0.73%", up: true,  icon: Building2,   points: "+67"  },
];

const EXPERT_PICKS = [
  { stock: "RELIANCE",  reco: "BUY",  target: "₹1,620", cmp: "₹1,440", upside: "+12.5%", analyst: "Motilal Oswal",    timeframe: "12M" },
  { stock: "ICICIBANK", reco: "BUY",  target: "₹1,580", cmp: "₹1,408", upside: "+12.2%", analyst: "Kotak Securities", timeframe: "12M" },
  { stock: "HDFCBANK",  reco: "BUY",  target: "₹2,100", cmp: "₹1,923", upside: "+9.2%",  analyst: "ICICI Direct",     timeframe: "6M"  },
  { stock: "TCS",       reco: "HOLD", target: "₹2,800", cmp: "₹2,690", upside: "+4.1%",  analyst: "Jefferies",        timeframe: "6M"  },
  { stock: "SUNPHARMA", reco: "BUY",  target: "₹1,900", cmp: "₹1,748", upside: "+8.7%",  analyst: "HDFC Securities",  timeframe: "9M"  },
];

const IPO_DATA = [
  { company: "Bajaj Housing Finance", price: "₹70",  band: "₹70–78",   gmp: "+₹12", status: "Open",     sub: "2.3x",  open: "Feb 09", close: "Feb 12" },
  { company: "Premier Energies",      price: "₹450", band: "₹445–455", gmp: "+₹38", status: "Upcoming", sub: "—",     open: "Feb 20", close: "Feb 24" },
  { company: "Ola Electric",          price: "₹76",  band: "₹72–76",   gmp: "+₹5",  status: "Listed",   sub: "4.27x", open: "Jan 22", close: "Jan 26" },
  { company: "Vibhor Steel Tubes",    price: "₹141", band: "₹138–141", gmp: "+₹22", status: "Listed",   sub: "312x",  open: "Jan 14", close: "Jan 16" },
];

const BREAKING_NEWS = [
  "🔴 SENSEX rises 423 pts; NIFTY holds above 22,800",
  "📊 RBI holds repo rate at 6.5% for sixth consecutive time",
  "💰 Rupee at 86.82 against USD; mild pressure from crude",
  "🏦 HDFC Bank Q3 net profit rises 2.7% YoY to ₹16,736 Cr",
  "🌍 US Fed signals two rate cuts possible in 2025",
  "📈 Reliance Industries up 1.2%; energy sector leads gains",
];

const TOOLS = [
  { name: "SIP Calculator",    emoji: "💰", desc: "Plan your SIP returns",   bg: "bg-emerald-50 border-emerald-200", hover: "hover:bg-emerald-100" },
  { name: "EMI Calculator",    emoji: "🏠", desc: "Home & auto loan EMIs",   bg: "bg-blue-50 border-blue-200",     hover: "hover:bg-blue-100" },
  { name: "Stock Screener",    emoji: "🔍", desc: "Filter & sort stocks",    bg: "bg-purple-50 border-purple-200", hover: "hover:bg-purple-100" },
  { name: "Portfolio Tracker", emoji: "📊", desc: "Track your returns",      bg: "bg-amber-50 border-amber-200",   hover: "hover:bg-amber-100" },
  { name: "Tax Calculator",    emoji: "📋", desc: "Capital gains & LTCG",   bg: "bg-rose-50 border-rose-200",    hover: "hover:bg-rose-100" },
  { name: "FD Calculator",     emoji: "🏦", desc: "Fixed deposit yields",    bg: "bg-indigo-50 border-indigo-200", hover: "hover:bg-indigo-100" },
];

const MARKET_SUMMARY = [
  { label: "NIFTY P/E", value: "21.4", note: "5Y avg: 22.1" },
  { label: "India VIX",  value: "13.82", note: "↓ low volatility" },
  { label: "FII Flow",   value: "-₹2,841 Cr", note: "today", red: true },
  { label: "DII Flow",   value: "+₹4,123 Cr", note: "today", green: true },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const EMOJI_MAP: Record<string, string> = {
  Markets: '📊', Economy: '🏛️', Stocks: '📈', Commodities: '🥇', Companies: '🏢', default: '📰'
};

function SectionHeading({ icon: Icon, title, link, linkLabel = "View All", accent }: {
  icon?: any; title: string; link?: string; linkLabel?: string; accent?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-[3px] h-5 rounded-full ${accent ?? 'bg-loss'}`} />
        {Icon && <Icon className="h-[15px] w-[15px] text-muted-foreground" />}
        <h2 className="font-bold text-[15px] text-foreground">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors group">
          {linkLabel}
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

/* ── News Carousel ─────────────────────────────────────────────── */
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

  if (!posts.length) return <div className="h-[360px] bg-muted rounded-2xl animate-pulse" />;

  const post = posts[current];

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-card-md border border-border group">
      <Link to={`/news/${post.slug}`} className="block relative h-[300px] sm:h-[360px] bg-gradient-to-br from-slate-800 to-slate-900">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title}
            className="w-full h-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[100px] opacity-10">
            {EMOJI_MAP[post.category ?? ''] ?? EMOJI_MAP.default}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-600 text-white">
              {post.category ?? 'News'}
            </span>
            <span className="text-white/50 text-[11px] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.published_at ? timeAgo(post.published_at) : 'Just now'}
            </span>
          </div>
          <h2 className="font-black text-xl sm:text-2xl leading-tight mb-2 line-clamp-2 group-hover:text-yellow-300 transition-colors">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="text-white/65 text-sm line-clamp-1 mb-3 hidden sm:block">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-3 text-white/50 text-[11px]">
            <span className="font-medium text-white/75">{post.author_name}</span>
            {post.views_count != null && (
              <><span>·</span><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count.toLocaleString()}</span></>
            )}
          </div>
        </div>
      </Link>

      {/* Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <button onClick={() => setPlaying(p => !p)}
          className="bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 transition-colors">
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
      </div>
      <button onClick={() => go(current - 1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button onClick={() => go(current + 1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100">
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots + count */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
        {posts.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/35 hover:bg-white/60'}`} />
        ))}
      </div>
    </div>
  );
}

/* ── Mini Sparkline Bar ─────────────────────────────────────────── */
function SparkBar({ value, max, up }: { value: number; max: number; up: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${up ? 'bg-gain' : 'bg-loss'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function Index() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [breakingIdx, setBreakingIdx] = useState(0);
  const [breakingAnimate, setBreakingAnimate] = useState(true);

  useEffect(() => {
    fetchPosts();
    const newsTimer = setInterval(() => {
      setBreakingAnimate(false);
      setTimeout(() => {
        setBreakingIdx(i => (i + 1) % BREAKING_NEWS.length);
        setBreakingAnimate(true);
      }, 200);
    }, 4500);
    const refreshTimer = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => { clearInterval(newsTimer); clearInterval(refreshTimer); };
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,tags,category,published_at,author_name,views_count")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20);
    setPosts(data ?? []);
    setLoading(false);
  }

  const carouselPosts = posts.slice(0, 5);
  const sideStories   = posts.slice(0, 5);
  const latestNews    = posts.slice(0, 6);
  const gridPosts     = posts.slice(5, 9);
  const moreNews      = posts.slice(9, 13);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <StockTicker />

      {/* ─── Breaking news bar ─── */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 py-2 flex items-center gap-3">
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
              LIVE
            </span>
          </div>
          <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
          <div className="overflow-hidden flex-1">
            <p
              className={`text-[12px] sm:text-sm text-foreground font-medium truncate transition-opacity duration-200 ${breakingAnimate ? 'opacity-100' : 'opacity-0'}`}
            >
              {BREAKING_NEWS[breakingIdx]}
            </p>
          </div>
          <div className="shrink-0 hidden md:flex text-[11px] text-muted-foreground items-center gap-1.5 border-l border-border pl-3 ml-1">
            <Clock className="h-3 w-3" />
            Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={() => setLastUpdated(new Date())}
            className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-3 sm:px-4 py-4 space-y-6">

        {/* ════════════════════════════════════════
            BLOCK 1 — Market Indices
        ════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
              <span className="text-[11px] font-bold text-gain uppercase tracking-wide">Markets Open</span>
              <span className="hidden sm:inline text-[11px] text-muted-foreground">· NSE / BSE · Live Data</span>
            </div>
            <Link to="/markets" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
              Full Market Data <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <MarketIndices />
        </section>

        {/* ════════════════════════════════════════
            BLOCK 2 — Market Summary Strip
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MARKET_SUMMARY.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
              <div className={`number-font text-lg font-black ${s.red ? 'text-loss' : s.green ? 'text-gain' : 'text-foreground'}`}>
                {s.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.note}</div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════
            BLOCK 3 — Top Stories Layout
            Left: Carousel + Grid | Right: Sidebar
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

          {/* ─── Main content (3 cols) ─── */}
          <div className="xl:col-span-3 space-y-5">

            {/* Top Stories */}
            <section>
              <SectionHeading icon={Flame} title="Top Stories" link="/news" />
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Carousel - 3 cols */}
                <div className="lg:col-span-3">
                  {loading
                    ? <div className="h-[300px] sm:h-[360px] bg-muted rounded-2xl animate-pulse" />
                    : <NewsCarousel posts={carouselPosts} />
                  }
                </div>
                {/* Side stories - 2 cols */}
                <div className="lg:col-span-2 flex flex-col gap-2.5">
                  {loading
                    ? [1, 2, 3, 4].map(i => <div key={i} className="h-[76px] bg-muted rounded-xl animate-pulse" />)
                    : sideStories.map((post, i) => (
                      <Link key={post.id} to={`/news/${post.slug}`}
                        className="group flex gap-3 bg-card border border-border rounded-xl p-3 hover:shadow-md hover:border-primary/20 transition-all">
                        <div className="relative w-[68px] h-[68px] rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center text-2xl">
                          {post.cover_image_url
                            ? <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                            : <span>{EMOJI_MAP[post.category ?? ''] ?? EMOJI_MAP.default}</span>
                          }
                          {i === 0 && (
                            <span className="absolute top-0.5 left-0.5 text-[8px] bg-red-600 text-white font-black px-1 rounded uppercase">TOP</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              {post.category ?? 'News'}
                            </span>
                          </div>
                          <h4 className="text-[12px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {post.published_at ? timeAgo(post.published_at) : 'Just now'}
                          </p>
                        </div>
                      </Link>
                    ))
                  }
                  <Link to="/news"
                    className="flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold text-primary border border-primary/25 rounded-xl hover:bg-primary/5 transition-colors mt-auto">
                    All Stories <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </section>

            {/* ─── Market Breadth + Sectors ─── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Breadth */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-border px-4 py-3 flex items-center gap-2 bg-muted/30">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-[13px] text-foreground">Market Breadth — NSE</span>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                  {MARKET_STATS.map(s => (
                    <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-3 text-center`}>
                      <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                      <div className={`number-font text-base font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sector Heatmap */}
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-[13px] text-foreground">Sector Performance</span>
                  </div>
                  <Link to="/markets" className="text-[11px] font-semibold text-primary">More →</Link>
                </div>
                <div className="p-3 grid grid-cols-4 gap-2">
                  {SECTORS.map(sec => (
                    <div key={sec.name}
                      className={`rounded-xl p-2.5 text-center border cursor-pointer transition-all hover:scale-105 ${
                        sec.up
                          ? 'bg-[hsl(var(--gain-light))] border-[hsl(var(--gain-mid))]'
                          : 'bg-[hsl(var(--loss-light))] border-[hsl(var(--loss-mid))]'
                      }`}>
                      <sec.icon className={`h-4 w-4 mx-auto mb-1 ${sec.up ? 'text-gain' : 'text-loss'}`} />
                      <div className="text-[10px] font-bold text-foreground">{sec.name}</div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${sec.up ? 'text-gain' : 'text-loss'}`}>{sec.change}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ─── Market Movers (Gainers/Losers) ─── */}
            <section>
              <SectionHeading icon={TrendingUp} title="Market Movers" link="/stocks" />
              <GainersLosers />
            </section>

            {/* ─── Latest News Grid ─── */}
            <section>
              <SectionHeading icon={Newspaper} title="Latest News" link="/news" linkLabel="More Stories" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loading
                  ? [1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)
                  : gridPosts.map(post => <NewsCard key={post.id} post={post} featured />)
                }
              </div>
            </section>

          </div>

          {/* ─── Right Sidebar ─── */}
          <aside className="xl:col-span-1 space-y-4">

            {/* Expert Picks */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-card">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="font-black text-[13px] text-foreground">Expert Picks</span>
              </div>
              <div className="divide-y divide-border/60">
                {EXPERT_PICKS.map(pick => (
                  <div key={pick.stock} className="px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-[13px] text-foreground group-hover:text-primary transition-colors">{pick.stock}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                        pick.reco === 'BUY' ? 'badge-gain' : pick.reco === 'SELL' ? 'badge-loss' : 'badge-neutral'
                      }`}>{pick.reco}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-muted-foreground">{pick.analyst}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{pick.timeframe}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">CMP <span className="number-font text-foreground font-semibold">{pick.cmp}</span></span>
                      <span className="text-muted-foreground">→ <span className="number-font text-foreground font-semibold">{pick.target}</span></span>
                      <span className={`number-font font-black text-[12px] ${pick.upside.startsWith('+') ? 'text-gain' : 'text-loss'}`}>
                        {pick.upside}
                      </span>
                    </div>
                    <SparkBar value={parseInt(pick.cmp.replace(/[₹,]/g,''))} max={parseInt(pick.target.replace(/[₹,]/g,''))} up={pick.upside.startsWith('+')} />
                  </div>
                ))}
              </div>
            </div>

            {/* Global Markets */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-[13px] text-foreground">Global Markets</span>
                </div>
                <Link to="/markets" className="text-[11px] font-semibold text-primary">More →</Link>
              </div>
              <div className="divide-y divide-border/40">
                {GLOBAL_MARKETS.map(m => (
                  <div key={m.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.country}</span>
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">{m.name}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide">{m.region}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="number-font text-[12px] font-bold text-foreground">{m.value}</div>
                      <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${m.up ? 'text-gain' : 'text-loss'}`}>
                        {m.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                        {m.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest News Feed */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-[13px] text-foreground">Latest</span>
                </div>
                <Link to="/news" className="text-[11px] font-semibold text-primary">All →</Link>
              </div>
              <div className="p-3">
                {loading
                  ? [1,2,3,4].map(i => <div key={i} className="h-14 bg-muted rounded-lg mb-2 animate-pulse" />)
                  : latestNews.map(post => <NewsCardSmall key={post.id} post={post} />)
                }
              </div>
            </div>

          </aside>
        </div>

        {/* ════════════════════════════════════════
            BLOCK 4 — Commodities & Currencies
        ════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Globe} title="Commodities & Currencies" link="/markets" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Commodities */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3 bg-muted/30 flex items-center justify-between">
                <span className="font-black text-[13px] text-foreground">🥇 Commodities (MCX)</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Futures</span>
              </div>
              <div className="divide-y divide-border/40">
                {COMMODITIES.map(c => (
                  <div key={c.name} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.emoji}</span>
                      <div>
                        <div className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">{c.sub}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="number-font text-[13px] font-black text-foreground">{c.price}</div>
                      <div className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${c.up ? 'text-gain' : 'text-loss'}`}>
                        {c.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                        {c.change} · {c.chgAbs}
                      </div>
                      <div className="text-[9px] text-muted-foreground">H {c.hi} · L {c.lo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Currencies */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3 bg-muted/30 flex items-center justify-between">
                <span className="font-black text-[13px] text-foreground">💱 Currency Rates (vs INR)</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Interbank</span>
              </div>
              <div className="divide-y divide-border/40">
                {CURRENCIES.map(c => (
                  <div key={c.pair} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.flag}</span>
                      <div>
                        <div className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">{c.pair}</div>
                        <div className="text-[10px] text-muted-foreground">{c.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="number-font text-base font-black text-foreground">₹{c.rate}</div>
                      <div className={`flex items-center justify-end text-[10px] font-bold ${c.up ? 'text-gain' : 'text-loss'}`}>
                        {c.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                        {c.change} ({c.pct})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            BLOCK 5 — IPO Corner + More News (2-col)
        ════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* IPO - 3 cols */}
          <section className="xl:col-span-3">
            <SectionHeading icon={Star} title="IPO Corner" link="/markets" linkLabel="All IPOs" />
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-border/60">
                {IPO_DATA.map(ipo => (
                  <div key={ipo.company} className="px-4 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-[13px] text-foreground">{ipo.company}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Open: {ipo.open} · Close: {ipo.close}</div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border mt-0.5 ${
                        ipo.status === 'Open' ? 'badge-gain' :
                        ipo.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>{ipo.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <div><span className="text-muted-foreground">Issue </span><span className="number-font font-bold text-foreground">{ipo.price}</span></div>
                      <div><span className="text-muted-foreground">GMP </span><span className="number-font font-bold text-gain">{ipo.gmp}</span></div>
                      <div><span className="text-muted-foreground">Sub </span><span className="number-font font-bold text-primary">{ipo.sub}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {["Company", "Issue Price", "Price Band", "GMP", "Open / Close", "Status", "Subscription"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {IPO_DATA.map(ipo => (
                      <tr key={ipo.company} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                        <td className="px-4 py-3.5 font-semibold text-[13px] text-foreground">{ipo.company}</td>
                        <td className="px-4 py-3.5 number-font font-bold text-foreground">{ipo.price}</td>
                        <td className="px-4 py-3.5 text-[12px] text-muted-foreground">{ipo.band}</td>
                        <td className="px-4 py-3.5 number-font font-semibold text-gain">{ipo.gmp}</td>
                        <td className="px-4 py-3.5 text-[11px] text-muted-foreground">{ipo.open} – {ipo.close}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
                            ipo.status === 'Open' ? 'badge-gain' :
                            ipo.status === 'Upcoming' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-muted text-muted-foreground border-border'
                          }`}>{ipo.status}</span>
                        </td>
                        <td className="px-4 py-3.5 number-font font-bold text-primary">{ipo.sub}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Quick Stats / FII-DII - 2 cols */}
          <section className="xl:col-span-2 space-y-4">
            <SectionHeading icon={Activity} title="FII / DII Activity" />
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-[13px] text-foreground">Institutional Flows</span>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: "FII (Equity)", buy: "₹12,430 Cr", sell: "₹15,271 Cr", net: "-₹2,841 Cr", up: false },
                  { label: "DII (Equity)", buy: "₹18,542 Cr", sell: "₹14,419 Cr", net: "+₹4,123 Cr", up: true },
                  { label: "FII (Debt)",   buy: "₹3,280 Cr",  sell: "₹2,940 Cr",  net: "+₹340 Cr",   up: true },
                ].map(row => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">{row.label}</span>
                      <span className={`number-font text-[12px] font-black ${row.up ? 'text-gain' : 'text-loss'}`}>{row.net}</span>
                    </div>
                    <div className="flex gap-1 text-[10px] text-muted-foreground">
                      <span className="text-gain font-semibold">Buy {row.buy}</span>
                      <span className="mx-1">·</span>
                      <span className="text-loss font-semibold">Sell {row.sell}</span>
                    </div>
                    <SparkBar value={row.up ? 70 : 30} max={100} up={row.up} />
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-4 py-2 bg-muted/20">
                <span className="text-[10px] text-muted-foreground">Data as of Feb 17, 2026 · SEBI</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-[13px] text-foreground">Market Snapshot</span>
              </div>
              <div className="p-4 space-y-2.5">
                {[
                  { label: "Market Cap (NSE)", value: "₹3,87,43,250 Cr" },
                  { label: "Avg Delivery %", value: "48.2%" },
                  { label: "Put/Call Ratio", value: "0.92" },
                  { label: "Market Width",  value: "71.4%", green: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    <span className={`number-font text-[12px] font-bold ${item.green ? 'text-gain' : 'text-foreground'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ════════════════════════════════════════
            BLOCK 6 — More News Full Grid
        ════════════════════════════════════════ */}
        {!loading && moreNews.length > 0 && (
          <section>
            <SectionHeading icon={Flame} title="More From MarketPulse" link="/news" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {moreNews.map(post => <NewsCard key={post.id} post={post} featured />)}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            BLOCK 7 — Tools & Calculators
        ════════════════════════════════════════ */}
        <section>
          <SectionHeading icon={Calculator} title="Tools & Calculators" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOOLS.map(tool => (
              <div key={tool.name}
                className={`${tool.bg} ${tool.hover} border rounded-xl p-4 transition-all cursor-pointer text-center group shadow-sm hover:shadow-md`}>
                <div className="text-3xl mb-2">{tool.emoji}</div>
                <div className="text-[12px] font-bold text-foreground group-hover:text-primary transition-colors">{tool.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{tool.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════
            BLOCK 8 — Data Disclaimer
        ════════════════════════════════════════ */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">Disclaimer:</span> Market data may be delayed by 15 minutes. All indices, stock prices,
            and financial data are for informational purposes only and do not constitute investment advice.
            Please consult a SEBI-registered advisor before making investment decisions.
          </p>
        </div>

      </main>

      <Footer />
    </div>
  );
}
