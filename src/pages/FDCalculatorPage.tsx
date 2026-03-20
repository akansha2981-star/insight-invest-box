import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Landmark, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function FDCalculatorPage() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(7.5);
  const [years, setYears] = useState(5);
  const [compounding, setCompounding] = useState<"quarterly" | "monthly" | "yearly">("quarterly");

  const freq = compounding === "monthly" ? 12 : compounding === "quarterly" ? 4 : 1;
  const maturity = principal * Math.pow(1 + rate / 100 / freq, freq * years);
  const interest = maturity - principal;

  const chartData = Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const val = principal * Math.pow(1 + rate / 100 / freq, freq * yr);
    return { year: `Year ${yr}`, value: Math.round(val), principal };
  });

  const bankRates = [
    { bank: "SBI", rate: 7.1 }, { bank: "HDFC", rate: 7.25 },
    { bank: "ICICI", rate: 7.0 }, { bank: "Axis", rate: 7.15 },
    { bank: "Kotak", rate: 7.4 }, { bank: "PNB", rate: 7.05 },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">FD Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate Fixed Deposit maturity amount & interest</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Deposit Amount <span className="number-font text-primary font-black">₹{principal.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={10000} max={10000000} step={10000} value={principal}
                onChange={e => setPrincipal(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Interest Rate <span className="number-font text-primary font-black">{rate}%</span>
              </label>
              <input type="range" min={1} max={12} step={0.1} value={rate}
                onChange={e => setRate(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Tenure <span className="number-font text-primary font-black">{years} Years</span>
              </label>
              <input type="range" min={1} max={10} step={1} value={years}
                onChange={e => setYears(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Compounding</label>
              <div className="flex gap-2">
                {(["monthly", "quarterly", "yearly"] as const).map(c => (
                  <button key={c} onClick={() => setCompounding(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      compounding === c ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                    }`}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="bg-[hsl(var(--section-bg))] rounded-xl p-4 space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Invested</span>
                <span className="number-font font-black text-foreground">₹{principal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Interest Earned</span>
                <span className="number-font font-black text-gain">₹{Math.round(interest).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Maturity Amount</span>
                <span className="number-font font-black text-primary text-lg">₹{Math.round(maturity).toLocaleString("en-IN")}</span></div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> FD Growth
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--gain))" fill="hsl(var(--gain))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4">Bank FD Rates Comparison</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bankRates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bank" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[6, 8]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
