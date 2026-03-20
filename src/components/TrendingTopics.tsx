import { useEffect, useState } from "react";
import { TrendingUp, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TrendingTag {
  tag: string;
  heat: number;
  category: string;
}

const CATEGORY_ROUTES: Record<string, string> = {
  Economy: "/economy",
  Stocks: "/stocks",
  Markets: "/markets",
  Commodities: "/markets",
  Crypto: "/crypto",
  MF: "/mutual-funds",
  Companies: "/stocks",
  General: "/news",
};

function getTagSize(heat: number): string {
  if (heat >= 90) return "text-[14px] font-black";
  if (heat >= 80) return "text-[13px] font-bold";
  if (heat >= 70) return "text-[12px] font-semibold";
  if (heat >= 60) return "text-[11px] font-semibold";
  return "text-[10px] font-medium";
}

function getTagColor(heat: number): string {
  if (heat >= 90) return "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20";
  if (heat >= 75) return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
  if (heat >= 60) return "bg-muted text-foreground border-border hover:bg-accent";
  return "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted";
}

export function TrendingTopics() {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, []);

  async function fetchTrending() {
    try {
      const [blogRes, reviewRes] = await Promise.all([
        supabase
          .from("blog_posts")
          .select("category, tags, views_count")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50),
        supabase
          .from("stock_reviews")
          .select("symbol, sector, tags, views_count")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50),
      ]);

      const tagMap = new Map<string, { count: number; views: number; category: string }>();

      const addTag = (tag: string, category: string, views: number) => {
        const key = tag.trim();
        if (!key) return;
        const existing = tagMap.get(key);
        if (existing) {
          existing.count += 1;
          existing.views += views;
        } else {
          tagMap.set(key, { count: 1, views, category });
        }
      };

      // Blog categories and tags
      (blogRes.data ?? []).forEach((p) => {
        if (p.category) addTag(p.category, p.category, p.views_count ?? 0);
        (p.tags ?? []).forEach((t: string) => addTag(t, p.category ?? "General", p.views_count ?? 0));
      });

      // Stock symbols, sectors, tags
      (reviewRes.data ?? []).forEach((r) => {
        addTag(r.symbol, "Stocks", r.views_count ?? 0);
        if (r.sector && r.sector !== "General") addTag(r.sector, "Stocks", r.views_count ?? 0);
        (r.tags ?? []).forEach((t: string) => addTag(t, "Stocks", r.views_count ?? 0));
      });

      // Score: count * 30 + log(views) * 10, capped at 100
      const scored: TrendingTag[] = Array.from(tagMap.entries())
        .map(([tag, d]) => ({
          tag,
          heat: Math.min(100, Math.round(d.count * 30 + Math.log1p(d.views) * 10)),
          category: d.category,
        }))
        .sort((a, b) => b.heat - a.heat)
        .slice(0, 15);

      setTags(scored.length > 0 ? scored : FALLBACK_TAGS);
    } catch {
      setTags(FALLBACK_TAGS);
    } finally {
      setLoading(false);
    }
  }

  const displayed = tags.sort(() => Math.random() - 0.5);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 flex items-center gap-2 bg-muted/30">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="font-bold text-[13px] text-foreground">Trending Now</span>
        <span className="ml-auto text-[9px] text-loss font-bold animate-pulse">● LIVE</span>
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 w-20 bg-muted rounded-full animate-pulse" />
          ))
        ) : (
          displayed.map((item) => (
            <Link
              key={item.tag}
              to={CATEGORY_ROUTES[item.category] ?? "/news"}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all cursor-pointer ${getTagSize(item.heat)} ${getTagColor(item.heat)}`}
            >
              <Hash className="h-2.5 w-2.5 opacity-50" />
              {item.tag}
              {item.heat >= 85 && <Flame className="h-2.5 w-2.5 text-red-500 ml-0.5" />}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

const FALLBACK_TAGS: TrendingTag[] = [
  { tag: "RBI Policy", heat: 98, category: "Economy" },
  { tag: "IT Stocks", heat: 92, category: "Stocks" },
  { tag: "NIFTY 50", heat: 89, category: "Markets" },
  { tag: "Budget 2026", heat: 85, category: "Economy" },
  { tag: "Gold Price", heat: 82, category: "Commodities" },
  { tag: "RELIANCE", heat: 78, category: "Stocks" },
  { tag: "Crypto", heat: 75, category: "Crypto" },
  { tag: "FII Flow", heat: 72, category: "Markets" },
  { tag: "IPO Alert", heat: 70, category: "Markets" },
  { tag: "HDFC Bank", heat: 68, category: "Stocks" },
];
