import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIStreamingPanel } from "@/components/AIStreamingPanel";
import {
  MapPin, Building2, Bed, Maximize, Star, Heart, Share2,
  Phone, ArrowRight, TrendingUp, TreePine, Layers, Shield,
  ChevronRight, Play, ChevronLeft, Users, BarChart3, Landmark,
  IndianRupee, FileText, Home, Check, Clock, Eye, Brain, Scale, LineChart as LineChartIcon, Map
} from "lucide-react";

interface BhkConfig {
  bhk?: string;
  area_sqft?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  carpet_area_sqft?: number | null;
  price?: number | null;
  price_display?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  num_bathrooms?: number | null;
  balconies?: number | null;
  configuration_notes?: string | null;
  floor_plan_url?: string | null;
}

interface PropertyDetail {
  id: string; title: string; slug: string; property_type: string;
  listing_type: string; city: string; locality: string | null;
  price: number; price_display: string | null; bhk: string | null;
  area_sqft: number | null; amenities: string[] | null;
  description: string | null; developer_name: string | null;
  developer_website: string | null;
  source_urls: string[] | null;
  cover_image_url: string | null; images: string[] | null;
  is_featured: boolean | null; is_price_drop: boolean | null;
  original_price: number | null; rating: number | null;
  reviews_count: number | null; roi_projection: string | null;
  investment_plan: string | null; green_area_pct: number | null;
  density: string | null; total_floors: number | null;
  video_url: string | null; overview: string | null;
  possession_status: string | null; rera_id: string | null;
  floor_plans: string[] | null; highlights: string[] | null;
  status: string | null;
  sector: string | null; nearest_hospital: string | null;
  nearest_school: string | null; nearest_mall: string | null;
  rera_status: string | null; price_min: number | null; price_max: number | null;
  bhk_min: string | null; bhk_max: string | null;
  area_min: number | null; area_max: number | null;
  price_history_detail: any[] | null; total_towers: number | null;
  cover_images: string[] | null; videos: string[] | null;
  bhk_configurations: BhkConfig[] | null;
  meta_title: string | null;
  meta_description: string | null;
}

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PropertyDetailPage() {
  const { slug } = useParams();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setProperty(data as any);
      setLoading(false);
    }
    if (slug) fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[1440px] mx-auto px-4 py-20 text-center text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[1440px] mx-auto px-4 py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Property Not Found</h1>
          <Link to="/real-estate" className="text-primary hover:underline">← Back to Real Estate</Link>
        </div>
      </div>
    );
  }

  const allImages = [
    ...(property.cover_images?.length ? property.cover_images : []),
    property.cover_image_url,
    ...(property.images ?? []),
  ].filter(Boolean) as string[];

  const allVideos = [
    ...(property.videos?.length ? property.videos : []),
    property.video_url,
  ].filter(Boolean) as string[];

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "investment", label: "Investment Plan" },
    { id: "amenities", label: "Amenities" },
    { id: "floorplan", label: "Floor Plans" },
    { id: "pricehistory", label: "Price History" },
    { id: "landmarks", label: "Nearby" },
  ];

  const RERA_STATUS_MAP: Record<string, string> = {
    rera_applied: "RERA Applied",
    upcoming: "Upcoming",
    under_construction: "Under Construction",
    pre_launch: "Pre Launch",
  };

  const infoCards = [
    { label: "Property Type", value: property.property_type, icon: Building2 },
    { label: "BHK", value: property.bhk_min && property.bhk_max ? `${property.bhk_min} – ${property.bhk_max}` : property.bhk, icon: Bed },
    { label: "Area", value: property.area_min && property.area_max ? `${property.area_min.toLocaleString()} – ${property.area_max.toLocaleString()} sqft` : property.area_sqft ? `${property.area_sqft.toLocaleString()} sqft` : null, icon: Maximize },
    { label: "Total Towers", value: property.total_towers, icon: Layers },
    { label: "Total Floors", value: property.total_floors, icon: Layers },
    { label: "Sector", value: property.sector, icon: MapPin },
    { label: "Green Area", value: property.green_area_pct ? `${property.green_area_pct}%` : null, icon: TreePine },
    { label: "Density", value: property.density, icon: Users },
    { label: "Possession", value: property.possession_status === "ready" ? "Ready to Move" : "Under Construction", icon: Clock },
    { label: "RERA Status", value: RERA_STATUS_MAP[property.rera_status || ""] || property.rera_status, icon: Shield },
    { label: "RERA ID", value: property.rera_id, icon: Shield },
  ].filter(c => c.value);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/real-estate" className="hover:text-primary">Real Estate</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate">{property.title}</span>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/9]">
              {allImages.length > 0 ? (
                <>
                  <img src={allImages[activeImage]} alt={property.title}
                    className="w-full h-full object-cover" />
                  {allImages.length > 1 && (
                    <>
                      <button onClick={() => setActiveImage(i => (i - 1 + allImages.length) % allImages.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={() => setActiveImage(i => (i + 1) % allImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {allImages.map((_, i) => (
                          <button key={i} onClick={() => setActiveImage(i)}
                            className={`rounded-full transition-all ${i === activeImage ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                  <Building2 className="h-24 w-24 text-blue-200" />
                </div>
              )}
              {property.is_price_drop && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-lg">
                  PRICE REDUCED
                </div>
              )}
              {allVideos.length > 0 && (
                <a href={allVideos[0]} target="_blank" rel="noopener noreferrer"
                  className="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black/90">
                  <Play className="h-4 w-4" /> Watch Video {allVideos.length > 1 ? `(${allVideos.length})` : ""}
                </a>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      i === activeImage ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                    }`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title bar */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{property.property_type}</span>
                {property.listing_type === "rent" && <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">For Rent</span>}
                {property.listing_type === "pg" && <span className="text-[10px] font-bold uppercase text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">PG</span>}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground mb-1">{property.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {property.locality}{property.locality ? ", " : ""}{property.city}
              </p>
              {property.developer_name && (
                <p className="text-sm text-muted-foreground mt-1">by <span className="font-semibold text-foreground">{property.developer_name}</span></p>
              )}
            </div>

            {/* Info cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {infoCards.map(card => (
                <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                  <card.icon className="h-5 w-5 text-primary mb-2" />
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{card.label}</div>
                  <div className="text-sm font-bold text-foreground mt-0.5 capitalize">{String(card.value)}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
              <div className="flex gap-0 overflow-x-auto">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}>{tab.label}</button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="bg-card border border-border rounded-2xl p-6">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground">About {property.title}</h3>
                  {property.overview ? (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.overview}</p>
                  ) : property.description ? (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided yet.</p>
                  )}
                  {property.highlights && property.highlights.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold text-foreground mb-3">Key Highlights</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {property.highlights.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                            {h}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "investment" && (
                <div className="space-y-6">
                  <h3 className="font-bold text-lg text-foreground">Investment Analysis</h3>
                  {property.investment_plan ? (
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <IndianRupee className="h-5 w-5 text-emerald-600" />
                        <h4 className="font-bold text-foreground">Investment Plan</h4>
                      </div>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.investment_plan}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Investment plan details not available.</p>
                  )}
                  {property.roi_projection && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h4 className="font-bold text-foreground">ROI Projections</h4>
                      </div>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.roi_projection}</p>
                    </div>
                  )}
                  {!property.investment_plan && !property.roi_projection && (
                    <p className="text-muted-foreground italic">No investment data available yet.</p>
                  )}
                </div>
              )}

              {activeTab === "amenities" && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-4">Amenities & Features</h3>
                  {property.amenities && property.amenities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {property.amenities.map(a => (
                        <div key={a} className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-4 py-3">
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm text-foreground">{a}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No amenities listed.</p>
                  )}
                </div>
              )}

              {activeTab === "floorplan" && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-4">Floor Plans</h3>
                  {property.floor_plans && property.floor_plans.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {property.floor_plans.map((fp, i) => (
                        <img key={i} src={fp} alt={`Floor plan ${i + 1}`} className="w-full rounded-xl border border-border" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Floor plans not available.</p>
                  )}
                </div>
              )}

              {activeTab === "pricehistory" && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-4">Price History</h3>
                  {property.price_history_detail && property.price_history_detail.length > 0 ? (
                    <div className="space-y-3">
                      {property.price_history_detail.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 bg-muted/50 rounded-xl px-4 py-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-foreground">{entry.label || "Milestone"}</span>
                              <span className="number-font font-bold text-foreground">{formatPrice(entry.price)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs text-muted-foreground">{entry.date || "—"}</span>
                              {entry.note && <span className="text-xs text-muted-foreground">{entry.note}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Price history not available yet.</p>
                  )}
                </div>
              )}

              {activeTab === "landmarks" && (
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-4">Nearby Landmarks</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {property.nearest_hospital && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <div className="text-red-600 font-bold text-sm mb-1">🏥 Hospital</div>
                        <p className="text-sm text-foreground">{property.nearest_hospital}</p>
                      </div>
                    )}
                    {property.nearest_school && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="text-blue-600 font-bold text-sm mb-1">🏫 School</div>
                        <p className="text-sm text-foreground">{property.nearest_school}</p>
                      </div>
                    )}
                    {property.nearest_mall && (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <div className="text-purple-600 font-bold text-sm mb-1">🛍️ Mall</div>
                        <p className="text-sm text-foreground">{property.nearest_mall}</p>
                      </div>
                    )}
                  </div>
                  {!property.nearest_hospital && !property.nearest_school && !property.nearest_mall && (
                    <p className="text-muted-foreground italic">No landmark information available.</p>
                  )}
                  {/* Videos section */}
                  {allVideos.length > 1 && (
                    <div className="mt-6">
                      <h4 className="font-bold text-foreground mb-3">🎥 Property Videos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allVideos.map((v, i) => (
                          <a key={i} href={v} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 hover:bg-muted transition-colors">
                            <Play className="h-4 w-4 text-primary" />
                            <span className="text-sm text-foreground">Video {i + 1}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar - Pricing & CTA */}
          <div className="space-y-4">
            {/* Price card - sticky */}
            <div className="bg-card border border-border rounded-2xl p-6 lg:sticky lg:top-24">
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Price</div>
                <div className="number-font text-3xl font-black text-foreground">
                  {property.price_display || formatPrice(property.price)}
                </div>
                {(property.price_min || property.price_max) && (
                  <div className="text-xs text-muted-foreground mt-1 number-font">
                    Range: {property.price_min ? formatPrice(property.price_min) : "—"} – {property.price_max ? formatPrice(property.price_max) : "—"}
                  </div>
                )}
                {property.is_price_drop && property.original_price && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground line-through number-font">{formatPrice(property.original_price)}</span>
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                      {Math.round(((property.original_price - property.price) / property.original_price) * 100)}% OFF
                    </span>
                  </div>
                )}
              </div>

              {(property.rating ?? 0) > 0 && (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= Math.round(property.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                  <span className="number-font font-bold">{property.rating}</span>
                  <span className="text-xs text-muted-foreground">({property.reviews_count} reviews)</span>
                </div>
              )}

              <div className="space-y-3">
                <button className="w-full bg-[#1a1a2e] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#1a1a2e]/90 transition-colors flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4" /> Contact Developer
                </button>
                <button className="w-full border border-border py-3 rounded-xl font-semibold text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <Heart className="h-4 w-4" /> Save Property
                </button>
                <button className="w-full border border-border py-3 rounded-xl font-semibold text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>

              {property.rera_id && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  RERA: {property.rera_id}
                </div>
              )}
            </div>

            {/* EMI Calculator preview */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" /> EMI Calculator
              </h4>
              <div className="text-sm text-muted-foreground mb-3">
                Estimated EMI for {formatPrice(property.price)}
              </div>
              <div className="space-y-2">
                {[
                  { years: 20, rate: 8.5 },
                  { years: 25, rate: 8.75 },
                  { years: 30, rate: 9.0 },
                ].map(opt => {
                  const monthly = (property.price * (opt.rate / 1200) * Math.pow(1 + opt.rate / 1200, opt.years * 12)) /
                    (Math.pow(1 + opt.rate / 1200, opt.years * 12) - 1);
                  return (
                    <div key={opt.years} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-xs text-muted-foreground">{opt.years}Y @ {opt.rate}%</span>
                      <span className="number-font text-sm font-bold text-foreground">₹{Math.round(monthly).toLocaleString("en-IN")}/mo</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Property Advisor */}
            <AIStreamingPanel
              title="AI Property Advisor"
              subtitle={`Analysis for ${property.title}`}
              functionName="ai-property-advisor"
              payload={{ slug: property.slug }}
              accentColor="emerald"
              actions={[
                { key: "investment-analysis", label: "Investment Analysis", icon: <Brain className="h-3 w-3" /> },
                { key: "locality-insights", label: "Locality Insights", icon: <Map className="h-3 w-3" /> },
                { key: "compare-similar", label: "Compare Similar", icon: <Scale className="h-3 w-3" /> },
                { key: "price-prediction", label: "Price Prediction", icon: <LineChartIcon className="h-3 w-3" /> },
              ]}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
