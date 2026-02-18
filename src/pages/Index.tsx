import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { MarketIndices } from "@/components/MarketIndices";
import { GainersLosers } from "@/components/GainersLosers";
import { NewsCard, NewsCardHero, NewsCardSmall } from "@/components/NewsCard";
import { Footer } from "@/components/Footer";
import {
  RefreshCw, ExternalLink, ArrowUp, ArrowDown, TrendingUp,
  Flame, Star, Globe, BarChart3, Zap, ChevronRight, Clock,
  Building2, Landmark, Leaf, Cpu, Pill, Car, Home, ShoppingBag
} from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; tags: string[] | null; category: string | null;
  published_at: string | null; author_name: string | null; views_count: number | null;
}

/* ── Static data ─────────────────────────────────────────────────── */
const MARKET_STATS = [
  { label: "Advances", value: "2,184", color: "text-gain", bg: "bg-[hsl(var(--gain-light))]" },
  { label: "Declines", value: "873",   color: "text-loss", bg: "bg-[hsl(var(--loss-light))]" },
  { label: "Unchanged", value: "146",  color: "text-muted-foreground", bg: "bg-muted" },
  { label: "Total Traded", value: "₹94,238 Cr", color: "text-foreground", bg: "bg-muted" },
  { label: "52W Highs", value: "483",  color: "text-gain", bg: "bg-[hsl(var(--gain-light))]" },
  { label: "52W Lows", value: "127",   color: "text-loss", bg: "bg-[hsl(var(--loss-light))]" },
];

const COMMODITIES = [
  { name: "Gold (MCX)", price: "₹72,450", change: "+0.53%", chgAbs: "+₹382", up: true },
  { name: "Silver (MCX)", price: "₹86,120", change: "+0.28%", chgAbs: "+₹241", up: true },
  { name: "Crude Oil (MCX)", price: "₹6,824", change: "-0.66%", chgAbs: "-₹45", up: false },
  { name: "Natural Gas", price: "₹237.80", change: "+1.24%", chgAbs: "+₹2.92", up: true },
  { name: "Copper", price: "₹782.50", change: "-0.38%", chgAbs: "-₹3.00", up: false },
  { name: "Zinc", price: "₹256.40", change: "+0.82%", chgAbs: "+₹2.10", up: true },
];

const CURRENCIES = [
  { pair: "USD / INR", rate: "83.12", change: "-0.14", up: false },
  { pair: "EUR / INR", rate: "90.45", change: "+0.12", up: true },
  { pair: "GBP / INR", rate: "105.82", change: "-0.25", up: false },
  { pair: "JPY / INR", rate: "0.5524", change: "+0.01", up: true },
  { pair: "AED / INR", rate: "22.63", change: "-0.03", up: false },
];

const GLOBAL_MARKETS = [
  { name: "Dow Jones", value: "38,654.42", change: "+0.76%", up: true, country: "🇺🇸" },
  { name: "S&P 500", value: "5,137.08", change: "+0.82%", up: true, country: "🇺🇸" },
  { name: "NASDAQ", value: "16,214.75", change: "+1.03%", up: true, country: "🇺🇸" },
  { name: "FTSE 100", value: "7,728.35", change: "-0.15%", up: false, country: "🇬🇧" },
  { name: "Nikkei 225", value: "38,487.90", change: "+0.62%", up: true, country: "🇯🇵" },
  { name: "Hang Seng", value: "16,512.92", change: "-0.44%", up: false, country: "🇭🇰" },
  { name: "Shanghai Comp.", value: "3,054.73", change: "+0.31%", up: true, country: "🇨🇳" },
  { name: "DAX", value: "17,842.50", change: "+0.55%", up: true, country: "🇩🇪" },
];

