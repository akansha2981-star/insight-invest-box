import CalculatorTemplate from "@/components/mf/CalculatorTemplate";

export default function StepUpSIPPage() {
  return <CalculatorTemplate
    title="Step-Up SIP Calculator"
    subtitle="SIP with annual increase — grow your investment with your income"
    metaTitle="Step-Up SIP Calculator 2026 | InvestingIQ"
    metaDescription="Calculate Step-Up SIP returns. Increase your SIP annually by a fixed percentage and see how your wealth multiplies."
    canonical="https://www.investingiq.in/tools/step-up-sip"
    gradient="from-emerald-600 to-cyan-700"
    fields={[
      { key: "sip", label: "Initial Monthly SIP", default: 5000, min: 500, max: 100000, step: 500, prefix: "₹" },
      { key: "step", label: "Annual Step-Up %", default: 10, min: 0, max: 30, step: 1, suffix: "%" },
      { key: "rate", label: "Expected Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
      { key: "years", label: "Investment Years", default: 15, min: 1, max: 40, step: 1 },
    ]}
    compute={({ sip, step, rate, years }) => {
      const r = rate / 100 / 12;
      let total = 0, invested = 0, currentSip = sip;
      for (let y = 0; y < years; y++) {
        for (let m = 0; m < 12; m++) {
          const monthsLeft = (years - y) * 12 - m;
          total += currentSip * Math.pow(1 + r, monthsLeft);
          invested += currentSip;
        }
        currentSip *= 1 + step / 100;
      }
      return [
        { label: "Total Invested", value: Math.round(invested), isCurrency: true },
        { label: "Estimated Returns", value: Math.round(total - invested), isCurrency: true, accent: "text-emerald-600" },
        { label: "Future Value", value: Math.round(total), isCurrency: true, accent: "text-primary" },
      ];
    }}
    faqs={[
      { q: "What is a Step-Up SIP?", a: "A Step-Up SIP automatically increases your monthly SIP by a fixed percentage each year, helping your investment grow with your income." },
      { q: "How much faster does wealth grow with step-up?", a: "A 10% annual step-up typically grows your corpus by 30-50% more compared to a flat SIP over 15-20 years." },
    ]}
  />;
}
