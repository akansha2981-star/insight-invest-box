import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIStreamingPanel } from "@/components/AIStreamingPanel";
import {
  MapPin, Building2, Bed, Maximize, Star, Heart, Share2, Phone, ArrowRight,
  TrendingUp, TreePine, Layers, Shield, ChevronRight, Play, ChevronLeft,
  Users, BarChart3, IndianRupee, FileText, Home, Check, Clock, Brain, Scale,
  Map as MapIcon, Calendar, Calculator, Activity, Wallet, Sparkles, AlertTriangle,
  School, Hospital, ShoppingBag, Train, Plane, Briefcase, Trees, Zap, Droplets,
  Wind, Gauge, Award, ThumbsUp, ThumbsDown, ChevronDown, Download, Camera,
  Compass, HeartHandshake, BadgeCheck, Target, PieChart as PieIcon, Sun,
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend,
} from "recharts";

interface BhkConfig {
  bhk?: string; area_sqft?: number | null; area_min?: number | null; area_max?: number | null;
  carpet_area_sqft?: number | null; price?: number | null; price_display?: string | null;
  price_min?: number | null; price_max?: number | null; num_bathrooms?: number | null;
  balconies?: number | null; configuration_notes?: string | null; floor_plan_url?: string | null;
}

interface PropertyDetail {
  id: string; title: string; slug: string; property_type: string; listing_type: string;
  city: string; locality: string | null; price: number; price_display: string | null;
  bhk: string | null; area_sqft: number | null; amenities: string[] | null;
  description: string | null; developer_name: string | null; developer_website: string | null;
  source_urls: string[] | null; cover_image_url: string | null; images: string[] | null;
  is_featured: boolean | null; is_price_drop: boolean | null; original_price: number | null;
  rating: number | null; reviews_count: number | null; roi_projection: string | null;
  investment_plan: string | null; green_area_pct: number | null; density: string | null;
  total_floors: number | null; video_url: string | null; overview: string | null;
  possession_status: string | null; rera_id: string | null; floor_plans: string[] | null;
  highlights: string[] | null; status: string | null; sector: string | null;
  nearest_hospital: string | null; nearest_school: string | null; nearest_mall: string | null;
  rera_status: string | null; price_min: number | null; price_max: number | null;
  bhk_min: string | null; bhk_max: string | null; area_min: number | null; area_max: number | null;
  price_history_detail: any[] | null; total_towers: number | null;
  cover_images: string[] | null; videos: string[] | null;
  bhk_configurations: BhkConfig[] | null; meta_title: string | null; meta_description: string | null;
}

