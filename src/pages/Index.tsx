import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { MarketIndices } from "@/components/MarketIndices";
import { GainersLosers } from "@/components/GainersLosers";
import { NewsCard } from "@/components/NewsCard";
import { Footer } from "@/components/Footer";
import { FeaturedStockReviews } from "@/components/FeaturedStockReviews";
import { HomeHero } from "@/components/HomeHero";
import { MiniIndexChart } from "@/components/MiniIndexChart";
import { TrendingTopics } from "@/components/TrendingTopics";
import { TopAnalysts } from "@/components/TopAnalysts";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { HomeRealEstateSection } from "@/components/HomeRealEstateSection";
import { AIAssistantBar } from "@/components/AIAssistantBar";
import { AIInsightTeaser } from "@/components/AIInsightTeaser";
import { AIMarketPulse } from "@/components/AIMarketPulse";
import { AIStockRecommendations } from "@/components/AIStockRecommendations";
import {
  RefreshCw, ArrowUp, ArrowDown, TrendingUp,
  Flame, Star, Globe, BarChart3, Zap, ChevronRight, Clock,
  Building2, Landmark, Cpu, Pill, Car, Home, ShoppingBag,
  ChevronLeft, Play, Pause, ArrowRight, Activity, Wallet,
  TrendingDown, DollarSign, PieChart, Calculator, Eye,
  AlertCircle, Newspaper, BookOpen, Search,
  Shield, Target, LineChart, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { getMarketStatusText } from "@/lib/marketTime";

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; tags: string[] | null; category: string | null;
  published_at: string | null; author_name: string | null; views_count: number | null;
}

/* ── Static data ─────────────────────────────────────────────────── */
const MARKET_STATS = [
  { label: "Advances", value: "2,184", color: "text-gain", icon: ArrowUp },
  { label: "Declines", value: "873", color: "text-loss", icon: ArrowDown },
  { label: "Unchanged", value: "146", color: "text-muted-foreground", icon: Activity },
  { label: "52W Highs", value: "483", color: "text-gain", icon: TrendingUp },
  { label: "52W Lows", value: "127", color: "text-loss", icon: TrendingDown },
  { label: "Volume", value: "₹94,238 Cr", color: "text-primary", icon: BarChart3 },
];

const COMMODITIES = [
  { name: "Gold", price: "₹87,450", change: "+0.44%", up: true },
  { name: "Silver", price: "₹98,240", change: "+0.31%", up: true },
  { name: "Crude Oil", price: "₹6,124", change: "-0.78%", up: false },
  { name: "Nat Gas", price: "₹238.40", change: "+1.24%", up: true },
  { name: "Copper", price: "₹856.70", change: "-0.36%", up: false },
];

const CURRENCIES = [
  { pair: "USD/INR", rate: "86.62", change: "-0.09%", up: false },
  { pair: "EUR/INR", rate: "90.18", change: "+0.24%", up: true },
  { pair: "GBP/INR", rate: "109.42", change: "-0.16%", up: false },
  { pair: "JPY/INR", rate: "0.5748", change: "+0.19%", up: true },
];

const GLOBAL_MARKETS = [
  { name: "Dow Jones", value: "44,546", change: "+0.37%", up: true, region: "US" },
  { name: "S&P 500", value: "6,114", change: "+0.24%", up: true, region: "US" },
  { name: "NASDAQ", value: "19,732", change: "+0.07%", up: true, region: "US" },
  { name: "FTSE 100", value: "8,718", change: "+0.52%", up: true, region: "UK" },
  { name: "Nikkei 225", value: "38,487", change: "-0.32%", up: false, region: "JP" },
  { name: "Hang Seng", value: "22,614", change: "+2.64%", up: true, region: "HK" },
];

const SECTORS = [
  { name: "IT", change: "+1.84%", up: true, icon: Cpu },
  { name: "Banking", change: "-0.42%", up: false, icon: Landmark },
  { name: "Pharma", change: "+0.95%", up: true, icon: Pill },
  { name: "Auto", change: "+1.12%", up: true, icon: Car },
  { name: "FMCG", change: "-0.28%", up: false, icon: ShoppingBag },
  { name: "Realty", change: "+2.34%", up: true, icon: Home },
  { name: "Energy", change: "-0.67%", up: false, icon: Zap },
  { name: "Metal", change: "+0.73%", up: true, icon: Building2 },
];

