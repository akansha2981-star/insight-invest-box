import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Search, Star, BarChart2, ChevronRight, Eye, Calendar } from "lucide-react";

interface StockReview {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  exchange: string;
  current_price: number | null;
  target_price: number | null;
  rating: string | null;
  analyst_name: string | null;
  summary: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  views_count: number | null;
  published_at: string | null;
  tags: string[] | null;
}

const RATING_STYLES: Record<string, string> = {
  "STRONG BUY": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "BUY": "bg-green-100 text-green-700 border-green-300",
  "HOLD": "bg-amber-100 text-amber-700 border-amber-300",
  "SELL": "bg-red-100 text-red-700 border-red-300",
  "STRONG SELL": "bg-rose-100 text-rose-800 border-rose-300",
};

const ALL_SECTORS = ["All", "IT", "Banking", "Pharma", "Auto", "FMCG", "Energy", "Finance", "Infra", "Telecom", "Power", "Realty"];

export default function StockReviewPage() {
  const [reviews, setReviews] = useState<StockReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [rating, setRating] = useState("All");

  useEffect(() => {
    async function fetchReviews() {
      const { data } = await supabase
        .from("stock_reviews" as any)
        .select("id,symbol,company_name,sector,exchange,current_price,target_price,rating,analyst_name,summary,cover_image_url,is_featured,views_count,published_at,tags")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      setReviews((data as any[]) ?? []);
      setLoading(false);
    }
    fetchReviews();
  }, []);

  const filtered = reviews.filter(r => {
    const matchSearch = !search ||
      r.symbol.toLowerCase().includes(search.toLowerCase()) ||
      r.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchSector = sector === "All" || r.sector === sector;
    const matchRating = rating === "All" || r.rating === rating;
    return matchSearch && matchSector && matchRating;
  });

  const featured = filtered.filter(r => r.is_featured);
  const regular = filtered.filter(r => !r.is_featured);

  const upside = (r: StockReview) => {
    if (!r.current_price || !r.target_price) return null;
    return (((r.target_price - r.current_price) / r.current_price) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Stock Reviews</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Stock Reviews & Analysis</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">In-depth research reports with financials, charts, investment thesis, and analyst ratings — all in one place.</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-card mb-8 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by stock, company, tag…"
              className="w-full bg-muted/40 border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ALL_SECTORS.slice(0, 7).map(s => (
              <button key={s} onClick={() => setSector(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sector === s ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                {s}
              </button>
            ))}
          </div>
          <select value={rating} onChange={e => setRating(e.target.value)}
            className="bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary">
            <option value="All">All Ratings</option>
            {["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading reviews…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No reviews found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-red-600 rounded-full" />
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <h2 className="font-bold text-base text-foreground">Featured Analysis</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {featured.map(r => (
                    <ReviewCard key={r.id} review={r} upside={upside(r)} featured />
                  ))}
                </div>
              </section>
            )}

            {/* All */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-red-600 rounded-full" />
                <h2 className="font-bold text-base text-foreground">{featured.length > 0 ? "All Reviews" : "Stock Reviews"} <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {(featured.length > 0 ? regular : filtered).map(r => (
                  <ReviewCard key={r.id} review={r} upside={upside(r)} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ReviewCard({ review: r, upside, featured }: { review: StockReview; upside: string | null; featured?: boolean }) {
  const isPositive = upside !== null && parseFloat(upside) > 0;
  const ratingStyle = RATING_STYLES[r.rating ?? ""] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Link to={`/stocks/review/${r.symbol.toLowerCase()}`}
      className={`group bg-white border border-border rounded-xl shadow-card hover:shadow-card-lg transition-all overflow-hidden block ${featured ? "flex flex-col" : ""}`}>
      {r.cover_image_url ? (
        <div className="h-44 overflow-hidden bg-muted">
          <img src={r.cover_image_url} alt={r.company_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <BarChart2 className="h-10 w-10 text-primary/30" />
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-black text-lg text-foreground tracking-tight">{r.symbol}</span>
              <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded">{r.exchange}</span>
            </div>
            <div className="text-sm text-muted-foreground">{r.company_name}</div>
          </div>
          <span className={`text-[11px] font-bold px-2 py-1 rounded border whitespace-nowrap ${ratingStyle}`}>{r.rating}</span>
        </div>

        {r.summary && <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{r.summary}</p>}

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-3">
            {r.current_price && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">CMP</div>
                <div className="number-font font-bold text-sm text-foreground">₹{r.current_price.toLocaleString("en-IN")}</div>
              </div>
            )}
            {upside !== null && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Upside</div>
                <div className={`number-font font-bold text-sm flex items-center gap-0.5 ${isPositive ? "text-gain" : "text-loss"}`}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isPositive ? "+" : ""}{upside}%
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(r.views_count ?? 0).toLocaleString()}</span>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">{r.sector}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
