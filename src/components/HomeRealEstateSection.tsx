import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, MapPin, TrendingUp, ArrowRight, Star, BarChart3, IndianRupee
} from "lucide-react";

interface Property {
  id: string; title: string; slug: string; city: string;
  locality: string | null; price: number; price_display: string | null;
  cover_image_url: string | null; property_type: string;
  bhk: string | null; rating: number | null; developer_name: string | null;
}

interface PriceTrend {
  city: string; avg_price_sqft: number | null; change_pct: number | null;
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export function HomeRealEstateSection() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [trends, setTrends] = useState<PriceTrend[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("properties").select("id,title,slug,city,locality,price,price_display,cover_image_url,property_type,bhk,rating,developer_name")
        .eq("status", "active").eq("is_featured", true).limit(4),
      supabase.from("re_price_trends").select("city,avg_price_sqft,change_pct").order("change_pct", { ascending: false }).limit(6),
    ]).then(([propRes, trendRes]) => {
      if (propRes.data) setProperties(propRes.data as any);
      if (trendRes.data) setTrends(trendRes.data as any);
    });
  }, []);

  if (properties.length === 0 && trends.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#ffd700]/5 rounded-full blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-[#ffd700]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Investment Opportunity</span>
            </div>
            <h2 className="text-2xl font-black">Real Estate Investment Picks</h2>
            <p className="text-white/50 text-sm mt-1">Top property investment opportunities with market trends</p>
          </div>
          <Link to="/real-estate" className="hidden md:flex items-center gap-2 bg-[#ffd700] text-[#1a1a2e] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#e6c200] transition-colors">
            Explore Properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Featured Properties */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {properties.slice(0, 4).map(p => (
                <Link key={p.id} to={`/real-estate/${p.slug}`}
                  className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all">
                  <div className="aspect-[16/10] bg-white/5 overflow-hidden">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-10 w-10 text-white/10" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#ffd700] transition-colors">{p.title}</h4>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {p.locality ? `${p.locality}, ` : ""}{p.city}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="number-font font-black text-[#ffd700]">{p.price_display || formatPrice(p.price)}</span>
                      {(p.rating ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-white/60">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {p.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Market Trends summary */}
          <div className="space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-[#ffd700]" />
                <h4 className="font-bold text-white">Price Trends</h4>
              </div>
              <div className="space-y-2.5">
                {trends.map(t => (
                  <div key={t.city} className="flex items-center justify-between">
                    <span className="text-sm text-white/70">{t.city}</span>
                    <div className="flex items-center gap-3">
                      <span className="number-font text-sm font-bold text-white">₹{((t.avg_price_sqft ?? 0) / 1000).toFixed(1)}K/sqft</span>
                      <span className={`number-font text-xs font-bold ${(t.change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(t.change_pct ?? 0) >= 0 ? "+" : ""}{t.change_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/real-estate" className="block bg-[#ffd700] text-[#1a1a2e] text-center py-3 rounded-xl font-bold text-sm hover:bg-[#e6c200] transition-colors">
              View All Trends →
            </Link>
          </div>
        </div>

        <Link to="/real-estate" className="mt-4 md:hidden flex items-center justify-center gap-2 bg-[#ffd700] text-[#1a1a2e] py-3 rounded-xl text-sm font-bold hover:bg-[#e6c200] transition-colors">
          Explore All Properties <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
