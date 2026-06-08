import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function RetirementSIPPage() {
  return <CalculatorTemplate
    title="Retirement SIP Planner"
    subtitle="Plan your retirement corpus with monthly SIP"
    metaTitle="Retirement SIP Calculator | InvestingIQ"
    metaDescription="Plan retirement corpus. Calculate required monthly SIP for a comfortable post-retirement life."
    canonical="https://www.investingiq.in/tools/retirement-sip"
    gradient="from-amber-600 to-orange-700"
    fields={[
      { key: "currentAge", label: "Current Age", default: 30, min: 20, max: 60 },
      { key: "retireAge", label: "Retirement Age", default: 60, min: 40, max: 75 },
      { key: "expense", label: "Monthly Expense Today", default: 50000, min: 10000, max: 1000000, step: 5000, prefix: "₹" },
      { key: "inflation", label: "Inflation %", default: 6, min: 1, max: 15, step: 0.5, suffix: "%" },
      { key: "rate", label: "Expected Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
    ]}
    compute={({ currentAge, retireAge, expense, inflation, rate }) => {
      const years = retireAge - currentAge;
      const futureMonthly = expense * Math.pow(1 + inflation / 100, years);
      const corpus = futureMonthly * 12 * 25; // 25x rule
      const r = rate / 100 / 12, n = years * 12;
      const sip = r > 0 ? corpus * r / ((Math.pow(1 + r, n) - 1) * (1 + r)) : corpus / n;
      return [
        { label: "Years to Retirement", value: years },
        { label: "Monthly Expense at Retirement", value: Math.round(futureMonthly), isCurrency: true },
        { label: "Required Corpus (25x rule)", value: Math.round(corpus), isCurrency: true, accent: "text-amber-600" },
        { label: "Required Monthly SIP", value: Math.round(sip), isCurrency: true, accent: "text-primary" },
      ];
    }}
    faqs={[
      { q: "What is the 25x retirement rule?", a: "A common guideline that your retirement corpus should be 25x your annual expenses to safely withdraw 4% annually for 30+ years." },
    ]}
  />;
}
