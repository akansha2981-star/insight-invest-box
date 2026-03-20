import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { NewsCard } from "@/components/NewsCard";
import { Search, Newspaper } from "lucide-react";

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; tags: string[] | null; category: string | null;
  published_at: string | null; author_name: string | null; views_count: number | null;
}

const CATEGORIES = ["All", "Markets", "Economy", "Stocks", "Commodities", "Companies", "IPO", "Budget", "Global"];

export default function NewsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchPosts(); }, [category]);

  async function fetchPosts() {
    setLoading(true);
    let query = supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,tags,category,published_at,author_name,views_count")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (category !== "All") query = query.eq("category", category);
    const { data } = await query.limit(24);
    setPosts(data ?? []);
    setLoading(false);
  }

  const filtered = search ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase())) : posts;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      {/* Page hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-foreground mb-1">Market News & Analysis</h1>
              <p className="text-muted-foreground">Expert coverage of Indian and global financial markets</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-muted border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap mt-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  category === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <div key={i} className="h-72 bg-white border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Newspaper className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <div className="text-lg font-bold text-foreground">No articles found</div>
            <div className="text-sm mt-2">Try a different category or search term</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(post => <NewsCard key={post.id} post={post} featured />)}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
