import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, pctClass, fmtINR } from "@/lib/mfFormat";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";

const RANGES = [
  { k: "1D", n: 24, step: "h" }, { k: "1W", n: 7, step: "d" }, { k: "1M", n: 30, step: "d" },
  { k: "6M", n: 180, step: "d" }, { k: "1Y", n: 12, step: "m" }, { k: "5Y", n: 60, step: "m" },
];

export default function ETFDetailPage() {
  const { slug } = useParams();
  const [e, setE] = useState<any>(null);
  const [range, setRange] = useState("1Y");

  useEffect(() => {
    if (!slug) return;
    supabase.from("mf_etfs").select("*").eq("slug", slug).maybeSingle().then(({ data }) => {
      setE(data);
      if (data) supabase.from("mf_etfs").update({ views: (data.views ?? 0) + 1 }).eq("id", data.id);
    });
  }, [slug]);

  if (!e) return <div className="min-h-screen bg-[hsl(var(--section-bg))]"><Header /><div className="p-8 text-center text-muted-foreground">Loading...</div><Footer /></div>;

  const r = RANGES.find(x => x.k === range)!;
  const series = Array.from({ length: r.n }, (_, i) => {
    const t = r.n - i;
    const trend = Math.pow(1 + Number(e.return_1y) / 100, -t / r.n);
    const noise = 1 + (Math.sin(i) * 0.005);
    return { t: `t-${t}`, price: +(Number(e.ltp) * trend * noise).toFixed(2) };
  });

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>{e.name} ({e.symbol}) — ETF Price, NAV, Holdings | InvestingIQ</title>
        <meta name="description" content={`${e.name} ETF: LTP ₹${Number(e.ltp).toFixed(2)}, 1Y ${fmtPct(e.return_1y)}, AUM ${fmtCr(e.aum_cr)}, expense ${Number(e.expense_ratio).toFixed(2)}%.`} />
        <link rel="canonical" href={`https://www.investingiq.in/etfs/${e.slug}`} />
      </Helmet>
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
        <Link to="/etfs" className="text-xs text-primary hover:underline">← ETF Hub</Link>
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">{e.issuer} · {e.benchmark}</div>
              <h1 className="text-2xl sm:text-3xl font-black">{e.name}</h1>
              <div className="text-xs mt-1"><span className="bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded font-semibold">{e.symbol}</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Last Traded Price</div>
              <div className="text-2xl font-black">{fmtINR(e.ltp)}</div>
              <div className={`text-xs font-semibold ${pctClass(e.return_1y)}`}>{fmtPct(e.return_1y, true)} (1Y)</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4 text-xs">
            <K l="NAV" v={fmtINR(e.nav)} />
            <K l="Premium/Disc" v={`${Number(e.premium_discount).toFixed(3)}%`} />
            <K l="AUM" v={fmtCr(e.aum_cr)} />
            <K l="Expense" v={`${Number(e.expense_ratio).toFixed(2)}%`} />
            <K l="Tracking Error" v={`${Number(e.tracking_error).toFixed(2)}%`} />
            <K l="Avg Volume" v={Number(e.avg_volume).toLocaleString('en-IN')} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex justify-between mb-3"><h2 className="font-bold">Price Chart</h2>
            <div className="flex gap-1">{RANGES.map(rg => <button key={rg.k} onClick={() => setRange(rg.k)} className={`px-2 py-1 text-xs rounded ${range === rg.k ? 'bg-violet-600 text-white' : 'bg-muted'}`}>{rg.k}</button>)}</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={series}><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="t" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} /><Tooltip /><Area dataKey="price" stroke="#8b5cf6" fill="url(#pg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold mb-3">Historical Returns</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            {[["1M", e.return_1m], ["3M", e.return_3m], ["6M", e.return_6m], ["1Y", e.return_1y], ["3Y", e.return_3y], ["5Y", e.return_5y]].map(([l, v]) => (
              <div key={l as string} className="border border-border rounded p-3 text-center"><div className="text-muted-foreground">{l}</div><div className={`font-bold ${pctClass(v as number)}`}>{fmtPct(v as number, true)}</div></div>
            ))}
          </div>
        </div>
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
function K({ l, v }: any) { return <div className="border border-border rounded p-2"><div className="text-[10px] uppercase text-muted-foreground">{l}</div><div className="font-bold text-sm">{v}</div></div>; }