const IPO_DATA = [
  { company: "Bajaj Housing Finance", price: "₹70", open: "₹70 - ₹78", gmp: "₹12", status: "Open", sub: "2.3x" },
  { company: "Premier Energies", price: "₹450", open: "₹445 - ₹455", gmp: "₹38", status: "Upcoming", sub: "—" },
  { company: "Ola Electric", price: "₹76", open: "₹72 - ₹76", gmp: "₹5", status: "Listed", sub: "4.27x" },
  { company: "Vibhor Steel Tubes", price: "₹141", open: "₹138 - ₹141", gmp: "₹22", status: "Listed", sub: "312x" },
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

const MARKET_PULSE = [
  { label: "FII Net (Today)", value: "+₹2,345 Cr", up: true },
  { label: "DII Net (Today)", value: "-₹1,102 Cr", up: false },
  { label: "Total Market Cap (BSE)", value: "₹398.7 L Cr", up: null },
  { label: "India VIX", value: "13.42 ▼5.2%", up: true },
  { label: "Nifty P/E", value: "22.4x", up: null },
  { label: "Nifty P/B", value: "3.8x", up: null },
  { label: "Nifty EPS", value: "₹985.42", up: null },
  { label: "Dividend Yield", value: "1.24%", up: null },
];

const EXPERT_PICKS = [
  { stock: "RELIANCE", reco: "BUY", target: "₹2,920", cmp: "₹2,741", upside: "+6.5%", analyst: "Motilal Oswal" },
  { stock: "HDFCBANK", reco: "BUY", target: "₹1,800", cmp: "₹1,623", upside: "+10.9%", analyst: "Kotak Securities" },
  { stock: "BAJFINANCE", reco: "HOLD", target: "₹7,500", cmp: "₹7,284", upside: "+3.0%", analyst: "ICICI Direct" },
  { stock: "ADANIPORTS", reco: "SELL", target: "₹1,200", cmp: "₹1,312", upside: "-8.5%", analyst: "Jefferies" },
  { stock: "SUNPHARMA", reco: "BUY", target: "₹1,500", cmp: "₹1,342", upside: "+11.8%", analyst: "HDFC Securities" },
];

/* ── Helper components ────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, title, link, linkLabel = "View All" }: { icon?: any; title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-red-600 rounded-full" />
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-bold text-base text-foreground">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
          {linkLabel} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-border text-center`}>
      <div className={`number-font text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1 font-medium">{label}</div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function Index() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [breakingIdx, setBreakingIdx] = useState(0);

  const BREAKING = [
    "🔴 Sensex surges 812 points; IT stocks lead rally",
    "📊 RBI holds repo rate at 6.5% for sixth consecutive time",
    "💰 Rupee strengthens to 83.12 against USD",
    "🏦 HDFC Bank Q3 net profit rises 2.7% YoY to ₹16,373 Cr",
    "🌍 US Fed signals three rate cuts in 2025",
  ];

  useEffect(() => {
    fetchPosts();
    const newsTimer = setInterval(() => setBreakingIdx(i => (i + 1) % BREAKING.length), 4000);
    const refreshTimer = setInterval(() => setLastUpdated(new Date()), 30000);
    return () => { clearInterval(newsTimer); clearInterval(refreshTimer); };
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,tags,category,published_at,author_name,views_count")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(15);
    setPosts(data ?? []);
    setLoading(false);
  }

  const heroPost = posts[0];
  const featuredPosts = posts.slice(1, 4);
  const sidePosts = posts.slice(4, 10);
  const latestPosts = posts.slice(4, 12);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      {/* ─── Breaking news bar ─── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">BREAKING</span>
          </div>
          <div className="overflow-hidden flex-1 relative h-5">
            <p className="text-sm text-foreground font-medium truncate transition-all duration-500">
              {BREAKING[breakingIdx]}
            </p>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        {/* ─── Market Indices ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gain animate-pulse" />
                <span className="text-xs font-semibold text-gain">Markets Open</span>
              </div>
              <span className="text-xs text-muted-foreground">· Auto-refreshing</span>
            </div>
            <button onClick={() => setLastUpdated(new Date())} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <MarketIndices />
        </section>

        {/* ─── Market breadth stats ─── */}
        <section className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {MARKET_STATS.map(s => <StatCard key={s.label} {...s} />)}
        </section>

        {/* ─── Sector heatmap ─── */}
        <section>
          <SectionHeading icon={BarChart3} title="Sector Performance" link="/markets" />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {SECTORS.map(sec => (
              <div
                key={sec.name}
                className={`rounded-xl p-3 text-center border cursor-pointer transition-all hover:scale-105 ${
                  sec.up ? 'bg-[hsl(var(--gain-light))] border-[hsl(var(--gain-mid))]' : 'bg-[hsl(var(--loss-light))] border-[hsl(var(--loss-mid))]'
                }`}
              >
                <sec.icon className={`h-4 w-4 mx-auto mb-1.5 ${sec.up ? 'text-gain' : 'text-loss'}`} />
                <div className="text-xs font-bold text-foreground">{sec.name}</div>
                <div className={`text-[11px] font-semibold mt-0.5 ${sec.up ? 'text-gain' : 'text-loss'}`}>{sec.change}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Main content grid: News + Sidebar ─── */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: hero news + grid */}
            <div className="lg:col-span-3 space-y-6">
              <SectionHeading icon={Flame} title="Top Stories" link="/news" />

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 h-96 bg-muted rounded-2xl animate-pulse" />
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Hero */}
                  <div className="md:col-span-2">
                    {heroPost && <NewsCardHero post={heroPost} />}
                  </div>
                  {/* Side stack */}
                  <div className="space-y-3">
                    {featuredPosts.map(post => (
                      <NewsCard key={post.id} post={post} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Featured grid */}
              {!loading && latestPosts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {latestPosts.slice(0, 4).map(post => (
                    <NewsCard key={post.id} post={post} featured />
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <aside className="space-y-5">
              {/* Gainers / Losers */}
              <GainersLosers />

              {/* Latest News */}
              <div className="bg-white border border-border rounded-xl shadow-card">
                <div className="border-b border-border px-4 py-3.5 flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> Latest News
                  </span>
                  <Link to="/news" className="text-xs font-semibold text-primary">All →</Link>
                </div>
                <div className="p-4">
                  {loading
                    ? [1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded mb-3 animate-pulse" />)
                    : posts.slice(0, 8).map(post => <NewsCardSmall key={post.id} post={post} />)
                  }
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ─── Gainers / Losers full section ─── */}
        <section>
          <SectionHeading icon={TrendingUp} title="Market Movers" link="/stocks" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GainersLosers />
            {/* Expert Picks */}
            <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
              <div className="border-b border-border px-5 py-3.5 flex items-center gap-2 bg-muted/30">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-sm text-foreground">Expert Stock Picks</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Stock</th>
                      <th className="text-center px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Reco</th>
                      <th className="text-right px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">CMP</th>
                      <th className="text-right px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Target</th>
                      <th className="text-right px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Upside</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXPERT_PICKS.map((pick) => (
                      <tr key={pick.stock} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                        <td className="px-5 py-3">
                          <div className="font-bold text-foreground">{pick.stock}</div>
                          <div className="text-[10px] text-muted-foreground">{pick.analyst}</div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                            pick.reco === 'BUY' ? 'badge-gain' : pick.reco === 'SELL' ? 'badge-loss' : 'badge-neutral'
                          }`}>{pick.reco}</span>
                        </td>
                        <td className="px-3 py-3 text-right number-font text-sm font-semibold text-foreground">{pick.cmp}</td>
                        <td className="px-3 py-3 text-right number-font text-sm font-semibold text-foreground">{pick.target}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`number-font text-sm font-bold ${pick.upside.startsWith('+') ? 'text-gain' : 'text-loss'}`}>
                            {pick.upside}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border p-3.5 text-center bg-muted/20">
                <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80">View All Recommendations →</a>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Commodities & Currencies ─── */}
        <section>
          <SectionHeading icon={Globe} title="Commodities & Currencies" link="/markets" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Commodities */}
            <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
              <div className="border-b border-border px-5 py-3.5 bg-muted/30">
                <span className="font-bold text-sm text-foreground">🥇 Commodities (MCX)</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Commodity</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Price</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Change</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">%</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMODITIES.map(c => (
                    <tr key={c.name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-5 py-2.5 text-sm font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-2.5 text-right number-font font-semibold text-foreground">{c.price}</td>
                      <td className={`px-4 py-2.5 text-right number-font text-xs font-medium ${c.up ? 'text-gain' : 'text-loss'}`}>{c.chgAbs}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={c.up ? 'badge-gain' : 'badge-loss'}>{c.change}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Currencies */}
            <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
              <div className="border-b border-border px-5 py-3.5 bg-muted/30">
                <span className="font-bold text-sm text-foreground">💱 Currency Rates</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/20 border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Pair</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Rate</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENCIES.map(c => (
                    <tr key={c.pair} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-5 py-3 text-sm font-medium text-foreground">{c.pair}</td>
                      <td className="px-4 py-3 text-right number-font text-base font-bold text-foreground">₹{c.rate}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`number-font text-sm font-semibold ${c.up ? 'text-gain' : 'text-loss'}`}>
                          {c.up ? '+' : ''}{c.change}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Market Pulse */}
              <div className="border-t border-border px-5 py-3.5 bg-muted/30">
                <span className="font-bold text-sm text-foreground">📡 Market Pulse</span>
              </div>
              <div className="grid grid-cols-2 gap-0">
                {MARKET_PULSE.map((item) => (
                  <div key={item.label} className="px-5 py-2.5 border-b border-r border-border/50 odd:border-r even:border-r-0 last:border-b-0 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    <span className={`number-font text-xs font-bold ${item.up === null ? 'text-foreground' : item.up ? 'text-gain' : 'text-loss'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Global Markets ─── */}
        <section>
          <SectionHeading icon={Globe} title="Global Markets" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y divide-border">
              {GLOBAL_MARKETS.map(m => (
                <div key={m.name} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="text-lg mb-1">{m.country}</div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{m.name}</div>
                  <div className="number-font text-sm font-bold text-foreground">{m.value}</div>
                  <div className={`flex items-center gap-0.5 text-[11px] font-semibold mt-0.5 ${m.up ? 'text-gain' : 'text-loss'}`}>
                    {m.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                    {m.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── IPO Section ─── */}
        <section>
          <SectionHeading icon={Star} title="IPO Corner" link="/markets" linkLabel="All IPOs" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Company", "Issue Price", "Price Band", "GMP", "Status", "Subscription"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {IPO_DATA.map((ipo) => (
                    <tr key={ipo.company} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{ipo.company}</td>
                      <td className="px-5 py-3.5 number-font font-bold text-foreground">{ipo.price}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{ipo.open}</td>
                      <td className="px-5 py-3.5 number-font font-semibold text-gain">{ipo.gmp}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
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

        {/* ─── More News ─── */}
        <section>
          <SectionHeading icon={Flame} title="More From MarketPulse" link="/news" />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {posts.slice(5, 9).map(post => (
                <NewsCard key={post.id} post={post} featured />
              ))}
            </div>
          )}
        </section>

        {/* ─── Market Insights / Educational strip ─── */}
        <section>
          <SectionHeading title="Tools & Calculators" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: "SIP Calculator", emoji: "💰", desc: "Plan your investments" },
              { name: "EMI Calculator", emoji: "🏠", desc: "Home & auto loans" },
              { name: "Stock Screener", emoji: "🔍", desc: "Filter & sort stocks" },
              { name: "Portfolio Tracker", emoji: "📊", desc: "Track your returns" },
              { name: "Tax Calculator", emoji: "📋", desc: "Capital gains tax" },
              { name: "FD Returns", emoji: "🏦", desc: "Fixed deposit yields" },
            ].map(tool => (
              <div key={tool.name} className="bg-white border border-border rounded-xl p-4 hover:shadow-card-md hover:border-primary/20 transition-all cursor-pointer text-center group">
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
