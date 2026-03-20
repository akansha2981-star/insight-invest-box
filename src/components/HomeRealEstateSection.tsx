import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, MapPin, TrendingUp, TrendingDown, ArrowRight, Star, BarChart3, IndianRupee,
  ChevronLeft, ChevronRight, Sparkles, Home, Key, Users, Eye
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

interface Property {
  id: string; title: string; slug: string; city: string;
  locality: string | null; price: number; price_display: string | null;
  cover_image_url: string | null; property_type: string; listing_type: string;
  bhk: string | null; rating: number | null; developer_name: string | null;
  is_featured: boolean | null; is_price_drop: boolean | null;
  area_sqft: number | null;
}

interface PriceTrend {
  city: string; avg_price_sqft: number | null; change_pct: number | null;
}

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; category: string | null; published_at: string | null;
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

/* Horizontal scroll slider — improved */
function Slider({ children, label, icon: Icon, link, count }: {
  children: React.ReactNode; label: string; icon: any; link?: string; count?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#ffd700]/15 flex items-center justify-center">
            <Icon className="h-4 w-4 text-[#ffd700]" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-white">{label}</h3>
            {count !== undefined && <span className="text-[10px] text-white/30">{count} properties</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll(-1)} className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/50 hover:text-white flex items-center justify-center transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/50 hover:text-white flex items-center justify-center transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
          {link && (
            <Link to={link} className="text-[11px] font-bold text-[#ffd700] hover:text-[#e6c200] ml-1 flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

function PropertyCard({ p }: { p: Property }) {
  return (
    <Link to={`/real-estate/${p.slug}`}
      className="group shrink-0 w-[260px] snap-start bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:bg-white/[0.08] hover:border-white/15 transition-all duration-300">
      <div className="aspect-[16/10] bg-white/[0.03] overflow-hidden relative">
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-indigo-900/20">
            <Building2 className="h-10 w-10 text-white/10" />
          </div>
        )}
        {p.is_price_drop && (
          <span className="absolute top-2.5 left-2.5 text-[9px] font-black px-2.5 py-1 rounded-lg bg-red-500 text-white shadow-lg shadow-red-500/30">PRICE DROP</span>
        )}
        {p.is_featured && !p.is_price_drop && (
          <span className="absolute top-2.5 left-2.5 text-[9px] font-black px-2.5 py-1 rounded-lg bg-[#ffd700] text-[#1a1a2e] shadow-lg shadow-[#ffd700]/30">FEATURED</span>
        )}
        {(p.rating ?? 0) > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-white font-bold">{p.rating}</span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h4 className="font-bold text-[13px] text-white line-clamp-1 group-hover:text-[#ffd700] transition-colors">{p.title}</h4>
        <p className="text-[10px] text-white/35 flex items-center gap-1 mt-1">
          <MapPin className="h-2.5 w-2.5" /> {p.locality ? `${p.locality}, ` : ""}{p.city}
        </p>
        <div className="flex items-center justify-between mt-2.5">
          <span className="number-font font-black text-[#ffd700] text-[15px]">{p.price_display || formatPrice(p.price)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {p.bhk && <span className="text-[9px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded">{p.bhk}</span>}
          <span className="text-[9px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded capitalize">{p.property_type}</span>
          {p.area_sqft && <span className="text-[9px] text-white/30">{p.area_sqft?.toLocaleString()} sqft</span>}
        </div>
      </div>
    </Link>
  );
}

/* Mini sparkline for price trends */
function MiniSparkline({ value, up }: { value: number; up: boolean }) {
  const base = value || 10000;
  const data = [
    { v: base * 0.82 }, { v: base * 0.85 }, { v: base * 0.78 },
    { v: base * 0.88 }, { v: base * 0.91 }, { v: base * 0.86 },
    { v: base * 0.93 }, { v: base * 0.96 }, { v: base },
  ];
  return (
    <div className="w-16 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${up ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? "#10b981" : "#ef4444"} stopOpacity={0.4} />
              <stop offset="100%" stopColor={up ? "#10b981" : "#ef4444"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={up ? "#10b981" : "#ef4444"} strokeWidth={1.5} fill={`url(#spark-${up ? 'up' : 'dn'})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HomeRealEstateSection() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("properties").select("id,title,slug,city,locality,price,price_display,cover_image_url,property_type,listing_type,bhk,rating,developer_name,is_featured,is_price_drop,area_sqft")
        .eq("status", "active").order("created_at", { ascending: false }).limit(30),
      supabase.from("re_price_trends").select("city,avg_price_sqft,change_pct").order("change_pct", { ascending: false }).limit(8),
      supabase.from("blog_posts").select("id,title,slug,excerpt,cover_image_url,category,published_at")
        .eq("status", "published").order("published_at", { ascending: false }).limit(6),
    ]).then(([propRes, trendRes, blogRes]) => {
      if (propRes.data) setProperties(propRes.data as any);
      if (trendRes.data) setTrends(trendRes.data as any);
      if (blogRes.data) setBlogs(blogRes.data as any);
    });
  }, []);

  if (properties.length === 0 && trends.length === 0) return null;

  const featured = properties.filter(p => p.is_featured);
  const newListings = properties.slice(0, 10);
  const buyProps = properties.filter(p => p.listing_type === "buy");
  const rentProps = properties.filter(p => p.listing_type === "rent" || p.listing_type === "pg");

  return (
    <section className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)" }}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffd700]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/3 rounded-full blur-[60px]" />

      <div className="relative p-6 md:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#ffd700]/15 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[#ffd700]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd700]">Investment Opportunity</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Real Estate & Investment Hub</h2>
            <p className="text-white/40 text-sm mt-1">Top property picks, market trends & latest insights</p>
          </div>
          <Link to="/real-estate" className="hidden md:flex items-center gap-2 bg-[#ffd700] text-[#1a1a2e] px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#e6c200] transition-colors shadow-lg shadow-[#ffd700]/20">
            Explore Properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Price Trend Charts Row */}
        {trends.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-[#ffd700]" />
              <h3 className="font-bold text-sm text-white">Property Price Trends</h3>
              <Link to="/real-estate" className="text-[10px] font-bold text-[#ffd700] ml-auto">See All Trends</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {trends.slice(0, 4).map(t => {
                const up = (t.change_pct ?? 0) >= 0;
                return (
                  <Link key={t.city} to="/real-estate" className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.08] transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{t.city}</span>
                      <MiniSparkline value={t.avg_price_sqft ?? 10000} up={up} />
                    </div>
                    <div className="number-font text-lg font-black text-white">
                      ₹{((t.avg_price_sqft ?? 0) / 1000).toFixed(1)}K
                      <span className="text-[10px] text-white/30 font-normal">/sqft</span>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 text-xs font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {up ? "+" : ""}{t.change_pct}% YoY
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* New Property Listings Slider */}
        {newListings.length > 0 && (
          <Slider label="New Property Listings" icon={Sparkles} link="/real-estate" count={newListings.length}>
            {newListings.map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Featured Properties Slider */}
        {featured.length > 0 && (
          <Slider label="Featured Projects" icon={Star} link="/real-estate" count={featured.length}>
            {featured.map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Investment Opportunities */}
        {buyProps.length > 0 && (
          <Slider label="Investment Opportunities" icon={TrendingUp} link="/real-estate" count={buyProps.length}>
            {buyProps.slice(0, 8).map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Rental/PG Slider */}
        {rentProps.length > 0 && (
          <Slider label="Rental & PG Listings" icon={Key} link="/real-estate" count={rentProps.length}>
            {rentProps.map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Blog Snippets */}
        {blogs.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#ffd700]/15 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[#ffd700]" />
              </div>
              <h3 className="font-bold text-[15px] text-white">Latest Insights</h3>
              <Link to="/news" className="text-[11px] font-bold text-[#ffd700] hover:text-[#e6c200] ml-auto flex items-center gap-1">
                All News <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogs.slice(0, 3).map(b => (
                <Link key={b.id} to={`/news/${b.slug}`}
                  className="group bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.08] hover:border-white/15 transition-all">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/15">
                    {b.category ?? "News"}
                  </span>
                  <h4 className="font-bold text-[13px] text-white mt-3 line-clamp-2 group-hover:text-[#ffd700] transition-colors leading-snug">{b.title}</h4>
                  {b.excerpt && <p className="text-[11px] text-white/30 mt-2 line-clamp-2">{b.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link to="/real-estate" className="mt-8 md:hidden flex items-center justify-center gap-2 bg-[#ffd700] text-[#1a1a2e] py-3.5 rounded-xl text-sm font-bold hover:bg-[#e6c200] transition-colors shadow-lg shadow-[#ffd700]/20">
          Explore All Properties <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
