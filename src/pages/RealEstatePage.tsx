import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Search, MapPin, Home, Building2, TrendingUp, TrendingDown,
  ChevronRight, Star, ArrowRight, Paintbrush, Shield, FileText,
  Phone, IndianRupee, ChevronDown, Bed, Maximize,
  Heart, BadgePercent, Sparkles, BarChart3, ChevronLeft,
  Landmark, Key, Grid3X3, Store, Users, Award, Clock, Eye,
  Layers, Warehouse, TreePine, CircleDollarSign, Briefcase
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
const CITIES = ["Mumbai", "Bengaluru", "Gurugram", "Pune", "Noida", "Hyderabad", "Thane", "Navi Mumbai", "Chennai", "Delhi"];

const SEARCH_TABS = [
  { id: "buy", label: "Buy", icon: Home },
  { id: "rent", label: "Rental", icon: Key },
  { id: "pg", label: "PG / Co-Living", icon: Users },
  { id: "projects", label: "Projects", icon: Building2 },
  { id: "plot", label: "Plot & Land", icon: TreePine },
  { id: "commercial", label: "Commercial", icon: Store },
];

const BUDGET_OPTIONS = [
  { label: "₹5 Lakhs", value: 500000 },
  { label: "₹10 Lakhs", value: 1000000 },
  { label: "₹20 Lakhs", value: 2000000 },
  { label: "₹30 Lakhs", value: 3000000 },
  { label: "₹50 Lakhs", value: 5000000 },
  { label: "₹75 Lakhs", value: 7500000 },
  { label: "₹1 Crore", value: 10000000 },
  { label: "₹1.5 Crore", value: 15000000 },
  { label: "₹2 Crore", value: 20000000 },
  { label: "₹3 Crore", value: 30000000 },
  { label: "₹5 Crore", value: 50000000 },
  { label: "₹10 Crore", value: 100000000 },
];

const PROPERTY_TYPES = [
  { label: "Apartment", value: "apartment", icon: Building2 },
  { label: "Villa", value: "villa", icon: Home },
  { label: "Plot", value: "plot", icon: Grid3X3 },
  { label: "Builder Floor", value: "builder_floor", icon: Layers },
  { label: "Penthouse", value: "penthouse", icon: Landmark },
  { label: "Independent House", value: "independent", icon: Home },
];

const POSSESSION_OPTIONS = [
  { label: "Ready To Move", value: "ready" },
  { label: "Under Construction", value: "under_construction" },
];

const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];

const AMENITY_OPTIONS = ["Swimming Pool", "Gym", "Parking", "Clubhouse", "Garden", "Security", "Power Backup", "Lift", "Play Area", "Jogging Track"];

const HERO_ROTATING_WORDS = ["Transactions", "Financing", "Interiors", "Property Management", "Site Visits"];

