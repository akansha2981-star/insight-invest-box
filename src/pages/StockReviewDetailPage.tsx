import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { AIStreamingPanel } from "@/components/AIStreamingPanel";
import {
  TrendingUp, TrendingDown, ChevronRight, Eye, Calendar,
  BarChart2, Target, AlertTriangle, Star, User, Tag, ArrowUpRight, Brain, Scale, LineChart as LineChartIcon, Shield
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from "recharts";
import { BarChart, Bar, Cell } from "recharts";

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
  investment_thesis: string | null;
  risks: string | null;
  financials: any;
  key_metrics: any;
  price_history: any;
  tags: string[] | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  views_count: number | null;
  published_at: string | null;
}

const RATING_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  "STRONG BUY": { color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300", icon: TrendingUp },
  "BUY": { color: "text-green-700", bg: "bg-green-100", border: "border-green-300", icon: TrendingUp },
  "HOLD": { color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300", icon: BarChart2 },
  "SELL": { color: "text-red-700", bg: "bg-red-100", border: "border-red-300", icon: TrendingDown },
  "STRONG SELL": { color: "text-rose-800", bg: "bg-rose-100", border: "border-rose-300", icon: TrendingDown },
};

// Generate simulated price history based on current price
function generatePriceHistory(currentPrice: number, weeks: number = 26) {
  const data = [];
  let price = currentPrice * 0.82;
  for (let i = weeks; i >= 0; i--) {
    const noise = (Math.random() - 0.46) * price * 0.04;
    price = Math.max(price + noise, currentPrice * 0.5);
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    data.push({
      date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      price: +price.toFixed(2),
    });
  }
  data[data.length - 1].price = currentPrice;
  return data;
}

// Parse stored price_history JSON into chart format
function parsePriceHistory(raw: any, currentPrice: number | null) {
  if (Array.isArray(raw) && raw.length > 0) {
    // Support {month, price} or {date, price} formats
    return raw.map((p: any) => ({
      date: p.month ?? p.date ?? "",
      price: typeof p.price === "number" ? p.price : parseFloat(p.price ?? "0"),
    })).filter((p: any) => p.price > 0);
  }
  // Fallback: generate simulated data
  if (currentPrice) return generatePriceHistory(currentPrice);
  return [];
}

export default function StockReviewDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [review, setReview] = useState<StockReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReview() {
      const { data } = await supabase
        .from("stock_reviews" as any)
        .select("*")
        .eq("symbol", symbol?.toUpperCase() ?? "")
        .eq("status", "published")
        .maybeSingle();

      if (!data) { setNotFound(true); }
      else {
        setReview(data as any);
        // Increment views
        await supabase.from("stock_reviews" as any)
          .update({ views_count: ((data as any).views_count ?? 0) + 1 })
          .eq("id", (data as any).id);
      }
      setLoading(false);
    }
    fetchReview();
  }, [symbol]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !review) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <BarChart2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground mb-2">Review Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">No published review found for this stock.</p>
          <Link to="/stocks/reviews" className="text-primary hover:text-primary/80 font-semibold">← Browse All Reviews</Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  const r = review;
  const upside = r.current_price && r.target_price
    ? (((r.target_price - r.current_price) / r.current_price) * 100).toFixed(1)
    : null;
  const isPositiveUpside = upside !== null && parseFloat(upside) > 0;
  const ratingCfg = RATING_CONFIG[r.rating ?? ""] ?? RATING_CONFIG["HOLD"];
  const priceHistory = parsePriceHistory(r.price_history, r.current_price);

  const financialData = r.financials ? Object.entries(r.financials)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      value: String(v)
    })) : [];

  const metricsData = r.key_metrics ? Object.entries(r.key_metrics)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace("52w", "52-Week").replace(/\b\w/g, l => l.toUpperCase()),
      value: String(v)
    })) : [];

  // Bar chart for financial comparison
  const barData = financialData.slice(0, 4).map(d => ({
    name: d.label.substring(0, 8),
    value: parseFloat(d.value.replace(/[^0-9.-]/g, "")) || 0,
    label: d.label,
  })).filter(d => d.value !== 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      {/* Cover */}
      {r.cover_image_url && (
        <div className="w-full h-56 overflow-hidden">
          <img src={r.cover_image_url} alt={r.company_name} className="w-full h-full object-cover" />
        </div>
      )}

      <main className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/stocks/reviews" className="hover:text-primary transition-colors">Stock Reviews</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{r.symbol}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white border border-border rounded-xl shadow-card p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">{r.symbol}</h1>
                    <span className="text-sm text-muted-foreground border border-border px-2 py-0.5 rounded">{r.exchange}</span>
                    {r.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  </div>
                  <p className="text-lg text-muted-foreground">{r.company_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">{r.sector}</span>
                    {(r.tags ?? []).map(t => (
                      <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border">{t}</span>
                    ))}
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${ratingCfg.bg} ${ratingCfg.border}`}>
                  <ratingCfg.icon className={`h-5 w-5 ${ratingCfg.color}`} />
                  <span className={`font-black text-sm ${ratingCfg.color}`}>{r.rating}</span>
                </div>
              </div>

              {/* Prices */}
              <div className="flex flex-wrap gap-6 py-4 border-t border-border/60">
                {r.current_price && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Current Price</div>
                    <div className="number-font text-2xl font-black text-foreground">₹{r.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
                {r.target_price && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Target Price</div>
                    <div className="number-font text-2xl font-black text-gain">₹{r.target_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
                {upside !== null && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Potential Upside</div>
                    <div className={`number-font text-2xl font-black flex items-center gap-1 ${isPositiveUpside ? "text-gain" : "text-loss"}`}>
                      <ArrowUpRight className="h-5 w-5" />
                      {isPositiveUpside ? "+" : ""}{upside}%
                    </div>
                  </div>
                )}
              </div>

              {r.summary && (
                <div className="pt-4 border-t border-border/60">
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.summary}</p>
                </div>
              )}
            </div>

            {/* Price Chart */}
            {priceHistory.length > 0 && (
              <div className="bg-white border border-border rounded-xl shadow-card p-5">
                <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" /> Price History (6 Months)
                  <span className="text-xs text-muted-foreground font-normal ml-1">Simulated</span>
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={priceHistory}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v.toLocaleString("en-IN")}`} width={70} />
                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Price"]} />
                    {r.target_price && (
                      <ReferenceLine y={r.target_price} stroke="hsl(var(--gain))" strokeDasharray="5 3"
                        label={{ value: `Target ₹${r.target_price.toLocaleString("en-IN")}`, fontSize: 10, fill: "hsl(var(--gain))" }} />
                    )}
                    <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2}
                      fill="url(#priceGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Investment Thesis */}
            {r.investment_thesis && (
              <div className="bg-white border border-border rounded-xl shadow-card p-6">
                <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Investment Thesis
                </h2>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{r.investment_thesis}</div>
              </div>
            )}

            {/* Risks */}
            {r.risks && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h2 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Key Risks
                </h2>
                <div className="text-sm text-amber-700 leading-relaxed whitespace-pre-wrap">{r.risks}</div>
              </div>
            )}

            {/* Financial Bar Chart */}
            {barData.length > 1 && (
              <div className="bg-white border border-border rounded-xl shadow-card p-5">
                <h2 className="font-bold text-foreground mb-4">Financial Snapshot</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any, _: any, p: any) => [v.toLocaleString("en-IN"), p.payload.label]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={`hsl(var(--primary))`} opacity={0.7 + (i * 0.075)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-5">
            {/* Analyst */}
            {r.analyst_name && (
              <div className="bg-white border border-border rounded-xl shadow-card p-5">
                <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" /> Analyst
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {r.analyst_name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{r.analyst_name}</div>
                    <div className="text-xs text-muted-foreground">Stock Analyst</div>
                  </div>
                </div>
                {r.published_at && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
                    <Calendar className="h-3 w-3" />
                    Published {new Date(r.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Eye className="h-3 w-3" /> {(r.views_count ?? 0).toLocaleString()} views
                </div>
              </div>
            )}

            {/* Key Metrics */}
            {metricsData.length > 0 && (
              <div className="bg-white border border-border rounded-xl shadow-card p-5">
                <h3 className="font-bold text-foreground text-sm mb-3">Market Metrics</h3>
                <div className="space-y-2.5">
                  {metricsData.map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="number-font font-bold text-sm text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financials */}
            {financialData.length > 0 && (
              <div className="bg-white border border-border rounded-xl shadow-card p-5">
                <h3 className="font-bold text-foreground text-sm mb-3">Financials</h3>
                <div className="space-y-2.5">
                  {financialData.map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="number-font font-bold text-sm text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {(r.tags ?? []).length > 0 && (
              <div className="bg-white border border-border rounded-xl shadow-card p-5">
                <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(r.tags ?? []).map(t => (
                    <span key={t} className="text-xs bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Back link */}
            <Link to="/stocks/reviews"
              className="block text-center text-sm font-semibold text-primary hover:text-primary/80 py-3 bg-white border border-border rounded-xl hover:bg-muted/30 transition-colors">
              ← Browse All Reviews
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
