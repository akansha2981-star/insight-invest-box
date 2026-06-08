import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function SWPCalculatorPage() {
  return <CalculatorTemplate
    title="SWP Calculator"
    subtitle="Systematic Withdrawal Plan"
    metaTitle="SWP Calculator | InvestingIQ"
    metaDescription="Calculate how long your corpus will last with a systematic monthly withdrawal."
    canonical="https://www.investingiq.in/tools/swp-calculator"
    gradient="from-teal-600 to-emerald-700"
    fields={[
      { key: "corpus", label: "Corpus", default: 5000000, min: 100000, max: 1000000000, step: 100000, prefix: "₹" },
      { key: "withdrawal", label: "Monthly Withdrawal", default: 30000, min: 1000, max: 10000000, step: 1000, prefix: "₹" },
      { key: "rate", label: "Expected Return %", default: 10, min: 1, max: 25, step: 0.5, suffix: "%" },
    ]}
    compute={({ corpus, withdrawal, rate }) => {
      const r = rate / 100 / 12;
      let bal = corpus, months = 0;
      while (bal > 0 && months < 600) {
        bal = bal * (1 + r) - withdrawal;
        months++;
      }
      const totalWithdrawn = withdrawal * months;
      return [
        { label: "Corpus Lasts (months)", value: months },
        { label: "Corpus Lasts (years)", value: Number((months / 12).toFixed(1)) },
        { label: "Total Withdrawn", value: Math.round(totalWithdrawn), isCurrency: true, accent: "text-teal-600" },
      ];
    }}
    faqs={[{ q: "What is SWP?", a: "Systematic Withdrawal Plan — a strategy to withdraw a fixed amount monthly from your mutual fund corpus while remainder stays invested." }]}
  />;
}
