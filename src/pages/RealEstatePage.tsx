import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Search, MapPin, Home, Building2, TrendingUp, TrendingDown,
  ChevronRight, Star, ArrowRight, Paintbrush, Shield, FileText,
  Phone, IndianRupee, Filter, X, ChevronDown, Bed, Maximize,
  Heart, Eye, BadgePercent, Sparkles, BarChart3, Clock
} from "lucide-react";

/* ── Types ── */
interface Property {
  id: string; title: string; slug: string; property_type: string;
  listing_type: string; city: string; locality: string | null;
  price: number; price_display: string | null; bhk: string | null;
  area_sqft: number | null; amenities: string[] | null;
  description: string | null; developer_name: string | null;
  cover_image_url: string | null; is_featured: boolean | null;
  is_price_drop: boolean | null; original_price: number | null;
  rating: number | null; reviews_count: number | null;
}

interface PriceTrend {
  id: string; city: string; locality: string | null;
  avg_price_sqft: number | null; change_pct: number | null;
  ai_insights: string | null;
}

interface REService {
  id: string; title: string; description: string | null;
  icon_name: string | null; cover_image_url: string | null;
}

interface InteriorDesign {
  id: string; title: string; description: string | null;
  cover_image_url: string | null; category: string | null;
}

/* ── Constants ── */
const CITIES = ["Mumbai", "Bengaluru", "Gurugram", "Pune", "Noida", "Hyderabad", "Thane", "Chennai", "Navi Mumbai", "Delhi"];
const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Penthouse", "Studio"];
const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4+ BHK"];

const CITY_IMAGES: Record<string, string> = {
  Mumbai: "🏙️", Bengaluru: "🌳", Gurugram: "🏗️", Pune: "🌆",
  Noida: "🏢", Hyderabad: "🕌", Thane: "🌊", Chennai: "🏛️",
  "Navi Mumbai": "🌉", Delhi: "🏰",
};

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

/* ── Mock data for initial display ── */
const MOCK_PROPERTIES: Property[] = [
  { id: "1", title: "Lodha World View", slug: "lodha-world-view", property_type: "apartment", listing_type: "buy", city: "Mumbai", locality: "Worli", price: 35000000, price_display: "₹3.5 Cr", bhk: "3 BHK", area_sqft: 1850, amenities: ["Swimming Pool", "Gym", "Parking"], description: "Ultra-luxury sea-facing apartments", developer_name: "Lodha Group", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.5, reviews_count: 128 },
  { id: "2", title: "Prestige Lakeside Habitat", slug: "prestige-lakeside", property_type: "apartment", listing_type: "buy", city: "Bengaluru", locality: "Whitefield", price: 12500000, price_display: "₹1.25 Cr", bhk: "2 BHK", area_sqft: 1250, amenities: ["Lake View", "Clubhouse", "Gym"], description: "Premium lake-facing community", developer_name: "Prestige Group", cover_image_url: null, is_featured: true, is_price_drop: true, original_price: 14000000, rating: 4.3, reviews_count: 256 },
  { id: "3", title: "DLF The Camellias", slug: "dlf-camellias", property_type: "villa", listing_type: "buy", city: "Gurugram", locality: "Golf Course Road", price: 250000000, price_display: "₹25 Cr", bhk: "4+ BHK", area_sqft: 7200, amenities: ["Private Pool", "Golf Course", "Concierge"], description: "Ultra-luxury golf-facing villas", developer_name: "DLF Ltd", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.8, reviews_count: 42 },
  { id: "4", title: "Godrej Forest Estate", slug: "godrej-forest", property_type: "apartment", listing_type: "buy", city: "Pune", locality: "Kharadi", price: 8500000, price_display: "₹85 L", bhk: "2 BHK", area_sqft: 1100, amenities: ["Garden", "Gym", "Parking"], description: "Nature-inspired living spaces", developer_name: "Godrej Properties", cover_image_url: null, is_featured: false, is_price_drop: true, original_price: 9200000, rating: 4.1, reviews_count: 89 },
  { id: "5", title: "Supertech Supernova", slug: "supertech-supernova", property_type: "apartment", listing_type: "buy", city: "Noida", locality: "Sector 94", price: 15000000, price_display: "₹1.5 Cr", bhk: "3 BHK", area_sqft: 2100, amenities: ["Infinity Pool", "Sky Lounge", "Gym"], description: "Iconic tower with panoramic views", developer_name: "Supertech", cover_image_url: null, is_featured: false, is_price_drop: false, original_price: null, rating: 3.9, reviews_count: 167 },
  { id: "6", title: "My Home Bhooja", slug: "myhome-bhooja", property_type: "apartment", listing_type: "buy", city: "Hyderabad", locality: "Madhapur", price: 22000000, price_display: "₹2.2 Cr", bhk: "3 BHK", area_sqft: 2800, amenities: ["Rooftop Pool", "Gym", "Theater"], description: "Premium gated community", developer_name: "My Home Group", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.6, reviews_count: 73 },
];

