import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function LumpsumCalculatorPage() {
  return <CalculatorTemplate
    title="Lumpsum Calculator"
    subtitle="One-time investment growth"
    metaTitle="Lumpsum Investment Calculator | InvestingIQ"
    metaDescription="Calculate future value of a one-time lumpsum mutual fund investment."
    canonical="https://www.investingiq.in/tools/lumpsum-calculator"
    gradient="from-cyan-600 to-blue-700"
    fields={[
      { key: "lump", label: "Lumpsum Amount", default: 100000, min: 1000, max: 100000000, step: 1000, prefix: "₹" },
      { key: "rate", label: "Expected Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
      { key: "years", label: "Years", default: 10, min: 1, max: 40 },
    ]}
    compute={({ lump, rate, years }) => {
      const fv = lump * Math.pow(1 + rate / 100, years);
      return [
        { label: "Invested", value: Math.round(lump), isCurrency: true },
        { label: "Returns", value: Math.round(fv - lump), isCurrency: true, accent: "text-emerald-600" },
        { label: "Future Value", value: Math.round(fv), isCurrency: true, accent: "text-primary" },
      ];
    }}
    faqs={[{ q: "Lumpsum vs SIP?", a: "Lumpsum benefits from a bull market start; SIP averages out volatility. For most investors SIP is recommended." }]}
  />;
}
