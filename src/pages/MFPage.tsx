import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { FundCard } from "@/components/mf/FundCard";
import { ETFCard } from "@/components/mf/ETFCard";
import { fmtCr } from "@/lib/mfFormat";
import {
  TrendingUp, TrendingDown, Filter, GitCompare, Sparkles, Building2,
  Newspaper, Calculator, Layers, Award, BarChart3, ArrowRight, LineChart as LineIcon,
} from "lucide-react";

const TABS = [
  { key: "return_1m", label: "1M" },
  { key: "return_3m", label: "3M" },
  { key: "return_1y", label: "1Y" },
  { key: "return_3y", label: "3Y" },
  { key: "return_5y", label: "5Y" },
];

const CATEGORY_TILES = [
  { label: "Best Large Cap", filter: { category: "Equity", sub_category: "Large Cap" } },
  { label: "Best Mid Cap", filter: { category: "Equity", sub_category: "Mid Cap" } },
  { label: "Best Small Cap", filter: { category: "Equity", sub_category: "Small Cap" } },
  { label: "Best Index Funds", filter: { category: "Equity", sub_category: "Index" } },
  { label: "Best ELSS (Tax Saving)", filter: { is_elss: true } },
  { label: "Best Flexi Cap", filter: { sub_category: "Flexi Cap" } },
  { label: "Best Hybrid", filter: { category: "Hybrid" } },
  { label: "Best International", filter: { sub_category: "International" } },
];

