import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft, Clock, User, Share2, Tag, Newspaper, Info, Target, LineChart,
  Layers, Globe, ThumbsUp, AlertTriangle, Building2, Activity, Brain, ListChecks,
  HelpCircle, BookOpen, Hash, Search, Sparkles, ExternalLink, Quote, Lightbulb,
  Radio,
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";

interface Faq { q?: string; a?: string; question?: string; answer?: string; }
interface SectorImpact { sector?: string; impact?: string; note?: string; }
interface CompanyImpact { name?: string; ticker?: string; impact?: string; note?: string; }
interface InternalLink { anchor?: string; slug_to?: string; rationale?: string; }
interface Insights {
  what_is?: string;
  why_matters?: string;
  market_impact?: string;
  sector_impact?: SectorImpact[];
  investor_impact?: string;
  economy_impact?: string;
  pros?: string[];
  risks?: string[];
  companies_affected?: (CompanyImpact | string)[];
  sentiment?: string;
  expert_analysis?: string;
  key_takeaways?: string[];
  key_facts?: string[];
  faqs?: Faq[];
  related_topics?: string[];
  educational_context?: string;
}
interface SeoKeywords {
  primary?: string;
  secondary?: string[];
  long_tail?: string[];
  short_tail?: string[];
  question_based?: string[];
  trending?: string[];
  lsi?: string[];
  search_intent?: string;
  all?: string[];
}
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  author_name: string | null;
  views_count: number | null;
  meta_title: string | null;
  meta_description: string | null;
  insights: Insights | null;
  seo_keywords: SeoKeywords | null;
  related_searches: string[] | null;
  trending_questions: string[] | null;
  internal_links: InternalLink[] | null;
  schema_jsonld: Record<string, unknown> | null;
}

const LIVE_THRESHOLD_MS = 60 * 60 * 1000;

function isLive(iso: string | null) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < LIVE_THRESHOLD_MS;
}

function sentimentClass(s?: string) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("bull")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v.includes("bear")) return "bg-red-50 text-red-700 border-red-200";
  if (v.includes("mixed")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function impactPillClass(s?: string) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("pos")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v.includes("neg")) return "bg-red-50 text-red-700 border-red-200";
  if (v.includes("mix")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

interface SectionCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
  children: React.ReactNode;
}