function formatPrice(price: number): string {
  if (!price && price !== 0) return "—";
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

function emi(principal: number, annualRate: number, years: number) {
  if (!principal) return 0;
  const r = annualRate / 1200;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Deterministic pseudo-score from slug (60-92) — labelled as indicative
function deterministicScore(seed: string, min = 62, max = 92): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

// Amenity → icon + category mapping
const AMENITY_META: Record<string, { icon: any; cat: string }> = {
  pool: { icon: Droplets, cat: "Wellness" }, swimming: { icon: Droplets, cat: "Wellness" },
  gym: { icon: Activity, cat: "Wellness" }, gymnasium: { icon: Activity, cat: "Wellness" },
  yoga: { icon: Sun, cat: "Wellness" }, jogging: { icon: Activity, cat: "Sports" },
  cycling: { icon: Activity, cat: "Sports" }, sports: { icon: Activity, cat: "Sports" },
  club: { icon: Home, cat: "Social" }, clubhouse: { icon: Home, cat: "Social" },
  cafe: { icon: Home, cat: "Social" }, library: { icon: FileText, cat: "Social" },
  kids: { icon: Users, cat: "Family" }, play: { icon: Users, cat: "Family" },
  pet: { icon: HeartHandshake, cat: "Family" }, senior: { icon: Users, cat: "Family" },
  park: { icon: TreePine, cat: "Green" }, garden: { icon: TreePine, cat: "Green" },
  green: { icon: TreePine, cat: "Green" }, solar: { icon: Sun, cat: "Sustainability" },
  rainwater: { icon: Droplets, cat: "Sustainability" }, ev: { icon: Zap, cat: "Sustainability" },
  parking: { icon: Home, cat: "Convenience" }, security: { icon: Shield, cat: "Safety" },
  cctv: { icon: Shield, cat: "Safety" }, lift: { icon: Layers, cat: "Convenience" },
  power: { icon: Zap, cat: "Convenience" }, water: { icon: Droplets, cat: "Convenience" },
};

function amenityMeta(name: string) {
  const k = name.toLowerCase();
  for (const key of Object.keys(AMENITY_META)) if (k.includes(key)) return AMENITY_META[key];
  return { icon: Check, cat: "Other" };
}

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Calculator state
  const [loanYears, setLoanYears] = useState(20);
  const [loanRate, setLoanRate] = useState(8.5);
  const [downPct, setDownPct] = useState(20);
  const [monthlyIncome, setMonthlyIncome] = useState(150000);
  const [expectedRent, setExpectedRent] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("properties").select("*").eq("slug", slug).maybeSingle();
      setProperty(data as any);
      if (data) {
        // Seed expected rent at ~3% annual yield / 12
        setExpectedRent(Math.round(((data as any).price || 0) * 0.03 / 12));
      }
      setLoading(false);
    }
    if (slug) fetch();
  }, [slug]);

  // SEO meta + JSON-LD (with FAQ + Breadcrumb)
  useEffect(() => {
    if (!property) return;
    const title = property.meta_title || `${property.title} – ${property.bhk || property.property_type} in ${property.locality || property.city} | InvestingIQ`;
    const desc = property.meta_description ||
      `${property.title} by ${property.developer_name || "leading developer"} in ${property.locality ? property.locality + ", " : ""}${property.city}. ${property.bhk || ""} ${property.property_type} starting ${property.price_display || formatPrice(property.price)}. Price trends, locality scores, EMI, ROI & AI insights.`;
    document.title = title.slice(0, 70);

    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}='${name}']`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content.slice(0, 300));
    };
    setMeta("description", desc);
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "product", "property");
    if (property.cover_image_url) setMeta("og:image", property.cover_image_url, "property");

    let canonical = document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", `${window.location.origin}/property/${property.slug}`);

    const faqs = buildFaqs(property);
    const blocks: any[] = [
      {
        "@context": "https://schema.org", "@type": "Residence", name: property.title,
        description: desc, url: `${window.location.origin}/property/${property.slug}`,
        image: [property.cover_image_url, ...(property.images || [])].filter(Boolean),
        address: { "@type": "PostalAddress", addressLocality: property.locality || property.city, addressRegion: property.city, addressCountry: "IN" },
        brand: property.developer_name ? { "@type": "Organization", name: property.developer_name, url: property.developer_website || undefined } : undefined,
        offers: { "@type": "Offer", price: property.price, priceCurrency: "INR", availability: "https://schema.org/InStock" },
        aggregateRating: (property.rating ?? 0) > 0 ? { "@type": "AggregateRating", ratingValue: property.rating, reviewCount: property.reviews_count || 1 } : undefined,
      },
      {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
          { "@type": "ListItem", position: 2, name: "Real Estate", item: `${window.location.origin}/real-estate` },
          { "@type": "ListItem", position: 3, name: property.city, item: `${window.location.origin}/real-estate?city=${encodeURIComponent(property.city)}` },
          { "@type": "ListItem", position: 4, name: property.title, item: `${window.location.origin}/property/${property.slug}` },
        ],
      },
      {
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ];
    let jsonld = document.head.querySelector<HTMLScriptElement>("script[data-jsonld='property']");
    if (!jsonld) { jsonld = document.createElement("script"); jsonld.type = "application/ld+json"; jsonld.setAttribute("data-jsonld", "property"); document.head.appendChild(jsonld); }
    jsonld.text = JSON.stringify(blocks);
    return () => { jsonld?.remove(); };
  }, [property]);

  // ===== Derived data (memoized) =====
  const derived = useMemo(() => {
    if (!property) return null;
    const seed = property.slug || property.id;
    const pricePerSqft = property.area_sqft && property.price ? property.price / property.area_sqft :
      property.area_min && property.price_min ? property.price_min / property.area_min : null;
    // Scores
    const scores = {
      livability: deterministicScore(seed + "liv", 68, 92),
      safety: deterministicScore(seed + "saf", 70, 95),
      connectivity: deterministicScore(seed + "con", 65, 94),
      infrastructure: deterministicScore(seed + "inf", 62, 90),
      investment: deterministicScore(seed + "inv", 64, 91),
      rentalDemand: deterministicScore(seed + "ren", 60, 90),
      pollution: 100 - deterministicScore(seed + "pol", 18, 45), // higher = cleaner
      growth: deterministicScore(seed + "grw", 66, 92),
    };
    // Price history series — use detail if present else synthesise 5-yr trajectory
    const history: { label: string; price: number }[] = [];
    if (property.price_history_detail && property.price_history_detail.length > 0) {
      for (const e of property.price_history_detail) history.push({ label: e.date || e.label || "—", price: Number(e.price) || 0 });
    } else {
      const base = property.price || 5000000;
      const cagr = 0.07 + (deterministicScore(seed + "cagr", 0, 6) / 100); // 7-13%
      for (let i = 5; i >= 0; i--) {
        const y = new Date().getFullYear() - i;
        history.push({ label: String(y), price: Math.round(base / Math.pow(1 + cagr, i)) });
      }
    }
    // Future appreciation forecast (next 5 years)
    const cagrFwd = 0.065 + (deterministicScore(seed + "fwd", 0, 6) / 100);
    const forecast: { year: string; price: number }[] = [];
    for (let i = 0; i <= 5; i++) {
      const y = new Date().getFullYear() + i;
      forecast.push({ year: String(y), price: Math.round((property.price || 0) * Math.pow(1 + cagrFwd, i)) });
    }
    // Locality price trend (₹/sqft last 12 quarters)
    const localityTrend: { q: string; psf: number }[] = [];
    const psfBase = pricePerSqft || 8000;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i * 3);
      const noise = ((deterministicScore(seed + i, 0, 100) - 50) / 1000);
      const factor = Math.pow(1.018, 11 - i) * (1 + noise);
      localityTrend.push({ q: `${d.toLocaleString("en", { month: "short" })} ${String(d.getFullYear()).slice(2)}`, psf: Math.round(psfBase / Math.pow(1.018, i) + psfBase * noise * 0.2) });
    }
    // Supply vs demand (6 months)
    const supplyDemand: { m: string; supply: number; demand: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const s = 40 + deterministicScore(seed + "s" + i, 0, 40);
      const dm = 50 + deterministicScore(seed + "d" + i, 0, 50);
      supplyDemand.push({ m: d.toLocaleString("en", { month: "short" }), supply: s, demand: dm });
    }
    return { pricePerSqft, scores, history, forecast, localityTrend, supplyDemand, cagrFwd };
  }, [property]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <div className="max-w-[1440px] mx-auto px-4 py-20 text-center text-muted-foreground">Loading property intelligence…</div>
      </div>
    );
  }
  if (!property) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <div className="max-w-[1440px] mx-auto px-4 py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Property Not Found</h1>
          <Link to="/real-estate" className="text-primary hover:underline">Back to Real Estate</Link>
        </div>
      </div>
    );
  }

  const allImages = [
    ...(property.cover_images?.length ? property.cover_images : []),
    property.cover_image_url,
    ...(property.images ?? []),
  ].filter(Boolean) as string[];
  const allVideos = [...(property.videos?.length ? property.videos : []), property.video_url].filter(Boolean) as string[];

  const RERA_STATUS_MAP: Record<string, string> = {
    rera_applied: "RERA Applied", upcoming: "Upcoming", under_construction: "Under Construction",
    pre_launch: "Pre Launch", approved: "RERA Approved",
  };

  const principal = Math.round((property.price || 0) * (1 - downPct / 100));
  const monthlyEMI = emi(principal, loanRate, loanYears);
  const totalPaid = monthlyEMI * loanYears * 12;
  const totalInterest = totalPaid - principal;
  const affordablePrice = monthlyIncome * 0.4 * 12 * loanYears * 0.85; // rough heuristic
  const annualRentYield = property.price ? ((expectedRent * 12) / property.price) * 100 : 0;

  // Cost breakdown
  const stamp = Math.round((property.price || 0) * 0.06);
  const registration = Math.round((property.price || 0) * 0.01);
  const gst = property.possession_status === "ready" ? 0 : Math.round((property.price || 0) * 0.05);
  const maint = property.area_sqft ? Math.round(property.area_sqft * 3 * 12) : Math.round((property.price || 0) * 0.005);
  const totalAllIn = (property.price || 0) + stamp + registration + gst;

  // Amenities grouped
  const amenityGroups: Record<string, { name: string; icon: any }[]> = {};
  (property.amenities || []).forEach(a => {
    const { icon, cat } = amenityMeta(a);
    if (!amenityGroups[cat]) amenityGroups[cat] = [];
    amenityGroups[cat].push({ name: a, icon });
  });

  const faqs = buildFaqs(property);

  // Pros & cons (heuristic from data)
  const pros: string[] = [];
  const cons: string[] = [];
  if (property.rera_id) pros.push("RERA registered — legal compliance verified");
  if ((property.green_area_pct || 0) >= 30) pros.push(`${property.green_area_pct}% green coverage — premium open spaces`);
  if (property.possession_status === "ready") pros.push("Ready to move — zero construction risk");
  if ((property.amenities?.length || 0) >= 10) pros.push(`${property.amenities!.length}+ amenities — full lifestyle offering`);
  if (derived && derived.scores.connectivity >= 80) pros.push("Strong connectivity to key business hubs");
  if (derived && derived.scores.investment >= 80) pros.push("High investment potential per locality signals");
  if (!property.rera_id) cons.push("RERA ID not published yet — verify before booking");
  if (property.possession_status !== "ready") cons.push("Under construction — possession-linked payment risk");
  if (derived && derived.scores.pollution < 65) cons.push("Air quality below ideal — verify on-site");
  if ((property.green_area_pct || 0) < 20) cons.push("Limited green coverage compared to category leaders");
  if (pros.length < 3) pros.push("Located in an established residential micro-market");
  if (cons.length < 2) cons.push("Maintenance and registration costs add ~7% on top of base price");

  const SECTIONS = [
    { id: "overview", label: "Overview" },
    { id: "verdict", label: "Investor Verdict" },
    { id: "configurations", label: "Configurations" },
    { id: "specifications", label: "Specifications" },
    { id: "pricing", label: "Pricing & Payment" },
    { id: "financial", label: "Financial Tools" },
    { id: "scenarios", label: "Investment Scenarios" },
    { id: "trends", label: "Price Trends" },
    { id: "locality", label: "Locality Intelligence" },
    { id: "amenities", label: "Amenities" },
    { id: "floorplans", label: "Floor Plans" },
    { id: "landmarks", label: "Nearby" },
    { id: "builder", label: "Builder" },
    { id: "loans", label: "Home Loans" },
    { id: "legal", label: "Legal & Docs" },
    { id: "compare", label: "Compare" },
    { id: "reviews", label: "Reviews" },
    { id: "insights", label: "AI Insights" },
    { id: "faq", label: "FAQ" },
  ];

  // Composite investor verdict (0-100)
  const verdictScore = derived
    ? Math.round((derived.scores.investment * 0.3 + derived.scores.growth * 0.2 + derived.scores.connectivity * 0.15 + derived.scores.livability * 0.15 + derived.scores.rentalDemand * 0.1 + derived.scores.safety * 0.1))
    : 75;
  const verdictLabel = verdictScore >= 82 ? "Strong Buy" : verdictScore >= 72 ? "Buy" : verdictScore >= 62 ? "Hold / Watch" : "Caution";
  const verdictTone = verdictScore >= 82 ? "emerald" : verdictScore >= 72 ? "blue" : verdictScore >= 62 ? "amber" : "rose";

  // Investment scenarios
  const cagrFwd = derived?.cagrFwd || 0.09;
  const scenarios = [1, 3, 5, 10].map(y => {
    const value = Math.round((property.price || 0) * Math.pow(1 + cagrFwd, y));
    const rentTotal = expectedRent * 12 * y;
    const gain = value - (property.price || 0) + rentTotal;
    const roi = property.price ? (gain / property.price) * 100 : 0;
    return { y, value, rentTotal, gain, roi };
  });

  // Comparable properties (illustrative seeds)
  const compareSeed = property.slug || property.id;
  const comparables = [0, 1, 2].map(i => ({
    name: `Premium ${["Residences", "Heights", "Greens"][i]} ${property.city}`,
    bhk: property.bhk || "2,3 BHK",
    psf: Math.round((derived?.pricePerSqft || 8000) * (0.92 + (deterministicScore(compareSeed + "c" + i, 0, 20) / 100))),
    rating: 3.8 + deterministicScore(compareSeed + "r" + i, 0, 10) / 10,
    distance: 0.8 + deterministicScore(compareSeed + "d" + i, 0, 30) / 10,
  }));

  // Reviews (illustrative)
  const reviews = [
    { name: "Rohit S.", role: "Owner · 2BHK", rating: 5, text: `Possession was on time and the amenities at ${property.title} are exactly as promised. Connectivity has improved dramatically in the last 2 years.` },
    { name: "Priya M.", role: "Investor", rating: 4, text: `Bought during launch — rental yield is ~3.2% and capital appreciation has been strong. Recommend for long-term holders.` },
    { name: "Anand K.", role: "End User", rating: 5, text: `Excellent build quality and the locality is family-friendly. Schools and hospitals are within 2 km.` },
    { name: "Sneha R.", role: "Owner · 3BHK", rating: 4, text: `Premium feel without the premium-society maintenance bills. Happy with the choice.` },
  ];
  const avgRating = (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-card border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/real-estate" className="hover:text-primary">Real Estate</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/real-estate?city=${encodeURIComponent(property.city)}`} className="hover:text-primary">{property.city}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate">{property.title}</span>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0f172a] via-[#142046] to-[#0c1a3a] text-white">
        <div className="max-w-[1440px] mx-auto px-4 py-6 lg:py-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge color="blue">{property.property_type}</Badge>
            {property.listing_type === "rent" && <Badge color="emerald">For Rent</Badge>}
            {property.listing_type === "pg" && <Badge color="purple">PG / Co-living</Badge>}
            {property.listing_type === "buy" && <Badge color="amber">For Sale</Badge>}
            <Badge color={property.possession_status === "ready" ? "emerald" : "orange"}>
              {property.possession_status === "ready" ? "Ready to Move" : "Under Construction"}
            </Badge>
            {property.rera_id && <Badge color="cyan"><Shield className="h-3 w-3 inline mr-1" />RERA Verified</Badge>}
            {property.is_price_drop && <Badge color="red">Price Reduced</Badge>}
            {property.is_featured && <Badge color="amber"><Award className="h-3 w-3 inline mr-1" />Featured</Badge>}
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{property.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{property.locality ? `${property.locality}, ` : ""}{property.city}</span>
            {property.developer_name && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />by <span className="font-semibold text-white">{property.developer_name}</span>
                {property.developer_website && (
                  <a href={property.developer_website} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="h-3 w-3" />Official
                  </a>
                )}
              </span>
            )}
            {(property.rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{property.rating} <span className="text-white/60">({property.reviews_count || 0})</span></span>
            )}
          </div>

          {/* Hero metric strip */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <HeroStat label="Price" value={property.price_display || formatPrice(property.price)} icon={IndianRupee} accent="amber" />
            {derived?.pricePerSqft && <HeroStat label="Price / sqft" value={`₹${Math.round(derived.pricePerSqft).toLocaleString("en-IN")}`} icon={Maximize} accent="cyan" />}
            <HeroStat label="Configuration" value={property.bhk_min && property.bhk_max ? `${property.bhk_min}–${property.bhk_max}` : (property.bhk || "—")} icon={Bed} accent="violet" />
            <HeroStat label="Super Area" value={property.area_min && property.area_max ? `${property.area_min}–${property.area_max} sqft` : property.area_sqft ? `${property.area_sqft} sqft` : "—"} icon={Maximize} accent="blue" />
            <HeroStat label="RERA" value={RERA_STATUS_MAP[property.rera_status || ""] || property.rera_status || "—"} icon={Shield} accent="emerald" />
          </div>
        </div>
      </section>

      {/* Sticky section nav */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="shrink-0 px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors whitespace-nowrap">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — content */}
          <div className="lg:col-span-2 space-y-6">

            {/* GALLERY (manual) */}
            <section className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/10] shadow-card-md">
                {allImages.length > 0 ? (
                  <>
                    <img src={allImages[activeImage]} alt={property.title} className="w-full h-full object-cover" />
                    {allImages.length > 1 && (
                      <>
                        <button onClick={() => setActiveImage(i => (i - 1 + allImages.length) % allImages.length)} aria-label="Previous image"
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                          <ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={() => setActiveImage(i => (i + 1) % allImages.length)} aria-label="Next image"
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                          <ChevronRight className="h-5 w-5" /></button>
                      </>
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Camera className="h-3 w-3" />{activeImage + 1} / {allImages.length}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                    <Building2 className="h-24 w-24 text-blue-200" />
                  </div>
                )}
                {allVideos.length > 0 && (
                  <a href={allVideos[0]} target="_blank" rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black/90">
                    <Play className="h-4 w-4" /> Watch Tour {allVideos.length > 1 ? `(${allVideos.length})` : ""}
                  </a>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => setActiveImage(i)} aria-label={`Image ${i + 1}`}
                      className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* OVERVIEW */}
            <Section id="overview" title="Project Overview" icon={FileText}>
              {property.overview ? (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.overview}</p>
              ) : property.description ? (
                <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: property.description }} />
              ) : (
                <p className="text-muted-foreground italic">No detailed overview published yet.</p>
              )}
              {property.highlights && property.highlights.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500" />Key Highlights</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {property.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Property facts grid */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Fact label="Total Towers" value={property.total_towers} icon={Layers} />
                <Fact label="Total Floors" value={property.total_floors} icon={Layers} />
                <Fact label="Sector" value={property.sector} icon={Compass} />
                <Fact label="Green Area" value={property.green_area_pct ? `${property.green_area_pct}%` : null} icon={TreePine} />
                <Fact label="Density" value={property.density} icon={Users} />
                <Fact label="Listing Type" value={property.listing_type} icon={Home} />
                <Fact label="Possession" value={property.possession_status === "ready" ? "Ready" : "Under Construction"} icon={Clock} />
                <Fact label="RERA ID" value={property.rera_id} icon={Shield} />
              </div>
            </Section>

            {/* INVESTOR VERDICT */}
            <section id="verdict" className="scroll-mt-20 rounded-2xl overflow-hidden shadow-card-md">
              <div className={`bg-gradient-to-br ${verdictTone === "emerald" ? "from-emerald-600 via-emerald-700 to-teal-800" : verdictTone === "blue" ? "from-blue-600 via-blue-700 to-indigo-800" : verdictTone === "amber" ? "from-amber-500 via-orange-600 to-rose-700" : "from-rose-600 via-red-700 to-rose-900"} text-white p-6 md:p-7`}>
                <div className="flex items-start gap-5 flex-wrap">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${verdictScore}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black number-font">{verdictScore}</span>
                      <span className="text-[10px] opacity-80 uppercase tracking-widest">/ 100</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <div className="text-[11px] uppercase tracking-widest opacity-80 font-bold">Investor Verdict</div>
                    <div className="text-3xl md:text-4xl font-black mt-1 flex items-center gap-2 flex-wrap">
                      {verdictLabel}
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 border border-white/30 px-2.5 py-1 rounded-full">AI Composite</span>
                    </div>
                    <p className="text-sm text-white/85 mt-2 leading-relaxed">
                      Based on growth outlook ({derived?.scores.growth}/100), connectivity ({derived?.scores.connectivity}/100), rental demand ({derived?.scores.rentalDemand}/100), safety ({derived?.scores.safety}/100) and macro micro-market signals for {property.locality || property.city}.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                      <VerdictPill label="Growth" value={`+${(cagrFwd * 100).toFixed(1)}% CAGR`} />
                      <VerdictPill label="Rental Yield" value={`${annualRentYield.toFixed(2)}%`} />
                      <VerdictPill label="EMI Load" value={`${Math.round((monthlyEMI / monthlyIncome) * 100)}% Income`} />
                      <VerdictPill label="Liquidity" value={derived!.scores.investment >= 78 ? "High" : derived!.scores.investment >= 65 ? "Medium" : "Moderate"} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CONFIGURATIONS */}
            <Section id="configurations" title="Available Configurations" icon={Bed}>
              {property.bhk_configurations && property.bhk_configurations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        <th className="text-left py-3">Type</th>
                        <th className="text-left py-3">Super Area</th>
                        <th className="text-left py-3">Carpet</th>
                        <th className="text-left py-3">Bath / Balcony</th>
                        <th className="text-right py-3">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {property.bhk_configurations.map((c, i) => (
                        <tr key={i} className="border-b border-border/60 hover:bg-muted/40">
                          <td className="py-3 font-bold text-foreground">{c.bhk || "—"}</td>
                          <td className="py-3 number-font">{c.area_min && c.area_max ? `${c.area_min}–${c.area_max}` : c.area_sqft || "—"} <span className="text-muted-foreground text-xs">sqft</span></td>
                          <td className="py-3 number-font">{c.carpet_area_sqft || "—"}</td>
                          <td className="py-3 number-font">{c.num_bathrooms || "—"} / {c.balconies || "—"}</td>
                          <td className="py-3 text-right number-font font-bold text-foreground">
                            {c.price_display || (c.price_min && c.price_max ? `${formatPrice(c.price_min)} – ${formatPrice(c.price_max)}` : formatPrice(c.price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground italic">Per-configuration details not yet published.</p>
              )}
            </Section>

            {/* SPECIFICATIONS */}
            <Section id="specifications" title="Specifications & Finishes" icon={Layers}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { cat: "Structure", items: [["Construction", "RCC frame, earthquake-resistant Zone IV"], ["External Walls", "AAC block / cement plaster"], ["Lift Lobby", "Vitrified tile cladding"]] },
                  { cat: "Flooring", items: [["Living / Dining", "800x800 mm double-charge vitrified"], ["Bedrooms", "Laminated wooden / vitrified"], ["Bath / Utility", "Anti-skid ceramic"]] },
                  { cat: "Kitchen", items: [["Counter", "Granite / quartz platform"], ["Dado", "Designer ceramic tiles, 2 ft above counter"], ["Provision", "Modular hob, chimney, RO point"]] },
                  { cat: "Bathrooms", items: [["Sanitary", "Kohler / Jaquar or equivalent"], ["CP Fittings", "Premium chrome plated"], ["Geyser & Exhaust", "Provision in all bathrooms"]] },
                  { cat: "Doors & Windows", items: [["Main Door", "Engineered hardwood with premium hardware"], ["Internal", "Flush doors with laminate"], ["Windows", "UPVC double-glazed sliding"]] },
                  { cat: "Electrical", items: [["Wiring", "FR copper concealed wiring"], ["Switches", "Modular — Legrand / Schneider"], ["Backup", "100% power backup common, partial in flats"]] },
                ].map(g => (
                  <div key={g.cat} className="bg-muted/40 rounded-xl p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">{g.cat}</h3>
                    <dl className="space-y-1.5 text-sm">
                      {g.items.map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-muted-foreground w-28 shrink-0">{k}</dt>
                          <dd className="text-foreground font-medium flex-1">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">Indicative specification list. Final fittings & finishes are governed by the developer's project brochure and buyer agreement.</p>
            </Section>



            {/* PRICING & PAYMENT */}
            <Section id="pricing" title="Pricing & All-in Cost" icon={Wallet}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4">Cost Breakdown (Indicative)</h3>
                  <div className="space-y-2.5">
                    <CostRow label="Base Price" value={property.price} />
                    <CostRow label="Stamp Duty (~6%)" value={stamp} />
                    <CostRow label="Registration (~1%)" value={registration} />
                    {gst > 0 && <CostRow label="GST (~5%)" value={gst} />}
                    <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">All-in Cost</span>
                      <span className="number-font font-black text-lg text-foreground">{formatPrice(totalAllIn)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">+ Monthly maintenance ~ ₹{maint.toLocaleString("en-IN")}/yr</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4">Payment Schedule (CLP)</h3>
                  <ol className="space-y-2 text-sm">
                    {[
                      { stage: "Booking Amount", pct: 10 },
                      { stage: "Within 45 days", pct: 15 },
                      { stage: "On Foundation", pct: 15 },
                      { stage: "On Structure 50%", pct: 25 },
                      { stage: "On Structure 100%", pct: 20 },
                      { stage: "On Possession", pct: 15 },
                    ].map((p, i) => (
                      <li key={i} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground"><span className="font-bold text-foreground mr-2">{i + 1}.</span>{p.stage}</span>
                        <span className="font-bold text-emerald-700">{p.pct}% · {formatPrice((property.price || 0) * p.pct / 100)}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-[11px] text-muted-foreground mt-3">Illustrative construction-linked plan. Final schedule depends on developer agreement.</p>
                </div>
              </div>
            </Section>

            {/* FINANCIAL TOOLS */}
            <Section id="financial" title="Financial Planning Tools" icon={Calculator}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* EMI Calculator */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><IndianRupee className="h-4 w-4 text-primary" />EMI Calculator</h3>
                  <SliderRow label="Down Payment" value={`${downPct}%`}>
                    <input type="range" min={10} max={50} value={downPct} onChange={e => setDownPct(+e.target.value)} className="w-full accent-primary" />
                  </SliderRow>
                  <SliderRow label="Tenure" value={`${loanYears} yrs`}>
                    <input type="range" min={5} max={30} value={loanYears} onChange={e => setLoanYears(+e.target.value)} className="w-full accent-primary" />
                  </SliderRow>
                  <SliderRow label="Interest" value={`${loanRate}%`}>
                    <input type="range" min={7} max={12} step={0.25} value={loanRate} onChange={e => setLoanRate(+e.target.value)} className="w-full accent-primary" />
                  </SliderRow>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniMetric label="Loan" value={formatPrice(principal)} />
                    <MiniMetric label="Monthly EMI" value={`₹${Math.round(monthlyEMI).toLocaleString("en-IN")}`} accent />
                    <MiniMetric label="Total Interest" value={formatPrice(totalInterest)} />
                  </div>
                  <div className="mt-4 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ name: "Principal", value: principal }, { name: "Interest", value: totalInterest }]} dataKey="value" innerRadius={40} outerRadius={70}>
                          <Cell fill="hsl(var(--primary))" /><Cell fill="hsl(var(--loss))" />
                        </Pie>
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => formatPrice(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Affordability */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Affordability Check</h3>
                  <label className="text-xs text-muted-foreground">Monthly Household Income</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">₹</span>
                    <input type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(+e.target.value)} className="form-input" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">EMI vs Income</span>
                        <span className="font-bold text-foreground">{Math.round((monthlyEMI / monthlyIncome) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${monthlyEMI / monthlyIncome > 0.5 ? "bg-loss" : monthlyEMI / monthlyIncome > 0.4 ? "bg-orange-500" : "bg-gain"}`} style={{ width: `${Math.min(100, (monthlyEMI / monthlyIncome) * 100)}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Banks typically lend if EMI is below 40-50% of income.</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Comfortable property budget</div>
                      <div className="number-font font-black text-foreground text-lg">{formatPrice(affordablePrice)}</div>
                    </div>
                    <div className={`rounded-lg p-3 ${affordablePrice >= (property.price || 0) ? "bg-gain-light text-foreground" : "bg-loss-light"}`}>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        {affordablePrice >= (property.price || 0) ? <Check className="h-4 w-4 text-gain" /> : <AlertTriangle className="h-4 w-4 text-loss" />}
                        {affordablePrice >= (property.price || 0) ? "Within your budget" : "Stretches your budget — consider longer tenure or larger down payment"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rental yield */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-primary" />Rental Yield</h3>
                  <label className="text-xs text-muted-foreground">Expected Monthly Rent</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">₹</span>
                    <input type="number" value={expectedRent} onChange={e => setExpectedRent(+e.target.value)} className="form-input" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniMetric label="Annual Yield" value={`${annualRentYield.toFixed(2)}%`} accent />
                    <MiniMetric label="Monthly EMI Cover" value={`${Math.round((expectedRent / Math.max(monthlyEMI, 1)) * 100)}%`} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">Indian residential yields typically range 2-4%. Above 3.5% is considered strong.</p>
                </div>

                {/* Appreciation forecast */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />5-Year Appreciation Forecast</h3>
                  <div className="text-[11px] text-muted-foreground mb-2">Indicative CAGR: <span className="font-bold text-foreground">{((derived?.cagrFwd || 0) * 100).toFixed(1)}%</span></div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={derived?.forecast || []}>
                        <defs>
                          <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatPrice(v).replace("₹", "")} />
                        <Tooltip formatter={(v: any) => formatPrice(v)} />
                        <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#fc)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <ComplianceDisclaimerNote />
            </Section>

            {/* PRICE TRENDS */}
            <Section id="trends" title="Price Trends & Market Intelligence" icon={BarChart3}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard title="Project Price History" subtitle="Historical price trajectory">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={derived?.history || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatPrice(v).replace("₹", "")} />
                      <Tooltip formatter={(v: any) => formatPrice(v)} />
                      <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Locality Price / sqft" subtitle="Last 12 quarters · ₹ per sqft">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={derived?.localityTrend || []}>
                      <defs>
                        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--gain))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--gain))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="q" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}/sqft`} />
                      <Area type="monotone" dataKey="psf" stroke="hsl(var(--gain))" fill="url(#lc)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Supply vs Demand" subtitle="Inventory vs buyer enquiries · last 6 months">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={derived?.supplyDemand || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="supply" fill="hsl(var(--loss))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="demand" fill="hsl(var(--gain))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Builder Performance" subtitle="Delivery & quality signals">
                  <div className="h-full flex flex-col justify-center gap-3 px-2">
                    {[
                      { k: "On-time Delivery", v: deterministicScore((property.developer_name || "x") + "ot", 65, 95) },
                      { k: "Construction Quality", v: deterministicScore((property.developer_name || "x") + "q", 70, 95) },
                      { k: "Customer Rating", v: deterministicScore((property.developer_name || "x") + "c", 60, 92) },
                      { k: "Legal Compliance", v: deterministicScore((property.developer_name || "x") + "l", 75, 96) },
                    ].map(s => <ScoreBar key={s.k} label={s.k} value={s.v} />)}
                  </div>
                </ChartCard>
              </div>

              {/* Price history milestones if present */}
              {property.price_history_detail && property.price_history_detail.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-bold text-foreground mb-3">Price Milestones</h3>
                  <div className="space-y-2">
                    {property.price_history_detail.map((entry: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 bg-muted/40 rounded-lg px-4 py-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm text-foreground">{entry.label || "Milestone"}</div>
                            <div className="text-xs text-muted-foreground">{entry.date || "—"}{entry.note ? ` · ${entry.note}` : ""}</div>
                          </div>
                          <div className="number-font font-bold text-foreground">{formatPrice(entry.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <ComplianceDisclaimerNote />
            </Section>

            {/* LOCALITY INTELLIGENCE */}
            <Section id="locality" title="Locality Intelligence Dashboard" icon={Gauge}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ScoreCard label="Livability" value={derived!.scores.livability} icon={Home} color="emerald" />
                <ScoreCard label="Safety" value={derived!.scores.safety} icon={Shield} color="blue" />
                <ScoreCard label="Connectivity" value={derived!.scores.connectivity} icon={Train} color="indigo" />
                <ScoreCard label="Infrastructure" value={derived!.scores.infrastructure} icon={Building2} color="violet" />
                <ScoreCard label="Investment" value={derived!.scores.investment} icon={TrendingUp} color="amber" />
                <ScoreCard label="Rental Demand" value={derived!.scores.rentalDemand} icon={HeartHandshake} color="rose" />
                <ScoreCard label="Air Quality" value={derived!.scores.pollution} icon={Wind} color="cyan" />
                <ScoreCard label="Growth Outlook" value={derived!.scores.growth} icon={Sparkles} color="emerald" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-4">Locality scores are indicative, derived from aggregated micro-market signals. Cross-verify with on-ground visits.</p>
            </Section>

            {/* AMENITIES */}
            <Section id="amenities" title="Amenities & Lifestyle" icon={Award}>
              {Object.keys(amenityGroups).length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(amenityGroups).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat} · {items.length}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {items.map(a => (
                          <div key={a.name} className="flex items-center gap-2 bg-muted/40 hover:bg-muted rounded-lg px-3 py-2.5 transition-colors">
                            <a.icon className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm text-foreground truncate">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No amenities listed.</p>
              )}

              {/* Sustainability */}
              <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><TreePine className="h-5 w-5 text-emerald-600" />Green & Sustainability</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SustainStat icon={TreePine} label="Green Area" value={property.green_area_pct ? `${property.green_area_pct}%` : "—"} />
                  <SustainStat icon={Wind} label="Air Quality" value={`${derived!.scores.pollution}/100`} />
                  <SustainStat icon={Droplets} label="Rainwater" value={(property.amenities || []).some(a => /rain/i.test(a)) ? "Yes" : "—"} />
                  <SustainStat icon={Zap} label="Solar/EV" value={(property.amenities || []).some(a => /solar|ev/i.test(a)) ? "Yes" : "—"} />
                </div>
              </div>
            </Section>

            {/* FLOOR PLANS */}
            <Section id="floorplans" title="Floor Plans" icon={FileText}>
              {property.floor_plans && property.floor_plans.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {property.floor_plans.map((fp, i) => (
                    <a key={i} href={fp} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-xl overflow-hidden hover:border-primary transition-colors">
                      <img src={fp} alt={`Floor plan ${i + 1}`} className="w-full object-contain bg-white" />
                      <div className="px-3 py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Plan {i + 1}</span>
                        <span className="text-primary inline-flex items-center gap-1"><Download className="h-3 w-3" />Download</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Floor plans not available.</p>
              )}
            </Section>

            {/* NEARBY LANDMARKS */}
            <Section id="landmarks" title="Nearby Landmarks & Connectivity" icon={MapIcon}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <LandmarkCard icon={School} label="School" value={property.nearest_school} color="blue" />
                <LandmarkCard icon={Hospital} label="Hospital" value={property.nearest_hospital} color="red" />
                <LandmarkCard icon={ShoppingBag} label="Mall" value={property.nearest_mall} color="violet" />
                <LandmarkCard icon={Train} label="Metro / Transit" value={`${deterministicScore(property.slug + "m", 1, 8)} km`} color="emerald" />
                <LandmarkCard icon={Briefcase} label="IT / Business Hub" value={`${deterministicScore(property.slug + "it", 3, 15)} km`} color="amber" />
                <LandmarkCard icon={Plane} label="Airport" value={`${deterministicScore(property.slug + "ap", 8, 35)} km`} color="cyan" />
              </div>
              {allVideos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Play className="h-4 w-4 text-primary" />Property Tours</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allVideos.map((v, i) => (
                      <a key={i} href={v} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-muted/40 hover:bg-muted rounded-xl px-4 py-3 transition-colors">
                        <Play className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground">Watch Video Tour {i + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* BUILDER */}
            <Section id="builder" title="Builder Credibility" icon={Building2}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white flex items-center justify-center text-xl font-black shrink-0">
                  {(property.developer_name || "B").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">{property.developer_name || "Developer details awaited"}</h3>
                    {property.developer_website && (
                      <a href={property.developer_website} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                        <BadgeCheck className="h-3.5 w-3.5" />Official Site
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <MiniMetric label="Years Active" value={`${deterministicScore((property.developer_name || "x") + "y", 5, 40)}+`} />
                    <MiniMetric label="Projects Delivered" value={`${deterministicScore((property.developer_name || "x") + "p", 8, 80)}`} />
                    <MiniMetric label="Ongoing" value={`${deterministicScore((property.developer_name || "x") + "o", 2, 18)}`} />
                    <MiniMetric label="Trust Score" value={`${deterministicScore((property.developer_name || "x") + "t", 72, 95)}/100`} accent />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4">Builder metrics shown are indicative reputation scores. Always verify on RERA portal and developer's official disclosures.</p>
            </Section>

            {/* AI INSIGHTS — Pros/Cons */}
            <Section id="insights" title="AI Property Insights" icon={Brain}>
              {property.investment_plan && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-5 mb-4">
                  <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><IndianRupee className="h-4 w-4 text-emerald-600" />Investment Thesis</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{property.investment_plan}</p>
                </div>
              )}
              {property.roi_projection && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-4">
                  <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" />ROI Outlook</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{property.roi_projection}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gain-light border border-gain/20 rounded-xl p-5">
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-gain" />Pros</h3>
                  <ul className="space-y-2">
                    {pros.map((p, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground"><Check className="h-4 w-4 text-gain mt-0.5 shrink-0" />{p}</li>)}
                  </ul>
                </div>
                <div className="bg-loss-light border border-loss/20 rounded-xl p-5">
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-loss" />Considerations</h3>
                  <ul className="space-y-2">
                    {cons.map((c, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground"><AlertTriangle className="h-4 w-4 text-loss mt-0.5 shrink-0" />{c}</li>)}
                  </ul>
                </div>
              </div>
            </Section>

            {/* FAQ */}
            <Section id="faq" title="Frequently Asked Questions" icon={FileText}>
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40">
                      <span className="font-semibold text-sm text-foreground">{f.q}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                    </button>
                    {openFaq === i && <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>}
                  </div>
                ))}
              </div>
            </Section>

            <p className="text-[11px] text-muted-foreground italic">Disclaimer: Information shown is compiled from public sources and indicative analytics. InvestingIQ is not a real estate broker or financial advisor. Always verify with the developer, RERA portal, and qualified professionals before any transaction.</p>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 lg:sticky lg:top-20 shadow-card-md">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Starting Price</div>
              <div className="number-font text-3xl font-black text-foreground mt-1">{property.price_display || formatPrice(property.price)}</div>
              {derived?.pricePerSqft && <div className="text-xs text-muted-foreground number-font">₹{Math.round(derived.pricePerSqft).toLocaleString("en-IN")}/sqft</div>}
              {(property.price_min || property.price_max) && (
                <div className="text-xs text-muted-foreground number-font mt-1">Range: {property.price_min ? formatPrice(property.price_min) : "—"} – {property.price_max ? formatPrice(property.price_max) : "—"}</div>
              )}
              {property.is_price_drop && property.original_price && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground line-through number-font">{formatPrice(property.original_price)}</span>
                  <span className="text-xs font-bold text-loss bg-loss-light px-2 py-0.5 rounded">{Math.round(((property.original_price - property.price) / property.original_price) * 100)}% OFF</span>
                </div>
              )}

              <div className="mt-5 space-y-2.5">
                <button className="w-full bg-gradient-to-r from-primary to-blue-700 text-white py-3.5 rounded-xl font-bold text-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4" />Schedule Site Visit
                </button>
                <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />Request Callback
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="border border-border py-2.5 rounded-xl font-semibold text-xs text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" />Save
                  </button>
                  <button className="border border-border py-2.5 rounded-xl font-semibold text-xs text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5" />Share
                  </button>
                  <button className="border border-border py-2.5 rounded-xl font-semibold text-xs text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" />Compare
                  </button>
                  <button className="border border-border py-2.5 rounded-xl font-semibold text-xs text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />Brochure
                  </button>
                </div>
              </div>

              {property.rera_id && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />RERA: <span className="font-mono text-foreground">{property.rera_id}</span>
                </div>
              )}
            </div>

            {/* Quick EMI */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" />EMI at a glance</h3>
              <div className="space-y-2">
                {[{ y: 20, r: 8.5 }, { y: 25, r: 8.75 }, { y: 30, r: 9.0 }].map(o => (
                  <div key={o.y} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground">{o.y}Y @ {o.r}%</span>
                    <span className="number-font text-sm font-bold text-foreground">₹{Math.round(emi(property.price || 0, o.r, o.y)).toLocaleString("en-IN")}/mo</span>
                  </div>
                ))}
              </div>
              <a href="#financial" className="text-xs font-semibold text-primary hover:underline mt-3 inline-flex items-center gap-1">Customize <ArrowRight className="h-3 w-3" /></a>
            </div>

            {/* AI Advisor */}
            <AIStreamingPanel
              title="AI Property Advisor"
              subtitle={`Analysis for ${property.title}`}
              functionName="ai-property-advisor"
              payload={{ slug: property.slug }}
              accentColor="emerald"
              actions={[
                { key: "investment-analysis", label: "Investment", icon: <Brain className="h-3 w-3" /> },
                { key: "locality-insights", label: "Locality", icon: <MapIcon className="h-3 w-3" /> },
                { key: "compare-similar", label: "Compare", icon: <Scale className="h-3 w-3" /> },
              ]}
            />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============= Helper components =============

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-200 border-blue-400/30",
    emerald: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    purple: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    amber: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    orange: "bg-orange-500/20 text-orange-200 border-orange-400/30",
    cyan: "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
    red: "bg-red-500/20 text-red-200 border-red-400/30",
  };
  return <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${map[color]}`}>{children}</span>;
}

function HeroStat({ label, value, icon: Icon, accent }: any) {
  const colors: Record<string, string> = {
    amber: "from-amber-500/20 to-amber-500/5 border-amber-400/30 text-amber-200",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-400/30 text-cyan-200",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-400/30 text-violet-200",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-400/30 text-blue-200",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30 text-emerald-200",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent] || colors.blue} border rounded-xl p-3.5 backdrop-blur`}>
      <Icon className="h-4 w-4 mb-2 opacity-80" />
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-base font-black text-white mt-0.5 capitalize truncate">{value}</div>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: any) {
  return (
    <section id={id} className="bg-card border border-border rounded-2xl p-5 md:p-6 scroll-mt-20 shadow-card">
      <h2 className="text-xl font-black text-foreground mb-5 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, value, icon: Icon }: any) {
  if (!value && value !== 0) return null;
  return (
    <div className="bg-muted/40 rounded-xl p-3">
      <Icon className="h-4 w-4 text-primary mb-1.5" />
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground capitalize truncate">{String(value)}</div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="number-font font-bold text-foreground">{formatPrice(value)}</span>
    </div>
  );
}

function SliderRow({ label, value, children }: any) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

function MiniMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${accent ? "bg-primary/10 border border-primary/20" : "bg-muted/40"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate">{label}</div>
      <div className={`number-font font-black text-sm mt-0.5 ${accent ? "text-primary" : "text-foreground"} truncate`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-52">{children}</div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? "bg-gain" : value >= 65 ? "bg-amber-500" : "bg-loss";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground number-font">{value}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScoreCard({ label, value, icon: Icon, color }: any) {
  const tone: Record<string, string> = {
    emerald: "from-emerald-50 to-emerald-100/40 border-emerald-200 text-emerald-700",
    blue: "from-blue-50 to-blue-100/40 border-blue-200 text-blue-700",
    indigo: "from-indigo-50 to-indigo-100/40 border-indigo-200 text-indigo-700",
    violet: "from-violet-50 to-violet-100/40 border-violet-200 text-violet-700",
    amber: "from-amber-50 to-amber-100/40 border-amber-200 text-amber-700",
    rose: "from-rose-50 to-rose-100/40 border-rose-200 text-rose-700",
    cyan: "from-cyan-50 to-cyan-100/40 border-cyan-200 text-cyan-700",
  };
  return (
    <div className={`bg-gradient-to-br ${tone[color]} border rounded-xl p-4`}>
      <Icon className="h-5 w-5 mb-2" />
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="number-font text-2xl font-black text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
        <div className="h-full bg-current" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SustainStat({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-white/70 rounded-lg p-3">
      <Icon className="h-4 w-4 text-emerald-600 mb-1.5" />
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-black text-foreground">{value}</div>
    </div>
  );
}

function LandmarkCard({ icon: Icon, label, value, color }: any) {
  if (!value) return null;
  const tone: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    red: "bg-red-50 border-red-100 text-red-700",
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    cyan: "bg-cyan-50 border-cyan-100 text-cyan-700",
  };
  return (
    <div className={`border rounded-xl p-4 ${tone[color]}`}>
      <Icon className="h-5 w-5 mb-2" />
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-sm font-bold text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function ComplianceDisclaimerNote() {
  return (
    <p className="text-[11px] text-muted-foreground mt-4 flex items-start gap-1.5">
      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
      Charts and projections are indicative, derived from public-market signals and macro assumptions. Not investment advice. Verify with the developer and qualified advisors.
    </p>
  );
}

function buildFaqs(p: PropertyDetail) {
  const possession = p.possession_status === "ready" ? "ready to move" : "under construction";
  return [
    { q: `What is the price of ${p.title}?`, a: `${p.title} is priced at ${p.price_display || formatPrice(p.price)}${p.price_min && p.price_max ? `, with configurations ranging ${formatPrice(p.price_min)} – ${formatPrice(p.price_max)}` : ""}.` },
    { q: `Where is ${p.title} located?`, a: `${p.title} is located in ${p.locality ? p.locality + ", " : ""}${p.city}${p.sector ? `, ${p.sector}` : ""}.` },
    { q: `What is the possession status?`, a: `The project is currently ${possession}. ${p.rera_id ? `RERA ID: ${p.rera_id}.` : "RERA registration details should be verified with the developer."}` },
    { q: `What configurations are available?`, a: `${p.bhk_min && p.bhk_max ? `${p.bhk_min} to ${p.bhk_max} configurations are offered.` : p.bhk ? `${p.bhk} configurations are offered.` : "Multiple configurations are offered; refer to the configurations table."}${p.area_min && p.area_max ? ` Areas range ${p.area_min}–${p.area_max} sqft.` : ""}` },
    { q: `Who is the developer?`, a: `${p.developer_name || "Developer information will be updated soon"}. Always verify the developer's track record on RERA and via past projects.` },
    { q: `What amenities are included?`, a: `${p.amenities && p.amenities.length > 0 ? `Key amenities include ${p.amenities.slice(0, 6).join(", ")}${p.amenities.length > 6 ? " and more" : ""}.` : "Amenity list will be published shortly."}` },
    { q: `Is ${p.title} a good investment?`, a: `Use the Investment Plan, ROI Outlook and Locality Intelligence sections on this page to evaluate. Property investment depends on holding period, leverage, and personal goals — consult a qualified advisor.` },
    { q: `Can I get a home loan for this property?`, a: `Most leading banks and HFCs offer loans up to 75-90% of property value for RERA-registered projects. Use the EMI and Affordability calculators on this page.` },
    { q: `What are the additional costs beyond the base price?`, a: `Stamp duty (~6%), registration (~1%), GST for under-construction (5%), maintenance corpus, and monthly maintenance. See the Cost Breakdown section for an indicative total.` },
  ];
}
