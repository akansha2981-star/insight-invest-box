import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home, TrendingUp, Info, HelpCircle, CheckCircle, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Helmet } from "react-helmet-async";

const FAQ = [
  { q: "What is EMI?", a: "EMI (Equated Monthly Installment) is a fixed payment amount made by a borrower to a lender at a specified date each calendar month. EMIs cover both the interest and principal so that over a specified number of years, the loan is fully repaid." },
  { q: "How is EMI calculated?", a: "EMI = P × r × (1+r)^n / ((1+r)^n – 1), where P = Principal, r = monthly interest rate, n = number of monthly installments. Higher tenure reduces EMI but increases total interest." },
  { q: "What factors affect my home loan EMI?", a: "Three main factors: (1) Loan amount — higher principal means higher EMI, (2) Interest rate — even 0.5% change significantly impacts total cost, (3) Tenure — longer tenure reduces EMI but increases total interest paid." },
  { q: "Should I choose a longer or shorter tenure?", a: "Shorter tenure means higher EMI but significantly less total interest. A 15-year loan at 8.5% costs ~30% less in total interest than a 30-year loan. Choose based on your monthly repayment capacity." },
  { q: "Can I reduce my EMI after taking a loan?", a: "Yes. You can: (1) Make partial prepayments to reduce principal, (2) Refinance at a lower rate, (3) Request tenure extension (increases total interest). Prepayment is usually the best strategy." },
];

export default function EMICalculatorPage() {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "EMI Calculator — InvestingIQ",
    description: "Calculate home loan, car loan, and personal loan EMIs instantly with our free EMI calculator. See payment breakdowns, amortization schedules, and interest analysis.",
    url: "https://www.investingiq.in/tools/emi",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>EMI Calculator 2026 — Home Loan, Car Loan EMI | InvestingIQ</title>
        <meta name="description" content="Free EMI calculator for home loans, car loans & personal loans. Calculate monthly EMI, total interest, amortization schedule. Updated for 2026 interest rates." />
        <link rel="canonical" href="https://www.investingiq.in/tools/emi" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">EMI Calculator</h1>
              <p className="text-white/70 text-sm">Home Loan · Car Loan · Personal Loan</p>
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
            Calculate your Equated Monthly Installment (EMI) for any loan type. Adjust loan amount, interest rate, and tenure to find the optimal repayment plan. Updated with latest 2026 bank rates.
          </p>
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

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly EMI</span>
                <span className="number-font text-2xl font-black text-primary">₹{Math.round(emi).toLocaleString("en-IN")}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Interest</span>
                <span className="number-font text-base font-black text-loss">₹{Math.round(totalInterest).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Payment</span>
                <span className="number-font text-base font-black text-foreground">₹{Math.round(totalPayment).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Interest-to-Principal</span>
                <span className="number-font text-sm font-bold text-muted-foreground">{((totalInterest / principal) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Amortization Schedule
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  <Area type="monotone" dataKey="principal" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Principal Paid" />
                  <Area type="monotone" dataKey="interest" stackId="1" stroke="hsl(var(--loss))" fill="hsl(var(--loss))" fillOpacity={0.2} name="Interest Paid" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col items-center justify-center">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Payment Split</h3>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={2}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--loss))" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /><span className="text-xs text-muted-foreground">Principal</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-loss" /><span className="text-xs text-muted-foreground">Interest</span></div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gain" /> Smart EMI Tips</h3>
                <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Higher down payment = lower EMI burden & less total interest</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Compare rates across 5+ banks — even 0.25% makes a difference</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Annual prepayments of 5% can save 3-4 years of EMI</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Keep total EMIs below 40% of monthly income</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />Tax benefit u/s 80C (principal) + 24(b) (interest) up to ₹3.5L/yr</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
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
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SEO Content */}
        <section className="mt-10 bg-card border border-border rounded-2xl p-6 shadow-card">
          <h2 className="text-lg font-bold text-foreground mb-3">How to Use the EMI Calculator</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>An EMI (Equated Monthly Installment) calculator helps you estimate the monthly payment for a loan. Whether you are planning a home loan, car loan, or personal loan, this tool gives you instant results based on three key inputs: loan amount, interest rate, and tenure.</p>
            <h3 className="text-foreground font-bold mt-4 mb-2">EMI Formula</h3>
            <p>EMI = [P x R x (1+R)^N] / [(1+R)^N - 1], where P = Principal loan amount, R = Monthly interest rate (annual rate / 12 / 100), and N = Total number of monthly installments.</p>
            <h3 className="text-foreground font-bold mt-4 mb-2">Current Home Loan Rates in India (2026)</h3>
            <p>Major banks offer home loan rates between 8.25% to 9.50% p.a. SBI offers the lowest starting rate at 8.25%, followed by HDFC Bank at 8.35% and ICICI Bank at 8.40%. Rates vary based on your credit score, loan amount, and property location.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
