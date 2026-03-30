import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Calculator, TrendingUp, Info, HelpCircle, ArrowRight, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Helmet } from "react-helmet-async";

const FAQ = [
  { q: "What is a Systematic Investment Plan (SIP)?", a: "A SIP allows you to invest a fixed amount regularly (monthly) in mutual funds. It helps you build wealth gradually through the power of compounding and rupee cost averaging, reducing the impact of market volatility." },
  { q: "What returns can I expect from SIP?", a: "Returns depend on the fund type: Large Cap funds average 10-12% p.a., Mid Cap 12-15% p.a., Small Cap 14-18% p.a., and Index Funds (Nifty 50) about 11-13% p.a. over 10+ year periods. Past performance doesn't guarantee future returns." },
  { q: "What is the minimum SIP amount?", a: "Most mutual funds allow SIPs starting from ₹500/month. Some AMCs offer micro-SIPs from ₹100. There is no maximum limit. You can increase your SIP amount anytime through a step-up SIP." },
  { q: "Is SIP better than lump sum investing?", a: "SIP reduces timing risk through rupee cost averaging — you buy more units when prices are low and fewer when high. Lump sum can outperform in a rising market. For most retail investors, SIP is recommended for disciplined, long-term wealth creation." },
  { q: "Can I withdraw my SIP anytime?", a: "Yes, SIP investments in open-ended mutual funds can be redeemed anytime. However, ELSS funds have a 3-year lock-in. For equity funds, consider holding for 3+ years for optimal tax treatment (LTCG above ₹1.25L taxed at 12.5%)." },
];

export default function SIPCalculatorPage() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const months = years * 12;
  const r = rate / 100 / 12;
  const futureValue = r > 0 ? monthly * ((Math.pow(1 + r, months) - 1) / r) * (1 + r) : monthly * months;
  const invested = monthly * months;
  const returns = futureValue - invested;
  const wealthMultiplier = invested > 0 ? (futureValue / invested).toFixed(2) : "0";

  const chartData = Array.from({ length: years }, (_, i) => {
    const m = (i + 1) * 12;
    const fv = r > 0 ? monthly * ((Math.pow(1 + r, m) - 1) / r) * (1 + r) : monthly * m;
    return { year: `Year ${i + 1}`, invested: monthly * m, value: Math.round(fv) };
  });

  const pieData = [
    { name: "Invested", value: Math.round(invested) },
    { name: "Returns", value: Math.round(returns) },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SIP Calculator — InvestingIQ",
    description: "Calculate SIP returns for mutual funds. See how monthly investments grow over time with the power of compounding.",
    url: "https://www.investingiq.in/tools/sip",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>SIP Calculator 2026 — Mutual Fund SIP Returns Calculator | InvestingIQ</title>
        <meta name="description" content="Free SIP calculator to estimate mutual fund returns. Calculate how monthly SIP investments grow with compounding. Plan your wealth creation journey with accurate projections." />
        <link rel="canonical" href="https://www.investingiq.in/tools/sip" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">SIP Calculator</h1>
              <p className="text-white/70 text-sm">Systematic Investment Plan · Mutual Funds</p>
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
            See how small monthly investments can create significant wealth over time. Adjust your SIP amount, expected returns, and duration to plan your financial goals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-card space-y-6">
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Monthly Investment
                <span className="number-font text-primary font-black">₹{monthly.toLocaleString("en-IN")}</span>
              </label>
              <input type="range" min={500} max={200000} step={500} value={monthly}
                onChange={e => setMonthly(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>₹500</span><span>₹2,00,000</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Expected Return Rate (p.a.)
                <span className="number-font text-primary font-black">{rate}%</span>
              </label>
              <input type="range" min={1} max={30} step={0.5} value={rate}
                onChange={e => setRate(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1%</span><span>30%</span></div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-bold text-foreground mb-2">
                Time Period
                <span className="number-font text-primary font-black">{years} Years</span>
              </label>
              <input type="range" min={1} max={40} step={1} value={years}
                onChange={e => setYears(+e.target.value)} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1 Yr</span><span>40 Yrs</span></div>
            </div>

            <div className="bg-gradient-to-br from-gain/5 to-gain/10 border border-gain/20 rounded-xl p-5 space-y-3">
              {[
                { label: "Invested Amount", value: invested, color: "text-foreground" },
                { label: "Estimated Returns", value: returns, color: "text-gain" },
                { label: "Total Value", value: futureValue, color: "text-primary", big: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`number-font ${item.big ? 'text-xl' : 'text-base'} font-black ${item.color}`}>
                    ₹{Math.round(item.value).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wealth Multiplier</span>
                <span className="number-font text-sm font-bold text-gain">{wealthMultiplier}x</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Wealth Growth Over Time
              </h2>
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
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col items-center justify-center">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Investment vs Returns</h3>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={2}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--gain))" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /><span className="text-xs text-muted-foreground">Invested</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gain" /><span className="text-xs text-muted-foreground">Returns</span></div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gain" /> SIP Benefits</h3>
                <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Rupee cost averaging reduces market timing risk</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Power of compounding — start early for maximum growth</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />ELSS SIPs offer tax savings under Section 80C</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Flexible — start from ₹500, pause or stop anytime</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Step-up SIP increases investment annually with income growth</li>
                </ul>
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

        {/* SEO Content */}
        <section className="mt-10 bg-card border border-border rounded-2xl p-6 shadow-card">
          <h2 className="text-lg font-bold text-foreground mb-3">Understanding SIP Investments in India</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>A Systematic Investment Plan (SIP) is the most popular way Indians invest in mutual funds. Over 8 crore SIP accounts are active in India as of 2026, with monthly inflows exceeding ₹23,000 crore. SIPs harness the power of compounding — your returns generate returns, creating an exponential growth curve over time.</p>
            <h3 className="text-foreground font-bold mt-4 mb-2">SIP vs Lump Sum: Which is Better?</h3>
            <p>For most investors, SIP is preferred because it eliminates the need to time the market. Through rupee cost averaging, you automatically buy more units when prices are low and fewer when high. Studies show that over 10+ year periods, SIP and lump sum returns converge, but SIP offers better risk management.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