const EXPERT_PICKS = [
  { stock: "RELIANCE", reco: "BUY", target: "₹1,620", cmp: "₹1,442", upside: "+12.3%", analyst: "Motilal Oswal" },
  { stock: "ICICIBANK", reco: "BUY", target: "₹1,580", cmp: "₹1,408", upside: "+12.2%", analyst: "Kotak Securities" },
  { stock: "HDFCBANK", reco: "BUY", target: "₹2,000", cmp: "₹1,712", upside: "+16.8%", analyst: "ICICI Direct" },
  { stock: "TCS", reco: "HOLD", target: "₹2,900", cmp: "₹2,695", upside: "+7.6%", analyst: "Jefferies" },
];

const IPO_DATA = [
  { company: "Bajaj Housing Finance", price: "₹70", gmp: "+₹12", status: "Open", sub: "2.3x" },
  { company: "Premier Energies", price: "₹450", gmp: "+₹38", status: "Upcoming", sub: "—" },
  { company: "Ola Electric", price: "₹76", gmp: "+₹5", status: "Listed", sub: "4.27x" },
];

const FALLBACK_BREAKING_NEWS = [
  "SENSEX at 83,740 | NIFTY 50 at 25,437 | Feb 18, 2026",
  "RBI holds repo rate at 6.5%; rate cut signals expected in H2 FY26",
  "Gold hits ₹87,450/10g on MCX | USD/INR at 86.62",
];

const TOOLS = [
  { name: "SIP Calculator", icon: Calculator, to: "/tools/sip" },
  { name: "EMI Calculator", icon: Home, to: "/tools/emi" },
  { name: "Stock Screener", icon: Search, to: "/tools/screener" },
  { name: "Portfolio Tester", icon: PieChart, to: "/tools/portfolio" },
  { name: "Tax Calculator", icon: Newspaper, to: "/tools/tax" },
  { name: "FD Calculator", icon: Landmark, to: "/tools/fd" },
];

const MARKET_SUMMARY = [
  { label: "NIFTY P/E", value: "21.8", note: "5Y avg: 22.1" },
  { label: "India VIX", value: "14.62", note: "Mild caution" },
  { label: "FII Flow", value: "-₹3,204 Cr", note: "today", red: true },
  { label: "DII Flow", value: "+₹5,812 Cr", note: "today", green: true },
];