/* ── Mock data ── */
const MOCK_PROPERTIES: Property[] = [
  { id: "1", title: "Lodha World View", slug: "lodha-world-view", property_type: "apartment", listing_type: "buy", city: "Mumbai", locality: "Worli", price: 33200000, price_display: "₹3.32 Cr - ₹6.88 Cr", bhk: "3 BHK", area_sqft: 1850, amenities: ["Swimming Pool", "Gym", "Parking", "Clubhouse"], description: "Ultra-luxury sea-facing apartments", developer_name: "Lodha Group", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.5, reviews_count: 128 },
  { id: "2", title: "Prestige Raintree Park", slug: "prestige-raintree", property_type: "apartment", listing_type: "buy", city: "Bengaluru", locality: "Whitefield", price: 34100000, price_display: "₹3.41 Cr - ₹6.29 Cr", bhk: "3 BHK", area_sqft: 2200, amenities: ["Lake View", "Clubhouse", "Gym", "Swimming Pool"], description: "Premium community in IT corridor", developer_name: "Prestige Group", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.7, reviews_count: 256 },
  { id: "3", title: "Conscient Elaira Residences", slug: "conscient-elaira", property_type: "apartment", listing_type: "buy", city: "Gurugram", locality: "Sector 80", price: 31800000, price_display: "₹3.18 Cr - ₹4.30 Cr", bhk: "3 BHK", area_sqft: 2800, amenities: ["Concierge", "Gym", "Swimming Pool", "Clubhouse"], description: "Premium luxury residences", developer_name: "Conscient", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.6, reviews_count: 84 },
  { id: "4", title: "Krisala 41 Westworld", slug: "krisala-westworld", property_type: "apartment", listing_type: "buy", city: "Pune", locality: "Balewadi", price: 4102000, price_display: "₹41.02 L - ₹49 L", bhk: "2 BHK", area_sqft: 850, amenities: ["Garden", "Gym", "Parking"], description: "Affordable modern apartments", developer_name: "Krisala Developers", cover_image_url: null, is_featured: true, is_price_drop: true, original_price: 4800000, rating: 4.1, reviews_count: 189 },
  { id: "5", title: "Experion Saatori", slug: "experion-saatori", property_type: "apartment", listing_type: "buy", city: "Noida", locality: "Sector 151", price: 33600000, price_display: "₹3.36 Cr - ₹5.12 Cr", bhk: "3 BHK", area_sqft: 2400, amenities: ["Infinity Pool", "Sky Lounge", "Gym"], description: "Panoramic luxury living", developer_name: "Experion", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.4, reviews_count: 67 },
  { id: "6", title: "Godrej Regal Pavilion", slug: "godrej-regal", property_type: "apartment", listing_type: "buy", city: "Hyderabad", locality: "Gaganpahad", price: 12200000, price_display: "₹1.22 Cr - ₹3.21 Cr", bhk: "2 BHK", area_sqft: 1350, amenities: ["Garden", "Gym", "Swimming Pool", "Clubhouse"], description: "Premium gated community", developer_name: "Godrej Properties", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.5, reviews_count: 143 },
  { id: "7", title: "Prestige Garden Trails", slug: "prestige-garden", property_type: "apartment", listing_type: "buy", city: "Thane", locality: "Mira Road", price: 21100000, price_display: "₹2.11 Cr", bhk: "3 BHK", area_sqft: 1450, amenities: ["Garden", "Jogging Track", "Gym"], description: "Nature-inspired living", developer_name: "Prestige Group", cover_image_url: null, is_featured: false, is_price_drop: false, original_price: null, rating: 4.2, reviews_count: 98 },
  { id: "8", title: "Arihant Aspire", slug: "arihant-aspire", property_type: "apartment", listing_type: "buy", city: "Navi Mumbai", locality: "Palaspe Phata", price: 5730000, price_display: "₹57.30 L - ₹95.16 L", bhk: "2 BHK", area_sqft: 950, amenities: ["Parking", "Gym", "Play Area"], description: "Value housing in Navi Mumbai", developer_name: "Arihant Group", cover_image_url: null, is_featured: false, is_price_drop: true, original_price: 6500000, rating: 3.9, reviews_count: 210 },
  { id: "9", title: "TVS Emerald Lake Shore", slug: "tvs-lakeshore", property_type: "apartment", listing_type: "buy", city: "Chennai", locality: "Siruseri", price: 3719000, price_display: "₹37.19 L - ₹83.99 L", bhk: "2 BHK", area_sqft: 1050, amenities: ["Lake View", "Gym", "Clubhouse"], description: "Lakeside living in IT hub", developer_name: "TVS Emerald", cover_image_url: null, is_featured: false, is_price_drop: false, original_price: null, rating: 4.0, reviews_count: 134 },
  { id: "10", title: "Sobha City Vista", slug: "sobha-vista", property_type: "apartment", listing_type: "rent", city: "Bengaluru", locality: "Hebbal", price: 45000, price_display: "₹45,000/mo", bhk: "2 BHK", area_sqft: 1200, amenities: ["Swimming Pool", "Gym", "Security"], description: "Premium rental apartments", developer_name: "Sobha", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.3, reviews_count: 56 },
  { id: "11", title: "DLF Magnolias Rental", slug: "dlf-magnolias-rent", property_type: "apartment", listing_type: "rent", city: "Gurugram", locality: "Golf Course Road", price: 250000, price_display: "₹2.5 L/mo", bhk: "4 BHK", area_sqft: 5500, amenities: ["Concierge", "Pool", "Gym", "Spa"], description: "Ultra-luxury rental", developer_name: "DLF", cover_image_url: null, is_featured: true, is_price_drop: false, original_price: null, rating: 4.9, reviews_count: 23 },
];

