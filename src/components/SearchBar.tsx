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

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function search(q: string) {
    setLoading(true);
    const lower = q.toLowerCase();
    // Sanitize for PostgREST or-filter: remove commas, parens, % and other reserved chars
    const safe = q.replace(/[,()%*"'\\]/g, " ").trim();
    const out: SearchResult[] = [];

    // Stock search (from mock data)
    const stockMatches = ALL_STOCKS.filter(s =>
      s.symbol.toLowerCase().includes(lower) ||
      s.name.toLowerCase().includes(lower)
    ).slice(0, 4);
    stockMatches.forEach(s => {
      out.push({
        type: "stock",
        title: s.symbol,
        subtitle: s.name,
        href: `/stocks?search=${s.symbol}`,
        badge: s.sector,
      });
    });

    // Mutual Funds & ETFs (mock data)
    const mfMatches = TOP_MUTUAL_FUNDS.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.category.toLowerCase().includes(lower)
    ).slice(0, 3);
    mfMatches.forEach(f => {
      out.push({
        type: "mf",
        title: f.name,
        subtitle: `${f.category}${f.ret1y ? ` · 1Y ${f.ret1y}` : ""}`,
        href: f.href,
        badge: f.category,
      });
    });

    // Cryptocurrencies (mock data)
    const cryptoMatches = TOP_CRYPTOS.filter(c =>
      c.symbol.toLowerCase().includes(lower) ||
      c.name.toLowerCase().includes(lower)
    ).slice(0, 3);
    cryptoMatches.forEach(c => {
      out.push({
        type: "crypto",
        title: c.symbol,
        subtitle: c.name,
        href: c.href,
        badge: "Crypto",
      });
    });

    // Articles search from DB
    const { data: articles } = await supabase
      .from("blog_posts")
      .select("title, slug, category, excerpt")
      .eq("status", "published")
      .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`)
      .limit(3);

    (articles ?? []).forEach((a: any) => {
      out.push({
        type: "article",
        title: a.title,
        subtitle: a.excerpt?.substring(0, 60) + "…" || a.category,
        href: `/news/${a.slug}`,
        badge: a.category,
      });
    });

    // Stock reviews search from DB
    const { data: reviews } = await supabase
      .from("stock_reviews" as any)
      .select("symbol, company_name, rating, sector")
      .eq("status", "published")
      .or(`symbol.ilike.%${safe}%,company_name.ilike.%${safe}%`)
      .limit(3);

    ((reviews as any[]) ?? []).forEach((r: any) => {
      out.push({
        type: "review",
        title: `${r.symbol} — ${r.rating ?? "Analysis"}`,
        subtitle: r.company_name,
        href: `/stocks/review/${r.symbol.toLowerCase()}`,
        badge: r.sector,
      });
    });

    // Properties search from DB
    const { data: properties } = await supabase
      .from("properties")
      .select("title, slug, city, locality, bhk, property_type, price_display")
      .eq("status", "active")
      .or(`title.ilike.%${safe}%,city.ilike.%${safe}%,locality.ilike.%${safe}%,developer_name.ilike.%${safe}%`)
      .limit(3);

    ((properties as any[]) ?? []).forEach((p: any) => {
      out.push({
        type: "property",
        title: p.title,
        subtitle: `${p.city}${p.locality ? ", " + p.locality : ""} | ${p.bhk || "-"} BHK`,
        href: `/real-estate/${p.slug}`,
        badge: p.price_display || p.property_type,
      });
    });

    setResults(out);
    setLoading(false);
    setSelected(-1);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, -1)); }
    else if (e.key === "Enter") {
      if (selected >= 0 && results[selected]) {
        navigate(results[selected].href);
        setQuery(""); setFocused(false);
      }
    }
    else if (e.key === "Escape") { setFocused(false); }
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

  const showDropdown = focused && (query.trim().length > 0);

  return (
    <div ref={containerRef} className={`hidden md:flex relative flex-1 max-w-lg transition-all ${focused ? "max-w-xl" : ""}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKey}
        placeholder="Search stocks, reviews, news…"
        className="w-full bg-muted border border-border rounded-full pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
      />
      {query && (
        <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-card-lg z-[100] overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-sm text-muted-foreground text-center">No results for "{query}"</div>
          ) : (
            <div>
              {/* Group by type */}
              {(["stock", "review", "mf", "crypto", "property", "article"] as const).map(type => {
                const group = results.filter(r => r.type === type);
                if (!group.length) return null;
                return (
                  <div key={type}>
                    <div className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {typeLabel(type)}
                    </div>
                    {group.map((r, i) => {
                      const globalIdx = results.indexOf(r);
                      return (
                        <button key={i} onClick={() => { navigate(r.href); setQuery(""); setFocused(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${globalIdx === selected ? "bg-primary/8" : "hover:bg-muted/60"}`}>
                          <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
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
                      );
                    })}
                  </div>
                );
              })}
              <div className="border-t border-border px-4 py-2.5">
                <button onClick={() => { navigate(`/stocks?search=${query}`); setQuery(""); setFocused(false); }}
                  className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors">
                  Search all stocks for "{query}" →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
