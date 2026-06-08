import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";
import { Filter, Search } from "lucide-react";

export default function ETFScreenerPage() {
  const [etfs, setEtfs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [assetClass, setAssetClass] = useState("");
  const [issuer, setIssuer] = useState("");
  const [minAum, setMinAum] = useState(0);
  const [maxExp, setMaxExp] = useState(2);
  const [maxTE, setMaxTE] = useState(2);
  const [sortBy, setSortBy] = useState("return_1y");

  useEffect(() => { supabase.from("mf_etfs").select("*").then(({ data }) => setEtfs(data ?? [])); }, []);

  const classes = Array.from(new Set(etfs.map(e => e.asset_class)));
  const issuers = Array.from(new Set(etfs.map(e => e.issuer)));

  const filtered = useMemo(() => etfs.filter(e =>
    (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.symbol.toLowerCase().includes(q.toLowerCase())) &&
    (!assetClass || e.asset_class === assetClass) &&
    (!issuer || e.issuer === issuer) &&
    Number(e.aum_cr) >= minAum && Number(e.expense_ratio) <= maxExp && Number(e.tracking_error) <= maxTE
  ).sort((a, b) => Number(b[sortBy]) - Number(a[sortBy])), [etfs, q, assetClass, issuer, minAum, maxExp, maxTE, sortBy]);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>ETF Screener — Filter by Tracking Error, AUM, Liquidity | InvestingIQ</title>
        <meta name="description" content="Screen Indian ETFs by asset class, expense ratio, tracking error, AUM, liquidity and returns." />
        <link rel="canonical" href="https://www.investingiq.in/etfs/screener" />
      </Helmet>
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-1"><Filter className="h-6 w-6 text-violet-600" /> ETF Screener</h1>
        <p className="text-sm text-muted-foreground mb-6">Filter ETFs by asset class, tracking error, expense ratio, AUM and liquidity.</p>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          <aside className="bg-card border border-border rounded-xl p-4 space-y-4 h-fit lg:sticky lg:top-4">
            <div className="relative"><Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search ETF" className="w-full pl-8 pr-2 py-2 text-sm border border-border rounded bg-background" /></div>
            <Sel label="Asset Class" value={assetClass} onChange={setAssetClass} options={classes} />
            <Sel label="Issuer" value={issuer} onChange={setIssuer} options={issuers} />
            <Range label="Min AUM (₹ Cr)" value={minAum} onChange={setMinAum} min={0} max={100000} step={500} />
            <Range label="Max Expense %" value={maxExp} onChange={setMaxExp} min={0} max={2} step={0.05} />
            <Range label="Max Tracking Error %" value={maxTE} onChange={setMaxTE} min={0} max={2} step={0.05} />
          </aside>
          <div>
            <div className="flex items-center justify-between mb-3 text-sm">
              <span><span className="font-bold">{filtered.length}</span> ETFs match</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
                <option value="return_1y">1Y Return</option><option value="aum_cr">AUM</option><option value="avg_volume">Volume</option>
              </select>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">ETF</th><th className="text-right p-3">LTP</th><th className="text-right p-3">1Y</th><th className="text-right p-3">3Y</th><th className="text-right p-3">AUM</th><th className="text-right p-3">Expense</th><th className="text-right p-3">TE</th><th className="text-right p-3">Volume</th></tr></thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3"><Link to={`/etfs/${e.slug}`} className="font-semibold hover:text-primary">{e.name}</Link><div className="text-xs text-muted-foreground">{e.symbol} · {e.benchmark}</div></td>
                      <td className="p-3 text-right font-mono">₹{Number(e.ltp).toFixed(2)}</td>
                      <td className={`p-3 text-right font-semibold ${pctClass(e.return_1y)}`}>{fmtPct(e.return_1y)}</td>
                      <td className={`p-3 text-right font-semibold ${pctClass(e.return_3y)}`}>{fmtPct(e.return_3y)}</td>
                      <td className="p-3 text-right">{fmtCr(e.aum_cr)}</td>
                      <td className="p-3 text-right">{Number(e.expense_ratio).toFixed(2)}%</td>
                      <td className="p-3 text-right">{Number(e.tracking_error).toFixed(2)}%</td>
                      <td className="p-3 text-right">{Number(e.avg_volume).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
function Sel({ label, value, onChange, options }: any) { return <div><label className="text-xs text-muted-foreground">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 text-sm border border-border rounded px-2 py-1.5 bg-background"><option value="">All</option>{options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select></div>; }
function Range({ label, value, onChange, min, max, step = 1 }: any) { return <div><div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-semibold text-foreground">{value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" /></div>; }
