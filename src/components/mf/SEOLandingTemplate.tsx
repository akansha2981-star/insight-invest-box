import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";
import { Award, ChevronDown, Star } from "lucide-react";

interface Props {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  filterFn?: (f: any) => boolean;
  source?: "funds" | "etfs" | "compare";
  sortKey?: string;
  faqs: { q: string; a: string }[];
  compareTable?: { col1: string; col2: string; rows: [string, string, string][] };
}

export default function SEOLandingTemplate({ slug, title, h1, description, intro, filterFn, source = "funds", sortKey = "return_1y", faqs, compareTable }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (source === "compare") return;
    const table = source === "etfs" ? "mf_etfs" : "mf_funds";
    supabase.from(table).select("*").then(({ data }) => {
      let list = data ?? [];
      if (filterFn) list = list.filter(filterFn);
      list.sort((a: any, b: any) => Number(b[sortKey]) - Number(a[sortKey]));
      setItems(list.slice(0, 10));
    });
  }, [source, sortKey]);

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: h1, description, datePublished: new Date().toISOString(), author: { "@type": "Organization", name: "InvestingIQ" } },
      { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://www.investingiq.in/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(ld)}</script>
      </Helmet>
      <Header />
      <main className="max-w-[1000px] mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-8 mb-6">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs uppercase mb-3"><Award className="h-3 w-3" /> Research Guide · {new Date().getFullYear()}</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">{h1}</h1>
          <p className="text-white/85 text-sm sm:text-base">{description}</p>
        </div>

        <article className="bg-card border border-border rounded-2xl p-6 mb-6">
          <p className="text-base leading-relaxed text-foreground">{intro}</p>
        </article>

        {items.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-x-auto mb-6">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">#</th><th className="text-left p-3">{source === "etfs" ? "ETF" : "Fund"}</th><th className="text-right p-3">1Y</th><th className="text-right p-3">3Y</th><th className="text-right p-3">5Y</th><th className="text-right p-3">AUM</th>{source === "funds" && <th className="text-right p-3">Rating</th>}</tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-3"><Link to={source === "etfs" ? `/etfs/${it.slug}` : `/mutual-funds/${it.slug}`} className="font-semibold hover:text-primary">{it.scheme_name || it.name}</Link><div className="text-xs text-muted-foreground">{it.fund_house || it.issuer}</div></td>
                    <td className={`p-3 text-right font-semibold ${pctClass(it.return_1y)}`}>{fmtPct(it.return_1y)}</td>
                    <td className={`p-3 text-right font-semibold ${pctClass(it.return_3y)}`}>{fmtPct(it.return_3y)}</td>
                    <td className={`p-3 text-right font-semibold ${pctClass(it.return_5y)}`}>{fmtPct(it.return_5y)}</td>
                    <td className="p-3 text-right">{fmtCr(it.aum_cr)}</td>
                    {source === "funds" && <td className="p-3 text-right"><span className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-current" />{Number(it.rating).toFixed(1)}</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {compareTable && (
          <div className="bg-card border border-border rounded-2xl overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Aspect</th><th className="text-left p-3">{compareTable.col1}</th><th className="text-left p-3">{compareTable.col2}</th></tr></thead>
              <tbody>{compareTable.rows.map(([a, b, c]) => <tr key={a} className="border-t border-border"><td className="p-3 font-semibold">{a}</td><td className="p-3">{b}</td><td className="p-3">{c}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="border-b border-border pb-2 last:border-0">
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex justify-between items-center text-left py-2 font-semibold text-sm">{f.q}<ChevronDown className={`h-4 w-4 transition ${open === i ? 'rotate-180' : ''}`} /></button>
                {open === i && <p className="text-sm text-muted-foreground pb-2 leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
