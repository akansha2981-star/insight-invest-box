import CalculatorTemplate from "@/components/mf/CalculatorTemplate";
export default function ChildEducationSIPPage() {
  return <CalculatorTemplate
    title="Child Education SIP Calculator"
    subtitle="Plan your child's higher education with SIP"
    metaTitle="Child Education SIP Calculator | InvestingIQ"
    metaDescription="Calculate the SIP needed for your child's higher education, factoring in education inflation."
    canonical="https://www.investingiq.in/tools/child-education-sip"
    gradient="from-rose-600 to-pink-700"
    fields={[
      { key: "childAge", label: "Child's Current Age", default: 5, min: 0, max: 17 },
      { key: "collegeAge", label: "Age at College", default: 18, min: 16, max: 25 },
      { key: "costToday", label: "Today's Cost of Education", default: 2000000, min: 100000, max: 50000000, step: 50000, prefix: "₹" },
      { key: "inflation", label: "Education Inflation %", default: 10, min: 1, max: 20, step: 0.5, suffix: "%" },
      { key: "rate", label: "Expected Return %", default: 12, min: 1, max: 25, step: 0.5, suffix: "%" },
    ]}
    compute={({ childAge, collegeAge, costToday, inflation, rate }) => {
      const years = Math.max(collegeAge - childAge, 1);
      const futureCost = costToday * Math.pow(1 + inflation / 100, years);
      const r = rate / 100 / 12, n = years * 12;
      const sip = r > 0 ? futureCost * r / ((Math.pow(1 + r, n) - 1) * (1 + r)) : futureCost / n;
      return [
        { label: "Years Available", value: years },
        { label: "Future Education Cost", value: Math.round(futureCost), isCurrency: true, accent: "text-rose-600" },
        { label: "Required Monthly SIP", value: Math.round(sip), isCurrency: true, accent: "text-primary" },
      ];
    }}
    faqs={[{ q: "Why is education inflation higher?", a: "Education costs in India historically rise 8-12% annually, much higher than general CPI inflation." }]}
  />;
}