const MOCK_TRENDS: PriceTrend[] = [
  { id: "1", city: "Mumbai", locality: "Bandra", avg_price_sqft: 42500, change_pct: 8.2, ai_insights: "Strong demand in micro-markets near metro lines" },
  { id: "2", city: "Bengaluru", locality: "Whitefield", avg_price_sqft: 8200, change_pct: 12.5, ai_insights: "IT corridor driving sustained price growth" },
  { id: "3", city: "Gurugram", locality: "Golf Course Road", avg_price_sqft: 18500, change_pct: 6.8, ai_insights: "Premium segment steady with new luxury launches" },
  { id: "4", city: "Pune", locality: "Hinjewadi", avg_price_sqft: 7800, change_pct: 15.2, ai_insights: "Fastest growing IT hub with affordable pricing" },
  { id: "5", city: "Hyderabad", locality: "Gachibowli", avg_price_sqft: 9200, change_pct: 18.4, ai_insights: "Highest growth driven by pharma and IT expansion" },
  { id: "6", city: "Chennai", locality: "OMR", avg_price_sqft: 7100, change_pct: 9.1, ai_insights: "Steady growth along IT corridor" },
  { id: "7", city: "Noida", locality: "Sector 150", avg_price_sqft: 6500, change_pct: 11.3, ai_insights: "Expressway connectivity boosting values" },
  { id: "8", city: "Thane", locality: "Ghodbunder Road", avg_price_sqft: 12800, change_pct: 7.5, ai_insights: "Affordable alternative to Mumbai with good infra" },
];

const DEFAULT_SERVICES: REService[] = [
  { id: "1", title: "Home Loans", description: "Compare rates from 30+ banks. Get pre-approved in minutes.", icon_name: "IndianRupee", cover_image_url: null },
  { id: "2", title: "Legal Assistance", description: "Property verification, title search & legal documentation.", icon_name: "Shield", cover_image_url: null },
  { id: "3", title: "Registration Help", description: "End-to-end property registration & stamp duty guidance.", icon_name: "FileText", cover_image_url: null },
  { id: "4", title: "Vastu Consultation", description: "Expert vastu advice for your new home.", icon_name: "Sparkles", cover_image_url: null },
];

const DEFAULT_DESIGNS: InteriorDesign[] = [
  { id: "1", title: "Modern Minimalist Living", description: "Clean lines, neutral palettes", cover_image_url: null, category: "Living Room" },
  { id: "2", title: "Contemporary Kitchen", description: "Modular designs with smart storage", cover_image_url: null, category: "Kitchen" },
  { id: "3", title: "Cozy Bedroom Suite", description: "Warm tones with luxury bedding", cover_image_url: null, category: "Bedroom" },
  { id: "4", title: "Urban Balcony Garden", description: "Green spaces in compact areas", cover_image_url: null, category: "Balcony" },
];

