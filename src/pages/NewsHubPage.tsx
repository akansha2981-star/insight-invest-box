import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StockTicker } from "@/components/StockTicker";
import { Clock, TrendingUp, Newspaper, Search, Sparkles } from "lucide-react";

interface NewsItem {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; category: string | null; tags: string[] | null;
  published_at: string | null; author_name: string | null;
}

const CATEGORY_FILTERS = [
  "All", "Markets", "Stock Market", "Mutual Funds", "Real Estate", "Economy",
  "Personal Finance", "IPOs", "Banking", "Cryptocurrency", "Government Policies",
  "Global Markets", "Business News",
];

function readTime(text: string | null): number {
  if (!text) return 3;
  const words = text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 220));
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function NewsHubPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,category,tags,published_at,author_name,content")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(200);
      setItems((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (activeCat !== "All") list = list.filter(i => (i.category ?? "").toLowerCase().includes(activeCat.toLowerCase()) || activeCat.toLowerCase().includes((i.category ?? "").toLowerCase()));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || (i.excerpt ?? "").toLowerCase().includes(q) || (i.tags ?? []).some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [items, activeCat, query]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, NewsItem[]>();
    for (const it of filtered) {
      const k = it.published_at ? new Date(it.published_at).toDateString() : "Unknown";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const headlineStory = filtered[0];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>News Hub | InvestingIQ — AI-curated Indian finance news</title>
        <meta name="description" content="Live timeline of Indian stock market, mutual fund, IPO, economy, banking and crypto news with AI-powered analysis and insights." />
        <link rel="canonical" href="https://www.investingiq.in/news-hub" />
        <meta property="og:title" content="News Hub | InvestingIQ" />
        <meta property="og:description" content="AI-curated Indian finance news with deep market insights." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.investingiq.in/news-hub" />
      </Helmet>
      <Header />
      <StockTicker />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-purple-50/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>
            <Sparkles className="h-3.5 w-3.5" /> AI-Curated Live News
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">News Hub</h1>
          <p className="text-base text-muted-foreground mt-2 max-w-2xl">
            Real-time Indian finance news, analysed by AI. Every article comes with market impact,
            investor implications, sentiment, FAQs and educational context.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search news, tags, companies…"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORY_FILTERS.map(c => (
              <button key={c} onClick={() => setActiveCat(c)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap transition-colors ${activeCat === c ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured / Headline */}
      {headlineStory && !query && activeCat === "All" && (
        <section className="max-w-7xl mx-auto px-4 pt-8">
          <Link to={`/news/${headlineStory.slug}`} className="group block bg-white border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-lg transition-shadow">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="aspect-[16/10] lg:aspect-auto bg-muted relative overflow-hidden">
                {headlineStory.cover_image_url ? (
                  <img src={headlineStory.cover_image_url} alt={headlineStory.title} loading="eager" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-100 flex items-center justify-center">
                    <Newspaper className="h-16 w-16 text-primary/40" />
                  </div>
                )}
                <span className="absolute top-4 left-4 text-[10px] font-bold uppercase bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1"><TrendingUp className="h-3 w-3" />Top Story</span>
              </div>
              <div className="p-6 lg:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase text-[10px]">{headlineStory.category ?? "Markets"}</span>
                  <span>{new Date(headlineStory.published_at ?? "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {formatTime(headlineStory.published_at)}</span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{headlineStory.title}</h2>
                {headlineStory.excerpt && <p className="text-base text-muted-foreground mt-3 line-clamp-3">{headlineStory.excerpt}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-4">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {readTime((headlineStory as any).content ?? headlineStory.excerpt)} min read</span>
                  {headlineStory.author_name && <span>· {headlineStory.author_name}</span>}
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Timeline */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-card border border-border rounded-xl h-72 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No news matches your filter.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(([date, group]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-5 sticky top-[64px] z-10 bg-background/95 backdrop-blur py-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{formatDateHeading(date)}</h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{group.length} {group.length === 1 ? "article" : "articles"}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.map(it => (
                    <Link key={it.id} to={`/news/${it.slug}`} className="group bg-white border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                        {it.cover_image_url ? (
                          <img src={it.cover_image_url} alt={it.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-100/50 flex items-center justify-center">
                            <Newspaper className="h-10 w-10 text-primary/40" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-white/95 text-primary px-2 py-0.5 rounded">{it.category ?? "News"}</span>
                        <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/70 text-white px-2 py-0.5 rounded flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatTime(it.published_at)}</span>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{it.title}</h4>
                        {it.excerpt && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{it.excerpt}</p>}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{readTime((it as any).content ?? it.excerpt)} min</span>
                          {it.tags && it.tags[0] && <span>· #{it.tags[0]}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
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
