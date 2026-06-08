import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { ETFCard } from "@/components/mf/ETFCard";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";
import { BarChart3, Filter, GitCompare, Sparkles } from "lucide-react";

export default function ETFPage() {
  const [etfs, setEtfs] = useState<any[]>([]);
  useEffect(() => { supabase.from("mf_etfs").select("*").then(({ data }) => setEtfs(data ?? [])); }, []);

  const trending = etfs.filter(e => e.is_trending).slice(0, 6);
  const topPerf = [...etfs].sort((a, b) => Number(b.return_1y) - Number(a.return_1y)).slice(0, 6);
  const gold = etfs.filter(e => e.asset_class === "Commodity" && e.sub_class?.includes("Gold"));
  const intl = etfs.filter(e => e.asset_class === "International");
  const sectoral = etfs.filter(e => e.sub_class?.startsWith("Sectoral"));

  // simple heatmap by sub_class
  const heatmap = useMemo(() => {
    const groups: Record<string, any[]> = {};
    etfs.forEach(e => { (groups[e.sub_class || "Other"] ||= []).push(e); });
    return Object.entries(groups).map(([name, list]) => ({
      name,
      avg: list.reduce((s, e) => s + Number(e.return_1y), 0) / list.length,
      count: list.length,
    }));
  }, [etfs]);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>ETF Hub India — Best ETFs, Screener, Comparison | InvestingIQ</title>
        <meta name="description" content="Complete ETF research hub: trending ETFs, gold ETFs, sector ETFs, international ETFs. Screener, comparison and AI insights." />
        <link rel="canonical" href="https://www.investingiq.in/etfs" />
      </Helmet>
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-6 space-y-8">
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full mb-3"><Sparkles className="h-3 w-3" /> ETF Intelligence</div>
          <h1 className="text-3xl sm:text-5xl font-black mb-3">ETF Research Hub</h1>
          <p className="text-white/80 text-sm sm:text-base mb-6 max-w-2xl">Track 100+ ETFs across equity, gold, silver, sectoral and international categories with live data.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/etfs/screener" className="bg-white text-violet-700 font-semibold text-sm px-4 py-2.5 rounded-lg inline-flex items-center gap-2"><Filter className="h-4 w-4" /> ETF Screener</Link>
            <Link to="/etfs/compare" className="bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-lg inline-flex items-center gap-2"><GitCompare className="h-4 w-4" /> Compare ETFs</Link>
          </div>
        </div>

        <Section title="Trending ETFs"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{trending.map(e => <ETFCard key={e.id} etf={e} />)}</div></Section>
        <Section title="Top Performing ETFs (1Y)"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{topPerf.map(e => <ETFCard key={e.id} etf={e} />)}</div></Section>

        <div className="grid lg:grid-cols-2 gap-6">
          <Section title="Best Gold ETFs"><div className="space-y-2">{gold.map(e => <ETFCard key={e.id} etf={e} />)}</div></Section>
          <Section title="Best International ETFs"><div className="space-y-2">{intl.map(e => <ETFCard key={e.id} etf={e} />)}</div></Section>
        </div>

        <Section title="Best Sector ETFs"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{sectoral.map(e => <ETFCard key={e.id} etf={e} />)}</div></Section>

        <Section title="ETF Performance Heatmap" subtitle="Average 1Y return by category">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {heatmap.map(h => {
              const intensity = Math.min(Math.abs(h.avg) / 50, 1);
              const bg = h.avg >= 0 ? `rgba(16,185,129,${0.15 + intensity * 0.5})` : `rgba(239,68,68,${0.15 + intensity * 0.5})`;
              return (
                <div key={h.name} className="rounded-lg p-3 border border-border" style={{ background: bg }}>
                  <div className="font-semibold text-xs">{h.name}</div>
                  <div className={`text-lg font-black ${pctClass(h.avg)}`}>{fmtPct(h.avg, true)}</div>
                  <div className="text-[10px] text-muted-foreground">{h.count} ETFs</div>
                </div>
              );
            })}
          </div>
        </Section>

        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, subtitle, children }: any) {
  return <section><div className="mb-4"><div className="flex items-center gap-2"><div className="w-1 h-5 bg-violet-600 rounded-full" /><h2 className="text-xl sm:text-2xl font-black">{title}</h2></div>{subtitle && <p className="text-xs text-muted-foreground ml-3 mt-1">{subtitle}</p>}</div>{children}</section>;
}
