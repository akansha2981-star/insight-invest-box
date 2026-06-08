import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function GoalSIPPage() {
  return <CalculatorTemplate
    title="Goal-Based SIP Calculator"
    subtitle="Find the SIP needed to reach any financial goal"
    metaTitle="Goal SIP Calculator | InvestingIQ"
    metaDescription="Calculate the monthly SIP required to reach any financial goal — home, car, vacation or education."
    canonical="https://www.investingiq.in/tools/goal-sip"
    gradient="from-purple-600 to-indigo-700"
    fields={[
      { key: "goal", label: "Goal Amount", default: 1000000, min: 100000, max: 100000000, step: 50000, prefix: "₹" },
      { key: "rate", label: "Expected Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
      { key: "years", label: "Years to Goal", default: 10, min: 1, max: 40, step: 1 },
    ]}
    compute={({ goal, rate, years }) => {
      const r = rate / 100 / 12, n = years * 12;
      const sip = r > 0 ? goal * r / ((Math.pow(1 + r, n) - 1) * (1 + r)) : goal / n;
      return [
        { label: "Required Monthly SIP", value: Math.round(sip), isCurrency: true, accent: "text-primary" },
        { label: "Total Invested", value: Math.round(sip * n), isCurrency: true },
        { label: "Wealth Gain", value: Math.round(goal - sip * n), isCurrency: true, accent: "text-emerald-600" },
      ];
    }}
    faqs={[
      { q: "What if I cannot afford the required SIP?", a: "Extend the goal timeline, increase expected returns by choosing equity-heavy funds, or use a step-up SIP." },
      { q: "Which funds are best for goal-based investing?", a: "Equity for >5 years, hybrid for 3-5 years, debt/liquid for <3 years." },
    ]}
  />;
}