/* ── Helpers ────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CATEGORY_ICON_MAP: Record<string, any> = {
  Markets: BarChart3, Economy: Landmark, Stocks: TrendingUp, Commodities: DollarSign, Companies: Building2, default: Newspaper
};

/* ── Clean Section Heading ───────────────────────────────────── */
function SectionHeading({ title, link, linkLabel = "View All" }: {
  title: string; link?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-semibold text-lg text-foreground tracking-tight">{title}</h2>
      {link && (
        <Link to={link} className="text-[12px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ── News Carousel ─────────────────────────────────────────── */
function NewsCarousel({ posts }: { posts: BlogPost[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number) => {
    setCurrent((idx + posts.length) % posts.length);
  }, [posts.length]);

  useEffect(() => {
    if (posts.length <= 1) return;
    timerRef.current = setInterval(() => go(current + 1), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, go, posts.length]);

  if (!posts.length) return <div className="h-[320px] bg-muted rounded-2xl animate-pulse" />;

  const post = posts[current];

  return (
    <div className="relative rounded-2xl overflow-hidden group">
      <Link to={`/news/${post.slug}`} className="block relative h-[280px] sm:h-[340px] bg-muted">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            {(() => { const Icon = CATEGORY_ICON_MAP[post.category ?? ''] ?? CATEGORY_ICON_MAP.default; return <Icon className="h-16 w-16 text-muted-foreground/30" />; })()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
              {post.category ?? 'News'}
            </span>
            <span className="text-white/50 text-[11px]">
              {post.published_at ? timeAgo(post.published_at) : 'Just now'}
            </span>
          </div>
          <h2 className="font-semibold text-lg sm:text-xl leading-snug line-clamp-2">{post.title}</h2>
        </div>
      </Link>

      {/* Dots */}
      {posts.length > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {posts.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE — Clean Apple/Google aesthetic
════════════════════════════════════════════════════════════ */
export default function Index() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [breakingIdx, setBreakingIdx] = useState(0);
  const [breakingAnimate, setBreakingAnimate] = useState(true);
  const [breakingNews, setBreakingNews] = useState<string[]>(FALLBACK_BREAKING_NEWS);

  const [liveCurrencies, setLiveCurrencies] = useState(CURRENCIES);
  const [liveGlobalMarkets, setLiveGlobalMarkets] = useState(GLOBAL_MARKETS);
  const [liveCommodities, setLiveCommodities] = useState(COMMODITIES);
  const [marketDataUpdatedAt, setMarketDataUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchBreakingNews();
    fetchMarketData();
  }, []);

  async function fetchMarketData() {
    try {
      const { data } = await supabase
        .from("site_config").select("value").eq("key", "market_data_live").maybeSingle();
      if (!data?.value) return;
      const v = data.value as any;
      if (!v.live) return;
      if (Array.isArray(v.currencies) && v.currencies.length > 0) {
        setLiveCurrencies(prev => prev.map(c => {
          const live = v.currencies.find((lc: any) => lc.pair === c.pair);
          return live ? { ...c, rate: live.rate, change: live.change || live.pct, up: live.up } : c;
        }));
      }
      if (Array.isArray(v.globalMarkets) && v.globalMarkets.length > 0) {
        setLiveGlobalMarkets(prev => prev.map(m => {
          const live = v.globalMarkets.find((lm: any) => lm.name === m.name);
          return live ? { ...m, ...live } : m;
        }));
      }
      if (Array.isArray(v.commodities) && v.commodities.length > 0) {
        setLiveCommodities(prev => prev.map(c => {
          const live = v.commodities.find((lc: any) => lc.name === c.name);
          return live ? { ...c, price: live.price, change: live.change, up: live.up } : c;
        }));
      }
      if (v.updatedAt) setMarketDataUpdatedAt(v.updatedAt);
    } catch (e) { console.error("fetchMarketData error:", e); }
  }

  useEffect(() => {
    if (breakingNews.length === 0) return;
    const newsTimer = setInterval(() => {
      setBreakingAnimate(false);
      setTimeout(() => {
        setBreakingIdx(i => (i + 1) % breakingNews.length);
        setBreakingAnimate(true);
      }, 200);
    }, 4500);
    const refreshTimer = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => { clearInterval(newsTimer); clearInterval(refreshTimer); };
  }, [breakingNews]);

  async function fetchBreakingNews() {
    const { data } = await supabase.from("site_config").select("value").eq("key", "breaking_news").maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      const items = (data.value as any[]).filter(i => i.active).map((i: any) => i.text as string);
      if (items.length > 0) setBreakingNews(items);
    }
  }

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
  const sideStories = posts.slice(0, 4);
  const gridPosts = posts.slice(5, 9);
  const moreNews = posts.slice(9, 13);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      {/* ─── Breaking News Marquee ─── */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 shrink-0 px-4 py-2 bg-destructive/10 border-r border-border">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Breaking</span>
          </div>
          <div className="overflow-hidden flex-1 py-2">
            <div className="breaking-marquee flex items-center gap-8 whitespace-nowrap" style={{ width: 'max-content' }}>
              {[...breakingNews, ...breakingNews].map((news, i) => (
                <span key={i} className="text-[13px] text-foreground font-medium flex items-center gap-3">
                  {news}
                  <span className="text-border">|</span>
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 hidden md:flex text-[11px] text-muted-foreground items-center gap-1 px-4">
            <Clock className="h-3 w-3" />
            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ─── Live Index Auto-Scroll Strip ─── */}
      <div className="border-b border-border bg-muted/30">
        <div className="overflow-hidden py-2">
          <div className="index-scroll-animate flex items-center gap-6 whitespace-nowrap" style={{ width: 'max-content' }}>
            {[...MARKET_STATS, ...COMMODITIES.map(c => ({ label: c.name, value: c.price, color: c.up ? 'text-gain' : 'text-loss', icon: c.up ? ArrowUp : ArrowDown, extra: c.change })), ...MARKET_STATS, ...COMMODITIES.map(c => ({ label: c.name, value: c.price, color: c.up ? 'text-gain' : 'text-loss', icon: c.up ? ArrowUp : ArrowDown, extra: c.change }))].map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0 px-2">
                {'icon' in item && item.icon && <item.icon className={`h-3 w-3 ${item.color}`} />}
                <span className="text-[11px] font-semibold text-muted-foreground">{item.label}</span>
                <span className={`number-font text-[12px] font-bold ${item.color}`}>{item.value}</span>
                {'extra' in item && item.extra && <span className={`text-[10px] ${item.color}`}>{item.extra}</span>}
                <span className="text-border/60 ml-2">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero with Search ── */}
      <HomeHero />

      <main className="max-w-[1280px] mx-auto px-4 py-6 space-y-10">

        {/* ── Market Status + Indices ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            {(() => {
              const ms = getMarketStatusText();
              return (
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ms.isOpen ? 'bg-gain animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className={`text-[12px] font-medium ${ms.isOpen ? 'text-gain' : 'text-muted-foreground'}`}>
                    {ms.label}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-muted-foreground">· {ms.detail}</span>
                </div>
              );
            })()}
            <Link to="/markets" className="text-[12px] font-medium text-primary hover:text-primary/80 flex items-center gap-1">
              All Markets <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <MarketIndices />
        </section>

        {/* ── Charts + Trending + Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <MiniIndexChart />
          <TrendingTopics />
          <div className="grid grid-cols-2 gap-3 content-start">
            {MARKET_SUMMARY.map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{s.label}</div>
                <div className={`number-font text-lg font-bold ${s.red ? 'text-loss' : s.green ? 'text-gain' : 'text-foreground'}`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{s.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stock Reviews ── */}
        <FeaturedStockReviews />

        {/* ── Top Stories ── */}
        <section>
          <SectionHeading title="Top Stories" link="/news" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              {loading ? <div className="h-[280px] sm:h-[340px] bg-muted rounded-2xl animate-pulse" /> : <NewsCarousel posts={carouselPosts} />}
            </div>
            <div className="lg:col-span-2 flex flex-col gap-2">
              {loading
                ? [1, 2, 3, 4].map(i => <div key={i} className="h-[72px] bg-muted rounded-xl animate-pulse" />)
                : sideStories.map((post, i) => (
                  <Link key={post.id} to={`/news/${post.slug}`}
                    className="group flex gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary/20 transition-all">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                      {post.cover_image_url
                        ? <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                        : (() => { const Icon = CATEGORY_ICON_MAP[post.category ?? ''] ?? CATEGORY_ICON_MAP.default; return <Icon className="h-5 w-5 text-muted-foreground/50" />; })()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-medium uppercase tracking-wider text-primary">
                        {post.category ?? 'News'}
                      </span>
                      <h4 className="text-[12px] font-medium text-foreground line-clamp-2 leading-snug mt-0.5 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {post.published_at ? timeAgo(post.published_at) : 'Just now'}
                      </p>
                    </div>
                  </Link>
                ))
              }
            </div>
          </div>
        </section>

        {/* ── Sectors + Market Breadth — compact row ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-semibold text-[14px] text-foreground">Sector Performance</span>
            </div>
            <div className="p-3 grid grid-cols-4 gap-2">
              {SECTORS.map(sec => (
                <div key={sec.name} className="rounded-lg p-2.5 text-center border border-border hover:border-primary/20 transition-all cursor-pointer">
                  <sec.icon className={`h-4 w-4 mx-auto mb-1 ${sec.up ? 'text-gain' : 'text-loss'}`} />
                  <div className="text-[11px] font-medium text-foreground">{sec.name}</div>
                  <div className={`text-[11px] font-semibold ${sec.up ? 'text-gain' : 'text-loss'}`}>{sec.change}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-semibold text-[14px] text-foreground">Market Breadth — NSE</span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {MARKET_STATS.map(s => (
                <div key={s.label} className="text-center p-2">
                  <div className={`number-font text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Market Movers ── */}
        <section>
          <SectionHeading title="Market Movers" link="/stocks" />
          <GainersLosers />
        </section>

        {/* ── Latest News Grid ── */}
        {!loading && gridPosts.length > 0 && (
          <section>
            <SectionHeading title="Latest News" link="/news" linkLabel="More Stories" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridPosts.map(post => <NewsCard key={post.id} post={post} featured />)}
            </div>
          </section>
        )}

        {/* ── AI Section ── */}
        <AIAssistantBar />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <AIInsightTeaser variant="homepage" />
          </div>
          <AIMarketPulse />
        </section>

        <AIStockRecommendations />

        {/* ── Real Estate ── */}
        <HomeRealEstateSection />

        {/* ── Global + Commodities + Currency — clean 3-col ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Global Markets */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-[14px] text-foreground">Global Markets</span>
              <Link to="/markets" className="text-[11px] text-primary font-medium">More</Link>
            </div>
            <div className="divide-y divide-border/50">
              {liveGlobalMarkets.map(m => (
                <div key={m.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="text-[12px] font-medium text-foreground">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.region}</div>
                  </div>
                  <div className="text-right">
                    <div className="number-font text-[13px] font-semibold">{m.value}</div>
                    <div className={`text-[10px] font-medium ${m.up ? 'text-gain' : 'text-loss'}`}>{m.change}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commodities */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-semibold text-[14px] text-foreground">Commodities</span>
            </div>
            <div className="divide-y divide-border/50">
              {liveCommodities.map(c => (
                <div key={c.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className="text-[12px] font-medium text-foreground">{c.name}</span>
                  <div className="text-right">
                    <div className="number-font text-[13px] font-semibold">{c.price}</div>
                    <div className={`text-[10px] font-medium ${c.up ? 'text-gain' : 'text-loss'}`}>{c.change}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Currencies */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-[14px] text-foreground">Currency Rates</span>
              {marketDataUpdatedAt && <span className="text-[9px] text-gain font-medium">LIVE</span>}
            </div>
            <div className="divide-y divide-border/50">
              {liveCurrencies.map(c => (
                <div key={c.pair} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className="text-[12px] font-medium text-foreground">{c.pair}</span>
                  <div className="text-right">
                    <div className="number-font text-[13px] font-semibold">₹{c.rate}</div>
                    <div className={`text-[10px] font-medium ${c.up ? 'text-gain' : 'text-loss'}`}>{c.change}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Expert Picks + IPO + Analysts — sidebar-style row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Expert Picks */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-semibold text-[14px] text-foreground">Expert Picks</span>
            </div>
            <div className="divide-y divide-border/50">
              {EXPERT_PICKS.map(pick => (
                <div key={pick.stock} className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[13px] text-foreground">{pick.stock}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                      pick.reco === 'BUY' ? 'badge-gain' : 'badge-neutral'
                    }`}>{pick.reco}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{pick.analyst}</span>
                    <span className={`number-font font-semibold ${pick.upside.startsWith('+') ? 'text-gain' : 'text-loss'}`}>{pick.upside}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                    <span>CMP {pick.cmp}</span>
                    <span>Target {pick.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* IPO Corner */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-[14px] text-foreground">IPO Corner</span>
              <Link to="/markets" className="text-[11px] text-primary font-medium">All IPOs</Link>
            </div>
            <div className="divide-y divide-border/50">
              {IPO_DATA.map(ipo => (
                <div key={ipo.company} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[13px] text-foreground">{ipo.company}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                      ipo.status === 'Open' ? 'badge-gain' :
                      ipo.status === 'Upcoming' ? 'bg-amber-50 text-amber-700' :
                      'bg-muted text-muted-foreground'
                    }`}>{ipo.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Price {ipo.price}</span>
                    <span className="text-gain font-medium">GMP {ipo.gmp}</span>
                    <span>Sub {ipo.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Analysts */}
          <TopAnalysts />
        </div>

        {/* ── FII/DII ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-semibold text-[14px] text-foreground">Institutional Flows</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "FII (Equity)", net: "-₹2,841 Cr", up: false },
                { label: "DII (Equity)", net: "+₹4,123 Cr", up: true },
                { label: "FII (Debt)", net: "+₹340 Cr", up: true },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1">
                  <span className="text-[12px] font-medium text-foreground">{row.label}</span>
                  <span className={`number-font text-[13px] font-semibold ${row.up ? 'text-gain' : 'text-loss'}`}>{row.net}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-4 py-2">
              <span className="text-[10px] text-muted-foreground">Data as of Feb 17, 2026</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-semibold text-[14px] text-foreground">Market Snapshot</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: "Market Cap (NSE)", value: "₹3,87,43,250 Cr" },
                { label: "Avg Delivery %", value: "48.2%" },
                { label: "Put/Call Ratio", value: "0.92" },
                { label: "Market Width", value: "71.4%", green: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-[12px] text-muted-foreground">{item.label}</span>
                  <span className={`number-font text-[13px] font-semibold ${item.green ? 'text-gain' : 'text-foreground'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── More News ── */}
        {!loading && moreNews.length > 0 && (
          <section>
            <SectionHeading title="More From InvestingIQ" link="/news" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {moreNews.map(post => <NewsCard key={post.id} post={post} featured />)}
            </div>
          </section>
        )}

        {/* ── Why InvestingIQ ── */}
        <section className="bg-card border border-border rounded-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="font-semibold text-xl text-foreground mb-2">Why Investors Trust InvestingIQ</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Actionable insights, real-time data, and expert analysis for 50,000+ investors</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Shield, title: "SEBI Compliant", desc: "Regulatory guidelines followed", color: "text-primary" },
              { icon: Target, title: "80% Hit Rate", desc: "Outperforming benchmarks", color: "text-gain" },
              { icon: LineChart, title: "Real-time Data", desc: "Live market feed", color: "text-amber-600" },
              { icon: Users, title: "50K+ Users", desc: "Trusted community", color: "text-purple-600" },
            ].map(item => (
              <div key={item.title} className="text-center">
                <item.icon className={`h-6 w-6 ${item.color} mx-auto mb-3`} />
                <div className="font-medium text-[13px] text-foreground mb-1">{item.title}</div>
                <div className="text-[11px] text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Learning Hub ── */}
        <section>
          <SectionHeading title="Learning Hub" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, title: "Technical Analysis 101", desc: "Candlestick patterns, support & resistance", tag: "Beginner" },
              { icon: Landmark, title: "Mutual Fund Selection", desc: "Pick the right scheme for your goals", tag: "Guide" },
              { icon: BarChart3, title: "Reading Financials", desc: "Balance sheets and cash flow analysis", tag: "Intermediate" },
              { icon: DollarSign, title: "Tax-Saving Investments", desc: "Section 80C, ELSS, NPS benefits", tag: "Tax" },
              { icon: Globe, title: "IPO Investing Guide", desc: "GMP analysis and listing gains", tag: "Popular" },
              { icon: Zap, title: "Options Trading Basics", desc: "Calls, puts, and hedging strategies", tag: "Advanced" },
            ].map(item => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{item.tag}</span>
                    <h3 className="font-medium text-[13px] text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tools ── */}
        <section>
          <SectionHeading title="Tools & Calculators" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {TOOLS.map(tool => (
              <Link key={tool.name} to={tool.to}
                className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/20 transition-all group">
                <tool.icon className="h-5 w-5 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                <div className="text-[11px] font-medium text-foreground">{tool.name}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Newsletter ── */}
        <NewsletterSignup />

        {/* ── Disclaimer ── */}
        <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Disclaimer:</span> Market data may be delayed by 15 minutes. All data is for informational purposes only and does not constitute investment advice. Consult a SEBI-registered advisor.
          </p>
        </div>

      </main>
      <Footer />
    </div>
  );
}
