import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function MarriageSIPPage() {
  return <CalculatorTemplate
    title="Marriage SIP Calculator"
    subtitle="Save for a wedding through SIP"
    metaTitle="Marriage SIP Calculator | InvestingIQ"
    metaDescription="Calculate the SIP required to fund a wedding, accounting for inflation."
    canonical="https://www.investingiq.in/tools/marriage-sip"
    gradient="from-pink-600 to-fuchsia-700"
    fields={[
      { key: "years", label: "Years to Wedding", default: 10, min: 1, max: 30 },
      { key: "costToday", label: "Today's Wedding Cost", default: 1500000, min: 100000, max: 30000000, step: 50000, prefix: "₹" },
      { key: "inflation", label: "Inflation %", default: 7, min: 1, max: 15, step: 0.5, suffix: "%" },
      { key: "rate", label: "Expected Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
    ]}
    compute={({ years, costToday, inflation, rate }) => {
      const fv = costToday * Math.pow(1 + inflation / 100, years);
      const r = rate / 100 / 12, n = years * 12;
      const sip = r > 0 ? fv * r / ((Math.pow(1 + r, n) - 1) * (1 + r)) : fv / n;
      return [{ label: "Future Wedding Cost", value: Math.round(fv), isCurrency: true }, { label: "Required Monthly SIP", value: Math.round(sip), isCurrency: true, accent: "text-primary" }];
    }}
    faqs={[{ q: "When should I start saving?", a: "Start at least 7-10 years before the wedding for SIP compounding to work effectively." }]}
  />;
}