const MOCK_TRENDS: PriceTrend[] = [
  { id: "1", city: "Mumbai", locality: "Bandra West", avg_price_sqft: 38200, change_pct: 8.2, ai_insights: "Strong demand near metro lines. Mumbai South leads at ₹45,900/sqft." },
  { id: "2", city: "Bengaluru", locality: "Whitefield", avg_price_sqft: 12300, change_pct: 12.5, ai_insights: "IT corridor driving sustained price growth. East Bengaluru at ₹14,150/sqft." },
  { id: "3", city: "Gurugram", locality: "Sector 80", avg_price_sqft: 15800, change_pct: 6.8, ai_insights: "Premium segment steady. New launches in Sector 80 & 84 popular." },
  { id: "4", city: "Pune", locality: "Balewadi", avg_price_sqft: 9400, change_pct: 15.2, ai_insights: "Fastest growing market. Hinjewadi & Balewadi top choices for buyers." },
  { id: "5", city: "Hyderabad", locality: "Gachibowli", avg_price_sqft: 9800, change_pct: 18.4, ai_insights: "Highest growth in India. Pharma & IT driving Gachibowli surge." },
  { id: "6", city: "Chennai", locality: "OMR", avg_price_sqft: 7500, change_pct: 9.1, ai_insights: "Steady growth along IT corridor. Siruseri emerging market." },
  { id: "7", city: "Noida", locality: "Sector 150", avg_price_sqft: 8200, change_pct: 11.3, ai_insights: "Expressway connectivity boosting values significantly." },
  { id: "8", city: "Thane", locality: "Ghodbunder Road", avg_price_sqft: 13500, change_pct: 7.5, ai_insights: "Affordable alternative to Mumbai. Metro connectivity upcoming." },
  { id: "9", city: "Delhi", locality: "Dwarka", avg_price_sqft: 14200, change_pct: 5.8, ai_insights: "Stable market with limited new supply. Dwarka Expressway trending." },
];

const TOP_DEVELOPERS = [
  { name: "Lodha", projects: 106, years: 39, priceRange: "₹67L - ₹98.7 Cr", city: "Mumbai" },
  { name: "Prestige", projects: 221, years: 33, priceRange: "₹32.8L - ₹31.5 Cr", city: "Bengaluru" },
  { name: "DLF", projects: 180, years: 78, priceRange: "₹45L - ₹50 Cr", city: "Gurugram" },
  { name: "Godrej", projects: 43, years: 29, priceRange: "₹1.07 Cr - ₹87.9 Cr", city: "Mumbai" },
  { name: "Sobha", projects: 168, years: 24, priceRange: "₹30.1L - ₹12 Cr", city: "Bengaluru" },
  { name: "Brigade", projects: 147, years: 33, priceRange: "₹29L - ₹32.6 Cr", city: "Bengaluru" },
  { name: "Kalpataru", projects: 83, years: 50, priceRange: "₹97.3L - ₹72 Cr", city: "Mumbai" },
  { name: "Mahindra Lifespaces", projects: 34, years: 25, priceRange: "₹1.11 Cr - ₹16 Cr", city: "Mumbai" },
];

const DEFAULT_SERVICES: REService[] = [
  { id: "1", title: "Home Loans", description: "Compare rates from 30+ banks. Get pre-approved in minutes with lowest EMIs.", icon_name: "IndianRupee", cover_image_url: null },
  { id: "2", title: "Legal Assistance", description: "Property verification, title search & complete legal documentation support.", icon_name: "Shield", cover_image_url: null },
  { id: "3", title: "Registration Help", description: "End-to-end property registration with stamp duty calculation & guidance.", icon_name: "FileText", cover_image_url: null },
  { id: "4", title: "Property Management", description: "Tenant management, rent collection & maintenance coordination.", icon_name: "Briefcase", cover_image_url: null },
];

const DEFAULT_DESIGNS: InteriorDesign[] = [
  { id: "1", title: "Modern Minimalist Living", description: "Clean lines, neutral palettes, functional furniture", cover_image_url: null, category: "Living Room" },
  { id: "2", title: "Contemporary Modular Kitchen", description: "Smart storage, island counters, premium finishes", cover_image_url: null, category: "Kitchen" },
  { id: "3", title: "Luxury Master Bedroom", description: "Warm tones, walk-in closet, ambient lighting", cover_image_url: null, category: "Bedroom" },
  { id: "4", title: "Urban Balcony Garden", description: "Vertical planters, seating nooks, fairy lights", cover_image_url: null, category: "Balcony" },
  { id: "5", title: "Kids Room Fantasy", description: "Themed walls, study corners, bunk beds", cover_image_url: null, category: "Kids Room" },
  { id: "6", title: "Home Office Studio", description: "Ergonomic setup, soundproofing, smart storage", cover_image_url: null, category: "Office" },
];

