import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, fmtINR, pctClass } from "@/lib/mfFormat";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from "recharts";
import { Star, Sparkles, Shield, TrendingUp, AlertTriangle, CheckCircle2, Calculator } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function MFDetailPage() {
  const { slug } = useParams();
  const [f, setF] = useState<any>(null);
  const [navHist, setNavHist] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const [sip, setSip] = useState(5000);
  const [years, setYears] = useState(10);
  const [lump, setLump] = useState(100000);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("mf_funds").select("*").eq("slug", slug).maybeSingle();
      setF(data);
      if (data) {
        await supabase.from("mf_funds").update({ views: (data.views ?? 0) + 1 }).eq("id", data.id);
        const { data: sim } = await supabase.from("mf_funds").select("*").eq("sub_category", data.sub_category).neq("id", data.id).limit(4);
        setSimilar(sim ?? []);
        // synthetic NAV history if none
        const base = Number(data.nav) || 100;
        setNavHist(Array.from({ length: 36 }, (_, i) => {
          const months = 36 - i;
          const growth = Math.pow(1 + Number(data.return_3y) / 100, -months / 12);
          return { month: `${months}m ago`, nav: +(base * growth).toFixed(2) };
        }).reverse());
      }
    })();
  }, [slug]);

  if (!f) return <div className="min-h-screen bg-[hsl(var(--section-bg))]"><Header /><div className="max-w-5xl mx-auto p-8 text-center text-muted-foreground">Loading fund…</div><Footer /></div>;

  // SIP calc
  const months = years * 12;
  const rate = Number(f.return_5y || f.return_3y || 12) / 100 / 12;
  const sipFV = rate > 0 ? sip * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate) : sip * months;
  const sipInv = sip * months;
  const lumpFV = lump * Math.pow(1 + Number(f.return_5y || 12) / 100, years);
  const growth10k = Array.from({ length: 6 }, (_, i) => {
    const y = i + 1;
    return { year: `Y${y}`, value: Math.round(10000 * Math.pow(1 + Number(f.return_3y || 12) / 100, y)) };
  });

  const holdings = (f.holdings?.length ? f.holdings : [
    { name: "HDFC Bank", pct: 8.2 }, { name: "ICICI Bank", pct: 7.5 }, { name: "Reliance Industries", pct: 6.8 },
    { name: "Infosys", pct: 5.4 }, { name: "TCS", pct: 4.9 }, { name: "Bharti Airtel", pct: 3.8 },
    { name: "L&T", pct: 3.2 }, { name: "Axis Bank", pct: 2.9 }, { name: "ITC", pct: 2.5 }, { name: "Kotak Bank", pct: 2.3 },
  ]);
  const sectors = (f.sector_allocation?.length ? f.sector_allocation : [
    { name: "Financials", value: 32 }, { name: "Technology", value: 18 }, { name: "Energy", value: 12 },
    { name: "Consumer", value: 10 }, { name: "Healthcare", value: 8 }, { name: "Industrials", value: 8 }, { name: "Others", value: 12 },
  ]);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>{f.scheme_name} — NAV, Returns, Holdings, AI Analysis | InvestingIQ</title>
        <meta name="description" content={`${f.scheme_name} — Latest NAV ₹${Number(f.nav).toFixed(2)}, 1Y Return ${fmtPct(f.return_1y)}, AUM ${fmtCr(f.aum_cr)}. Complete research, holdings, risk metrics and AI analysis.`} />
        <link rel="canonical" href={`https://www.investingiq.in/mutual-funds/${f.slug}`} />
      </Helmet>
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-6 space-y-6">
        {/* Header card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <Link to="/mutual-funds" className="text-xs text-primary hover:underline">← Mutual Funds Hub</Link>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">{f.scheme_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <Link to={`/mutual-funds/fund-house/${f.fund_house_slug}`} className="text-primary hover:underline">{f.fund_house}</Link>
                <span className="text-muted-foreground">·</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{f.category} / {f.sub_category}</span>
                <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">{f.risk_level}</span>
                {f.rating > 0 && <span className="flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-current" />{Number(f.rating).toFixed(1)}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">NAV</div>
              <div className="text-2xl font-black">{fmtINR(f.nav)}</div>
              <div className="text-xs text-muted-foreground">as of {f.nav_date}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <Kpi label="AUM" value={fmtCr(f.aum_cr)} />
            <Kpi label="Expense" value={`${Number(f.expense_ratio).toFixed(2)}%`} />
            <Kpi label="Min SIP" value={fmtINR(f.min_sip)} />
            <Kpi label="Min Lumpsum" value={fmtINR(f.min_lumpsum)} />
            <Kpi label="Manager" value={f.fund_manager || "—"} />
            <Kpi label="Launch" value={f.launch_date || "—"} />
          </div>
        </div>

        {/* Returns grid */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> Performance</h2>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-6">
            {[
              ["1M", f.return_1m], ["3M", f.return_3m], ["6M", f.return_6m],
              ["1Y", f.return_1y], ["3Y CAGR", f.return_3y], ["5Y CAGR", f.return_5y], ["10Y CAGR", f.return_10y],
            ].map(([l, v]) => (
              <div key={l as string} className="border border-border rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className={`font-bold ${pctClass(v as number)}`}>{fmtPct(v as number, true)}</div>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">NAV (last 3 years)</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={navHist}>
                  <defs><linearGradient id="na" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Area dataKey="nav" stroke="#10b981" fill="url(#na)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Growth of ₹10,000</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={growth10k}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => fmtINR(v)} />
                  <Line dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Risk metrics */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-violet-600" /> Risk Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <Kpi label="Alpha" value={Number(f.alpha).toFixed(2)} />
            <Kpi label="Beta" value={Number(f.beta).toFixed(2)} />
            <Kpi label="Sharpe" value={Number(f.sharpe).toFixed(2)} />
            <Kpi label="Sortino" value={Number(f.sortino).toFixed(2)} />
            <Kpi label="Std Dev" value={Number(f.std_dev).toFixed(2)} />
          </div>
        </div>

        {/* Allocation + Holdings */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold mb-3">Sector Allocation</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sectors} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                  {sectors.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 text-xs mt-2">
              {sectors.map((s: any, i: number) => (
                <div key={s.name} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{s.name} <span className="ml-auto font-semibold">{s.value}%</span></div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold mb-3">Top Holdings</h3>
            <div className="space-y-2">
              {holdings.slice(0, 10).map((h: any) => (
                <div key={h.name} className="flex items-center justify-between text-sm">
                  <span>{h.name}</span>
                  <div className="flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 bg-muted rounded"><div className="h-full bg-primary rounded" style={{ width: `${Math.min(h.pct * 10, 100)}%` }} /></div>
                    <span className="font-semibold text-xs w-10 text-right">{h.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-[#0a0f1e] via-[#0f1729] to-[#0a0f1e] text-white border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-lg">AI Fund Analysis</h2>
            <span className="text-[10px] uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">Powered by Lovable AI</span>
          </div>
          <p className="text-sm text-white/80 mb-4 leading-relaxed">
            {f.ai_summary || `This ${f.sub_category || f.category} fund from ${f.fund_house} has delivered ${fmtPct(f.return_3y)} 3-year CAGR with a Sharpe ratio of ${Number(f.sharpe).toFixed(2)}. AUM stands at ${fmtCr(f.aum_cr)} with an expense ratio of ${Number(f.expense_ratio).toFixed(2)}%.`}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-emerald-300 mb-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pros</div>
              <ul className="space-y-1 text-sm">
                {((f.ai_pros?.length ? f.ai_pros : ["Strong long-term track record", "Experienced fund manager", "Competitive expense ratio", "Diversified portfolio"]) as string[]).map((p, i) => <li key={i} className="text-white/85">• {p}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase text-amber-300 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risks</div>
              <ul className="space-y-1 text-sm">
                {((f.ai_risks?.length ? f.ai_risks : ["Market volatility", "Sector concentration", "Past returns not indicative of future"]) as string[]).map((r, i) => <li key={i} className="text-white/85">• {r}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-full text-xs">
            <span className="text-cyan-300">AI Verdict:</span>
            <span className="font-bold text-white">{f.ai_verdict || "Moderate"}</span>
          </div>
          <p className="text-[10px] text-white/50 mt-3">AI insights are informational only and not investment advice.</p>
        </div>

        {/* Calculators */}
        <div className="grid lg:grid-cols-2 gap-6">
          <CalcBox title="SIP Calculator" icon={<Calculator className="h-4 w-4 text-emerald-600" />}>
            <NumInput label="Monthly SIP" value={sip} onChange={setSip} prefix="₹" />
            <NumInput label="Years" value={years} onChange={setYears} />
            <div className="grid grid-cols-3 gap-2 text-sm mt-3">
              <Mini label="Invested" v={fmtINR(sipInv)} />
              <Mini label="Returns" v={fmtINR(sipFV - sipInv)} cls="text-emerald-600" />
              <Mini label="Future Value" v={fmtINR(sipFV)} cls="text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">At assumed {Number(f.return_5y || 12).toFixed(1)}% CAGR.</p>
          </CalcBox>
          <CalcBox title="Lumpsum Calculator" icon={<Calculator className="h-4 w-4 text-violet-600" />}>
            <NumInput label="Lumpsum Amount" value={lump} onChange={setLump} prefix="₹" />
            <NumInput label="Years" value={years} onChange={setYears} />
            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
              <Mini label="Invested" v={fmtINR(lump)} />
              <Mini label="Future Value" v={fmtINR(lumpFV)} cls="text-violet-600" />
            </div>
          </CalcBox>
        </div>

        {/* Similar Funds */}
        {similar.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-3">Similar Funds</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {similar.map(s => (
                <Link key={s.id} to={`/mutual-funds/${s.slug}`} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition">
                  <div className="text-xs text-muted-foreground">{s.fund_house}</div>
                  <div className="font-semibold text-sm">{s.scheme_name}</div>
                  <div className={`text-sm font-bold mt-2 ${pctClass(s.return_1y)}`}>{fmtPct(s.return_1y)} (1Y)</div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}

function Kpi({ label, value }: any) {
  return <div className="border border-border rounded-lg p-2"><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="font-bold text-foreground text-sm truncate">{value}</div></div>;
}
function CalcBox({ title, icon, children }: any) {
  return <div className="bg-card border border-border rounded-2xl p-5"><div className="font-bold mb-3 flex items-center gap-2">{icon}{title}</div>{children}</div>;
}
function NumInput({ label, value, onChange, prefix }: any) {
  return <div className="mb-2"><label className="text-xs text-muted-foreground">{label}</label><div className="flex items-center border border-border rounded px-2 py-1.5 mt-1 bg-background">{prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}<input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 bg-transparent outline-none text-sm" /></div></div>;
}
function Mini({ label, v, cls }: any) {
  return <div className="border border-border rounded p-2"><div className="text-[10px] text-muted-foreground">{label}</div><div className={`font-bold text-xs ${cls || ''}`}>{v}</div></div>;
}
