import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StockTicker } from "@/components/StockTicker";
import { Clock, Search, Sparkles, TrendingUp, Radio, Filter } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  author_name: string | null;
}

const CATEGORY_FILTERS = [
  "All", "Markets", "Stock Market", "Mutual Funds", "Real Estate", "Economy",
  "Personal Finance", "IPOs", "Banking", "Cryptocurrency", "Government Policies",
  "Global Markets", "Business News",
];

const LIVE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function isLive(iso: string | null, now: number) {
  if (!iso) return false;
  return now - new Date(iso).getTime() < LIVE_THRESHOLD_MS;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateHeading(key: string): string {
  if (key === "Unknown") return "Earlier";
  const d = new Date(key);
  const today = new Date();
  const yest = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "";
  const diff = now - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function NewsHubPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(Date.now());

  async function fetchNews() {
    const { data } = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,category,tags,published_at,author_name")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(200);
    setItems((data as NewsItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchNews();
    const tick = setInterval(() => setNow(Date.now()), 30_000); // keep LIVE badges fresh
    const poll = setInterval(fetchNews, 90_000); // auto-pull new news
    return () => { clearInterval(tick); clearInterval(poll); };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== "All") {
      list = list.filter(i => {
        const c = (i.category ?? "").toLowerCase();
        const a = activeCat.toLowerCase();
        return c.includes(a) || a.includes(c);
      });
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.excerpt ?? "").toLowerCase().includes(q) ||
        (i.tags ?? []).some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, activeCat, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, NewsItem[]>();
    for (const it of filtered) {
      const k = it.published_at ? new Date(it.published_at).toDateString() : "Unknown";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const liveCount = filtered.filter(i => isLive(i.published_at, now)).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>News Hub | InvestingIQ — Live Indian finance news timeline</title>
        <meta name="description" content="Real-time timeline of Indian stock market, mutual fund, IPO, economy, banking and crypto news with deep AI analysis. LIVE updates every minute." />
        <link rel="canonical" href="https://www.investingiq.in/news-hub" />
        <meta property="og:title" content="News Hub | InvestingIQ" />
        <meta property="og:description" content="Live AI-curated Indian finance news with deep market insights." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.investingiq.in/news-hub" />
      </Helmet>
      <Header />
      <StockTicker />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-purple-50/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Live News Timeline</span>
            <Sparkles className="h-3.5 w-3.5 ml-1" />
            <span className="text-muted-foreground font-medium normal-case tracking-normal">AI-curated</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">News Hub</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
            A real-time chronological feed of Indian finance news. Every story includes AI-powered market impact,
            investor implications, sector breakdowns, FAQs, and SEO-rich analysis.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search news, tags, companies…"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {liveCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                </span>
                {liveCount} LIVE {liveCount === 1 ? "story" : "stories"}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category chips — sticky */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block flex-shrink-0" />
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {CATEGORY_FILTERS.map(c => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeCat === c
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        {loading ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl h-28 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No news matches your filter.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(([dateKey, group]) => (
              <div key={dateKey} className="relative">
                {/* Date heading */}
                <div className="sticky top-[60px] z-20 bg-background/95 backdrop-blur py-2 mb-4 flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
                    {formatDateHeading(dateKey)}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {group.length} {group.length === 1 ? "story" : "stories"}
                  </span>
                </div>

                {/* Timeline rail + cards */}
                <div className="relative pl-6 sm:pl-10 lg:pl-12">
                  {/* Vertical rail */}
                  <div className="absolute left-2 sm:left-4 lg:left-5 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-border" />

                  <ol className="space-y-4 sm:space-y-5">
                    {group.map(it => {
                      const live = isLive(it.published_at, now);
                      return (
                        <li key={it.id} className="relative">
                          {/* Timeline dot */}
                          <span
                            className={`absolute -left-[18px] sm:-left-[26px] lg:-left-[31px] top-5 flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full ring-4 ring-background ${
                              live ? "bg-red-600" : "bg-primary"
                            }`}
                          >
                            {live && (
                              <span className="absolute inset-0 rounded-full bg-red-500 opacity-60 animate-ping" />
                            )}
                          </span>

                          <Link
                            to={`/news/${it.slug}`}
                            className="group block bg-white border border-border hover:border-primary/40 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {it.category ?? "Markets"}
                              </span>
                              {live && (
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded flex items-center gap-1">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                                  </span>
                                  LIVE
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span className="number-font">{formatTime(it.published_at)}</span>
                                <span className="opacity-60">·</span>
                                <span>{relativeTime(it.published_at, now)}</span>
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {it.title}
                            </h3>

                            {it.excerpt && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{it.excerpt}</p>
                            )}

                            {it.tags && it.tags.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-3">
                                {it.tags.slice(0, 4).map(t => (
                                  <span key={t} className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/60">
                              <span className="flex items-center gap-1 group-hover:text-primary transition-colors font-medium">
                                <TrendingUp className="h-3 w-3" /> Read deep analysis
                              </span>
                              {it.author_name && <span className="ml-auto">{it.author_name}</span>}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
