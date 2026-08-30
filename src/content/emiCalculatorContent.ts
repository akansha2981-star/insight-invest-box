/**
 * SEO copy for the EMI Calculator page.
 * Content team can edit this file without touching calculation logic.
 */

export const EMI_META = {
  title: "EMI Calculator – Calculate Loan EMI, Interest & Total Payment | Investing IQ",
  description:
    "Calculate your monthly loan EMI, total interest and total repayment instantly. Use Investing IQ's free EMI Calculator for home, personal, car and other loans.",
  h1: "EMI Calculator",
  subtitle: "Calculate Your Monthly Loan EMI, Interest & Total Repayment",
  intro:
    "Enter your loan amount, interest rate and tenure to see your monthly EMI, total interest and total repayment instantly. The EMI calculator works for home, personal, car, education and business loans.",
};

export const EMI_SECTIONS: { h2: string; body: string[]; h3?: { h: string; p: string }[] }[] = [
  {
    h2: "What Is an EMI?",
    body: [
      "EMI stands for Equated Monthly Installment — the fixed amount you pay your lender every month until the loan is fully repaid. Each EMI has two parts: interest on the outstanding balance and repayment of principal.",
      "In the early months most of the EMI goes towards interest. As the outstanding balance falls, the principal share rises while the EMI stays the same.",
    ],
  },
  {
    h2: "How Does an EMI Calculator Work?",
    body: [
      "An EMI calculator uses three inputs to compute your monthly outgo:",
    ],
    h3: [
      { h: "Principal", p: "The loan amount you borrow. A higher principal raises both the EMI and the total interest." },
      { h: "Interest Rate", p: "The annual rate charged by the lender, converted to a monthly rate inside the formula." },
      { h: "Loan Tenure", p: "The repayment period in months. A longer tenure lowers the EMI but increases total interest." },
    ],
  },
  {
    h2: "EMI Formula",
    body: [
      "EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)",
      "P is the principal, r is the monthly interest rate (annual rate ÷ 12 ÷ 100) and n is the number of monthly installments. When the interest rate is zero, EMI is simply principal divided by the number of months.",
    ],
  },
  {
    h2: "How to Calculate EMI",
    body: [
      "Take a ₹10,00,000 loan at 8.5% per annum for 10 years. The monthly rate is 8.5 ÷ 12 ÷ 100 = 0.00708 and the number of installments is 120.",
      "Applying the formula gives an EMI of about ₹12,399. Over 120 months you repay roughly ₹14,87,880, of which about ₹4,87,880 is interest.",
    ],
  },
  {
    h2: "Factors That Affect EMI",
    body: [],
    h3: [
      { h: "How Loan Tenure Affects EMI", p: "A longer tenure spreads repayment over more months, so the EMI falls — but you pay interest for longer, so total interest rises. A shorter tenure means a higher EMI and lower total interest." },
      { h: "How Interest Rate Affects EMI", p: "Even a 0.25% change in rate moves the EMI and can change total interest by a large amount on long-tenure loans. Floating-rate loans usually adjust tenure rather than EMI when rates move." },
      { h: "Down Payment", p: "A larger down payment reduces the principal, which lowers both the EMI and the total interest outgo." },
    ],
  },
  {
    h2: "EMI Amortization",
    body: [
      "Amortization shows how each EMI splits between interest and principal across the loan. Early instalments are interest-heavy; later ones are principal-heavy.",
      "Reviewing the amortization schedule helps you judge when prepayment is most effective — prepaying early saves far more interest than prepaying near the end of the loan.",
    ],
  },
  {
    h2: "How to Reduce Your EMI",
    body: [
      "Options commonly used by borrowers include negotiating or refinancing to a lower interest rate, extending the tenure (which lowers the EMI but raises total interest), making a larger down payment, and making part-prepayments to reduce the outstanding principal.",
      "Each option has trade-offs, and lender policies on prepayment charges and refinancing differ. Compare the total cost, not just the monthly EMI.",
    ],
  },
];

export const EMI_FAQS: { q: string; a: string }[] = [
  { q: "What is EMI?", a: "EMI is the fixed monthly amount paid to a lender that covers both interest and principal until the loan is repaid in full." },
  { q: "How is EMI calculated?", a: "Using EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P is the principal, r is the monthly interest rate and n is the number of monthly installments." },
  { q: "What happens if I increase my loan tenure?", a: "Your monthly EMI falls because repayment is spread over more months, but you pay interest for longer, so the total interest increases." },
  { q: "Does a higher interest rate increase EMI?", a: "Yes. A higher rate increases the interest component of every installment, raising both the EMI and the total repayment." },
  { q: "Can I use the EMI calculator for a home loan?", a: "Yes. The same reducing-balance formula applies to home loans. Enter the sanctioned amount, the offered rate and the tenure." },
  { q: "Can I calculate personal loan EMI?", a: "Yes. Personal loans use the same formula, usually with shorter tenures and higher interest rates than home loans." },
  { q: "Can I calculate car loan EMI?", a: "Yes. Enter the on-road price minus your down payment as the loan amount, along with the rate and tenure offered by the lender." },
  { q: "Can I calculate total interest payable?", a: "Yes. The calculator shows total interest as total repayment minus the principal, along with interest as a share of total payment." },
  { q: "How does loan prepayment affect EMI?", a: "Most lenders keep the EMI unchanged and shorten the tenure after a part-prepayment, which reduces the total interest. Some allow EMI reduction instead." },
  { q: "Is EMI fixed for the entire loan?", a: "On fixed-rate loans the EMI stays the same. On floating-rate loans, the EMI or tenure may change when the benchmark rate changes." },
  { q: "What happens when interest rates change on floating-rate loans?", a: "Lenders typically adjust the tenure first while keeping the EMI constant. If the tenure cannot be extended further, the EMI is revised." },
  { q: "Does the EMI calculator include processing fees?", a: "Processing fee is an optional input. It is shown as an upfront cost with GST where applicable and is not added to the EMI unless your lender capitalises it." },
  { q: "How accurate is an EMI calculator?", a: "The mathematics is exact for reducing-balance loans. Actual figures may differ because of disbursement dates, insurance, fees and lender rounding." },
  { q: "Can I compare two loans?", a: "Yes. Use the scenario comparison to place up to three combinations of amount, rate and tenure side by side." },
];

export const EMI_DISCLAIMER =
  "This calculator provides estimates for informational purposes only. Actual EMI, interest, fees and repayment terms may vary by lender and loan agreement.";

/** Only link to pages that exist. */
export const RELATED_CALCULATORS: { name: string; desc: string; href: string }[] = [
  { name: "SIP Calculator", desc: "Project mutual fund SIP returns over any horizon.", href: "/tools/sip" },
  { name: "Lumpsum Calculator", desc: "See how a one-time investment grows over time.", href: "/tools/lumpsum-calculator" },
  { name: "FD Calculator", desc: "Calculate fixed deposit maturity value and interest.", href: "/tools/fd" },
  { name: "Income Tax Calculator", desc: "Compare old and new regime tax liability.", href: "/tools/tax" },
  { name: "Retirement SIP Calculator", desc: "Estimate the monthly SIP needed for retirement.", href: "/tools/retirement-sip" },
  { name: "FIRE Calculator", desc: "Find the corpus needed for financial independence.", href: "/tools/fire-calculator" },
  { name: "Goal SIP Calculator", desc: "Work backwards from a target amount to a monthly SIP.", href: "/tools/goal-sip" },
  { name: "SWP Calculator", desc: "Plan systematic withdrawals from your corpus.", href: "/tools/swp-calculator" },
];
