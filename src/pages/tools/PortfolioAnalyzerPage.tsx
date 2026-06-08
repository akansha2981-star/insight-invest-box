import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR, fmtPct, pctClass } from "@/lib/mfFormat";
import { Briefcase, Plus, Trash2 } from "lucide-react";

interface Holding { fundId: string; units: number; buyPrice: number; }

export default function PortfolioAnalyzerPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([{ fundId: "", units: 0, buyPrice: 0 }]);
  useEffect(() => { supabase.from("mf_funds").select("*").then(({ data }) => setFunds(data ?? [])); }, []);

  const rows = useMemo(() => holdings.map(h => {
    const f = funds.find(x => x.id === h.fundId);
    if (!f) return null;
    const curVal = h.units * Number(f.nav);
    const invested = h.units * h.buyPrice;
    const gain = curVal - invested;
    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
    return { ...h, fund: f, curVal, invested, gain, gainPct };
  }).filter(Boolean) as any[], [holdings, funds]);

  const totals = rows.reduce((s, r) => ({ inv: s.inv + r.invested, cur: s.cur + r.curVal }), { inv: 0, cur: 0 });
  const totalGain = totals.cur - totals.inv;

  // diversification = unique categories / total
  const cats = new Set(rows.map(r => r.fund.sub_category));
  const diversification = rows.length > 0 ? Math.min(Math.round((cats.size / rows.length) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>Mutual Fund Portfolio Analyzer | InvestingIQ</title>
        <meta name="description" content="Analyze your mutual fund portfolio. Track current value, gains, CAGR and diversification." />
        <link rel="canonical" href="https://www.investingiq.in/tools/portfolio-analyzer" />
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-6"><Briefcase className="h-6 w-6 text-primary" /> Portfolio Analyzer</h1>

        {rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Box l="Total Invested" v={fmtINR(totals.inv)} />
            <Box l="Current Value" v={fmtINR(totals.cur)} accent="text-primary" />
            <Box l="Total Gain/Loss" v={fmtINR(totalGain)} accent={pctClass(totalGain)} />
            <Box l="Diversification" v={`${diversification}%`} />
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="space-y-3">
            {holdings.map((h, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_40px] gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Fund</label>
                  <select value={h.fundId} onChange={e => { const c = [...holdings]; c[i].fundId = e.target.value; setHoldings(c); }} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background mt-1">
                    <option value="">Select fund</option>
                    {funds.map(f => <option key={f.id} value={f.id}>{f.scheme_name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Units</label><input type="number" value={h.units} onChange={e => { const c = [...holdings]; c[i].units = Number(e.target.value); setHoldings(c); }} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background mt-1" /></div>
                <div><label className="text-xs text-muted-foreground">Buy Price (NAV)</label><input type="number" value={h.buyPrice} onChange={e => { const c = [...holdings]; c[i].buyPrice = Number(e.target.value); setHoldings(c); }} className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background mt-1" /></div>
                <button onClick={() => setHoldings(holdings.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setHoldings([...holdings, { fundId: "", units: 0, buyPrice: 0 }])} className="mt-3 text-sm text-primary flex items-center gap-1 hover:underline"><Plus className="h-4 w-4" /> Add holding</button>
        </div>

        {rows.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Fund</th><th className="text-right p-3">Units</th><th className="text-right p-3">Invested</th><th className="text-right p-3">Current</th><th className="text-right p-3">Gain</th><th className="text-right p-3">Gain%</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3 font-semibold">{r.fund.scheme_name}</td>
                    <td className="p-3 text-right">{r.units}</td>
                    <td className="p-3 text-right">{fmtINR(r.invested)}</td>
                    <td className="p-3 text-right font-semibold">{fmtINR(r.curVal)}</td>
                    <td className={`p-3 text-right font-bold ${pctClass(r.gain)}`}>{fmtINR(r.gain)}</td>
                    <td className={`p-3 text-right font-bold ${pctClass(r.gainPct)}`}>{fmtPct(r.gainPct, true)}</td>
                  </tr>
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
function Box({ l, v, accent }: any) { return <div className="bg-card border border-border rounded-xl p-4"><div className="text-xs text-muted-foreground">{l}</div><div className={`text-xl font-black mt-1 ${accent || ''}`}>{v}</div></div>; }
