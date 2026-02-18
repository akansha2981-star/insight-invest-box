import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BarChart2, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

interface Review {
  id: string;
  symbol: string;
  company_name: string;
  rating: string | null;
  current_price: number | null;
  target_price: number | null;
  sector: string;
  summary: string | null;
}

function ratingColor(rating: string | null) {
  const r = (rating ?? "").toLowerCase();
  if (r.includes("strong buy")) return "badge-gain";
  if (r.includes("buy")) return "badge-gain";
  if (r.includes("strong sell") || r.includes("sell")) return "badge-loss";
  return "badge-neutral";
}

function upside(current: number | null, target: number | null) {
  if (!current || !target) return null;
  const pct = ((target - current) / current) * 100;
  return { pct: pct.toFixed(1), up: pct >= 0 };
}

export function FeaturedStockReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("stock_reviews" as any)
      .select("id, symbol, company_name, rating, current_price, target_price, sector, summary")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setReviews((data as unknown as Review[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (!loading && reviews.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-5 rounded-full bg-primary" />
          <BarChart2 className="h-[15px] w-[15px] text-muted-foreground" />
          <h2 className="font-bold text-[15px] text-foreground">Featured Stock Reviews</h2>
        </div>
        <Link to="/stocks/reviews" className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors group">
          All Reviews
          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? [1, 2, 3].map(i => <div key={i} className="h-44 bg-muted rounded-xl animate-pulse" />)
          : reviews.map(review => {
              const up = upside(review.current_price, review.target_price);
              return (
                <Link key={review.id} to={`/stocks/review/${review.symbol.toLowerCase()}`}
                  className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-[18px] text-foreground group-hover:text-primary transition-colors">
                        {review.symbol}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{review.company_name}</div>
                    </div>
                    <span className={`shrink-0 text-[9px] font-black px-2.5 py-1 rounded border ${ratingColor(review.rating)}`}>
                      {review.rating ?? "HOLD"}
                    </span>
                  </div>

                  {/* Summary */}
                  {review.summary && (
                    <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                      {review.summary}
                    </p>
                  )}

                  {/* Price targets */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="text-[11px] text-muted-foreground">
                      CMP <span className="number-font font-bold text-foreground">
                        {review.current_price ? `₹${review.current_price.toLocaleString("en-IN")}` : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Target <span className="number-font font-bold text-foreground">
                        {review.target_price ? `₹${review.target_price.toLocaleString("en-IN")}` : "—"}
                      </span>
                    </div>
                    {up && (
                      <div className={`flex items-center gap-0.5 text-[12px] font-black number-font ${up.up ? "text-gain" : "text-loss"}`}>
                        {up.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {up.up ? "+" : ""}{up.pct}%
                      </div>
                    )}
                  </div>

                  {/* Sector badge */}
                  <span className="self-start text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                    {review.sector}
                  </span>
                </Link>
              );
            })
        }
      </div>
    </section>
  );
}
