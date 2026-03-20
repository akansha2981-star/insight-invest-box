import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PieChart as PieChartIcon, Plus, Trash2, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Holding {
  id: number; name: string; invested: number; current: number;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--gain))", "hsl(var(--gold))",
  "hsl(var(--loss))", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"
];

export default function PortfolioTesterPage() {
  const [holdings, setHoldings] = useState<Holding[]>([
    { id: 1, name: "RELIANCE", invested: 150000, current: 168000 },
    { id: 2, name: "HDFCBANK", invested: 200000, current: 232000 },
    { id: 3, name: "TCS", invested: 100000, current: 94000 },
    { id: 4, name: "INFY", invested: 80000, current: 88000 },
  ]);
  const [nextId, setNextId] = useState(5);

  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.current, 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  function addHolding() {
    setHoldings(prev => [...prev, { id: nextId, name: "", invested: 0, current: 0 }]);
    setNextId(n => n + 1);
  }

  function updateHolding(id: number, field: keyof Holding, value: string | number) {
    setHoldings(prev => prev.map(h => h.id === id ? { ...h, [field]: field === "name" ? value : Number(value) } : h));
  }

  function removeHolding(id: number) {
    setHoldings(prev => prev.filter(h => h.id !== id));
  }

  const pieData = holdings.filter(h => h.current > 0).map(h => ({ name: h.name || "Unknown", value: h.current }));
  const barData = holdings.filter(h => h.name).map(h => ({
    name: h.name, invested: h.invested, current: h.current,
    return: ((h.current - h.invested) / (h.invested || 1) * 100).toFixed(1),
  }));

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <PieChartIcon className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Portfolio Tester</h1>
            <p className="text-sm text-muted-foreground">Analyze your portfolio allocation and returns</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Invested", value: totalInvested, color: "text-foreground" },
            { label: "Current Value", value: totalCurrent, color: "text-primary" },
            { label: "Total Returns", value: totalReturn, color: totalReturn >= 0 ? "text-gain" : "text-loss" },
            { label: "Return %", value: null, display: `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`, color: returnPct >= 0 ? "text-gain" : "text-loss" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
              <div className={`number-font text-xl font-black ${s.color}`}>
                {s.display ?? `₹${Math.abs(s.value!).toLocaleString("en-IN")}`}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Holdings input */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">Holdings</h3>
              <button onClick={addHolding} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                <Plus className="h-3.5 w-3.5" /> Add Stock
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {holdings.map(h => (
                <div key={h.id} className="flex items-center gap-2">
                  <input value={h.name} onChange={e => updateHolding(h.id, "name", e.target.value)}
                    placeholder="Symbol" className="w-24 border border-border rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-primary" />
                  <input type="number" value={h.invested || ""} onChange={e => updateHolding(h.id, "invested", e.target.value)}
                    placeholder="Invested" className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs number-font focus:outline-none focus:border-primary" />
                  <input type="number" value={h.current || ""} onChange={e => updateHolding(h.id, "current", e.target.value)}
                    placeholder="Current" className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs number-font focus:outline-none focus:border-primary" />
                  <button onClick={() => removeHolding(h.id)} className="p-1 text-muted-foreground hover:text-loss">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Stock-wise Performance
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Bar dataKey="invested" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Invested" />
                  <Bar dataKey="current" fill="hsl(var(--gain))" radius={[4, 4, 0, 0]} name="Current" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4">Portfolio Allocation</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">Add holdings to see allocation</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
