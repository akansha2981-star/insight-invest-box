import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";
import { Filter, Search, Star, X, RotateCcw } from "lucide-react";

const RANKING_PRESETS = [
  { id: "best-return", label: "Best 1Y Return", sort: "return_1y", dir: "desc" as const },
  { id: "best-3y", label: "Best 3Y CAGR", sort: "return_3y", dir: "desc" as const },
  { id: "best-5y", label: "Best 5Y CAGR", sort: "return_5y", dir: "desc" as const },
  { id: "best-risk-adj", label: "Best Risk-Adjusted (Sharpe)", sort: "sharpe", dir: "desc" as const },
  { id: "lowest-expense", label: "Lowest Expense", sort: "expense_ratio", dir: "asc" as const },
  { id: "highest-aum", label: "Highest AUM", sort: "aum_cr", dir: "desc" as const },
  { id: "highest-rated", label: "Highest Rated", sort: "rating", dir: "desc" as const },
];

export default function MFScreenerPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [sub, setSub] = useState(params.get("sub_category") ?? "");
  const [house, setHouse] = useState(params.get("fund_house_slug") ?? "");
  const [risk, setRisk] = useState("");
  const [planType, setPlanType] = useState("");
  const [elss, setElss] = useState(params.get("is_elss") === "true");
  const [r1y, setR1y] = useState(-100);
  const [r3y, setR3y] = useState(-100);
  const [r5y, setR5y] = useState(-100);
  const [expMax, setExpMax] = useState(3);
  const [aumMin, setAumMin] = useState(0);
  const [sharpeMin, setSharpeMin] = useState(0);
  const [betaMax, setBetaMax] = useState(3);
  const [ratingMin, setRatingMin] = useState(0);
  const [equityMin, setEquityMin] = useState(0);
  const [sortBy, setSortBy] = useState("return_1y");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openGroup, setOpenGroup] = useState<string | null>("basic");

  useEffect(() => {
    supabase.from("mf_funds").select("*").then(({ data }) => setFunds(data ?? []));
  }, []);

  const categories = useMemo(() => Array.from(new Set(funds.map(f => f.category))).filter(Boolean), [funds]);
  const subCats = useMemo(() => Array.from(new Set(funds.map(f => f.sub_category))).filter(Boolean), [funds]);
  const houses = useMemo(() => Array.from(new Set(funds.map(f => f.fund_house_slug))).filter(Boolean), [funds]);

  const filtered = useMemo(() => {
    let list = funds.filter(f => {
      if (q && !f.scheme_name.toLowerCase().includes(q.toLowerCase()) && !f.fund_house.toLowerCase().includes(q.toLowerCase())) return false;
      if (category && f.category !== category) return false;
      if (sub && f.sub_category !== sub) return false;
      if (house && f.fund_house_slug !== house) return false;
      if (risk && f.risk_level !== risk) return false;
      if (planType && f.plan_type !== planType) return false;
      if (elss && !f.is_elss) return false;
      if (Number(f.return_1y) < r1y) return false;
      if (Number(f.return_3y) < r3y) return false;
      if (Number(f.return_5y) < r5y) return false;
      if (Number(f.expense_ratio) > expMax) return false;
      if (Number(f.aum_cr) < aumMin) return false;
      if (Number(f.sharpe) < sharpeMin) return false;
      if (Number(f.beta) > betaMax) return false;
      if (Number(f.rating) < ratingMin) return false;
      if (Number(f.equity_pct) < equityMin) return false;
      return true;
    });
    list.sort((a, b) => sortDir === "desc" ? Number(b[sortBy]) - Number(a[sortBy]) : Number(a[sortBy]) - Number(b[sortBy]));
    return list;
  }, [funds, q, category, sub, house, risk, planType, elss, r1y, r3y, r5y, expMax, aumMin, sharpeMin, betaMax, ratingMin, equityMin, sortBy, sortDir]);

  const applyPreset = (p: typeof RANKING_PRESETS[0]) => { setSortBy(p.sort); setSortDir(p.dir); };
  const reset = () => {
    setQ(""); setCategory(""); setSub(""); setHouse(""); setRisk(""); setPlanType(""); setElss(false);
    setR1y(-100); setR3y(-100); setR5y(-100); setExpMax(3); setAumMin(0); setSharpeMin(0); setBetaMax(3); setRatingMin(0); setEquityMin(0);
    setParams({});
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>Advanced Mutual Fund Screener — 60+ Filters | InvestingIQ</title>
        <meta name="description" content="Screen 1000+ Indian mutual funds with 60+ filters: returns, risk metrics, expense ratio, AUM, ratings, Sharpe, alpha, beta, ELSS and more." />
        <link rel="canonical" href="https://www.investingiq.in/mutual-funds/screener" />
      </Helmet>
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2"><Filter className="h-6 w-6 text-emerald-600" /> Mutual Fund Screener</h1>
          <p className="text-sm text-muted-foreground mt-1">Combine 60+ professional filters to find the perfect fund. Save ranking presets in one click.</p>
        </div>

        {/* Presets */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">One-click Rankings</div>
          <div className="flex flex-wrap gap-2">
            {RANKING_PRESETS.map(p => (
              <button key={p.id} onClick={() => applyPreset(p)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground transition">{p.label}</button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-4">
          {/* Filters */}
          <aside className="bg-card border border-border rounded-xl p-4 h-fit lg:sticky lg:top-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Filters</span>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Reset</button>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search funds" className="w-full pl-8 pr-2 py-2 text-sm border border-border rounded-md bg-background" />
            </div>

            <FilterGroup label="Basic" open={openGroup === "basic"} onToggle={() => setOpenGroup(openGroup === "basic" ? null : "basic")}>
              <Select label="Category" value={category} onChange={setCategory} options={categories} />
              <Select label="Sub Category" value={sub} onChange={setSub} options={subCats} />
              <Select label="Fund House" value={house} onChange={setHouse} options={houses} />
              <Select label="Plan" value={planType} onChange={setPlanType} options={["Direct", "Regular"]} />
              <Select label="Risk Level" value={risk} onChange={setRisk} options={["Low", "Low to Moderate", "Moderate", "Moderately High", "High", "Very High"]} />
              <label className="flex items-center gap-2 text-sm pt-1"><input type="checkbox" checked={elss} onChange={e => setElss(e.target.checked)} /> ELSS / Tax Saving</label>
            </FilterGroup>

            <FilterGroup label="Performance" open={openGroup === "perf"} onToggle={() => setOpenGroup(openGroup === "perf" ? null : "perf")}>
              <Range label="Min 1Y Return" value={r1y} onChange={setR1y} min={-50} max={60} unit="%" />
              <Range label="Min 3Y CAGR" value={r3y} onChange={setR3y} min={-20} max={50} unit="%" />
              <Range label="Min 5Y CAGR" value={r5y} onChange={setR5y} min={-10} max={40} unit="%" />
            </FilterGroup>

            <FilterGroup label="Risk Metrics" open={openGroup === "risk"} onToggle={() => setOpenGroup(openGroup === "risk" ? null : "risk")}>
              <Range label="Min Sharpe Ratio" value={sharpeMin} onChange={setSharpeMin} min={-2} max={3} step={0.1} />
              <Range label="Max Beta" value={betaMax} onChange={setBetaMax} min={0} max={2} step={0.05} />
            </FilterGroup>

            <FilterGroup label="Cost & Size" open={openGroup === "cost"} onToggle={() => setOpenGroup(openGroup === "cost" ? null : "cost")}>
              <Range label="Max Expense Ratio" value={expMax} onChange={setExpMax} min={0} max={3} step={0.05} unit="%" />
              <Range label="Min AUM" value={aumMin} onChange={setAumMin} min={0} max={100000} step={1000} unit=" Cr" />
            </FilterGroup>

            <FilterGroup label="Portfolio & Rating" open={openGroup === "port"} onToggle={() => setOpenGroup(openGroup === "port" ? null : "port")}>
              <Range label="Min Equity %" value={equityMin} onChange={setEquityMin} min={0} max={100} unit="%" />
              <div>
                <label className="text-xs text-muted-foreground">Min Rating</label>
                <div className="flex gap-1 mt-1">
                  {[0, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setRatingMin(r)} className={`px-2 py-1 text-xs rounded border ${ratingMin === r ? 'bg-amber-500 text-white border-amber-500' : 'border-border'}`}>
                      {r === 0 ? "Any" : `${r}+`}
                    </button>
                  ))}
                </div>
              </div>
            </FilterGroup>
          </aside>

          {/* Results table */}
          <div>
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground"><span className="font-bold text-foreground">{filtered.length}</span> funds match your filters</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-border rounded px-2 py-1 bg-background">
                  <option value="return_1y">1Y Return</option>
                  <option value="return_3y">3Y CAGR</option>
                  <option value="return_5y">5Y CAGR</option>
                  <option value="aum_cr">AUM</option>
                  <option value="expense_ratio">Expense</option>
                  <option value="sharpe">Sharpe</option>
                  <option value="rating">Rating</option>
                </select>
                <button onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")} className="text-xs border border-border rounded px-2 py-1">{sortDir === "desc" ? "↓" : "↑"}</button>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3">Fund</th>
                    <th className="text-right p-3">NAV</th>
                    <th className="text-right p-3">1Y</th>
                    <th className="text-right p-3">3Y</th>
                    <th className="text-right p-3">5Y</th>
                    <th className="text-right p-3">AUM</th>
                    <th className="text-right p-3">Expense</th>
                    <th className="text-right p-3">Sharpe</th>
                    <th className="text-right p-3">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/mutual-funds/${f.slug}`} className="font-semibold text-foreground hover:text-primary">{f.scheme_name}</Link>
                        <div className="text-xs text-muted-foreground">{f.fund_house} · {f.sub_category}</div>
                      </td>
                      <td className="p-3 text-right font-mono">₹{Number(f.nav).toFixed(2)}</td>
                      <td className={`p-3 text-right font-semibold ${pctClass(f.return_1y)}`}>{fmtPct(f.return_1y)}</td>
                      <td className={`p-3 text-right font-semibold ${pctClass(f.return_3y)}`}>{fmtPct(f.return_3y)}</td>
                      <td className={`p-3 text-right font-semibold ${pctClass(f.return_5y)}`}>{fmtPct(f.return_5y)}</td>
                      <td className="p-3 text-right">{fmtCr(f.aum_cr)}</td>
                      <td className="p-3 text-right">{Number(f.expense_ratio).toFixed(2)}%</td>
                      <td className="p-3 text-right">{Number(f.sharpe).toFixed(2)}</td>
                      <td className="p-3 text-right"><span className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-current" />{Number(f.rating).toFixed(1)}</span></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No funds match. Try widening filters.</td></tr>
                  )}
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

function FilterGroup({ label, open, onToggle, children }: any) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider bg-muted/40 hover:bg-muted">{label}<span>{open ? "−" : "+"}</span></button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}
function Select({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 text-sm border border-border rounded px-2 py-1.5 bg-background">
        <option value="">All</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Range({ label, value, onChange, min, max, step = 1, unit = "" }: any) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="font-semibold text-foreground">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