const ICON_MAP: Record<string, any> = {
  Home, Building2, IndianRupee, Shield, FileText, Sparkles, Phone, Paintbrush, Briefcase, Landmark, Key, Store,
};

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function RealEstatePage() {
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [trends, setTrends] = useState<PriceTrend[]>(MOCK_TRENDS);
  const [services, setServices] = useState<REService[]>(DEFAULT_SERVICES);
  const [designs, setDesigns] = useState<InteriorDesign[]>(DEFAULT_DESIGNS);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [activeTab, setActiveTab] = useState("buy");
  const [selectedCity, setSelectedCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [budgetMin, setBudgetMin] = useState<number | "">("");
  const [budgetMax, setBudgetMax] = useState<number | "">("");
  const [selectedPropertyType, setSelectedPropertyType] = useState("");
  const [selectedBHK, setSelectedBHK] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [possession, setPossession] = useState("");
  const [showBudget, setShowBudget] = useState(false);
  const [showPropertyType, setShowPropertyType] = useState(false);
  const [showPossession, setShowPossession] = useState(false);
  const [showAmenities, setShowAmenities] = useState(false);

  // Hot selling city tab
  const [hotCity, setHotCity] = useState("Mumbai");

  // Price insights city tab
  const [insightCity, setInsightCity] = useState("Mumbai");

  // Hero rotating word
  const [heroWordIdx, setHeroWordIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setHeroWordIdx(i => (i + 1) % HERO_ROTATING_WORDS.length), 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [propRes, trendRes, svcRes, designRes] = await Promise.all([
        supabase.from("properties").select("*").eq("status", "active").order("is_featured", { ascending: false }).limit(50),
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

  // Filtering logic
  const filteredProperties = properties.filter(p => {
    if (activeTab === "rent" && p.listing_type !== "rent") return false;
    if (activeTab === "pg" && p.listing_type !== "pg") return false;
    if (activeTab !== "rent" && activeTab !== "pg" && p.listing_type !== "buy") return false;
    if (selectedCity && p.city !== selectedCity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q) && !(p.locality?.toLowerCase().includes(q))) return false;
    }
    if (budgetMin && p.price < budgetMin) return false;
    if (budgetMax && p.price > budgetMax) return false;
    if (selectedPropertyType && p.property_type !== selectedPropertyType) return false;
    if (selectedBHK.length > 0 && p.bhk && !selectedBHK.includes(p.bhk)) return false;
    if (selectedAmenities.length > 0 && p.amenities) {
      if (!selectedAmenities.some(a => p.amenities!.includes(a))) return false;
    }
    return true;
  });

  const hotCityProperties = properties.filter(p => p.city === hotCity && p.listing_type === "buy");
  const priceDropProps = properties.filter(p => p.is_price_drop);
  const cityTrend = trends.find(t => t.city === insightCity);

  function toggleBHK(bhk: string) {
    setSelectedBHK(prev => prev.includes(bhk) ? prev.filter(b => b !== bhk) : [...prev, bhk]);
  }

  function toggleAmenity(a: string) {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  function clearFilters() {
    setSelectedCity("");
    setSearchQuery("");
    setBudgetMin("");
    setBudgetMax("");
    setSelectedPropertyType("");
    setSelectedBHK([]);
    setSelectedAmenities([]);
    setPossession("");
  }

  const activeFilterCount = [
    selectedCity, searchQuery, budgetMin, budgetMax, selectedPropertyType,
    selectedBHK.length > 0 ? "x" : "", possession, selectedAmenities.length > 0 ? "x" : ""
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />

      {/* ═══════════════════════════════════
          HERO — Dark, inspired by Square Yards
      ═══════════════════════════════════ */}
      <section className="relative bg-[#1a1a2e] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#e94560]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12">
          {/* Hero text */}
          <div className="mb-10 max-w-2xl">
            <h1 className="text-3xl md:text-5xl lg:text-[56px] font-black text-white leading-tight mb-4">
              India's Largest<br />
              <span className="text-white">Real Estate Platform</span>
            </h1>
            <p className="text-white/60 text-lg">
              We've got you covered! From finding the perfect property to{" "}
              <span className="text-[#ffd700] font-bold transition-all">
                {HERO_ROTATING_WORDS[heroWordIdx]}
              </span>
            </p>
          </div>

          {/* ─── Search Box ─── */}
          <div className="max-w-5xl">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-white/10">
              {SEARCH_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "text-white border-[#ffd700] bg-white/5"
                      : "text-white/50 border-transparent hover:text-white/80 hover:bg-white/5"
                  }`}>
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Row */}
            <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-2xl">
              <div className="flex flex-col md:flex-row">
                {/* City select */}
                <div className="relative border-b md:border-b-0 md:border-r border-border md:w-[200px]">
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                    className="w-full h-full px-4 py-4 text-sm text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer font-medium">
                    <option value="">Select City</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Search input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={`Search by locality, project, or developer...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                {/* Search button */}
                <button className="bg-[#ffd700] hover:bg-[#e6c200] text-[#1a1a2e] px-8 py-4 font-bold text-sm transition-colors md:rounded-br-2xl md:rounded-tr-2xl flex items-center gap-2 justify-center">
                  <Search className="h-4 w-4" /> Search
                </button>
              </div>

              {/* Filter pills row */}
              <div className="px-4 py-3 border-t border-border flex flex-wrap gap-2 items-center">
                {/* Budget */}
                <div className="relative">
                  <button onClick={() => { setShowBudget(!showBudget); setShowPropertyType(false); setShowPossession(false); setShowAmenities(false); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      budgetMin || budgetMax ? "border-[#ffd700] bg-[#ffd700]/10 text-[#1a1a2e]" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}>
                    Budget <ChevronDown className="h-3 w-3" />
                  </button>
                  {showBudget && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 p-4 w-[300px]">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Min Budget</div>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {BUDGET_OPTIONS.slice(0, 6).map(b => (
                          <button key={b.value} onClick={() => setBudgetMin(b.value)}
                            className={`text-[11px] px-2 py-1.5 rounded-lg border transition-colors ${
                              budgetMin === b.value ? "bg-[#1a1a2e] text-white border-[#1a1a2e]" : "border-border hover:bg-muted"
                            }`}>{b.label}</button>
                        ))}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Max Budget</div>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {BUDGET_OPTIONS.slice(3).map(b => (
                          <button key={b.value} onClick={() => setBudgetMax(b.value)}
                            className={`text-[11px] px-2 py-1.5 rounded-lg border transition-colors ${
                              budgetMax === b.value ? "bg-[#1a1a2e] text-white border-[#1a1a2e]" : "border-border hover:bg-muted"
                            }`}>{b.label}</button>
                        ))}
                      </div>
                      <button onClick={() => setShowBudget(false)} className="w-full bg-[#ffd700] text-[#1a1a2e] py-2 rounded-lg text-xs font-bold">Apply</button>
                    </div>
                  )}
                </div>

                {/* Property Type */}
                <div className="relative">
                  <button onClick={() => { setShowPropertyType(!showPropertyType); setShowBudget(false); setShowPossession(false); setShowAmenities(false); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      selectedPropertyType ? "border-[#ffd700] bg-[#ffd700]/10 text-[#1a1a2e]" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}>
                    Property Type <ChevronDown className="h-3 w-3" />
                  </button>
                  {showPropertyType && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 p-3 w-[220px]">
                      {PROPERTY_TYPES.map(pt => (
                        <button key={pt.value} onClick={() => { setSelectedPropertyType(pt.value === selectedPropertyType ? "" : pt.value); setShowPropertyType(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                            selectedPropertyType === pt.value ? "bg-[#1a1a2e] text-white" : "hover:bg-muted text-foreground"
                          }`}>
                          <pt.icon className="h-4 w-4" /> {pt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Possession */}
                <div className="relative">
                  <button onClick={() => { setShowPossession(!showPossession); setShowBudget(false); setShowPropertyType(false); setShowAmenities(false); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      possession ? "border-[#ffd700] bg-[#ffd700]/10 text-[#1a1a2e]" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}>
                    Possession Status <ChevronDown className="h-3 w-3" />
                  </button>
                  {showPossession && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 p-3 w-[200px]">
                      {POSSESSION_OPTIONS.map(po => (
                        <button key={po.value} onClick={() => { setPossession(po.value === possession ? "" : po.value); setShowPossession(false); }}
                          className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                            possession === po.value ? "bg-[#1a1a2e] text-white" : "hover:bg-muted"
                          }`}>{po.label}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* BHK pills */}
                <div className="hidden md:flex items-center gap-1.5 ml-1">
                  {BHK_OPTIONS.map(bhk => (
                    <button key={bhk} onClick={() => toggleBHK(bhk)}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all ${
                        selectedBHK.includes(bhk)
                          ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}>{bhk}</button>
                  ))}
                </div>

                {/* Amenities */}
                <div className="relative">
                  <button onClick={() => { setShowAmenities(!showAmenities); setShowBudget(false); setShowPropertyType(false); setShowPossession(false); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      selectedAmenities.length > 0 ? "border-[#ffd700] bg-[#ffd700]/10 text-[#1a1a2e]" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}>
                    Amenities {selectedAmenities.length > 0 && <span className="bg-[#1a1a2e] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{selectedAmenities.length}</span>}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showAmenities && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 p-3 w-[260px]">
                      <div className="grid grid-cols-2 gap-1.5">
                        {AMENITY_OPTIONS.map(a => (
                          <button key={a} onClick={() => toggleAmenity(a)}
                            className={`text-[11px] px-2 py-2 rounded-lg border text-left transition-colors ${
                              selectedAmenities.includes(a) ? "bg-[#1a1a2e] text-white border-[#1a1a2e]" : "border-border hover:bg-muted"
                            }`}>{a}</button>
                        ))}
                      </div>
                      <button onClick={() => setShowAmenities(false)} className="w-full mt-2 bg-[#ffd700] text-[#1a1a2e] py-2 rounded-lg text-xs font-bold">Apply</button>
                    </div>
                  )}
                </div>

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-semibold ml-2">
                    Clear All ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-[1440px] mx-auto px-4 py-8 space-y-12">

        {/* ═══════════════════════════════════
            HOT SELLING PROJECTS — City Tabs
        ═══════════════════════════════════ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-foreground mb-1">Hot Selling Real Estate Projects in India</h2>
            <p className="text-sm text-muted-foreground">A handpicked collection of the country's most in-demand residential developments</p>
          </div>
          {/* City tabs */}
          <div className="flex gap-1 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            {CITIES.map(city => (
              <button key={city} onClick={() => setHotCity(city)}
                className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all ${
                  hotCity === city
                    ? "bg-[#1a1a2e] text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>{city}</button>
            ))}
          </div>
          {/* Property cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(hotCityProperties.length > 0 ? hotCityProperties : properties.filter(p => p.listing_type === "buy")).slice(0, 5).map((prop, idx) => (
              <div key={prop.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all relative">
                {/* Rank number */}
                <div className="absolute top-3 left-3 z-10 bg-[#1a1a2e] text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                  {idx + 1}
                </div>
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden relative">
                  {prop.cover_image_url ? (
                    <img src={prop.cover_image_url} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                      <Building2 className="h-12 w-12 text-blue-200" />
                    </div>
                  )}
                  {prop.is_price_drop && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">PRICE DROP</span>
                  )}
                </div>
                <div className="p-3.5">
                  <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{prop.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {prop.locality}, {prop.city}
                  </p>
                  <div className="mt-2 number-font text-base font-black text-foreground">
                    {prop.price_display || formatPrice(prop.price)}
                  </div>
                  {prop.developer_name && (
                    <p className="text-[10px] text-muted-foreground mt-1">by {prop.developer_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════
            PROPERTY PRICE INSIGHTS — City Tabs
        ═══════════════════════════════════ */}
        <section className="bg-card border border-border rounded-3xl p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-foreground mb-1">Property Price Insights in India</h2>
            <p className="text-sm text-muted-foreground">Get accurate property price insights with city-wise trends and micro-market comparisons</p>
          </div>
          {/* City tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {CITIES.slice(0, 9).map(city => (
              <button key={city} onClick={() => setInsightCity(city)}
                className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all ${
                  insightCity === city
                    ? "bg-[#1a1a2e] text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>{city}</button>
            ))}
          </div>

          {cityTrend ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Price Trend Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-foreground">Price Trend in {insightCity}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{insightCity}'s average asking price is rising quarter-on-quarter.</p>
                <div className="space-y-2">
                  {[
                    { q: "Q4 2025", price: cityTrend.avg_price_sqft ?? 0 },
                    { q: "Q3 2025", price: Math.round((cityTrend.avg_price_sqft ?? 0) * 0.94) },
                    { q: "Q2 2025", price: Math.round((cityTrend.avg_price_sqft ?? 0) * 0.89) },
                    { q: "Q1 2025", price: Math.round((cityTrend.avg_price_sqft ?? 0) * 0.85) },
                  ].map(q => (
                    <div key={q.q} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{q.q}</span>
                      <span className="number-font font-bold text-foreground">₹{q.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asking Price Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-foreground">Asking Price in {insightCity}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Median Price of <span className="font-bold text-foreground">₹{((cityTrend.avg_price_sqft ?? 0) / 1000).toFixed(1)}K/Sq.Ft.</span>
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className={`flex items-center gap-1 text-sm font-bold ${
                    (cityTrend.change_pct ?? 0) >= 0 ? "text-gain" : "text-loss"
                  }`}>
                    {(cityTrend.change_pct ?? 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {(cityTrend.change_pct ?? 0) >= 0 ? "+" : ""}{cityTrend.change_pct}% YoY
                  </div>
                </div>
                <div className="mt-4 w-full h-3 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(Math.abs(cityTrend.change_pct ?? 0) * 4, 100)}%` }} />
                </div>
              </div>

              {/* AI Insights Card */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-foreground">AI Market Insights</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{cityTrend.ai_insights}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Updated by AI analysis
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No price insights available for {insightCity} yet.</p>
            </div>
          )}

          {/* All city trend cards */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {trends.slice(0, 10).map(t => (
              <button key={t.id} onClick={() => setInsightCity(t.city)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  insightCity === t.city ? "border-[#1a1a2e] bg-[#1a1a2e] text-white" : "border-border bg-white hover:shadow-md"
                }`}>
                <div className="font-bold text-sm">{t.city}</div>
                <div className={`number-font text-lg font-black ${insightCity === t.city ? "text-[#ffd700]" : "text-foreground"}`}>
                  ₹{((t.avg_price_sqft ?? 0) / 1000).toFixed(1)}K
                </div>
                <div className={`text-xs font-semibold ${
                  (t.change_pct ?? 0) >= 0 ? (insightCity === t.city ? "text-emerald-300" : "text-gain") : "text-loss"
                }`}>
                  {(t.change_pct ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(t.change_pct ?? 0)}%
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════
            PRICE DROP SECTION
        ═══════════════════════════════════ */}
        {priceDropProps.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
                Price Reduced!
              </div>
              <h2 className="text-2xl font-black text-foreground">Price Drop Deals</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {priceDropProps.map(prop => (
                <PropertyCard key={prop.id} property={prop} showPriceDrop />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════
            ALL FILTERED LISTINGS
        ═══════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-black text-foreground">
                {activeTab === "rent" ? "Properties for Rent" : "Properties for Sale"}
                {selectedCity && ` in ${selectedCity}`}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{filteredProperties.length} properties found</p>
            </div>
          </div>
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProperties.slice(0, 16).map(prop => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card border border-border rounded-2xl">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
              <p className="font-bold text-foreground text-lg">No properties match your filters</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Try adjusting your search criteria</p>
              <button onClick={clearFilters} className="bg-[#1a1a2e] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a2e]/90 transition-colors">
                Clear All Filters
              </button>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════
            TOP DEVELOPERS
        ═══════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-foreground mb-1">Top Developers in India</h2>
          <p className="text-sm text-muted-foreground mb-5">Trusted builders with decades of experience</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {TOP_DEVELOPERS.map(dev => (
              <div key={dev.name} className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all group cursor-pointer">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <span className="text-xl font-black text-[#1a1a2e]">{dev.name[0]}</span>
                </div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{dev.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 number-font font-semibold">{dev.priceRange}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {dev.projects} Projects</span>
                  <span>{dev.years} Years</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════
            SERVICES
        ═══════════════════════════════════ */}
        <section className="bg-[#1a1a2e] rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#ffd700]/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black mb-2">Our Services</h2>
              <p className="text-white/50 text-sm">Everything you need for a smooth property journey</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map(svc => {
                const IconComp = ICON_MAP[svc.icon_name ?? "Home"] ?? Home;
                return (
                  <div key={svc.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-[#ffd700]/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <IconComp className="h-6 w-6 text-[#ffd700]" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{svc.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{svc.description}</p>
                    <button className="mt-4 text-[#ffd700] text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                      Learn More <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════
            INTERIOR DESIGN
        ═══════════════════════════════════ */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-foreground mb-1">Interior Design Inspiration</h2>
            <p className="text-sm text-muted-foreground">Transform your space with expert design solutions and curated ideas</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {designs.map(d => (
              <div key={d.id} className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer">
                <div className="aspect-[16/10] bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center overflow-hidden">
                  {d.cover_image_url ? (
                    <img src={d.cover_image_url} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <Paintbrush className="h-16 w-16 text-amber-200" />
                  )}
                </div>
                <div className="p-5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">{d.category}</span>
                  <h3 className="font-bold text-lg text-foreground mt-2.5 group-hover:text-primary transition-colors">{d.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════
            RATINGS & REVIEWS
        ═══════════════════════════════════ */}
        <section>
          <h2 className="text-2xl font-black text-foreground mb-1">Top Rated Projects</h2>
          <p className="text-sm text-muted-foreground mb-5">What homebuyers are saying about popular properties</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.filter(p => (p.rating ?? 0) >= 4).slice(0, 6).map(prop => (
              <div key={prop.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-50 rounded-xl flex items-center justify-center">
                    <Award className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{prop.title}</div>
                    <div className="text-xs text-muted-foreground">{prop.city} · {prop.developer_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= Math.round(prop.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="number-font text-sm font-bold text-foreground">{prop.rating}</span>
                  <span className="text-xs text-muted-foreground">({prop.reviews_count} reviews)</span>
                </div>
                <div className="number-font text-xl font-black text-foreground mb-1">
                  {prop.price_display || formatPrice(prop.price)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {prop.locality}, {prop.city}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════
            GOVERNMENT REGISTRATIONS & POLICIES
        ═══════════════════════════════════ */}
        <section className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-100 rounded-3xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold mb-3">
              <Landmark className="h-3.5 w-3.5" /> Government & Regulatory
            </div>
            <h2 className="text-2xl font-black text-foreground">Registrations & Policies</h2>
            <p className="text-sm text-muted-foreground mt-1">Stay informed about regulatory changes and government initiatives</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "RERA Guidelines 2026", desc: "Updated Real Estate Regulatory Authority guidelines for buyer protection and project transparency.", icon: Shield },
              { title: "Stamp Duty Rates", desc: "Current stamp duty and registration charges across all states. Compare before buying.", icon: FileText },
              { title: "Home Loan Interest Rates", desc: "Latest home loan interest rates from SBI, HDFC, ICICI & 20+ banks compared.", icon: IndianRupee },
            ].map(item => (
              <div key={item.title} className="bg-white border border-blue-100 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group">
                <item.icon className="h-8 w-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                <button className="mt-3 text-blue-600 text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                  Read More <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}

/* ── Property Card Component ── */
function PropertyCard({ property: p, showPriceDrop, compact }: { property: Property; showPriceDrop?: boolean; compact?: boolean }) {
  return (
    <Link to={`/real-estate/${p.slug}`} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all block">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
        {p.cover_image_url ? (
          <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <Building2 className="h-14 w-14 text-blue-200" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.is_featured && (
            <span className="bg-[#ffd700] text-[#1a1a2e] text-[9px] font-black px-2 py-1 rounded-lg uppercase flex items-center gap-1">
              <Star className="h-3 w-3" /> Featured
            </span>
          )}
          {(p.is_price_drop || showPriceDrop) && (
            <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase flex items-center gap-1">
              <BadgePercent className="h-3 w-3" /> Price Drop
            </span>
          )}
        </div>
        <button onClick={e => e.preventDefault()} className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
          <Heart className="h-4 w-4 text-muted-foreground hover:text-red-500 transition-colors" />
        </button>
        {p.listing_type === "rent" && (
          <span className="absolute bottom-3 left-3 bg-[#1a1a2e]/80 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-lg uppercase">For Rent</span>
        )}
        {p.listing_type === "pg" && (
          <span className="absolute bottom-3 left-3 bg-purple-600/80 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-lg uppercase">PG</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{p.property_type}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" /> {p.locality}, {p.city}
          </span>
        </div>
        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-0.5">{p.title}</h3>
        {p.developer_name && <p className="text-xs text-muted-foreground mb-2">by {p.developer_name}</p>}
        <div className="flex items-center gap-3 mb-2.5 flex-wrap">
          {p.bhk && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              <Bed className="h-3 w-3" /> {p.bhk}
            </span>
          )}
          {p.area_sqft && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              <Maximize className="h-3 w-3" /> {p.area_sqft.toLocaleString()} sqft
            </span>
          )}
          {p.amenities && p.amenities.length > 0 && (
            <span className="text-xs text-muted-foreground">+{p.amenities.length} amenities</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="number-font text-lg font-black text-foreground">
              {p.price_display || formatPrice(p.price)}
            </div>
            {p.is_price_drop && p.original_price && (
              <div className="text-xs text-muted-foreground line-through number-font">
                {formatPrice(p.original_price)}
              </div>
            )}
          </div>
          {(p.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 bg-[#ffd700]/10 px-2 py-1 rounded-lg">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="number-font text-sm font-bold text-foreground">{p.rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
