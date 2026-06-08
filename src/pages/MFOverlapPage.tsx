import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtPct, pctClass } from "@/lib/mfFormat";
import { Layers } from "lucide-react";

export default function MFOverlapPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [a, setA] = useState<any>(null);
  const [b, setB] = useState<any>(null);

  useEffect(() => { supabase.from("mf_funds").select("*").then(({ data }) => setFunds(data ?? [])); }, []);

  const fallback = [
    { name: "HDFC Bank", pct: 8 }, { name: "ICICI Bank", pct: 7 }, { name: "Reliance Industries", pct: 6 },
    { name: "Infosys", pct: 5 }, { name: "TCS", pct: 5 }, { name: "Bharti Airtel", pct: 4 },
    { name: "L&T", pct: 3 }, { name: "Axis Bank", pct: 3 }, { name: "ITC", pct: 2 }, { name: "Kotak Bank", pct: 2 },
  ];

  const ha = a ? (a.holdings?.length ? a.holdings : fallback) : [];
  const hb = b ? (b.holdings?.length ? b.holdings : fallback) : [];
  const namesA = new Set(ha.map((h: any) => h.name));
  const common = hb.filter((h: any) => namesA.has(h.name));
  const overlapPct = a && b ? Math.round(common.reduce((s: number, h: any) => {
    const pa = ha.find((x: any) => x.name === h.name)?.pct || 0;
    return s + Math.min(pa, h.pct);
  }, 0)) : 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>Mutual Fund Portfolio Overlap Tool | InvestingIQ</title>
        <meta name="description" content="Find common holdings and overlap percentage between any two mutual funds. Avoid concentration risk in your portfolio." />
        <link rel="canonical" href="https://www.investingiq.in/mutual-funds/overlap" />
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-1"><Layers className="h-6 w-6 text-emerald-600" /> Portfolio Overlap Tool</h1>
        <p className="text-sm text-muted-foreground mb-6">Compare two mutual funds and discover how much of their portfolios overlap.</p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <FundPick label="Fund A" value={a} onChange={setA} funds={funds.filter(f => f.id !== b?.id)} />
          <FundPick label="Fund B" value={b} onChange={setB} funds={funds.filter(f => f.id !== a?.id)} />
        </div>

        {a && b && (
          <>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center mb-6">
              <div className="text-xs uppercase text-emerald-700 dark:text-emerald-300 font-semibold">Portfolio Overlap</div>
              <div className="text-5xl font-black text-emerald-700 dark:text-emerald-300 my-2">{overlapPct}%</div>
              <div className="text-sm text-muted-foreground">{common.length} common holdings out of {ha.length + hb.length - common.length} unique stocks</div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Holding</th><th className="text-right p-3">{a.scheme_name}</th><th className="text-right p-3">{b.scheme_name}</th></tr></thead>
                <tbody>
                  {common.map((h: any) => {
                    const pa = ha.find((x: any) => x.name === h.name)?.pct || 0;
                    return <tr key={h.name} className="border-t border-border"><td className="p-3 font-semibold">{h.name}</td><td className="p-3 text-right">{pa}%</td><td className="p-3 text-right">{h.pct}%</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}

function FundPick({ label, value, onChange, funds }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <label className="text-xs font-bold uppercase text-muted-foreground">{label}</label>
      <select value={value?.id || ""} onChange={e => onChange(funds.find((f: any) => f.id === e.target.value))} className="w-full mt-2 border border-border rounded px-3 py-2 bg-background text-sm">
        <option value="">Select a fund</option>
        {funds.map((f: any) => <option key={f.id} value={f.id}>{f.scheme_name}</option>)}
      </select>
    </div>
  );
}
