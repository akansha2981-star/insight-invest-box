import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, MapPin, TrendingUp, ArrowRight, Star, BarChart3, IndianRupee,
  ChevronLeft, ChevronRight, Sparkles, Home, Key, Users
} from "lucide-react";

interface Property {
  id: string; title: string; slug: string; city: string;
  locality: string | null; price: number; price_display: string | null;
  cover_image_url: string | null; property_type: string; listing_type: string;
  bhk: string | null; rating: number | null; developer_name: string | null;
  is_featured: boolean | null; is_price_drop: boolean | null;
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

/* Horizontal scroll slider */
function Slider({ children, label, icon: Icon, link }: {
  children: React.ReactNode; label: string; icon: any; link?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#ffd700]" />
          <h3 className="font-bold text-sm text-white">{label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => scroll(-1)} className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          {link && (
            <Link to={link} className="text-[11px] font-semibold text-[#ffd700] hover:text-[#e6c200] ml-2">
              View All →
            </Link>
          )}
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

function PropertyCard({ p }: { p: Property }) {
  return (
    <Link to={`/real-estate/${p.slug}`}
      className="group shrink-0 w-[240px] bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all">
      <div className="aspect-[16/10] bg-white/5 overflow-hidden relative">
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Building2 className="h-8 w-8 text-white/10" /></div>
        )}
        {p.is_price_drop && (
          <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded bg-red-500 text-white">PRICE DROP</span>
        )}
        {p.is_featured && !p.is_price_drop && (
          <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded bg-[#ffd700] text-[#1a1a2e]">FEATURED</span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-[#ffd700] transition-colors">{p.title}</h4>
        <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
          <MapPin className="h-2.5 w-2.5" /> {p.locality ? `${p.locality}, ` : ""}{p.city}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="number-font font-black text-[#ffd700] text-sm">{p.price_display || formatPrice(p.price)}</span>
          {(p.rating ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/60">
              <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" /> {p.rating}
            </span>
          )}
        </div>
        {p.bhk && <span className="text-[9px] text-white/40 mt-1 block">{p.bhk} · {p.property_type}</span>}
      </div>
    </Link>
  );
}

export function HomeRealEstateSection() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("properties").select("id,title,slug,city,locality,price,price_display,cover_image_url,property_type,listing_type,bhk,rating,developer_name,is_featured,is_price_drop")
        .eq("status", "active").order("created_at", { ascending: false }).limit(30),
      supabase.from("re_price_trends").select("city,avg_price_sqft,change_pct").order("change_pct", { ascending: false }).limit(6),
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
    <section className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#ffd700]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-[#ffd700]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Investment Opportunity</span>
            </div>
            <h2 className="text-2xl font-black">Real Estate & Investment Hub</h2>
            <p className="text-white/50 text-sm mt-1">Top property picks, market trends & latest insights</p>
          </div>
          <Link to="/real-estate" className="hidden md:flex items-center gap-2 bg-[#ffd700] text-[#1a1a2e] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#e6c200] transition-colors">
            Explore Properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* New Property Listings Slider */}
        {newListings.length > 0 && (
          <Slider label="New Property Listings" icon={Sparkles} link="/real-estate">
            {newListings.map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Featured Properties Slider */}
        {featured.length > 0 && (
          <Slider label="Featured Projects" icon={Star} link="/real-estate">
            {featured.map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Investment Opportunities — price trends */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            {buyProps.length > 0 && (
              <Slider label="Investment Opportunities" icon={TrendingUp} link="/real-estate">
                {buyProps.slice(0, 8).map(p => <PropertyCard key={p.id} p={p} />)}
              </Slider>
            )}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-[#ffd700]" />
              <h4 className="font-bold text-white text-sm">Price Trends</h4>
            </div>
            <div className="space-y-2.5">
              {trends.map(t => (
                <Link key={t.city} to="/real-estate" className="flex items-center justify-between hover:bg-white/5 rounded-lg px-2 py-1 -mx-2 transition-colors">
                  <span className="text-sm text-white/70">{t.city}</span>
                  <div className="flex items-center gap-3">
                    <span className="number-font text-xs font-bold text-white">₹{((t.avg_price_sqft ?? 0) / 1000).toFixed(1)}K/sqft</span>
                    <span className={`number-font text-xs font-bold ${(t.change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(t.change_pct ?? 0) >= 0 ? "+" : ""}{t.change_pct}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/real-estate" className="block mt-3 bg-[#ffd700] text-[#1a1a2e] text-center py-2 rounded-lg font-bold text-xs hover:bg-[#e6c200] transition-colors">
              View All Trends →
            </Link>
          </div>
        </div>

        {/* Rental/PG Slider */}
        {rentProps.length > 0 && (
          <Slider label="Rental & PG Listings" icon={Key} link="/real-estate">
            {rentProps.map(p => <PropertyCard key={p.id} p={p} />)}
          </Slider>
        )}

        {/* Blog Snippets */}
        {blogs.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-[#ffd700]" />
              <h3 className="font-bold text-sm text-white">Latest Insights</h3>
              <Link to="/news" className="text-[11px] font-semibold text-[#ffd700] hover:text-[#e6c200] ml-auto">
                All News →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {blogs.slice(0, 3).map(b => (
                <Link key={b.id} to={`/news/${b.slug}`}
                  className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                  <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-[#ffd700]/20 text-[#ffd700]">
                    {b.category ?? "News"}
                  </span>
                  <h4 className="font-bold text-xs text-white mt-2 line-clamp-2 group-hover:text-[#ffd700] transition-colors">{b.title}</h4>
                  {b.excerpt && <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{b.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link to="/real-estate" className="mt-6 md:hidden flex items-center justify-center gap-2 bg-[#ffd700] text-[#1a1a2e] py-3 rounded-xl text-sm font-bold hover:bg-[#e6c200] transition-colors">
          Explore All Properties <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