export default function MFPage() {
  const [stats, setStats] = useState<any>(null);
  const [funds, setFunds] = useState<any[]>([]);
  const [etfs, setEtfs] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [perfTab, setPerfTab] = useState("return_1y");

  useEffect(() => {
    (async () => {
      const [s, f, e, h, n] = await Promise.all([
        supabase.from("mf_industry_stats").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("mf_funds").select("*"),
        supabase.from("mf_etfs").select("*"),
        supabase.from("mf_fund_houses").select("*").order("total_aum_cr", { ascending: false }),
        supabase.from("mf_news").select("*").order("published_at", { ascending: false }).limit(6),
      ]);
      setStats(s.data);
      setFunds(f.data ?? []);
      setEtfs(e.data ?? []);
      setHouses(h.data ?? []);
      setNews(n.data ?? []);
    })();
  }, []);

  const sortedFunds = [...funds].sort((a, b) => Number(b[perfTab]) - Number(a[perfTab])).slice(0, 8);
  const trendingFunds = funds.filter((f) => f.is_trending).slice(0, 8);
  const trendingEtfs = etfs.filter((e) => e.is_trending).slice(0, 6);
  const highestAUM = [...funds].sort((a, b) => Number(b.aum_cr) - Number(a.aum_cr)).slice(0, 6);
  const lowestExpense = [...funds].filter(f => Number(f.expense_ratio) > 0).sort((a, b) => Number(a.expense_ratio) - Number(b.expense_ratio)).slice(0, 6);
  const mostViewed = [...funds].sort((a, b) => Number(b.views) - Number(a.views)).slice(0, 6);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>Mutual Funds & ETFs Research Hub 2026 | InvestingIQ</title>
        <meta name="description" content="India's complete mutual fund & ETF research hub. Trending funds, top performers, screener, comparison, fund houses, SIP calculators and AI-powered analysis." />
        <link rel="canonical" href="https://www.investingiq.in/mutual-funds" />
      </Helmet>
      <Header />

      <main className="max-w-[1280px] mx-auto px-4 py-6 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-8 sm:p-10 shadow-lg">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full mb-3">
              <Sparkles className="h-3 w-3" /> Research Terminal
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight">Mutual Funds & ETFs Hub</h1>
            <p className="text-white/80 text-sm sm:text-base mb-6 max-w-2xl">
              Research, screen, compare and analyze 1000+ mutual funds & ETFs with live NAVs, advanced metrics, portfolio overlap, and AI-powered insights.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/mutual-funds/screener" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/90">
                <Filter className="h-4 w-4" /> Advanced Screener
              </Link>
              <Link to="/mutual-funds/compare" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/25">
                <GitCompare className="h-4 w-4" /> Compare Funds
              </Link>
              <Link to="/mutual-funds/overlap" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/25">
                <Layers className="h-4 w-4" /> Overlap Tool
              </Link>
              <Link to="/etfs" className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/25">
                <BarChart3 className="h-4 w-4" /> ETF Hub
              </Link>
            </div>
          </div>
        </div>

        {/* Industry Stats Widgets */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatWidget label="Total MF Industry AUM" value={fmtCr(stats.total_mf_aum_cr)} icon={<TrendingUp className="h-4 w-4" />} accent="emerald" />
            <StatWidget label="Total ETF AUM" value={fmtCr(stats.total_etf_aum_cr)} icon={<BarChart3 className="h-4 w-4" />} accent="violet" />
            <StatWidget label="Today's Net Inflows" value={fmtCr(stats.net_inflows_cr)} icon={<TrendingUp className="h-4 w-4" />} accent="cyan" />
            <StatWidget label="Active Fund Houses" value={String(houses.length)} icon={<Building2 className="h-4 w-4" />} accent="amber" />
          </div>
        )}

        {/* Top Gainers/Losers categories */}
        {stats && (
          <div className="grid md:grid-cols-2 gap-4">
            <CategoryList title="Top Gaining Categories" up data={stats.top_gaining_categories} />
            <CategoryList title="Top Losing Categories" data={stats.top_losing_categories} />
          </div>
        )}

        {/* Trending Funds */}
        <Section title="Trending Mutual Funds" cta={{ label: "Open screener", href: "/mutual-funds/screener" }}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {trendingFunds.map((f) => <FundCard key={f.id} fund={f} />)}
          </div>
        </Section>

        {/* Top performers with tabs */}
        <Section title="Top Performing Funds">
          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setPerfTab(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${perfTab === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedFunds.map((f) => <FundCard key={f.id} fund={f} />)}
          </div>
        </Section>

        {/* Category tiles - SEO landing links */}
        <Section title="Browse by Category" subtitle="Curated lists of the best funds in every category">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORY_TILES.map((t) => (
              <Link key={t.label} to={`/mutual-funds/screener?${new URLSearchParams(t.filter as any).toString()}`}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all flex items-center justify-between group">
                <div>
                  <Award className="h-4 w-4 text-amber-500 mb-2" />
                  <div className="font-semibold text-sm text-foreground">{t.label}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition" />
              </Link>
            ))}
          </div>
        </Section>

        {/* Highest AUM / Lowest expense */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="Highest AUM Funds">
            <div className="grid sm:grid-cols-2 gap-3">
              {highestAUM.map((f) => <FundCard key={f.id} fund={f} />)}
            </div>
          </Section>
          <Section title="Lowest Expense Ratio">
            <div className="grid sm:grid-cols-2 gap-3">
              {lowestExpense.map((f) => <FundCard key={f.id} fund={f} />)}
            </div>
          </Section>
        </div>

        {/* Trending ETFs */}
        <Section title="Trending ETFs" cta={{ label: "All ETFs", href: "/etfs" }}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trendingEtfs.map((e) => <ETFCard key={e.id} etf={e} />)}
          </div>
        </Section>

        {/* Fund Houses */}
        <Section title="Top Fund Houses (AMCs)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {houses.slice(0, 8).map((h) => (
              <Link key={h.id} to={`/mutual-funds/fund-house/${h.slug}`} className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition group">
                <Building2 className="h-5 w-5 text-primary mb-2" />
                <div className="font-semibold text-sm text-foreground line-clamp-1">{h.name}</div>
                <div className="text-xs text-muted-foreground mt-1">AUM {fmtCr(h.total_aum_cr)}</div>
                <div className="text-xs text-muted-foreground">{h.fund_count} funds</div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Tools strip */}
        <Section title="Mutual Fund Tools & Calculators" cta={{ label: "All tools", href: "/tools" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "SIP Calculator", h: "/tools/sip" },
              { l: "Step-Up SIP", h: "/tools/step-up-sip" },
              { l: "Goal SIP Planner", h: "/tools/goal-sip" },
              { l: "Retirement Planner", h: "/tools/retirement-sip" },
              { l: "FIRE Calculator", h: "/tools/fire-calculator" },
              { l: "Lumpsum Calculator", h: "/tools/lumpsum-calculator" },
              { l: "SWP Calculator", h: "/tools/swp-calculator" },
              { l: "Portfolio Analyzer", h: "/tools/portfolio-analyzer" },
            ].map(t => (
              <Link key={t.h} to={t.h} className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition flex items-center gap-3">
                <Calculator className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-sm">{t.l}</span>
              </Link>
            ))}
          </div>
        </Section>

        {/* Most Viewed */}
        <Section title="Most Viewed Funds">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mostViewed.map((f) => <FundCard key={f.id} fund={f} />)}
          </div>
        </Section>

        {/* News */}
        <Section title="Mutual Fund News Center" cta={{ label: "All MF news", href: "/mutual-funds/news" }}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {news.map((n) => (
              <article key={n.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider">
                  <Newspaper className="h-3 w-3 text-primary" />
                  <span className="text-primary font-semibold">{n.category}</span>
                  <span className="text-muted-foreground">· {new Date(n.published_at).toLocaleDateString('en-IN')}</span>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-2 line-clamp-2">{n.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-3">{n.summary}</p>
              </article>
            ))}
          </div>
        </Section>

        {/* SEO links */}
        <Section title="Popular Research Guides">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {[
              ["Best Mutual Funds 2026", "/best-mutual-funds-2026"],
              ["Best SIP Funds", "/best-sip-funds"],
              ["Best ELSS Funds", "/best-elss-funds"],
              ["Best Small Cap Funds", "/best-small-cap-funds"],
              ["Best Index Funds", "/best-index-funds"],
              ["Best ETFs in India", "/best-etfs-india"],
              ["Gold ETF vs Physical Gold", "/gold-etf-vs-physical-gold"],
              ["ETF vs Mutual Fund", "/etf-vs-mutual-fund"],
              ["SIP vs Lumpsum", "/sip-vs-lumpsum"],
            ].map(([l, h]) => (
              <Link key={h} to={h} className="text-primary hover:underline flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> {l}
              </Link>
            ))}
          </div>
        </Section>

        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, subtitle, cta, children }: any) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-emerald-600 rounded-full" />
            <h2 className="text-xl sm:text-2xl font-black text-foreground">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 ml-3">{subtitle}</p>}
        </div>
        {cta && (
          <Link to={cta.href} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            {cta.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function StatWidget({ label, value, icon, accent }: any) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-600",
    violet: "from-violet-500 to-purple-600",
    cyan: "from-cyan-500 to-blue-600",
    amber: "from-amber-500 to-orange-600",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${colors[accent]} opacity-10`} />
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon}<span>{label}</span></div>
      <div className="font-black text-xl text-foreground">{value}</div>
    </div>
  );
}

function CategoryList({ title, data, up }: { title: string; data: any[]; up?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
        {up ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
        {title}
      </h3>
      <div className="space-y-2">
        {(data ?? []).map((c, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
            <span className="text-foreground">{c.name}</span>
            <span className={`font-semibold ${Number(c.change) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {Number(c.change) >= 0 ? '+' : ''}{c.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
