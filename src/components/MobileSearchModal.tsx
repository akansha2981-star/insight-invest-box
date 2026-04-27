import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, FileText, X, BarChart2, Building2, PieChart, Bitcoin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TOP_GAINERS, TOP_LOSERS } from "@/data/mockStocks";
import { TOP_MUTUAL_FUNDS, TOP_CRYPTOS } from "@/data/mockMFCrypto";

const ALL_STOCKS = [...TOP_GAINERS, ...TOP_LOSERS];

interface SearchResult {
  type: "stock" | "article" | "review" | "property" | "mf" | "crypto";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

interface MobileSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSearchModal({ open, onClose }: MobileSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  async function search(q: string) {
    setLoading(true);
    const lower = q.toLowerCase();
    const safe = q.replace(/[,()%*"'\\]/g, " ").trim();
    const out: SearchResult[] = [];

    const stockMatches = ALL_STOCKS.filter(s =>
      s.symbol.toLowerCase().includes(lower) ||
      s.name.toLowerCase().includes(lower)
    ).slice(0, 4);
    stockMatches.forEach(s => {
      out.push({ type: "stock", title: s.symbol, subtitle: s.name, href: `/stocks?search=${s.symbol}`, badge: s.sector });
    });

    TOP_MUTUAL_FUNDS.filter(f =>
      f.name.toLowerCase().includes(lower) || f.category.toLowerCase().includes(lower)
    ).slice(0, 3).forEach(f => {
      out.push({ type: "mf", title: f.name, subtitle: `${f.category}${f.ret1y ? ` · 1Y ${f.ret1y}` : ""}`, href: f.href, badge: f.category });
    });

    TOP_CRYPTOS.filter(c =>
      c.symbol.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)
    ).slice(0, 3).forEach(c => {
      out.push({ type: "crypto", title: c.symbol, subtitle: c.name, href: c.href, badge: "Crypto" });
    });

    const { data: articles } = await supabase
      .from("blog_posts")
      .select("title, slug, category, excerpt")
      .eq("status", "published")
      .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`)
      .limit(3);
    (articles ?? []).forEach((a: any) => {
      out.push({ type: "article", title: a.title, subtitle: a.excerpt?.substring(0, 60) + "…" || a.category, href: `/news/${a.slug}`, badge: a.category });
    });

    const { data: reviews } = await supabase
      .from("stock_reviews" as any)
      .select("symbol, company_name, rating, sector")
      .eq("status", "published")
      .or(`symbol.ilike.%${safe}%,company_name.ilike.%${safe}%`)
      .limit(3);
    ((reviews as any[]) ?? []).forEach((r: any) => {
      out.push({ type: "review", title: `${r.symbol} — ${r.rating ?? "Analysis"}`, subtitle: r.company_name, href: `/stocks/review/${r.symbol.toLowerCase()}`, badge: r.sector });
    });

    const { data: properties } = await supabase
      .from("properties")
      .select("title, slug, city, locality, bhk, price_display")
      .eq("status", "active")
      .or(`title.ilike.%${safe}%,city.ilike.%${safe}%,locality.ilike.%${safe}%`)
      .limit(3);
    ((properties as any[]) ?? []).forEach((p: any) => {
      out.push({ type: "property", title: p.title, subtitle: `${p.city}${p.locality ? ", " + p.locality : ""}${p.bhk ? " | " + p.bhk + " BHK" : ""}`, href: `/real-estate/${p.slug}`, badge: p.price_display });
    });

    setResults(out);
    setLoading(false);
  }

  function go(href: string) {
    navigate(href);
    onClose();
  }

  const typeIcon = (type: SearchResult["type"]) => {
    if (type === "stock") return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
    if (type === "review") return <BarChart2 className="h-3.5 w-3.5 text-gain" />;
    if (type === "property") return <Building2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (type === "mf") return <PieChart className="h-3.5 w-3.5 text-violet-500" />;
    if (type === "crypto") return <Bitcoin className="h-3.5 w-3.5 text-amber-500" />;
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const typeLabel = (type: SearchResult["type"]) => {
    if (type === "stock") return "Stocks";
    if (type === "review") return "Stock Analysis";
    if (type === "property") return "Properties";
    if (type === "mf") return "Mutual Funds & ETFs";
    if (type === "crypto") return "Crypto";
    return "Blog";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stocks, MF, crypto, news…"
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
            <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />
            Searching…
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No results for "<span className="font-semibold text-foreground">{query}</span>"
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="py-2">
            {(["stock", "review", "mf", "crypto", "property", "article"] as const).map(type => {
              const group = results.filter(r => r.type === type);
              if (!group.length) return null;
              return (
                <div key={type}>
                  <div className="px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {typeLabel(type)}
                  </div>
                  {group.map((r, i) => (
                    <button key={i} onClick={() => go(r.href)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/30 last:border-0">
                      <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        {typeIcon(r.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                      </div>
                      {r.badge && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold shrink-0">{r.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
            <div className="px-5 py-4 border-t border-border">
              <button onClick={() => go(`/stocks?search=${query}`)}
                className="text-sm text-primary font-semibold hover:underline">
                Search all stocks for "{query}" →
              </button>
            </div>
          </div>
        )}

        {!query && (
          <div className="px-5 py-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Popular</div>
            <div className="flex flex-wrap gap-2">
              {["RELIANCE", "TCS", "HDFCBANK", "INFY", "NIFTY", "BTC", "ETH", "Mirae"].map(q => (
                <button key={q} onClick={() => setQuery(q)}
                  className="text-sm px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 text-foreground font-medium transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