const ICON_MAP: Record<string, any> = {
  Home, Building2, IndianRupee, Shield, FileText, Sparkles, Phone, Paintbrush,
};

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function RealEstatePage() {
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [trends, setTrends] = useState<PriceTrend[]>(MOCK_TRENDS);
  const [services, setServices] = useState<REService[]>(DEFAULT_SERVICES);
  const [designs, setDesigns] = useState<InteriorDesign[]>(DEFAULT_DESIGNS);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"buy" | "rent">("buy");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [propRes, trendRes, svcRes, designRes] = await Promise.all([
        supabase.from("properties").select("*").eq("status", "active").order("is_featured", { ascending: false }).limit(20),
        supabase.from("re_price_trends").select("*").order("change_pct", { ascending: false }),
        supabase.from("re_services").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("re_interior_designs").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (propRes.data && propRes.data.length > 0) setProperties(propRes.data as any);
      if (trendRes.data && trendRes.data.length > 0) setTrends(trendRes.data as any);
      if (svcRes.data && svcRes.data.length > 0) setServices(svcRes.data as any);
      if (designRes.data && designRes.data.length > 0) setDesigns(designRes.data as any);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filteredProperties = properties.filter(p => {
    if (p.listing_type !== activeTab) return false;
    if (selectedCity && p.city !== selectedCity) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.city.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const featuredProps = filteredProperties.filter(p => p.is_featured);
  const priceDropProps = properties.filter(p => p.is_price_drop);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />

      {/* ─── Hero Section ─── */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm mb-6">
              <Home className="h-4 w-4" />
              <span>Starting Your Real Estate Journey</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-4">
              Find Your <span className="text-emerald-300">Dream Home</span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl">
              Explore thousands of properties across India's top cities
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-1 mb-4">
              {(["buy", "rent"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-t-xl font-bold text-sm uppercase tracking-wide transition-all ${
                    activeTab === tab ? "bg-white text-emerald-900" : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}>
                  {tab === "buy" ? "Buy" : "Rent"}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none p-2 shadow-2xl flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by city, locality or project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-4 py-3.5 rounded-xl bg-muted/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
              >
                <option value="">All Cities</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1440px] mx-auto px-4 py-8 space-y-10">

        {/* ─── Trending Cities ─── */}
        <section>
          <SectionHead title="🔥 Trending Now" subtitle="Popular cities for property seekers" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CITIES.slice(0, 10).map(city => (
              <button key={city} onClick={() => setSelectedCity(city === selectedCity ? "" : city)}
                className={`group relative rounded-2xl p-5 text-center transition-all border ${
                  selectedCity === city
                    ? "bg-emerald-50 border-emerald-300 shadow-md"
                    : "bg-card border-border hover:border-emerald-200 hover:shadow-md"
                }`}>
                <div className="text-3xl mb-2">{CITY_IMAGES[city] ?? "🏙️"}</div>
                <div className="font-bold text-sm text-foreground">{city}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {properties.filter(p => p.city === city).length || Math.floor(Math.random() * 500 + 100)}+ properties
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Hot Selling / Featured Projects ─── */}
        <section>
          <SectionHead title="🏆 Hot Selling Projects" subtitle="Handpicked properties across top cities" link="#" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(featuredProps.length > 0 ? featuredProps : filteredProperties).slice(0, 6).map(prop => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
          {filteredProperties.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No properties found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </section>

        {/* ─── Price Drop Section ─── */}
        {priceDropProps.length > 0 && (
          <section className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
            <SectionHead title="💰 Price Drop Alert!" subtitle="Properties with recent price reductions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {priceDropProps.slice(0, 3).map(prop => (
                <PropertyCard key={prop.id} property={prop} showPriceDrop />
              ))}
            </div>
          </section>
        )}

        {/* ─── All Listings ─── */}
        <section>
          <SectionHead
            title={activeTab === "buy" ? "🏠 Properties for Sale" : "🔑 Properties for Rent"}
            subtitle={`${filteredProperties.length} properties available`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProperties.slice(0, 12).map(prop => (
              <PropertyCard key={prop.id} property={prop} compact />
            ))}
          </div>
        </section>

        {/* ─── Price Trends ─── */}
        <section>
          <SectionHead title="📊 Price Trends & Insights" subtitle="AI-powered market analysis across cities" link="#" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trends.slice(0, 8).map(trend => (
              <div key={trend.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-foreground">{trend.city}</div>
                    <div className="text-xs text-muted-foreground">{trend.locality}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-bold ${
                    (trend.change_pct ?? 0) >= 0 ? "text-gain" : "text-loss"
                  }`}>
                    {(trend.change_pct ?? 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {trend.change_pct}%
                  </div>
                </div>
                <div className="number-font text-2xl font-black text-foreground mb-1">
                  ₹{(trend.avg_price_sqft ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-muted-foreground mb-3">per sq.ft (avg)</div>
                {/* Mini chart bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${(trend.change_pct ?? 0) >= 0 ? "bg-gain" : "bg-loss"}`}
                    style={{ width: `${Math.min(Math.abs(trend.change_pct ?? 0) * 5, 100)}%` }}
                  />
                </div>
                {trend.ai_insights && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 shrink-0 text-amber-500 mt-0.5" />
                    {trend.ai_insights}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Services ─── */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black mb-2">Our Services</h2>
            <p className="text-white/60 text-sm">Everything you need for a smooth property journey</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map(svc => {
              const IconComp = ICON_MAP[svc.icon_name ?? "Home"] ?? Home;
              return (
                <div key={svc.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all group cursor-pointer">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <IconComp className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{svc.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Interior Design ─── */}
        <section>
          <SectionHead title="🎨 Interior Design Inspiration" subtitle="Transform your space with expert designs" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {designs.map(d => (
              <div key={d.id} className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                <div className="aspect-[4/3] bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                  {d.cover_image_url ? (
                    <img src={d.cover_image_url} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <Paintbrush className="h-12 w-12 text-emerald-300" />
                  )}
                </div>
                <div className="p-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{d.category}</span>
                  <h3 className="font-bold text-foreground mt-2 group-hover:text-emerald-700 transition-colors">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Ratings / Reviews Summary ─── */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-foreground mb-2">⭐ Top Rated Projects</h2>
            <p className="text-muted-foreground text-sm">What buyers are saying about top properties</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.filter(p => (p.rating ?? 0) >= 4).slice(0, 6).map(prop => (
              <div key={prop.id} className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{prop.title}</div>
                    <div className="text-xs text-muted-foreground">{prop.city} · {prop.developer_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i <= (prop.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="number-font text-sm font-bold text-foreground">{prop.rating}</span>
                  <span className="text-xs text-muted-foreground">({prop.reviews_count} reviews)</span>
                </div>
                <div className="number-font text-lg font-black text-emerald-700">
                  {prop.price_display || formatPrice(prop.price)}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

/* ── Sub-components ── */
function SectionHead({ title, subtitle, link }: { title: string; subtitle?: string; link?: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-xl font-black text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
          View All <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function PropertyCard({ property: p, compact, showPriceDrop }: { property: Property; compact?: boolean; showPriceDrop?: boolean }) {
  return (
    <div className={`group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all ${compact ? "" : ""}`}>
      <div className={`relative ${compact ? "aspect-[16/10]" : "aspect-[16/10]"} bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden`}>
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-16 w-16 text-slate-200" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.is_featured && (
            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase flex items-center gap-1">
              <Star className="h-3 w-3 fill-white" /> Featured
            </span>
          )}
          {(p.is_price_drop || showPriceDrop) && (
            <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase flex items-center gap-1">
              <BadgePercent className="h-3 w-3" /> Price Drop
            </span>
          )}
        </div>
        <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
          <Heart className="h-4 w-4 text-muted-foreground hover:text-red-500" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{p.property_type}</span>
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" /> {p.city}{p.locality ? `, ${p.locality}` : ""}
          </span>
        </div>
        <h3 className="font-bold text-foreground group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1">{p.title}</h3>
        {p.developer_name && <p className="text-xs text-muted-foreground mb-2">by {p.developer_name}</p>}
        <div className="flex items-center gap-3 mb-3">
          {p.bhk && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bed className="h-3 w-3" /> {p.bhk}
            </span>
          )}
          {p.area_sqft && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Maximize className="h-3 w-3" /> {p.area_sqft.toLocaleString()} sqft
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="number-font text-xl font-black text-emerald-700">
              {p.price_display || formatPrice(p.price)}
            </div>
            {p.is_price_drop && p.original_price && (
              <div className="text-xs text-muted-foreground line-through number-font">
                {formatPrice(p.original_price)}
              </div>
            )}
          </div>
          {(p.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="font-bold text-foreground">{p.rating}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
