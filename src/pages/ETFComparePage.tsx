import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";
import { GitCompare, X, Plus } from "lucide-react";

export default function ETFComparePage() {
  const [all, setAll] = useState<any[]>([]);
  const [sel, setSel] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(false);
  useEffect(() => { supabase.from("mf_etfs").select("*").then(({ data }) => setAll(data ?? [])); }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>ETF Compare Tool | InvestingIQ</title>
        <meta name="description" content="Compare ETFs side by side: tracking error, expense, AUM, returns and liquidity." />
        <link rel="canonical" href="https://www.investingiq.in/etfs/compare" />
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-1"><GitCompare className="h-6 w-6 text-violet-600" /> Compare ETFs</h1>
        <p className="text-sm text-muted-foreground mb-6">Side-by-side metrics for up to 5 ETFs.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {sel.map(s => <div key={s.id} className="bg-card border border-border rounded-xl px-3 py-2 text-sm flex items-center gap-2"><span className="font-semibold">{s.name}</span><button onClick={() => setSel(sel.filter(x => x.id !== s.id))}><X className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button></div>)}
          {sel.length < 5 && <button onClick={() => setPick(true)} className="border-2 border-dashed border-border hover:border-violet-500 text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2"><Plus className="h-4 w-4" /> Add ETF</button>}
        </div>
        {pick && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ETFs..." className="w-full border border-border rounded px-3 py-2 mb-3 bg-background" autoFocus />
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {all.filter(e => !sel.find(s => s.id === e.id) && (!q || e.name.toLowerCase().includes(q.toLowerCase()))).slice(0, 30).map(e => (
                <button key={e.id} onClick={() => { setSel([...sel, e]); setPick(false); setQ(""); }} className="w-full text-left py-2 px-2 hover:bg-muted rounded text-sm">{e.name} <span className="text-xs text-muted-foreground">· {e.symbol}</span></button>
              ))}
            </div>
          </div>
        )}
        {sel.length >= 2 && (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Metric</th>{sel.map(s => <th key={s.id} className="text-right p-3">{s.symbol}</th>)}</tr></thead>
              <tbody>
                {[["LTP", "ltp", (v: any) => `₹${Number(v).toFixed(2)}`], ["NAV", "nav", (v: any) => `₹${Number(v).toFixed(2)}`], ["AUM", "aum_cr", fmtCr], ["Expense", "expense_ratio", (v: any) => `${Number(v).toFixed(2)}%`], ["Tracking Err", "tracking_error", (v: any) => `${Number(v).toFixed(2)}%`], ["1Y Return", "return_1y", (v: any) => fmtPct(v, true)], ["3Y Return", "return_3y", (v: any) => fmtPct(v, true)], ["Benchmark", "benchmark", (v: any) => v]].map(([l, k, f]: any) => (
                  <tr key={l} className="border-t border-border"><td className="p-3 text-muted-foreground">{l}</td>{sel.map(s => <td key={s.id} className="p-3 text-right font-semibold">{f(s[k])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
