import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Calculator, TrendingUp, IndianRupee, BarChart3, Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SIPCalculatorPage() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const months = years * 12;
  const r = rate / 100 / 12;
  const futureValue = r > 0 ? monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r) : monthly * months;
  const invested = monthly * months;
  const returns = futureValue - invested;

  const chartData = Array.from({ length: years }, (_, i) => {
    const m = (i + 1) * 12;
    const fv = r > 0 ? monthly * ((Math.pow(1 + r, m) - 1) / r) * (1 + r) : monthly * m;
    return { year: `Year ${i + 1}`, invested: monthly * m, value: Math.round(fv) };
  });

  const pieData = [
    { name: "Invested", value: Math.round(invested) },
    { name: "Returns", value: Math.round(returns) },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">SIP Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate your Systematic Investment Plan returns</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Monthly Investment
                <span className="number-font text-primary font-black">₹{monthly.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={500} max={200000} step={500} value={monthly}
                onChange={e => setMonthly(+e.target.value)}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>₹500</span><span>₹2,00,000</span>
              </div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Expected Return Rate (p.a.)
                <span className="number-font text-primary font-black">{rate}%</span>
              </label>
              <input type="range" min={1} max={30} step={0.5} value={rate}
                onChange={e => setRate(+e.target.value)}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1%</span><span>30%</span>
              </div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Time Period
                <span className="number-font text-primary font-black">{years} Years</span>
              </label>
              <input type="range" min={1} max={40} step={1} value={years}
                onChange={e => setYears(+e.target.value)}
                className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1 Yr</span><span>40 Yrs</span>
              </div>
            </div>

            {/* Results */}
            <div className="bg-[hsl(var(--section-bg))] rounded-xl p-4 space-y-3">
              {[
                { label: "Invested Amount", value: invested, color: "text-foreground" },
                { label: "Estimated Returns", value: returns, color: "text-gain" },
                { label: "Total Value", value: futureValue, color: "text-primary" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className={`number-font text-base font-black ${r.color}`}>
                    ₹{Math.round(r.value).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Growth Over Time
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="sipInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sipVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--gain))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--gain))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Area type="monotone" dataKey="invested" stroke="hsl(var(--primary))" fill="url(#sipInv)" strokeWidth={2} name="Invested" />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--gain))" fill="url(#sipVal)" strokeWidth={2} name="Total Value" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex items-center justify-center">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={2}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--gain))" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" /> What is SIP?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A Systematic Investment Plan (SIP) allows you to invest a fixed amount regularly in mutual funds.
                  It helps in rupee cost averaging and power of compounding. Start small, invest regularly,
                  and let your money grow over time.
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-primary" />
                    <span className="text-xs text-muted-foreground">Invested Amount</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-gain" />
                    <span className="text-xs text-muted-foreground">Wealth Gained</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
