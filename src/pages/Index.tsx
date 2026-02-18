import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { MarketIndices } from "@/components/MarketIndices";
import { GainersLosers } from "@/components/GainersLosers";
import { NewsCard, NewsCardSmall } from "@/components/NewsCard";
import { Footer } from "@/components/Footer";
import { TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
  views_count: number | null;
}

const MARKET_SUMMARY = [
  { label: "Advances", value: "2,184", color: "text-gain" },
  { label: "Declines", value: "873", color: "text-loss" },
  { label: "Unchanged", value: "146", color: "text-neutral" },
  { label: "Total Traded", value: "₹94,238 Cr", color: "text-foreground" },
  { label: "52W High", value: "483", color: "text-gold" },
  { label: "52W Low", value: "127", color: "text-muted-foreground" },
];

const COMMODITY_SNAPSHOT = [
  { name: "Gold (MCX)", price: "₹72,450", change: "+0.53%", up: true },
  { name: "Silver (MCX)", price: "₹86,120", change: "+0.28%", up: true },
  { name: "Crude Oil (MCX)", price: "₹6,824", change: "-0.66%", up: false },
  { name: "USD/INR", price: "₹83.12", change: "-0.17%", up: false },
  { name: "EUR/INR", price: "₹90.45", change: "+0.12%", up: true },
];

export default function Index() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image_url, tags, category, published_at, author_name, views_count")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(10);
    setPosts(data ?? []);
    setLoading(false);
  }

  const featuredPosts = posts.slice(0, 3);
  const latestPosts = posts.slice(3, 8);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Market status bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gain animate-pulse" />
            <span className="text-sm font-medium text-foreground">Markets Open</span>
            <span className="text-xs text-muted-foreground">· Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <button
            onClick={() => { setLastUpdated(new Date()); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Market Indices */}
        <MarketIndices />

        {/* Market summary strip */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {MARKET_SUMMARY.map((item) => (
            <div key={item.label} className="bg-card border border-surface rounded p-3 text-center">
              <div className={`number-font text-base font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: News */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured news */}
            <div>
              <div className="section-header">
                <h2 className="text-base font-bold text-foreground">Top Stories</h2>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-card border border-surface rounded-lg h-64 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {featuredPosts.map(post => (
                    <NewsCard key={post.id} post={post} featured />
                  ))}
                </div>
              )}
            </div>

            {/* Latest news list */}
            <div>
              <div className="section-header flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">Latest News</h2>
                <Link to="/news" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  View All <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div className="bg-card border border-surface rounded-lg p-2">
                {loading ? (
                  <div className="space-y-3 p-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-surface-2 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  latestPosts.map(post => (
                    <NewsCard key={post.id} post={post} />
                  ))
                )}
              </div>
            </div>

            {/* Commodity Snapshot */}
            <div>
              <div className="section-header">
                <h2 className="text-base font-bold text-foreground">Commodities & Currency</h2>
              </div>
              <div className="bg-card border border-surface rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-surface">
                  {COMMODITY_SNAPSHOT.map(item => (
                    <div key={item.name} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors">
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="number-font font-semibold text-foreground">{item.price}</span>
                        <span className={`text-sm font-semibold ${item.up ? 'text-gain' : 'text-loss'}`}>{item.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Gainers/Losers + Sidebar */}
          <div className="space-y-6">
            <GainersLosers />

            {/* Latest news sidebar */}
            <div className="bg-card border border-surface rounded-lg overflow-hidden">
              <div className="border-b border-surface px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground">Breaking News</h3>
                <Link to="/news" className="text-xs text-primary">All →</Link>
              </div>
              <div className="p-2">
                {posts.slice(0, 6).map(post => (
                  <NewsCardSmall key={post.id} post={post} />
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-card border border-surface rounded-lg p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Market Pulse</h3>
              <div className="space-y-3">
                {[
                  { label: "FII Net Buy/Sell", value: "+₹2,345 Cr", up: true },
                  { label: "DII Net Buy/Sell", value: "-₹1,102 Cr", up: false },
                  { label: "Total Market Cap (BSE)", value: "₹398.7 L Cr", up: true },
                  { label: "India VIX", value: "13.42 (-5.2%)", up: true },
                  { label: "Nifty P/E", value: "22.4x", up: null },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-surface/50 last:border-0">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-xs font-semibold number-font ${item.up === null ? 'text-foreground' : item.up ? 'text-gain' : 'text-loss'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
