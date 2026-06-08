import { useState } from "react";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText, Info, HelpCircle, ArrowRight, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Helmet } from "react-helmet-async";

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

const FAQ = [
  { q: "What is the new tax regime for FY 2025-26?", a: "The new tax regime is the default regime with lower tax rates but no major deductions/exemptions. Tax slabs: Up to ₹3L (0%), ₹3-7L (5%), ₹7-10L (10%), ₹10-12L (15%), ₹12-15L (20%), Above ₹15L (30%). A standard deduction of ₹75,000 is available." },
  { q: "How is STCG (Short-Term Capital Gains) taxed?", a: "Short-term capital gains on equity/equity mutual funds (held < 12 months) are taxed at 20% (increased from 15% in Budget 2024). STCG on other assets is added to income and taxed at your slab rate." },
  { q: "What is the LTCG exemption limit?", a: "Long-term capital gains on equity/equity MFs above ₹1.25 lakh per year are taxed at 12.5% (increased from 10% and ₹1L threshold in Budget 2024). LTCG on property and other assets is taxed at 12.5% without indexation." },
  { q: "Should I choose old or new tax regime?", a: "New regime is better if your deductions (80C, HRA, 80D, etc.) are below ₹3.75L. Old regime benefits those with high home loan interest, HRA, and 80C investments. Use both calculators to compare your actual tax liability." },
];

export default function TaxCalculatorPage() {
  const [income, setIncome] = useState(1200000);
  const [stcg, setStcg] = useState(0);
  const [ltcg, setLtcg] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { tax, cess, total } = calcTax(income);
  const stcgTax = stcg * 0.2;
  const ltcgTax = Math.max(0, ltcg - 125000) * 0.125;
  const grandTotal = total + stcgTax + ltcgTax;
  const effectiveRate = income > 0 ? ((grandTotal / (income + stcg + ltcg)) * 100).toFixed(1) : "0";

  const slabData = SLABS_NEW.map(s => ({
    slab: s.max === Infinity ? ">₹15L" : `₹${(s.min / 100000).toFixed(0)}-${(s.max / 100000).toFixed(0)}L`,
    rate: s.rate,
  }));

  const pieData = [
    { name: "Income Tax", value: Math.round(tax) },
    { name: "Cess", value: Math.round(cess) },
    { name: "STCG Tax", value: Math.round(stcgTax) },
    { name: "LTCG Tax", value: Math.round(ltcgTax) },
  ].filter(d => d.value > 0);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--loss))", "hsl(var(--gain))"];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Tax Calculator — InvestingIQ",
    description: "Calculate income tax and capital gains tax under the new regime for FY 2025-26. Includes STCG and LTCG calculations.",
    url: "https://www.investingiq.in/tools/tax",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>Tax Calculator 2026 — Income Tax & Capital Gains | InvestingIQ</title>
        <meta name="description" content="Calculate income tax under new regime FY 2025-26. Includes STCG (20%), LTCG (12.5%) tax on equity. Free, instant, and accurate tax estimation for Indian investors." />
        <link rel="canonical" href="https://www.investingiq.in/tools/tax" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-6 sm:p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">Tax Calculator</h1>
              <p className="text-white/70 text-sm">Income Tax + Capital Gains · New Regime FY 2025-26</p>
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
            Calculate your total tax liability including income tax, STCG, and LTCG. Based on the latest Union Budget 2024 updates with revised capital gains rates.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Annual Income <span className="number-font text-primary font-black">₹{income.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={0} max={10000000} step={50000} value={income}
                onChange={e => setIncome(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>₹0</span><span>₹1Cr</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Short-Term Capital Gains <span className="number-font text-primary font-black">₹{stcg.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={0} max={5000000} step={10000} value={stcg}
                onChange={e => setStcg(+e.target.value)} className="w-full accent-primary" />
              <p className="text-[10px] text-muted-foreground mt-1">Equity STCG taxed at flat 20%</p>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Long-Term Capital Gains <span className="number-font text-primary font-black">₹{ltcg.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={0} max={5000000} step={10000} value={ltcg}
                onChange={e => setLtcg(+e.target.value)} className="w-full accent-primary" />
              <p className="text-[10px] text-muted-foreground mt-1">₹1.25L exempt, then 12.5% on equity LTCG</p>
            </div>

            <div className="bg-gradient-to-br from-loss/5 to-loss/10 border border-loss/20 rounded-xl p-5 space-y-2">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Income Tax</span>
                <span className="number-font font-bold text-foreground">₹{Math.round(tax).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Health & Education Cess (4%)</span>
                <span className="number-font font-bold text-foreground">₹{Math.round(cess).toLocaleString("en-IN")}</span></div>
              {stcgTax > 0 && <div className="flex justify-between"><span className="text-sm text-muted-foreground">STCG Tax (20%)</span>
                <span className="number-font font-bold text-loss">₹{Math.round(stcgTax).toLocaleString("en-IN")}</span></div>}
              {ltcgTax > 0 && <div className="flex justify-between"><span className="text-sm text-muted-foreground">LTCG Tax (12.5%)</span>
                <span className="number-font font-bold text-loss">₹{Math.round(ltcgTax).toLocaleString("en-IN")}</span></div>}
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-sm font-bold text-foreground">Total Tax Liability</span>
                <span className="number-font text-xl font-black text-primary">₹{Math.round(grandTotal).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Effective Tax Rate</span>
                <span className="number-font font-bold text-muted-foreground">{effectiveRate}%</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-bold text-sm text-foreground mb-4">New Tax Regime Slabs — FY 2025-26</h2>
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
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col items-center justify-center">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Tax Breakdown</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={2}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] text-muted-foreground">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No tax applicable at this income level</p>
                )}
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gain" /> Tax Saving Tips</h3>
                <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Harvest LTCG up to ₹1.25L/yr tax-free by booking profits annually</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Hold equity investments 12+ months to qualify for lower LTCG rate</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Set off capital losses against gains in the same year</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Consider old regime if deductions exceed ₹3.75L</li>
                </ul>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[10px] text-amber-800">
                    Disclaimer: This is an estimate. Surcharge not included. Consult a qualified CA for accurate tax filing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-xl font-black text-foreground mb-5 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <span className="font-semibold text-sm text-foreground">{faq.q}</span>
                  <span className={`text-muted-foreground transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4"><p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p></div>
                )}
              </div>
            ))}
          </div>
        </section>
        <ComplianceDisclaimer variant="card" className="mt-8" />
      </main>
      <Footer />
    </div>
  );
}
