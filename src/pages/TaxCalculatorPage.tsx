import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const SLABS_NEW = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 5 },
  { min: 700000, max: 1000000, rate: 10 },
  { min: 1000000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
];

function calcTax(income: number) {
  let tax = 0;
  for (const slab of SLABS_NEW) {
    if (income <= slab.min) break;
    const taxable = Math.min(income, slab.max) - slab.min;
    tax += taxable * slab.rate / 100;
  }
  const cess = tax * 0.04;
  return { tax, cess, total: tax + cess };
}

export default function TaxCalculatorPage() {
  const [income, setIncome] = useState(1200000);
  const [stcg, setStcg] = useState(0);
  const [ltcg, setLtcg] = useState(0);

  const { tax, cess, total } = calcTax(income);
  const stcgTax = stcg * 0.2;
  const ltcgTax = Math.max(0, ltcg - 125000) * 0.125;
  const grandTotal = total + stcgTax + ltcgTax;

  const slabData = SLABS_NEW.map(s => ({
    slab: s.max === Infinity ? "Above ₹15L" : `₹${(s.min / 100000).toFixed(0)}L-${(s.max / 100000).toFixed(0)}L`,
    rate: s.rate,
  }));

  const pieData = [
    { name: "Income Tax", value: Math.round(tax) },
    { name: "Cess", value: Math.round(cess) },
    { name: "STCG Tax", value: Math.round(stcgTax) },
    { name: "LTCG Tax", value: Math.round(ltcgTax) },
  ].filter(d => d.value > 0);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--loss))", "hsl(var(--gain))"];

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-rose-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Tax Calculator</h1>
            <p className="text-sm text-muted-foreground">Income Tax & Capital Gains — New Regime FY 2025-26</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Annual Income <span className="number-font text-primary font-black">₹{income.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={0} max={10000000} step={50000} value={income}
                onChange={e => setIncome(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Short-Term Capital Gains <span className="number-font text-primary font-black">₹{stcg.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={0} max={5000000} step={10000} value={stcg}
                onChange={e => setStcg(+e.target.value)} className="w-full accent-primary" />
              <p className="text-[10px] text-muted-foreground mt-1">Taxed at 20% (Equity)</p>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Long-Term Capital Gains <span className="number-font text-primary font-black">₹{ltcg.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={0} max={5000000} step={10000} value={ltcg}
                onChange={e => setLtcg(+e.target.value)} className="w-full accent-primary" />
              <p className="text-[10px] text-muted-foreground mt-1">₹1.25L exempt, then 12.5%</p>
            </div>

            <div className="bg-[hsl(var(--section-bg))] rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Income Tax</span>
                <span className="number-font font-bold text-foreground">₹{Math.round(tax).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Health & Education Cess (4%)</span>
                <span className="number-font font-bold text-foreground">₹{Math.round(cess).toLocaleString("en-IN")}</span></div>
              {stcgTax > 0 && <div className="flex justify-between"><span className="text-sm text-muted-foreground">STCG Tax</span>
                <span className="number-font font-bold text-loss">₹{Math.round(stcgTax).toLocaleString("en-IN")}</span></div>}
              {ltcgTax > 0 && <div className="flex justify-between"><span className="text-sm text-muted-foreground">LTCG Tax</span>
                <span className="number-font font-bold text-loss">₹{Math.round(ltcgTax).toLocaleString("en-IN")}</span></div>}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-sm font-bold text-foreground">Total Tax</span>
                <span className="number-font text-lg font-black text-primary">₹{Math.round(grandTotal).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-sm text-foreground mb-4">New Tax Regime Slabs</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={slabData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="slab" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tax Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex items-center justify-center">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h4 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" /> Disclaimer
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This calculator provides approximate tax liability under the New Tax Regime for FY 2025-26.
                  Surcharge is not included. Consult a qualified CA for accurate tax filing.
                  Data sourced from official Income Tax Department guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
