import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";
import { GitCompare, X, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function MFComparePage() {
  const [all, setAll] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => { supabase.from("mf_funds").select("*").then(({ data }) => setAll(data ?? [])); }, []);

  const add = (f: any) => { if (selected.length < 5 && !selected.find(s => s.id === f.id)) { setSelected([...selected, f]); setPicker(false); setQ(""); } };
  const remove = (id: string) => setSelected(selected.filter(s => s.id !== id));

  const chartData = ["return_1y", "return_3y", "return_5y", "sharpe", "expense_ratio"].map(k => {
    const row: any = { metric: ({ return_1y: "1Y%", return_3y: "3Y%", return_5y: "5Y%", sharpe: "Sharpe", expense_ratio: "Expense%" } as any)[k] };
    selected.forEach((s, i) => { row[s.scheme_name.slice(0, 15)] = Number(s[k]); });
    return row;
  });

  const filteredPick = all.filter(f => !selected.find(s => s.id === f.id) && (!q || f.scheme_name.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>Mutual Fund Compare Tool — Up to 5 Funds | InvestingIQ</title>
        <meta name="description" content="Compare up to 5 mutual funds side by side. Returns, risk, expense, fund manager, alpha, beta, Sharpe ratio and visual charts." />
        <link rel="canonical" href="https://www.investingiq.in/mutual-funds/compare" />
      </Helmet>
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-1"><GitCompare className="h-6 w-6 text-emerald-600" /> Compare Mutual Funds</h1>
        <p className="text-sm text-muted-foreground mb-6">Add up to 5 funds and compare returns, risk and cost in one view.</p>

        <div className="flex flex-wrap gap-3 mb-6">
          {selected.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
              <span className="font-semibold">{s.scheme_name}</span>
              <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ))}
          {selected.length < 5 && (
            <button onClick={() => setPicker(true)} className="border-2 border-dashed border-border hover:border-primary text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2"><Plus className="h-4 w-4" /> Add fund</button>
          )}
        </div>

        {picker && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search funds..." className="w-full border border-border rounded px-3 py-2 mb-3 bg-background" />
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {filteredPick.slice(0, 30).map(f => (
                <button key={f.id} onClick={() => add(f)} className="w-full text-left py-2 px-2 hover:bg-muted rounded text-sm flex justify-between">
                  <span><span className="font-semibold">{f.scheme_name}</span> <span className="text-xs text-muted-foreground">· {f.sub_category}</span></span>
                  <span className={`text-xs font-semibold ${pctClass(f.return_1y)}`}>{fmtPct(f.return_1y)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected.length >= 2 && (
          <>
            <div className="bg-card border border-border rounded-xl overflow-x-auto mb-6">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr><th className="text-left p-3">Metric</th>{selected.map(s => <th key={s.id} className="text-right p-3">{s.scheme_name}</th>)}</tr>
                </thead>
                <tbody>
                  {[
                    ["NAV", "nav", (v: any) => `₹${Number(v).toFixed(2)}`],
                    ["AUM", "aum_cr", fmtCr],
                    ["Expense %", "expense_ratio", (v: any) => `${Number(v).toFixed(2)}%`],
                    ["1Y Return", "return_1y", (v: any) => fmtPct(v, true)],
                    ["3Y CAGR", "return_3y", (v: any) => fmtPct(v, true)],
                    ["5Y CAGR", "return_5y", (v: any) => fmtPct(v, true)],
                    ["Alpha", "alpha", (v: any) => Number(v).toFixed(2)],
                    ["Beta", "beta", (v: any) => Number(v).toFixed(2)],
                    ["Sharpe", "sharpe", (v: any) => Number(v).toFixed(2)],
                    ["Sortino", "sortino", (v: any) => Number(v).toFixed(2)],
                    ["Rating", "rating", (v: any) => `${Number(v).toFixed(1)} ★`],
                    ["Manager", "fund_manager", (v: any) => v || "—"],
                    ["Risk", "risk_level", (v: any) => v],
                  ].map(([label, key, fmt]: any) => (
                    <tr key={label} className="border-t border-border">
                      <td className="p-3 text-muted-foreground">{label}</td>
                      {selected.map(s => <td key={s.id} className="p-3 text-right font-semibold">{fmt(s[key])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-bold mb-3 text-sm">Visual Comparison</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {selected.map((s, i) => <Bar key={s.id} dataKey={s.scheme_name.slice(0, 15)} fill={["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"][i]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {selected.length < 2 && <div className="text-center py-12 text-muted-foreground">Add at least 2 funds to compare.</div>}
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