function SectionCard({ title, icon: Icon, accent = "bg-primary/10 text-primary", children }: SectionCardProps) {
  return (
    <section className="bg-white border border-border rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-xl ${accent} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">{title}</h2>
      </div>
      <div className="text-sm sm:text-[15px] leading-relaxed text-foreground/85 space-y-3">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items?: (string | unknown)[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2.5 items-start">
          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
          <span>{typeof x === "string" ? x : JSON.stringify(x)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ============ PREMIUM SECTION COMPONENTS ============ */

interface PremiumProps { title: string; eyebrow?: string; children: React.ReactNode; }

function PremiumShell({
  title, eyebrow, icon: Icon, gradient, iconBg, borderAccent, children,
}: PremiumProps & {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  borderAccent: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border ${borderAccent} bg-white shadow-sm hover:shadow-lg transition-all duration-300 group`}>
      <div className={`absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity ${gradient}`} />
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "currentColor" }} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={`h-12 w-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-black/5`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">{eyebrow}</div>}
            <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight">{title}</h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function PremiumProse({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[15px] leading-[1.75] text-foreground/85 first-letter:text-3xl first-letter:font-bold first-letter:text-foreground first-letter:mr-1 first-letter:float-left first-letter:leading-none first-letter:mt-1">
      {children}
    </div>
  );
}

function sentimentScore(s?: string) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("very bull")) return 92;
  if (v.includes("bull")) return 78;
  if (v.includes("very bear")) return 12;
  if (v.includes("bear")) return 28;
  if (v.includes("mixed") || v.includes("neutral")) return 50;
  return 50;
}

function impactBarValue(impact?: string) {
  const v = (impact ?? "").toLowerCase();
  if (v.includes("very pos") || v.includes("strong pos")) return 90;
  if (v.includes("pos")) return 72;
  if (v.includes("very neg") || v.includes("strong neg")) return 10;
  if (v.includes("neg")) return 28;
  if (v.includes("mix")) return 50;
  return 50;
}
  if (v.includes("pos")) return 72;
  if (v.includes("very neg") || v.includes("strong neg")) return 10;
  if (v.includes("neg")) return 28;
  if (v.includes("mix")) return 50;
  return 50;
}

function impactBarColor(impact?: string) {
  const v = (impact ?? "").toLowerCase();
  if (v.includes("pos")) return "from-emerald-400 to-emerald-600";
  if (v.includes("neg")) return "from-red-400 to-red-600";
  if (v.includes("mix")) return "from-amber-400 to-amber-600";
  return "from-slate-300 to-slate-500";
}


export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (slug) fetchPost(slug); }, [slug]);

  async function fetchPost(s: string) {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", s)
      .eq("status", "published")
      .maybeSingle();

    if (data) {
      const p = data as unknown as BlogPost;
      setPost(p);
      supabase.from("blog_posts").update({ views_count: (data.views_count ?? 0) + 1 }).eq("id", data.id).then();
      const { data: rel } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,category,tags,published_at,author_name")
        .eq("status", "published")
        .eq("category", data.category)
        .neq("id", data.id)
        .order("published_at", { ascending: false })
        .limit(6);
      setRelated((rel as unknown as BlogPost[]) ?? []);
    }
    setLoading(false);
  }

  const ins = post?.insights ?? null;
  const seo = post?.seo_keywords ?? null;
  const live = isLive(post?.published_at ?? null);

  const allKeywords = useMemo(() => {
    if (!seo) return [] as string[];
    const set = new Set<string>();
    [seo.primary].filter(Boolean).forEach(k => k && set.add(k));
    [...(seo.secondary ?? []), ...(seo.long_tail ?? []), ...(seo.short_tail ?? []), ...(seo.trending ?? []), ...(seo.lsi ?? []), ...(seo.all ?? [])]
      .forEach(k => k && set.add(k));
    return Array.from(set).slice(0, 24);
  }, [seo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header /><StockTicker />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 bg-card rounded w-3/4 animate-pulse mb-4" />
          <div className="h-4 bg-card rounded w-1/2 animate-pulse mb-8" />
          {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse mb-4" />)}
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header /><StockTicker />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">This article may have been removed or is not yet published.</p>
          <Link to="/news-hub" className="text-primary hover:text-primary/80 font-medium">← Back to News Hub</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Helmet>
        <title>{post.meta_title || post.title}</title>
        <meta name="description" content={post.meta_description || post.excerpt || ""} />
        <link rel="canonical" href={`https://www.investingiq.in/news/${post.slug}`} />
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt || ""} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.investingiq.in/news/${post.slug}`} />
        {allKeywords.length > 0 && <meta name="keywords" content={allKeywords.join(", ")} />}
        {post.schema_jsonld && (
          <script type="application/ld+json">{JSON.stringify(post.schema_jsonld)}</script>
        )}
        {Array.isArray(ins?.faqs) && ins!.faqs!.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: ins!.faqs!.map(f => ({
              "@type": "Question",
              name: f.q ?? f.question ?? "",
              acceptedAnswer: { "@type": "Answer", text: f.a ?? f.answer ?? "" },
            })),
          })}</script>
        )}
      </Helmet>
      <Header />
      <StockTicker />

      <main className="max-w-[1400px] mx-auto px-4 py-6 sm:py-10">
        <Link to="/news-hub" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to News Hub
        </Link>

        {/* Headline card */}
        <header className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {post.category || "Markets"}
            </span>
            {live && (
              <span className="text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Radio className="h-3 w-3 animate-pulse" /> LIVE
              </span>
            )}
            {ins?.sentiment && (
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${sentimentClass(ins.sentiment)}`}>
                Sentiment: {ins.sentiment}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mt-4 border-l-4 border-primary pl-4">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 mt-5 pt-5 border-t border-border text-sm text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span className="font-medium text-foreground">{post.author_name || "InvestingIQ AI Desk"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.published_at
                  ? new Date(post.published_at).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "Recently"}
              </span>
            </div>
            <button
              onClick={() => navigator.share?.({ title: post.title, url: window.location.href }).catch(() => {})}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          {/* Left column — section cards */}
          <div className="space-y-5 sm:space-y-6">
            {Array.isArray(ins?.key_takeaways) && ins!.key_takeaways!.length > 0 && (
              <SectionCard title="Key Takeaways" icon={ListChecks} accent="bg-amber-50 text-amber-700">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {ins!.key_takeaways!.map((k, i) => (
                    <div key={i} className="flex gap-2.5 items-start bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                      <span className="h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm">{k}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {ins?.what_is && (
              <SectionCard title="What is this News?" icon={Info}>
                <p>{ins.what_is}</p>
              </SectionCard>
            )}

            {ins?.why_matters && (
              <SectionCard title="Why is this Important for Investors?" icon={Target} accent="bg-blue-50 text-blue-700">
                <p>{ins.why_matters}</p>
              </SectionCard>
            )}

            {ins?.market_impact && (
              <SectionCard title="Impact on the Stock Market" icon={LineChart} accent="bg-violet-50 text-violet-700">
                <p>{ins.market_impact}</p>
              </SectionCard>
            )}

            {Array.isArray(ins?.sector_impact) && ins!.sector_impact!.length > 0 && (
              <SectionCard title="Impact on Specific Sectors" icon={Layers} accent="bg-indigo-50 text-indigo-700">
                <div className="grid sm:grid-cols-2 gap-3">
                  {ins!.sector_impact!.map((s, i) => (
                    <div key={i} className="border border-border rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-semibold text-foreground text-sm">{s.sector}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${impactPillClass(s.impact)}`}>
                          {s.impact ?? "Neutral"}
                        </span>
                      </div>
                      {s.note && <p className="text-xs text-muted-foreground leading-relaxed">{s.note}</p>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {ins?.economy_impact && (
              <SectionCard title="Impact on the Indian Economy" icon={Globe} accent="bg-teal-50 text-teal-700">
                <p>{ins.economy_impact}</p>
              </SectionCard>
            )}

            <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
              {Array.isArray(ins?.pros) && ins!.pros!.length > 0 && (
                <SectionCard title="Advantages & Opportunities" icon={ThumbsUp} accent="bg-emerald-50 text-emerald-700">
                  <Bullets items={ins!.pros} />
                </SectionCard>
              )}
              {Array.isArray(ins?.risks) && ins!.risks!.length > 0 && (
                <SectionCard title="Risks & Concerns" icon={AlertTriangle} accent="bg-red-50 text-red-700">
                  <Bullets items={ins!.risks} />
                </SectionCard>
              )}
            </div>

            {Array.isArray(ins?.companies_affected) && ins!.companies_affected!.length > 0 && (
              <SectionCard title="Companies Potentially Affected" icon={Building2} accent="bg-slate-100 text-slate-700">
                <div className="grid sm:grid-cols-2 gap-3">
                  {ins!.companies_affected!.map((c, i) => {
                    const co = typeof c === "string" ? { name: c } as CompanyImpact : c;
                    return (
                      <div key={i} className="border border-border rounded-xl p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm truncate">{co.name}</div>
                            {co.ticker && <div className="text-[11px] text-muted-foreground number-font">{co.ticker}</div>}
                          </div>
                          {co.impact && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${impactPillClass(co.impact)}`}>
                              {co.impact}
                            </span>
                          )}
                        </div>
                        {co.note && <p className="text-xs text-muted-foreground leading-relaxed">{co.note}</p>}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {(ins?.sentiment || ins?.expert_analysis) && (
              <SectionCard title="Market Sentiment Analysis" icon={Activity} accent="bg-fuchsia-50 text-fuchsia-700">
                {ins?.sentiment && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${sentimentClass(ins.sentiment)}`}>
                    {ins.sentiment}
                  </div>
                )}
                {ins?.expert_analysis && (
                  <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 relative">
                    <Quote className="h-4 w-4 text-slate-400 absolute top-3 left-3" />
                    <p className="pl-6 text-sm text-foreground/80 italic leading-relaxed">{ins.expert_analysis}</p>
                  </div>
                )}
              </SectionCard>
            )}

            {Array.isArray(ins?.key_facts) && ins!.key_facts!.length > 0 && (
              <SectionCard title="Key Facts & Numbers" icon={Hash} accent="bg-cyan-50 text-cyan-700">
                <Bullets items={ins!.key_facts} />
              </SectionCard>
            )}

            {ins?.expert_analysis && !ins?.sentiment && (
              <SectionCard title="AI Expert Analysis" icon={Brain} accent="bg-purple-50 text-purple-700">
                <p className="italic">{ins.expert_analysis}</p>
              </SectionCard>
            )}

            {Array.isArray(ins?.faqs) && ins!.faqs!.length > 0 && (
              <SectionCard title="Frequently Asked Questions" icon={HelpCircle} accent="bg-orange-50 text-orange-700">
                <div className="space-y-2.5">
                  {ins!.faqs!.map((f, i) => (
                    <details key={i} className="group border border-border rounded-xl overflow-hidden">
                      <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-foreground text-sm flex items-center justify-between gap-3 hover:bg-muted/50">
                        <span>{f.q ?? f.question}</span>
                        <span className="text-primary group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                      </summary>
                      <div className="px-4 pb-4 pt-1 text-sm text-foreground/80 leading-relaxed">{f.a ?? f.answer}</div>
                    </details>
                  ))}
                </div>
              </SectionCard>
            )}

            {ins?.educational_context && (
              <SectionCard title="Educational Context (for beginners)" icon={BookOpen} accent="bg-green-50 text-green-700">
                <p>{ins.educational_context}</p>
              </SectionCard>
            )}

            {/* DYNAMIC SEO BLOCKS */}
            {Array.isArray(post.trending_questions) && post.trending_questions.length > 0 && (
              <SectionCard title="People Also Ask" icon={Lightbulb} accent="bg-yellow-50 text-yellow-700">
                <ul className="divide-y divide-border">
                  {post.trending_questions.map((q, i) => (
                    <li key={i} className="py-2.5 first:pt-0 last:pb-0 flex gap-2.5 items-start">
                      <HelpCircle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{q}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {Array.isArray(post.related_searches) && post.related_searches.length > 0 && (
              <SectionCard title="Related Searches" icon={Search} accent="bg-sky-50 text-sky-700">
                <div className="flex flex-wrap gap-2">
                  {post.related_searches.map((s, i) => (
                    <a
                      key={i}
                      href={`https://www.google.com/search?q=${encodeURIComponent(s)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Search className="h-3 w-3" /> {s}
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}

            {allKeywords.length > 0 && (
              <SectionCard title="Related Keywords" icon={Hash} accent="bg-violet-50 text-violet-700">
                <div className="flex flex-wrap gap-1.5">
                  {allKeywords.map((k, i) => (
                    <span key={i} className="text-xs font-medium bg-muted text-muted-foreground border border-border px-2.5 py-1 rounded-full">
                      {k}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {Array.isArray(ins?.related_topics) && ins!.related_topics!.length > 0 && (
              <SectionCard title="Related Financial Topics" icon={Sparkles} accent="bg-pink-50 text-pink-700">
                <div className="flex flex-wrap gap-2">
                  {ins!.related_topics!.map((t, i) => (
                    <span key={i} className="text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {Array.isArray(post.internal_links) && post.internal_links.length > 0 && (
              <SectionCard title="Explore More on InvestingIQ" icon={ExternalLink} accent="bg-primary/10 text-primary">
                <ul className="space-y-2">
                  {post.internal_links.map((l, i) => {
                    const href = l.slug_to?.startsWith("/") ? l.slug_to : `/${l.slug_to ?? ""}`;
                    return (
                      <li key={i}>
                        <Link to={href} className="group flex items-start gap-2.5 text-sm hover:text-primary">
                          <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                          <span>
                            <span className="font-semibold underline-offset-2 group-hover:underline">{l.anchor || l.slug_to}</span>
                            {l.rationale && <span className="block text-xs text-muted-foreground mt-0.5">{l.rationale}</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {post.tags.map(t => (
                  <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <ComplianceDisclaimer variant="card" className="mt-4" />
          </div>

          {/* Right sidebar — Related news + live markets */}
          <aside className="space-y-5">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="border-b border-border px-4 py-3 bg-muted/40">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-primary" /> Related News
                </h3>
              </div>
              {related.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No related news yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {related.map(r => {
                    const liveR = isLive(r.published_at);
                    return (
                      <Link key={r.id} to={`/news/${r.slug}`} className="block p-4 hover:bg-muted/40 transition-colors group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{r.category}</span>
                          {liveR && (
                            <span className="text-[10px] font-bold uppercase bg-red-600 text-white px-1.5 py-0.5 rounded">LIVE</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary line-clamp-3 leading-snug">
                          {r.title}
                        </p>
                        {r.published_at && (
                          <p className="text-[11px] text-muted-foreground mt-2">
                            {new Date(r.published_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-border rounded-2xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Live Markets
              </h3>
              {[
                { name: "SENSEX", val: "73,827", chg: "+1.11%", up: true },
                { name: "NIFTY", val: "22,378", chg: "+1.08%", up: true },
                { name: "GOLD", val: "₹72,450", chg: "+0.53%", up: true },
                { name: "USD/INR", val: "83.12", chg: "-0.17%", up: false },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground">{m.name}</span>
                  <div className="text-right">
                    <div className="number-font text-sm font-bold text-foreground">{m.val}</div>
                    <div className={`text-xs font-medium ${m.up ? 'text-emerald-600' : 'text-red-600'}`}>{m.chg}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
