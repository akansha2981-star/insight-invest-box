import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function FIRECalculatorPage() {
  return <CalculatorTemplate
    title="FIRE Calculator"
    subtitle="Financial Independence, Retire Early"
    metaTitle="FIRE Calculator India | InvestingIQ"
    metaDescription="Calculate your FIRE (Financial Independence Retire Early) number and the SIP required to reach it."
    canonical="https://www.investingiq.in/tools/fire-calculator"
    gradient="from-red-600 to-orange-700"
    fields={[
      { key: "expense", label: "Annual Expense", default: 600000, min: 100000, max: 10000000, step: 50000, prefix: "₹" },
      { key: "wr", label: "Safe Withdrawal Rate %", default: 4, min: 2, max: 7, step: 0.25, suffix: "%" },
      { key: "currentAge", label: "Current Age", default: 30, min: 18, max: 60 },
      { key: "fireAge", label: "Target FIRE Age", default: 45, min: 30, max: 65 },
      { key: "rate", label: "Expected Return %", default: 13, min: 1, max: 25, step: 0.5, suffix: "%" },
    ]}
    compute={({ expense, wr, currentAge, fireAge, rate }) => {
      const fire = expense * 100 / wr;
      const years = Math.max(fireAge - currentAge, 1);
      const r = rate / 100 / 12, n = years * 12;
      const sip = r > 0 ? fire * r / ((Math.pow(1 + r, n) - 1) * (1 + r)) : fire / n;
      return [
        { label: "FIRE Number", value: Math.round(fire), isCurrency: true, accent: "text-red-600" },
        { label: "Years to FIRE", value: years },
        { label: "Required Monthly SIP", value: Math.round(sip), isCurrency: true, accent: "text-primary" },
      ];
    }}
    faqs={[{ q: "What is FIRE?", a: "Financial Independence Retire Early — saving 25-30x annual expenses to live off investments forever using the 4% safe withdrawal rule." }]}
  />;
}
