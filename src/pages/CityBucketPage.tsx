import { useEffect, useState, useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Building2, MapPin, Bed, Maximize, ChevronRight, Home, IndianRupee,
  Sparkles, Shield, TrendingUp, CheckCircle2,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════
   Bucket + city configuration (extensible — drives URL slugs)
   ════════════════════════════════════════════════════════════ */

interface BucketConfig {
  slug: string;
  label: string;
  shortLabel: string;
  intent: string;
  filter: (p: Property) => boolean;
  faqs: { q: string; a: string }[];
  intro: (city: string, year: number) => string;
}

interface CityConfig {
  slug: string;
  name: string; // canonical e.g. "Gurgaon"
  dbName: string; // matches city column in DB e.g. "Gurugram"
  state: string;
  intro: string;
  localities: string[];
}

const CITIES: CityConfig[] = [
  {
    slug: "gurgaon",
    name: "Gurgaon",
    dbName: "Gurugram",
    state: "Haryana",
    intro:
      "Gurgaon (Gurugram) is India's premier corporate hub and one of the fastest-growing real estate markets in the NCR, home to leading developers like DLF, M3M, Sobha, Godrej, Signature Global and Smartworld.",
    localities: ["Golf Course Road", "Golf Course Extension", "Sohna Road", "Dwarka Expressway", "Sector 79", "Sector 80", "Sector 84", "Sector 102", "New Gurgaon", "MG Road"],
  },
  {
    slug: "noida",
    name: "Noida",
    dbName: "Noida",
    state: "Uttar Pradesh",
    intro:
      "Noida and Greater Noida offer one of the best-planned real estate landscapes in NCR with metro connectivity, the upcoming Jewar airport, and projects by ATS, Godrej, M3M, Tata and County Group.",
    localities: ["Sector 150", "Sector 151", "Noida Expressway", "Sector 137", "Greater Noida West", "Sector 75"],
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    dbName: "Mumbai",
    state: "Maharashtra",
    intro:
      "Mumbai remains India's most premium real estate market with marquee launches from Lodha, Godrej, Oberoi, Piramal and Rustomjee across the Western Suburbs, South Mumbai and Thane.",
    localities: ["Worli", "Lower Parel", "Bandra", "Andheri", "Powai", "Thane", "Mulund", "Goregaon"],
  },
  {
    slug: "bengaluru",
    name: "Bengaluru",
    dbName: "Bengaluru",
    state: "Karnataka",
    intro:
      "Bengaluru's real estate market is powered by its IT corridors with active launches from Prestige, Sobha, Brigade and Godrej across Whitefield, Sarjapur, North Bengaluru and Electronic City.",
    localities: ["Whitefield", "Sarjapur Road", "Hebbal", "Yelahanka", "Electronic City", "Hennur"],
  },
];

const BUCKETS: BucketConfig[] = [
  {
    slug: "new-launch",
    label: "New Launch Property",
    shortLabel: "New Launch",
    intent: "transactional",
    filter: (p) => {
      const recent = p.created_at ? new Date(p.created_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 365 : false;
      return ["upcoming", "under_construction"].includes((p.possession_status || "").toLowerCase()) || recent;
    },
    intro: (city, y) =>
      `Discover the latest new launch property in ${city} for ${y}. Compare RERA-registered launches from top developers, possession timelines, BHK configurations and current pre-launch prices.`,
    faqs: [
      { q: "What is a new launch property?", a: "A new launch property is a residential project that has just been opened for booking by the developer, often offering pre-launch pricing, flexible payment plans, and the widest choice of units, floor and view." },
      { q: "Is it safe to book a new launch property in Gurgaon?", a: "Yes, provided the project is RERA-registered, the developer has a proven delivery track record, and the land title is clean. Always verify RERA ID, approvals, and bank tie-ups before booking." },
      { q: "What are the price benefits of buying at new launch stage?", a: "Pre-launch and new launch buyers typically get a 10–20% lower price compared to construction-linked stages, plus flexible 10:90 or subvention payment plans from the developer." },
      { q: "How long does possession take for a new launch property?", a: "Most new launch residential projects in NCR have a possession window of 3 to 5 years from launch date depending on the developer and project category." },
    ],
  },
  {
    slug: "under-construction",
    label: "Under Construction Property",
    shortLabel: "Under Construction",
    intent: "transactional",
    filter: (p) => (p.possession_status || "").toLowerCase() === "under_construction",
    intro: (city, y) =>
      `Explore under construction flats and apartments in ${city} for ${y}. Compare construction stage, possession date, RERA status and price per sqft across active projects.`,
    faqs: [
      { q: "Is under construction property a good investment in 2026?", a: "Under construction property offers entry pricing 15–25% lower than ready-to-move inventory and stronger capital appreciation potential, but carries execution and delivery risk that must be mitigated by buying only RERA-registered projects from established developers." },
      { q: "What taxes apply to under construction flats?", a: "Under construction flats attract 5% GST (1% for affordable housing under ₹45 lakh and 60 sqm). Stamp duty applies at registration as per state rates." },
      { q: "Can I get a home loan on under construction property?", a: "Yes. Most banks offer construction-linked home loans where disbursement happens in tranches as construction milestones are reached. Subvention plans are also available where the developer pays interest till possession." },
    ],
  },
  {
    slug: "ready-to-move",
    label: "Ready To Move Flats",
    shortLabel: "Ready To Move",
    intent: "transactional",
    filter: (p) => ["ready_to_move", "ready"].includes((p.possession_status || "").toLowerCase()),
    intro: (city, y) =>
      `Browse ready to move in flats in ${city} (${y}). RERA-approved, possession-ready apartments — no GST, immediate occupation, complete amenities live.`,
    faqs: [
      { q: "What are the advantages of ready to move flats?", a: "Ready to move flats eliminate construction risk, allow you to physically inspect the actual unit and amenities, attract no GST, and let you start saving rent or earning rental income immediately." },
      { q: "Are ready to move flats more expensive than under construction?", a: "Typically yes — ready inventory commands a 15–25% premium because of zero waiting period and no execution risk, but you save GST and can move in or rent it out immediately." },
      { q: "What documents should I check for a ready to move property?", a: "Verify the occupancy certificate (OC), completion certificate, RERA registration, no-objection certificates, latest property tax receipts, and society maintenance records." },
    ],
  },
  {
    slug: "affordable",
    label: "Affordable New Launch Flats",
    shortLabel: "Affordable",
    intent: "transactional",
    filter: (p) => {
      const price = p.price_max || p.price || 0;
      return price > 0 && price <= 6500000;
    },
    intro: (city, y) =>
      `Find affordable new launch flats in ${city} under ₹65 lakh for ${y}. PMAY-eligible, RERA-registered projects ideal for first-time home buyers and salaried professionals.`,
    faqs: [
      { q: "What qualifies as an affordable housing project in India?", a: "Under PMAY-CLSS, affordable housing covers homes with carpet area up to 60 sqm in metros (90 sqm in non-metros) and price below ₹45 lakh. State definitions may vary." },
      { q: "Are home loan subsidies available for affordable flats?", a: "Yes, eligible buyers under PMAY get an interest subsidy of up to ₹2.67 lakh on home loans up to ₹6 lakh, depending on income category (EWS, LIG, MIG-I, MIG-II)." },
      { q: "Which Gurgaon sectors have affordable new launch flats?", a: "Sectors 36A, 37D, 81, 88B, 89, 92, 93, 95 and 102 along the Dwarka Expressway and New Gurgaon offer the largest concentration of affordable launches under Haryana's Affordable Housing Policy 2013." },
    ],
  },
  {
    slug: "luxury",
    label: "Luxury New Launch Apartments",
    shortLabel: "Luxury",
    intent: "transactional",
    filter: (p) => (p.price_min || p.price || 0) >= 30000000,
    intro: (city, y) =>
      `Explore luxury new launch apartments and villas in ${city} (${y}) priced ₹3 Cr and above. Branded residences, private elevators, sky decks and concierge services from DLF, M3M, Trump, Smartworld and Signature Global.`,
    faqs: [
      { q: "What defines a luxury apartment in Gurgaon?", a: "Luxury apartments in Gurgaon typically start at ₹3 Cr, offer 3000+ sqft layouts, branded residences, private elevators, smart-home automation, and curated concierge services along the Golf Course Road and Golf Course Extension micro-markets." },
      { q: "Are luxury new launches a good investment?", a: "Premium luxury launches in established micro-markets like Golf Course Road have historically delivered 12–18% CAGR over 5-year cycles, driven by limited supply and strong NRI demand." },
      { q: "Which developers lead the luxury segment in Gurgaon?", a: "DLF, M3M, Trump Towers, Smartworld, Signature Global Deluxe, Krisumi, Birla Estates and Conscient are among the leading luxury developers active in Gurgaon today." },
    ],
  },
  {
    slug: "2-bhk",
    label: "New Launch 2 BHK Flats",
    shortLabel: "2 BHK",
    intent: "transactional",
    filter: (p) => (p.bhk || "").includes("2") || (p.bhk_min || "").includes("2"),
    intro: (city, y) =>
      `Compare new launch 2 BHK flats in ${city} for ${y}. View carpet area, balconies, price per sqft, possession date and floor plan across RERA-registered projects.`,
    faqs: [
      { q: "What is the average price of a 2 BHK flat in Gurgaon?", a: "A new launch 2 BHK in Gurgaon typically ranges from ₹65 lakh to ₹2.5 Cr depending on the micro-market — affordable corridors like Sector 36A or 92 start from ₹65L, while premium 2 BHKs on Golf Course Extension or Dwarka Expressway cross ₹1.8 Cr." },
      { q: "What carpet area should I expect in a new 2 BHK?", a: "New launch 2 BHK apartments offer carpet area between 600–1,100 sqft. Premium 2 BHKs in luxury projects can go up to 1,400 sqft with multiple balconies and a study." },
      { q: "Are 2 BHK flats a good rental investment in Gurgaon?", a: "Yes — 2 BHK flats are the highest-demand rental configuration in Gurgaon, driven by IT professionals and expat tenants, delivering 2.5–3.5% gross rental yield in established micro-markets." },
    ],
  },
  {
    slug: "investment",
    label: "Investment in New Launch Property",
    shortLabel: "Investment",
    intent: "informational",
    filter: (p) => p.is_featured === true,
    intro: (city, y) =>
      `Curated investment-grade new launches in ${city} for ${y}. Projects shortlisted on developer track record, RERA compliance, micro-market growth, and expected rental yield.`,
    faqs: [
      { q: "Should I invest in new launch property in 2026?", a: "2026 looks favourable for new launch investment due to softening interest rates, strong end-user demand, and limited grade-A supply — provided you focus on RERA-registered projects in established micro-markets with infrastructure tailwinds." },
      { q: "What ROI can I expect from a new launch in Gurgaon?", a: "Historically, well-chosen new launches in Gurgaon have delivered 8–15% annual capital appreciation between launch and possession, with the strongest returns coming from infrastructure-led micro-markets like the Dwarka Expressway and Golf Course Extension." },
      { q: "What are the risks of investing in new launch property?", a: "Key risks include construction delays, change in approvals, developer cash flow stress, and softening of micro-market demand. Mitigate by selecting only RERA-registered projects, established developers, and projects with clear approvals and bank funding." },
    ],
  },
];

/* ── Types ── */
interface Property {
  id: string;
  title: string;
  slug: string;
  property_type: string;
  city: string;
  locality: string | null;
  price: number;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  bhk: string | null;
  bhk_min: string | null;
  area_sqft: number | null;
  developer_name: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  rating: number | null;
  reviews_count: number | null;
  possession_status: string | null;
  rera_id: string | null;
  created_at: string | null;
}

function formatPrice(p: number): string {
  if (!p) return "Price on Request";
  if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
  if (p >= 100000) return `₹${(p / 100000).toFixed(2)} L`;
  return `₹${p.toLocaleString("en-IN")}`;
}

/* ════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════ */

export default function CityBucketPage() {
  const { city: citySlug, bucket: bucketSlug } = useParams<{ city: string; bucket: string }>();
  const city = useMemo(() => CITIES.find((c) => c.slug === citySlug?.toLowerCase()), [citySlug]);
  const bucket = useMemo(() => BUCKETS.find((b) => b.slug === bucketSlug?.toLowerCase()), [bucketSlug]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("properties")
        .select("id,title,slug,property_type,city,locality,price,price_min,price_max,price_display,bhk,bhk_min,area_sqft,developer_name,cover_image_url,is_featured,rating,reviews_count,possession_status,rera_id,created_at")
        .eq("status", "active")
        .ilike("city", `%${city.dbName}%`)
        .order("is_featured", { ascending: false })
        .limit(60);
      setProperties((data as Property[]) || []);
      setLoading(false);
    })();
  }, [city]);

  if (!city || !bucket) {
    return <Navigate to="/real-estate" replace />;
  }

  const year = new Date().getFullYear();
  const filtered = properties.filter(bucket.filter);
  const title = `${bucket.label} in ${city.name} ${year} | Prices, RERA, Developers`;
  const description = `${bucket.intro(city.name, year).slice(0, 155)}`.slice(0, 160);
  const canonical = `https://www.investingiq.in/real-estate/${city.slug}/${bucket.slug}`;

  const h1 = `${bucket.label} in ${city.name} ${year}`;

  /* JSON-LD */
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.investingiq.in/" },
      { "@type": "ListItem", position: 2, name: "Real Estate", item: "https://www.investingiq.in/real-estate" },
      { "@type": "ListItem", position: 3, name: city.name, item: `https://www.investingiq.in/real-estate/${city.slug}` },
      { "@type": "ListItem", position: 4, name: bucket.shortLabel, item: canonical },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: bucket.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1,
    itemListElement: filtered.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.investingiq.in/real-estate/${p.slug}`,
      name: p.title,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        {filtered.length > 0 && <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>}
      </Helmet>

      <Header />

      {/* Breadcrumbs */}
      <nav className="container mx-auto px-4 pt-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-foreground">Home</Link></li>
          <li><ChevronRight className="h-3 w-3" /></li>
          <li><Link to="/real-estate" className="hover:text-foreground">Real Estate</Link></li>
          <li><ChevronRight className="h-3 w-3" /></li>
          <li><Link to={`/real-estate/${city.slug}/new-launch`} className="hover:text-foreground">{city.name}</Link></li>
          <li><ChevronRight className="h-3 w-3" /></li>
          <li className="text-foreground font-medium">{bucket.shortLabel}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-sm text-primary mb-3">
            <MapPin className="h-4 w-4" /> {city.name}, {city.state}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{h1}</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{bucket.intro(city.name, year)}</p>
          <p className="text-sm text-muted-foreground mt-3">{city.intro}</p>

          <div className="flex flex-wrap gap-3 mt-6 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <Shield className="h-4 w-4 text-primary" /> RERA-registered only
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <Building2 className="h-4 w-4 text-primary" /> {filtered.length} active project{filtered.length === 1 ? "" : "s"}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <Sparkles className="h-4 w-4 text-primary" /> Updated {year}
            </div>
          </div>
        </div>
      </section>

      {/* Bucket Switcher */}
      <section className="container mx-auto px-4 pb-6">
        <h2 className="sr-only">Browse {city.name} property categories</h2>
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {BUCKETS.map((b) => {
            const active = b.slug === bucket.slug;
            return (
              <Link
                key={b.slug}
                to={`/real-estate/${city.slug}/${b.slug}`}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"}`}
              >
                {b.shortLabel}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Listings */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-semibold">Top {bucket.shortLabel} Projects in {city.name}</h2>
          <Link to="/real-estate" className="text-sm text-primary hover:underline">View all <ChevronRight className="inline h-3 w-3" /></Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <Home className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No {bucket.shortLabel} projects listed yet in {city.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">Our editorial team is curating verified projects. Meanwhile, browse all {city.name} property listings.</p>
            <Link to="/real-estate" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Browse all properties <ChevronRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} to={`/real-estate/${p.slug}`} className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-[16/10] bg-muted overflow-hidden">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={`${p.title} - ${bucket.shortLabel} in ${city.name}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Building2 className="h-12 w-12 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold leading-tight line-clamp-1">{p.title}</h3>
                    {p.rera_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">RERA</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.locality || p.city} {p.developer_name && `· ${p.developer_name}`}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    {p.bhk && <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {p.bhk}</span>}
                    {p.area_sqft && <span className="flex items-center gap-1"><Maximize className="h-3 w-3" /> {p.area_sqft} sqft</span>}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-primary font-bold">{p.price_display || formatPrice(p.price_min || p.price)}</div>
                    <span className="text-xs text-muted-foreground">View details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Why this bucket - SEO content */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: "RERA Verified", body: `Every ${bucket.shortLabel.toLowerCase()} project listed for ${city.name} is RERA-registered with verified developer credentials and approvals.` },
            { icon: TrendingUp, title: "Live Price Trends", body: `Track per-sqft prices, capital appreciation and rental yield trends across ${city.name}'s top micro-markets.` },
            { icon: IndianRupee, title: "Transparent Pricing", body: `Compare base price, GST, registration, floor PLC and amenities — no hidden charges across listed projects.` },
          ].map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5">
              <c.icon className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Localities */}
      <section className="container mx-auto px-4 py-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Popular {city.name} micro-markets for {bucket.shortLabel}</h2>
        <div className="flex flex-wrap gap-2">
          {city.localities.map((loc) => (
            <span key={loc} className="px-3 py-1.5 rounded-md border border-border bg-card text-sm">{loc}</span>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="divide-y divide-border border border-border rounded-lg bg-card">
          {bucket.faqs.map((f, i) => (
            <details key={i} className="group p-4">
              <summary className="cursor-pointer font-medium flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{f.q}</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed pl-6">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <div className="container mx-auto px-4 pb-6">
        <p className="text-xs text-muted-foreground italic">
          Disclaimer: Property information is sourced from RERA and official developer websites. InvestingIQ is not a registered real estate broker. All prices, RERA status and possession dates are indicative and should be verified directly with the developer before booking. We do not source data from aggregator websites.
        </p>
      </div>

      <Footer />
    </div>
  );
}
