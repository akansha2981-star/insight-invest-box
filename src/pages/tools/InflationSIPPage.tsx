import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function InflationSIPPage() {
  return <CalculatorTemplate
    title="Inflation-Adjusted SIP Calculator"
    subtitle="See your real returns after inflation"
    metaTitle="Inflation Adjusted SIP Calculator | InvestingIQ"
    metaDescription="Calculate real (inflation-adjusted) SIP returns. Understand your true wealth in today's rupees."
    canonical="https://www.investingiq.in/tools/inflation-sip"
    gradient="from-orange-600 to-red-700"
    fields={[
      { key: "sip", label: "Monthly SIP", default: 10000, min: 500, max: 200000, step: 500, prefix: "₹" },
      { key: "rate", label: "Nominal Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
      { key: "inflation", label: "Inflation %", default: 6, min: 0, max: 15, step: 0.5, suffix: "%" },
      { key: "years", label: "Years", default: 20, min: 1, max: 40 },
    ]}
    compute={({ sip, rate, inflation, years }) => {
      const r = rate / 100 / 12, n = years * 12;
      const nominalFV = r > 0 ? sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : sip * n;
      const realRate = ((1 + rate / 100) / (1 + inflation / 100) - 1) * 100;
      const rr = realRate / 100 / 12;
      const realFV = rr > 0 ? sip * ((Math.pow(1 + rr, n) - 1) / rr) * (1 + rr) : sip * n;
      return [
        { label: "Nominal Future Value", value: Math.round(nominalFV), isCurrency: true },
        { label: "Real Future Value (today's ₹)", value: Math.round(realFV), isCurrency: true, accent: "text-orange-600" },
        { label: "Real Annual Return", value: Number(realRate.toFixed(2)) },
      ];
    }}
    faqs={[{ q: "Why does inflation matter?", a: "₹1 crore in 25 years at 6% inflation has only the buying power of ~₹23 lakhs today." }]}
  />;
}
