import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { NewsCard } from "@/components/NewsCard";
import { Search, Filter } from "lucide-react";

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

const CATEGORIES = ["All", "Markets", "Economy", "Stocks", "Commodities", "IPO", "Budget"];

export default function NewsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPosts();
  }, [category]);

  async function fetchPosts() {
    setLoading(true);
    let query = supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image_url, tags, category, published_at, author_name, views_count")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (category !== "All") {
      query = query.eq("category", category);
    }

    const { data } = await query.limit(20);
    setPosts(data ?? []);
    setLoading(false);
  }

  const filtered = search
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : posts;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      <main className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Market News & Analysis</h1>
          <p className="text-muted-foreground text-sm">Expert coverage of Indian and global financial markets</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-card border border-surface pl-9 pr-4 py-2 rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  category === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-surface text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-card border border-surface rounded-lg h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-3">📰</div>
            <div className="font-medium">No articles found</div>
            <div className="text-sm mt-1">Try a different category or search term</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(post => (
              <NewsCard key={post.id} post={post} featured />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
