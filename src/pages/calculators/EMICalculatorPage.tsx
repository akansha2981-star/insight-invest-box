import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { EMI_CONFIG, type PrepayFrequency } from "@/config/emiCalculator";
import { EMI_DISCLAIMER, EMI_FAQS, EMI_META, EMI_SECTIONS, RELATED_CALCULATORS } from "@/content/emiCalculatorContent";
import { buildSchedule, calcEMI, clamp, inr, inrCompact, monthsToLabel, safeNum, yearlySummary } from "@/lib/emi";
import {
  Activity, ArrowRight, BarChart3, Calculator, ChevronDown, ChevronRight, Download,
  Info, Percent, PiggyBank, Printer, RotateCcw, Share2, Sliders, Table2, TrendingDown, Wallet,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const C = EMI_CONFIG;
const track = (event: string, params: Record<string, string | number> = {}) => {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
};
const bucket = (v: number, steps: number[]) => steps.find((s) => v <= s) ?? steps[steps.length - 1] + 1;

interface FieldProps {
  id: string; label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step: number; suffix?: string; prefix?: string; error?: string; hint?: string;
}

function NumberField({ id, label, value, onChange, min, max, step, suffix, prefix, error, hint }: FieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
        <span className="text-sm font-black text-primary tabular-nums">
          {prefix}{value.toLocaleString(C.locale)}{suffix}
        </span>
      </div>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input
          id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ""}
          min={min} max={max} step={step}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(safeNum(e.target.value, min))}
          className={`w-full h-11 rounded-lg border bg-background px-3 ${prefix ? "pl-7" : ""} text-base font-semibold text-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/40 ${error ? "border-destructive" : "border-border"}`}
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={clamp(value, min, max)}
        aria-label={`${label} slider`} onChange={(e) => onChange(safeNum(e.target.value, min))}
        className="w-full mt-3 h-2 accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{prefix}{inrCompact(min).replace("₹", prefix ? "" : "")}{suffix}</span>
        <span>{prefix}{inrCompact(max).replace("₹", prefix ? "" : "")}{suffix}</span>
      </div>
      {error && <p id={`${id}-err`} role="alert" className="text-xs text-destructive mt-1.5">{error}</p>}
      {!error && hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className={`text-lg sm:text-xl font-black tabular-nums mt-1 ${accent ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function EMICalculatorPage() {
  const [params] = useSearchParams();
  const [amount, setAmount] = useState(() => clamp(safeNum(params.get("amount"), C.amount.default), C.amount.min, C.amount.max));
  const [rate, setRate] = useState(() => clamp(safeNum(params.get("rate"), C.rate.default), C.rate.min, C.rate.max));
  const [tenureUnit, setTenureUnit] = useState<"years" | "months">("years");
  const [tenure, setTenure] = useState(() => clamp(safeNum(params.get("tenure"), C.tenureYears.default), C.tenureYears.min, C.tenureYears.max));

  const [advOpen, setAdvOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [fee, setFee] = useState(0);
  const [feeGst, setFeeGst] = useState(true);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [lumpsum, setLumpsum] = useState(0);
  const [lumpsumMonth, setLumpsumMonth] = useState(12);
  const [prepayFreq, setPrepayFreq] = useState<PrepayFrequency>("none");
  const [prepayAmount, setPrepayAmount] = useState(0);

  const [schedOpen, setSchedOpen] = useState(false);
  const [schedView, setSchedView] = useState<"yearly" | "monthly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [barDismissed, setBarDismissed] = useState(false);
  const [shared, setShared] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const [scenarios, setScenarios] = useState([
    { amount: 1000000, rate: 8, years: 10 },
    { amount: 1000000, rate: 9, years: 10 },
    { amount: 1000000, rate: 8, years: 7 },
  ]);

  const months = tenureUnit === "years" ? Math.round(tenure * 12) : Math.round(tenure);
  const tRange = tenureUnit === "years" ? C.tenureYears : C.tenureMonths;

  const errors = {
    amount: amount < C.amount.min ? `Please enter a loan amount of at least ${inr(C.amount.min)}.` :
      amount > C.amount.max ? `Please enter a loan amount up to ${inrCompact(C.amount.max)}.` : "",
    rate: rate < 0 ? "Please enter an interest rate of 0% or more." : rate > C.rate.max ? `Please enter a rate up to ${C.rate.max}%.` : "",
    tenure: months < 1 ? "Please enter a loan tenure greater than zero." : months > 600 ? "Please enter a tenure of 50 years or less." : "",
  };
  const valid = !errors.amount && !errors.rate && !errors.tenure;

  const base = useMemo(() => buildSchedule({ principal: amount, annualRate: rate, months }), [amount, rate, months]);
  const withPrepay = useMemo(
    () => buildSchedule({ principal: amount, annualRate: rate, months, extraMonthly, lumpsum, lumpsumMonth, prepayFrequency: prepayFreq, prepayAmount }),
    [amount, rate, months, extraMonthly, lumpsum, lumpsumMonth, prepayFreq, prepayAmount],
  );
  const hasPrepay = extraMonthly > 0 || lumpsum > 0 || (prepayFreq !== "none" && prepayAmount > 0);
  const active = hasPrepay ? withPrepay : base;
  const years = useMemo(() => yearlySummary(active.rows, amount), [active.rows, amount]);

  const feeGstAmt = feeGst ? (fee * C.processingFeeGstRate) / 100 : 0;
  const upfront = fee + feeGstAmt;

  const pieData = [
    { name: "Principal", value: Math.round(amount) },
    { name: "Interest", value: Math.round(active.totalInterest) },
  ];
  const balanceData = years.map((y) => ({ year: `Y${y.year}`, balance: Math.round(y.closing), interest: Math.round(y.interest) }));

  useEffect(() => { track("calculator_loaded", { calculator: "emi" }); }, []);
  useEffect(() => {
    if (!valid) return;
    const t = setTimeout(() => track("emi_calculated", {
      amount_bucket: bucket(amount, [500000, 2500000, 10000000]),
      rate_bucket: bucket(rate, [8, 12, 18]),
      tenure_bucket: bucket(months, [60, 120, 240]),
    }), 600);
    return () => clearTimeout(t);
  }, [amount, rate, months, valid]);

  const reset = () => {
    setAmount(C.amount.default); setRate(C.rate.default);
    setTenureUnit("years"); setTenure(C.tenureYears.default);
    setFee(0); setFeeGst(true); setExtraMonthly(0); setLumpsum(0); setLumpsumMonth(12);
    setPrepayFreq("none"); setPrepayAmount(0); setStartDate(""); setAdvOpen(false); setSchedOpen(false);
    setScenarios([{ amount: 1000000, rate: 8, years: 10 }, { amount: 1000000, rate: 9, years: 10 }, { amount: 1000000, rate: 8, years: 7 }]);
  };

  const share = async () => {
    const url = `${window.location.origin}/calculators/emi-calculator?amount=${Math.round(amount)}&rate=${rate}&tenure=${tenureUnit === "years" ? tenure : Math.round(months / 12)}`;
    track("share_clicked");
    try {
      if (navigator.share) await navigator.share({ title: "EMI Calculation — Investing IQ", url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* user cancelled */ }
  };

  const downloadCsv = () => {
    track("download_clicked");
    const head = "Month,EMI,Principal,Interest,Prepayment,Balance\n";
    const body = active.rows.map((r) => [r.month, r.emi.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.prepayment.toFixed(2), r.balance.toFixed(2)].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "investingiq-emi-amortization.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // What-if simulations
  const emiRatePlus1 = calcEMI(amount, rate + 1, months);
  const shorterMonths = Math.max(months - 24, 12);
  const emiShorter = calcEMI(amount, rate, shorterMonths);
  const shorterInterest = buildSchedule({ principal: amount, annualRate: rate, months: shorterMonths }).totalInterest;
  const prepay1L = buildSchedule({ principal: amount, annualRate: rate, months, lumpsum: 100000, lumpsumMonth: 12 });

  const emiTable = [
    { amt: 500000, r: 8, y: 5 }, { amt: 1000000, r: 8, y: 10 },
    { amt: 2000000, r: 8, y: 15 }, { amt: 5000000, r: 8, y: 20 },
  ].map((row) => ({ ...row, emi: calcEMI(row.amt, row.r, row.y * 12) }));

  const canonical = C.canonical;
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.investingiq.in/" },
        { "@type": "ListItem", position: 2, name: "Calculators", item: "https://www.investingiq.in/tools" },
        { "@type": "ListItem", position: 3, name: "EMI Calculator", item: canonical },
      ],
    },
    {
      "@context": "https://schema.org", "@type": "WebPage",
      name: EMI_META.title, description: EMI_META.description, url: canonical,
      dateModified: C.methodologyReviewed,
      publisher: { "@type": "Organization", name: "Investing IQ", url: "https://www.investingiq.in/" },
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: EMI_FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  const interestShare = active.totalPayment > 0 ? (active.totalInterest / active.totalPayment) * 100 : 0;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>{EMI_META.title}</title>
        <meta name="description" content={EMI_META.description} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content={params.toString() ? "noindex, follow" : "index, follow"} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Investing IQ" />
        <meta property="og:title" content={EMI_META.title} />
        <meta property="og:description" content={EMI_META.description} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={EMI_META.title} />
        <meta name="twitter:description" content={EMI_META.description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />

      <main className="max-w-[1320px] mx-auto px-4 py-6 sm:py-8 pb-24 lg:pb-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
            <li><Link to="/tools" className="hover:text-primary">Calculators</Link></li>
            <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
            <li className="text-foreground font-semibold" aria-current="page">EMI Calculator</li>
          </ol>
        </nav>

        <header className="mb-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calculator className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{EMI_META.h1}</h1>
              <p className="text-sm text-muted-foreground font-medium">{EMI_META.subtitle}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-3xl leading-relaxed">{EMI_META.intro}</p>
        </header>

        {/* CALCULATOR */}
        <section aria-label="EMI calculator" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" aria-hidden /> Loan Details
              </h2>
              <button onClick={reset} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
              </button>
            </div>

            <div>
              <NumberField id="loan-amount" label="Loan Amount" value={amount} onChange={setAmount}
                min={C.amount.min} max={C.amount.max} step={C.amount.step} prefix="₹" error={errors.amount} />
              <div className="flex flex-wrap gap-2 mt-3">
                {C.amountPresets.map((p) => (
                  <button key={p.label} onClick={() => setAmount(p.value)}
                    className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors ${amount === p.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <NumberField id="interest-rate" label="Interest Rate (p.a.)" value={rate} onChange={setRate}
              min={C.rate.min} max={C.rate.max} step={C.rate.step} suffix="%" error={errors.rate} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Loan Tenure</span>
                <div className="inline-flex rounded-lg border border-border overflow-hidden" role="group" aria-label="Tenure unit">
                  {(["years", "months"] as const).map((u) => (
                    <button key={u} aria-pressed={tenureUnit === u}
                      onClick={() => { if (u === tenureUnit) return; setTenure(u === "months" ? Math.round(tenure * 12) : Math.max(1, Math.round(tenure / 12))); setTenureUnit(u); }}
                      className={`h-9 px-3 text-xs font-bold capitalize ${tenureUnit === u ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{u}</button>
                  ))}
                </div>
              </div>
              <NumberField id="loan-tenure" label={tenureUnit === "years" ? "Years" : "Months"} value={tenure} onChange={setTenure}
                min={tRange.min} max={tRange.max} step={1} suffix={tenureUnit === "years" ? " yr" : " mo"} error={errors.tenure} />
              {tenureUnit === "years" && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {C.tenurePresets.map((y) => (
                    <button key={y} onClick={() => setTenure(y)}
                      className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors ${tenure === y ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                      {y}Y
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ADVANCED */}
            <div className="border-t border-border pt-4">
              <button onClick={() => { setAdvOpen(!advOpen); if (!advOpen) track("advanced_options_opened"); }}
                aria-expanded={advOpen} className="w-full flex items-center justify-between text-sm font-bold text-foreground">
                <span className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" aria-hidden /> Advanced Options</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {advOpen && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="start-date" className="text-xs font-semibold text-muted-foreground">Loan Start Date (optional)</label>
                      <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="fee" className="text-xs font-semibold text-muted-foreground">Processing Fee (optional)</label>
                      <input id="fee" type="number" min={0} value={fee || ""} placeholder="0" onChange={(e) => setFee(Math.max(0, safeNum(e.target.value)))}
                        className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
                      <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={feeGst} onChange={(e) => setFeeGst(e.target.checked)} className="accent-primary h-4 w-4" />
                        Add {C.processingFeeGstRate}% GST on fee
                      </label>
                    </div>
                    <div>
                      <label htmlFor="extra" className="text-xs font-semibold text-muted-foreground">Extra Monthly Payment</label>
                      <input id="extra" type="number" min={0} value={extraMonthly || ""} placeholder="0"
                        onChange={(e) => { setExtraMonthly(Math.max(0, safeNum(e.target.value))); track("prepayment_used"); }}
                        className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
                    </div>
                    <div>
                      <label htmlFor="lump" className="text-xs font-semibold text-muted-foreground">One-Time Prepayment</label>
                      <input id="lump" type="number" min={0} value={lumpsum || ""} placeholder="0"
                        onChange={(e) => { setLumpsum(Math.max(0, safeNum(e.target.value))); track("prepayment_used"); }}
                        className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
                    </div>
                    <div>
                      <label htmlFor="lump-month" className="text-xs font-semibold text-muted-foreground">Prepayment After (months)</label>
                      <input id="lump-month" type="number" min={1} max={months} value={lumpsumMonth}
                        onChange={(e) => setLumpsumMonth(clamp(Math.round(safeNum(e.target.value, 1)), 1, Math.max(months, 1)))}
                        className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
                    </div>
                    <div>
                      <label htmlFor="freq" className="text-xs font-semibold text-muted-foreground">Recurring Prepayment</label>
                      <select id="freq" value={prepayFreq} onChange={(e) => setPrepayFreq(e.target.value as PrepayFrequency)}
                        className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold">
                        <option value="none">None</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {prepayFreq !== "none" && (
                      <div>
                        <label htmlFor="pre-amt" className="text-xs font-semibold text-muted-foreground">Prepayment Amount</label>
                        <input id="pre-amt" type="number" min={0} value={prepayAmount || ""} placeholder="0"
                          onChange={(e) => setPrepayAmount(Math.max(0, safeNum(e.target.value)))}
                          className="w-full h-11 mt-1 rounded-lg border border-border bg-background px-3 text-sm font-semibold" />
                      </div>
                    )}
                  </div>
                  {!hasPrepay && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 flex gap-2">
                      <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Add a prepayment to see how much interest you could save.
                    </p>
                  )}
                  {upfront > 0 && (
                    <div className="rounded-lg border border-border p-3 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Processing fee</span><span className="font-bold">{inr(fee)}</span></div>
                      {feeGst && <div className="flex justify-between"><span className="text-muted-foreground">GST @ {C.processingFeeGstRate}%</span><span className="font-bold">{inr(feeGstAmt)}</span></div>}
                      <div className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Effective upfront cost</span><span className="font-black text-primary">{inr(upfront)}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RESULTS */}
          <div className="lg:col-span-7 space-y-5" ref={resultRef}>
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-card">
              <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Your Monthly EMI</p>
              <p className="text-4xl sm:text-5xl font-black text-primary tabular-nums mt-1" aria-live="polite">
                {valid ? inr(Math.round(active.emi)) : "—"}
                <span className="text-base font-bold text-muted-foreground"> /month</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <Stat label="Principal" value={valid ? inr(amount) : "—"} />
                <Stat label="Total Interest" value={valid ? inr(Math.round(active.totalInterest)) : "—"} accent="text-loss" />
                <Stat label="Total Payable" value={valid ? inr(Math.round(active.totalPayment)) : "—"} />
                <Stat label="Interest Share" value={valid ? `${interestShare.toFixed(1)}%` : "—"} sub="of total payment" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Stat label="Loan Tenure" value={monthsToLabel(active.months)} sub={hasPrepay ? "after prepayments" : undefined} />
                <Stat label="Interest Rate" value={`${rate}% p.a.`} sub="reducing balance" />
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                <button onClick={share} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                  <Share2 className="h-4 w-4" aria-hidden /> {shared ? "Link copied" : "Share"}
                </button>
                <button onClick={downloadCsv} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-bold hover:bg-muted transition-colors">
                  <Download className="h-4 w-4" aria-hidden /> Download Schedule
                </button>
                <button onClick={() => window.print()} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-bold hover:bg-muted transition-colors">
                  <Printer className="h-4 w-4" aria-hidden /> Print
                </button>
              </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
                <h2 className="text-sm font-black text-foreground mb-3 flex items-center gap-2"><PiggyBank className="h-4 w-4 text-primary" aria-hidden /> Loan Payment Breakdown</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={52} outerRadius={78} strokeWidth={2} isAnimationActive={false}>
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--loss))" />
                    </Pie>
                    <Tooltip formatter={(v: number) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" aria-hidden />Principal {inrCompact(amount)}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-loss" aria-hidden />Interest {inrCompact(active.totalInterest)}</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
                <h2 className="text-sm font-black text-foreground mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" aria-hidden /> Yearly Outstanding Balance</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={balanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => inrCompact(v)} width={52} />
                    <Tooltip formatter={(v: number) => inr(v)} />
                    <Area type="monotone" dataKey="balance" name="Outstanding" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PREPAYMENT COMPARISON */}
            {hasPrepay && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-card overflow-x-auto">
                <h2 className="text-sm font-black text-foreground mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-gain" aria-hidden /> Prepayment Impact</h2>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 font-semibold">Metric</th><th className="py-2 font-semibold">Original</th><th className="py-2 font-semibold">With Prepayment</th>
                  </tr></thead>
                  <tbody className="tabular-nums">
                    <tr className="border-b border-border"><td className="py-2 text-muted-foreground">Loan Tenure</td><td className="font-bold">{monthsToLabel(base.months)}</td><td className="font-bold text-gain">{monthsToLabel(withPrepay.months)}</td></tr>
                    <tr className="border-b border-border"><td className="py-2 text-muted-foreground">Total Interest</td><td className="font-bold">{inr(base.totalInterest)}</td><td className="font-bold text-gain">{inr(withPrepay.totalInterest)}</td></tr>
                    <tr className="border-b border-border"><td className="py-2 text-muted-foreground">Total Repayment</td><td className="font-bold">{inr(base.totalPayment)}</td><td className="font-bold">{inr(withPrepay.totalPayment)}</td></tr>
                    <tr><td className="py-2 text-muted-foreground">Interest Saved</td><td>—</td><td className="font-black text-gain">{inr(base.totalInterest - withPrepay.totalInterest)} · {monthsToLabel(base.months - withPrepay.months)} saved</td></tr>
                  </tbody>
                </table>
                <p className="text-[11px] text-muted-foreground mt-3">Actual lender terms, prepayment charges and reset rules may differ.</p>
              </div>
            )}
          </div>
        </section>

        {/* WHAT IF */}
        <section aria-label="What if simulations" className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: "If the rate rises by 1%", a: `${inr(active.emi)} → ${inr(emiRatePlus1)}`, s: `EMI increases by ${inr(emiRatePlus1 - base.emi)} per month` },
            { t: "If tenure is 2 years shorter", a: `${inr(base.emi)} → ${inr(emiShorter)}`, s: `Interest saved ${inr(Math.max(base.totalInterest - shorterInterest, 0))}` },
            { t: "If you prepay ₹1 lakh", a: `${inr(Math.max(base.totalInterest - prepay1L.totalInterest, 0))} saved`, s: `Tenure reduced by ${monthsToLabel(Math.max(base.months - prepay1L.months, 0))}` },
          ].map((w) => (
            <div key={w.t} className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-primary" aria-hidden />{w.t}</p>
              <p className="text-lg font-black text-foreground mt-2 tabular-nums">{w.a}</p>
              <p className="text-xs text-muted-foreground mt-1">{w.s}</p>
            </div>
          ))}
        </section>

        {/* AMORTIZATION */}
        <section className="mt-6 bg-card border border-border rounded-2xl shadow-card">
          <button onClick={() => { setSchedOpen(!schedOpen); if (!schedOpen) track("amortization_opened"); }}
            aria-expanded={schedOpen} className="w-full flex items-center justify-between p-5">
            <span className="text-sm font-black text-foreground flex items-center gap-2"><Table2 className="h-4 w-4 text-primary" aria-hidden /> View Amortization Schedule</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${schedOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {schedOpen && (
            <div className="px-5 pb-5">
              <div className="inline-flex rounded-lg border border-border overflow-hidden mb-4" role="group" aria-label="Schedule view">
                {(["yearly", "monthly"] as const).map((v) => (
                  <button key={v} aria-pressed={schedView === v} onClick={() => setSchedView(v)}
                    className={`h-9 px-4 text-xs font-bold capitalize ${schedView === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{v}</button>
                ))}
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs sm:text-sm tabular-nums">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left text-muted-foreground">
                      {schedView === "yearly"
                        ? ["Year", "Opening", "Principal", "Interest", "Closing"].map((h) => <th key={h} className="py-2 px-3 font-semibold whitespace-nowrap">{h}</th>)
                        : ["Month", "EMI", "Principal", "Interest", "Balance"].map((h) => <th key={h} className="py-2 px-3 font-semibold whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {schedView === "yearly"
                      ? years.map((y) => (
                        <tr key={y.year} className="border-t border-border">
                          <td className="py-2 px-3 font-bold">{y.year}</td>
                          <td className="py-2 px-3">{inr(y.opening)}</td>
                          <td className="py-2 px-3 text-primary font-semibold">{inr(y.principal + y.prepayment)}</td>
                          <td className="py-2 px-3 text-loss">{inr(y.interest)}</td>
                          <td className="py-2 px-3 font-semibold">{inr(y.closing)}</td>
                        </tr>))
                      : active.rows.map((r) => (
                        <tr key={r.month} className="border-t border-border">
                          <td className="py-2 px-3 font-bold">{r.month}</td>
                          <td className="py-2 px-3">{inr(r.emi + r.prepayment)}</td>
                          <td className="py-2 px-3 text-primary font-semibold">{inr(r.principal + r.prepayment)}</td>
                          <td className="py-2 px-3 text-loss">{inr(r.interest)}</td>
                          <td className="py-2 px-3 font-semibold">{inr(r.balance)}</td>
                        </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* SCENARIO COMPARISON */}
        <section className="mt-6 bg-card border border-border rounded-2xl p-5 shadow-card">
          <h2 className="text-sm font-black text-foreground mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" aria-hidden /> Compare Loan Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((s, i) => {
              const e = calcEMI(s.amount, s.rate, s.years * 12);
              const total = e * s.years * 12;
              return (
                <div key={i} className="rounded-xl border border-border p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-primary mb-3">Scenario {String.fromCharCode(65 + i)}</p>
                  <div className="space-y-2">
                    {([["Amount", "amount", 10000], ["Rate %", "rate", 0.05], ["Years", "years", 1]] as const).map(([lbl, key, step]) => (
                      <label key={key} className="block">
                        <span className="text-[11px] text-muted-foreground">{lbl}</span>
                        <input type="number" min={0} step={step} value={s[key]}
                          onChange={(e2) => { const v = Math.max(0, safeNum(e2.target.value)); setScenarios(scenarios.map((x, j) => j === i ? { ...x, [key]: v } : x)); track("scenario_comparison_used"); }}
                          className="w-full h-10 rounded-lg border border-border bg-background px-2 text-sm font-semibold" />
                      </label>
                    ))}
                  </div>
                  <dl className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs tabular-nums">
                    <div className="flex justify-between"><dt className="text-muted-foreground">EMI</dt><dd className="font-black text-primary">{inr(e)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Total Interest</dt><dd className="font-bold text-loss">{inr(total - s.amount)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Total Payment</dt><dd className="font-bold">{inr(total)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Tenure</dt><dd className="font-bold">{monthsToLabel(s.years * 12)}</dd></div>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>

        {/* RELATED CALCULATORS */}
        <section className="mt-8">
          <h2 className="text-lg font-black text-foreground mb-4">Related Calculators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RELATED_CALCULATORS.map((c) => (
              <Link key={c.href} to={c.href} onClick={() => track("related_calculator_clicked", { target: c.href })}
                className="group bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-card transition-all">
                <p className="font-bold text-sm text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Calculate <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" aria-hidden /></span>
              </Link>
            ))}
          </div>
        </section>

        {/* SEO CONTENT */}
        <article className="mt-10 bg-card border border-border rounded-2xl p-5 sm:p-8 shadow-card">
          {EMI_SECTIONS.map((sec) => (
            <section key={sec.h2} className="mb-8 last:mb-0">
              <h2 className="text-xl font-black text-foreground mb-3">{sec.h2}</h2>
              {sec.body.map((p, i) => <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3">{p}</p>)}
              {sec.h3?.map((s) => (
                <div key={s.h} className="mb-3">
                  <h3 className="text-sm font-bold text-foreground">{s.h}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.p}</p>
                </div>
              ))}
            </section>
          ))}

          <section className="mb-8">
            <h2 className="text-xl font-black text-foreground mb-3">Sample EMI Table</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">Sample monthly EMI for common loan amounts at 8% interest</caption>
                <thead className="bg-muted text-left text-xs text-muted-foreground">
                  <tr>{["Loan Amount", "Interest Rate", "Tenure", "Monthly EMI"].map((h) => <th key={h} className="py-2 px-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {emiTable.map((r) => (
                    <tr key={r.amt} className="border-t border-border">
                      <td className="py-2 px-3 font-semibold">{inrCompact(r.amt)}</td>
                      <td className="py-2 px-3">{r.r}%</td>
                      <td className="py-2 px-3">{r.y} years</td>
                      <td className="py-2 px-3 font-black text-primary">{inr(r.emi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-foreground mb-4">Frequently Asked Questions</h2>
            <div className="divide-y divide-border border-y border-border">
              {EMI_FAQS.map((f, i) => (
                <div key={f.q}>
                  <h3>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}
                      className="w-full flex items-center justify-between gap-3 text-left py-3.5 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                      {f.q}
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                  </h3>
                  {openFaq === i && <p className="text-sm text-muted-foreground leading-relaxed pb-4">{f.a}</p>}
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-8 pt-6 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground">
              Methodology: reducing-balance EMI formula, computed entirely in your browser. No loan data leaves your device.
              Calculator methodology reviewed: {new Date(C.methodologyReviewed).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
            </p>
            <p className="text-xs text-muted-foreground">{EMI_DISCLAIMER}</p>
            <p className="text-xs text-muted-foreground">
              <Link to="/about" className="text-primary font-semibold hover:underline">About Investing IQ</Link>
              {" · "}
              <Link to="/contact" className="text-primary font-semibold hover:underline">Contact</Link>
              {" · "}
              <Link to="/tools" className="text-primary font-semibold hover:underline">All Calculators</Link>
            </p>
            <ComplianceDisclaimer variant="card" />
          </footer>
        </article>
      </main>

      {/* MOBILE STICKY RESULT */}
      {C.features.mobileStickyBar && !barDismissed && valid && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">EMI</p>
            <p className="text-base font-black text-primary tabular-nums leading-tight">{inr(Math.round(active.emi))}<span className="text-[11px] text-muted-foreground font-bold">/mo</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="h-10 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold">View Breakdown</button>
            <button onClick={() => setBarDismissed(true)} aria-label="Dismiss EMI bar"
              className="h-10 w-10 rounded-lg border border-border text-muted-foreground text-lg leading-none">×</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
