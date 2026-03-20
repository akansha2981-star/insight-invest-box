import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home, TrendingUp, Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function EMICalculatorPage() {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const r = rate / 100 / 12;
  const n = tenure * 12;
  const emi = r > 0 ? principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : principal / n;
  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;

  const chartData = Array.from({ length: tenure }, (_, i) => {
    const yr = i + 1;
    let bal = principal;
    let intPaid = 0;
    for (let m = 0; m < yr * 12; m++) {
      const intMonth = bal * r;
      intPaid += intMonth;
      bal -= (emi - intMonth);
    }
    return { year: `Yr ${yr}`, principal: Math.round(principal - Math.max(bal, 0)), interest: Math.round(intPaid) };
  });

  const pieData = [
    { name: "Principal", value: Math.round(principal) },
    { name: "Interest", value: Math.round(totalInterest) },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <Home className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">EMI Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate your Home & Auto Loan EMIs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Loan Amount
                <span className="number-font text-primary font-black">₹{principal.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={100000} max={100000000} step={100000} value={principal}
                onChange={e => setPrincipal(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>₹1L</span><span>₹10Cr</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Interest Rate (p.a.)
                <span className="number-font text-primary font-black">{rate}%</span>
              </label>
              <input type="range" min={1} max={20} step={0.1} value={rate}
                onChange={e => setRate(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1%</span><span>20%</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Loan Tenure
                <span className="number-font text-primary font-black">{tenure} Years</span>
              </label>
              <input type="range" min={1} max={30} step={1} value={tenure}
                onChange={e => setTenure(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1 Yr</span><span>30 Yrs</span></div>
            </div>

            <div className="bg-[hsl(var(--section-bg))] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly EMI</span>
                <span className="number-font text-xl font-black text-primary">₹{Math.round(emi).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Interest</span>
                <span className="number-font text-base font-black text-loss">₹{Math.round(totalInterest).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Payment</span>
                <span className="number-font text-base font-black text-foreground">₹{Math.round(totalPayment).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Payment Breakdown Over Time
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Area type="monotone" dataKey="principal" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Principal" />
                  <Area type="monotone" dataKey="interest" stackId="1" stroke="hsl(var(--loss))" fill="hsl(var(--loss))" fillOpacity={0.2} name="Interest" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex items-center justify-center">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={2}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--loss))" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> EMI Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                  <li>Higher down payment = lower EMI burden</li>
                  <li>Compare rates across banks before finalizing</li>
                  <li>Prepayment can save significant interest</li>
                  <li>Keep EMI below 40% of monthly income</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
