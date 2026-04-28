import { useState, useEffect, useRef, useMemo } from "react";
import { Search, TrendingUp, FileText, X, BarChart2, Building2, PieChart, Bitcoin, Wrench, Compass, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { STOCK_CATALOG } from "@/data/stockCatalog";
import { TOP_MUTUAL_FUNDS, TOP_CRYPTOS } from "@/data/mockMFCrypto";
import { searchStaticPages } from "@/data/staticPagesCatalog";

const ALL_STOCKS = STOCK_CATALOG;

type ResultType = "stock" | "article" | "review" | "property" | "mf" | "crypto" | "tool" | "page";

interface SearchResult {
  type: ResultType;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

const CATEGORIES: { key: ResultType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stock", label: "Stocks" },
  { key: "review", label: "Analysis" },
  { key: "article", label: "News" },
  { key: "mf", label: "Mutual Funds" },
  { key: "crypto", label: "Crypto" },
  { key: "property", label: "Real Estate" },
  { key: "tool", label: "Tools" },
  { key: "page", label: "Pages" },
];

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [activeCat, setActiveCat] = useState<ResultType | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => search(query), 120);
    return () => clearTimeout(timer);
  }, [query]);

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
    const myReq = ++reqIdRef.current;
    const lower = q.toLowerCase();
    const safe = q.replace(/[,()%*"'\\]/g, " ").trim();
    const out: SearchResult[] = [];

    // --- Local (instant) sources ---
    ALL_STOCKS.filter(s => s.symbol.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower))
      .slice(0, 5)
      .forEach(s => out.push({ type: "stock", title: s.symbol, subtitle: s.name, href: `/stocks?search=${s.symbol}`, badge: s.sector }));

    TOP_MUTUAL_FUNDS.filter(f => f.name.toLowerCase().includes(lower) || f.category.toLowerCase().includes(lower))
      .slice(0, 4)
      .forEach(f => out.push({ type: "mf", title: f.name, subtitle: `${f.category}${f.ret1y ? ` · 1Y ${f.ret1y}` : ""}`, href: f.href, badge: f.category }));

    TOP_CRYPTOS.filter(c => c.symbol.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower))
      .slice(0, 4)
      .forEach(c => out.push({ type: "crypto", title: c.symbol, subtitle: c.name, href: c.href, badge: "Crypto" }));

    searchStaticPages(q, 6).forEach(p => out.push({
      type: p.category === "Tools" ? "tool" : "page",
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
      badge: p.category,
    }));

    // Show local results immediately
    if (myReq === reqIdRef.current) {
      setResults([...out]);
    }

    // --- DB sources in parallel ---
    const [articlesRes, reviewsRes, propertiesRes, mfDbRes] = await Promise.all([
      supabase.from("blog_posts").select("title, slug, category, excerpt").eq("status", "published")
        .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%,category.ilike.%${safe}%`).limit(5),
      supabase.from("stock_reviews" as any).select("symbol, company_name, rating, sector").eq("status", "published")
        .or(`symbol.ilike.%${safe}%,company_name.ilike.%${safe}%,sector.ilike.%${safe}%`).limit(5),
      supabase.from("properties").select("title, slug, city, locality, bhk, property_type, price_display").eq("status", "active")
        .or(`title.ilike.%${safe}%,city.ilike.%${safe}%,locality.ilike.%${safe}%,developer_name.ilike.%${safe}%`).limit(5),
      supabase.from("mutual_funds" as any).select("name, slug, category, fund_house").eq("status", "active" as any)
        .or(`name.ilike.%${safe}%,category.ilike.%${safe}%,fund_house.ilike.%${safe}%`).limit(4)
        .then((r: any) => r, () => ({ data: [] as any[] })),
    ]);

    if (myReq !== reqIdRef.current) return; // stale

    (articlesRes.data ?? []).forEach((a: any) => out.push({
      type: "article", title: a.title,
      subtitle: a.excerpt?.substring(0, 70) + "…" || a.category,
      href: `/news/${a.slug}`, badge: a.category,
    }));

    ((reviewsRes.data as any[]) ?? []).forEach((r: any) => out.push({
      type: "review", title: `${r.symbol} — ${r.rating ?? "Analysis"}`, subtitle: r.company_name,
      href: `/stocks/review/${r.symbol.toLowerCase()}`, badge: r.sector,
    }));

    ((propertiesRes.data as any[]) ?? []).forEach((p: any) => out.push({
      type: "property", title: p.title,
      subtitle: `${p.city}${p.locality ? ", " + p.locality : ""} | ${p.bhk || "-"} BHK`,
      href: `/real-estate/${p.slug}`, badge: p.price_display || p.property_type,
    }));

    ((mfDbRes as any)?.data ?? []).forEach((f: any) => out.push({
      type: "mf", title: f.name, subtitle: `${f.fund_house || ""} · ${f.category || ""}`.trim(),
      href: f.slug ? `/mf/${f.slug}` : "/mf", badge: f.category,
    }));

    setResults(out);
    setLoading(false);
    setSelected(-1);
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: results.length };
    results.forEach(r => { map[r.type] = (map[r.type] || 0) + 1; });
    return map;
  }, [results]);

  const filtered = useMemo(() => {
    if (activeCat === "all") return results;
    return results.filter(r => r.type === activeCat);
  }, [results, activeCat]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, -1)); }
    else if (e.key === "Enter") {
      if (selected >= 0 && filtered[selected]) {
        navigate(filtered[selected].href);
        setQuery(""); setFocused(false);
      } else if (query.trim()) {
        navigate(`/stocks?search=${encodeURIComponent(query)}`);
        setQuery(""); setFocused(false);
      }
    }
    else if (e.key === "Escape") { setFocused(false); }
  }

  const typeIcon = (type: ResultType) => {
    if (type === "stock") return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
    if (type === "review") return <BarChart2 className="h-3.5 w-3.5 text-gain" />;
    if (type === "property") return <Building2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (type === "mf") return <PieChart className="h-3.5 w-3.5 text-violet-500" />;
    if (type === "crypto") return <Bitcoin className="h-3.5 w-3.5 text-amber-500" />;
    if (type === "tool") return <Wrench className="h-3.5 w-3.5 text-orange-500" />;
    if (type === "page") return <Compass className="h-3.5 w-3.5 text-indigo-500" />;
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
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
        placeholder="Search stocks, funds, properties, tools, news…"
        className="w-full bg-muted border border-border rounded-full pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
      />
      {query && (
        <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-card-lg z-[100] overflow-hidden flex" style={{ minHeight: 280 }}>
          {/* Category sidebar */}
          <div className="w-36 shrink-0 border-r border-border bg-muted/30 py-2">
            {CATEGORIES.map(c => {
              const count = counts[c.key] || 0;
              const disabled = c.key !== "all" && count === 0;
              return (
                <button
                  key={c.key}
                  onClick={() => !disabled && setActiveCat(c.key)}
                  disabled={disabled}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                    activeCat === c.key
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : disabled
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{c.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCat === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="flex-1 max-h-[420px] overflow-y-auto">
            {loading && results.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                Searching across the site…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
                <Info className="h-5 w-5 opacity-50" />
                No results in this category for "{query}"
              </div>
            ) : (
              <div>
                {filtered.map((r, i) => (
                  <button key={i} onClick={() => { navigate(r.href); setQuery(""); setFocused(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? "bg-primary/8" : "hover:bg-muted/60"}`}>
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
                ))}
                <div className="border-t border-border px-4 py-2.5 sticky bottom-0 bg-white flex items-center justify-between">
                  <button onClick={() => { navigate(`/stocks?search=${encodeURIComponent(query)}`); setQuery(""); setFocused(false); }}
                    className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors">
                    Search all stocks for "{query}" →
                  </button>
                  {loading && <span className="text-[10px] text-muted-foreground">Loading more…</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
