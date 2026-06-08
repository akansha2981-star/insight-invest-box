import { useState } from "react";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Landmark, TrendingUp, HelpCircle, ArrowRight, CheckCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Helmet } from "react-helmet-async";

const FAQ = [
  { q: "What is a Fixed Deposit (FD)?", a: "A Fixed Deposit is a financial instrument where you deposit a lump sum with a bank for a fixed tenure at a predetermined interest rate. FDs are considered one of the safest investment options in India, with DICGC insurance covering up to ₹5 lakh per depositor per bank." },
  { q: "Which bank offers the highest FD rate?", a: "As of 2026, small finance banks like Unity SFB (9.0%), AU SFB (8.1%), and Ujjivan SFB (8.25%) offer the highest rates. Among large banks, SBI offers 7.1%, HDFC 7.25%, and ICICI 7.0% for general deposits. Senior citizens get an additional 0.5% across all banks." },
  { q: "Is FD interest taxable?", a: "Yes, FD interest is fully taxable as per your income tax slab. Banks deduct TDS at 10% if annual interest exceeds ₹40,000 (₹50,000 for senior citizens). You can submit Form 15G/15H if your total income is below the taxable limit to avoid TDS." },
  { q: "What is the difference between cumulative and non-cumulative FD?", a: "In a cumulative FD, interest is compounded and paid at maturity, giving higher effective returns. In a non-cumulative FD, interest is paid monthly/quarterly/yearly — useful for regular income needs but yields slightly lower total returns." },
];

export default function FDCalculatorPage() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(7.5);
  const [years, setYears] = useState(5);
  const [compounding, setCompounding] = useState<"quarterly" | "monthly" | "yearly">("quarterly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const freq = compounding === "monthly" ? 12 : compounding === "quarterly" ? 4 : 1;
  const maturity = principal * Math.pow(1 + rate / 100 / freq, freq * years);
  const interest = maturity - principal;
  const effectiveRate = ((Math.pow(1 + rate / 100 / freq, freq) - 1) * 100).toFixed(2);

  const chartData = Array.from({ length: years }, (_, i) => {
    const yr = i + 1;
    const val = principal * Math.pow(1 + rate / 100 / freq, freq * yr);
    return { year: `Year ${yr}`, value: Math.round(val), principal };
  });

  const bankRates = [
    { bank: "SBI", general: 7.1, senior: 7.6 },
    { bank: "HDFC", general: 7.25, senior: 7.75 },
    { bank: "ICICI", general: 7.0, senior: 7.5 },
    { bank: "Axis", general: 7.15, senior: 7.65 },
    { bank: "Kotak", general: 7.4, senior: 7.9 },
    { bank: "PNB", general: 7.05, senior: 7.55 },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "FD Calculator — InvestingIQ",
    description: "Calculate fixed deposit maturity amount and interest earned. Compare FD rates across major Indian banks.",
    url: "https://www.investingiq.in/tools/fd",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>FD Calculator 2026 — Fixed Deposit Interest Calculator | InvestingIQ</title>
        <meta name="description" content="Calculate fixed deposit maturity amount and interest earned. Compare FD rates across SBI, HDFC, ICICI & more. Updated 2026 bank rates with senior citizen benefits." />
        <link rel="canonical" href="https://www.investingiq.in/tools/fd" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 sm:p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">FD Calculator</h1>
              <p className="text-white/70 text-sm">Fixed Deposit Maturity & Interest Calculator</p>
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
            Calculate how much your fixed deposit will grow. Compare interest rates across banks and choose the best compounding frequency for maximum returns.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Deposit Amount <span className="number-font text-primary font-black">₹{principal.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={10000} max={10000000} step={10000} value={principal}
                onChange={e => setPrincipal(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>₹10K</span><span>₹1Cr</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Interest Rate <span className="number-font text-primary font-black">{rate}%</span>
              </label>
              <input type="range" min={1} max={12} step={0.1} value={rate}
                onChange={e => setRate(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1%</span><span>12%</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Tenure <span className="number-font text-primary font-black">{years} Years</span>
              </label>
              <input type="range" min={1} max={10} step={1} value={years}
                onChange={e => setYears(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-2 block">Compounding Frequency</label>
              <div className="flex gap-2">
                {(["monthly", "quarterly", "yearly"] as const).map(c => (
                  <button key={c} onClick={() => setCompounding(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      compounding === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
                    }`}>{c.charAt(0).toUpperCase() + c.slice(1)}</button>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Invested</span>
                <span className="number-font font-black text-foreground">₹{principal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Interest Earned</span>
                <span className="number-font font-black text-gain">₹{Math.round(interest).toLocaleString("en-IN")}</span></div>
              <div className="h-px bg-border" />
              <div className="flex justify-between"><span className="text-sm font-bold text-foreground">Maturity Amount</span>
                <span className="number-font font-black text-primary text-xl">₹{Math.round(maturity).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Effective Annual Rate</span>
                <span className="number-font font-bold text-muted-foreground">{effectiveRate}%</span></div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> FD Growth Trajectory
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--gain))" fill="hsl(var(--gain))" fillOpacity={0.15} strokeWidth={2} name="Maturity Value" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-bold text-sm text-foreground mb-4">Bank FD Rates Comparison (2026)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-bold text-muted-foreground">Bank</th>
                      <th className="text-right py-2 text-xs font-bold text-muted-foreground">General</th>
                      <th className="text-right py-2 text-xs font-bold text-muted-foreground">Senior Citizen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankRates.map(b => (
                      <tr key={b.bank} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 font-semibold text-foreground">{b.bank}</td>
                        <td className="py-2.5 text-right number-font">{b.general}%</td>
                        <td className="py-2.5 text-right number-font text-gain font-bold">{b.senior}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
