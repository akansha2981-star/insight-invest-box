import SEOLandingTemplate from "@/components/mf/SEOLandingTemplate";

export const BestMutualFunds2026 = () => <SEOLandingTemplate slug="best-mutual-funds-2026"
  title="Best Mutual Funds 2026 — Top 10 Picks by Returns | InvestingIQ"
  h1="Best Mutual Funds to Invest in 2026"
  description="Discover the top 10 best-performing Indian mutual funds for 2026 across categories. Compare returns, AUM, expense and ratings."
  intro="The Indian mutual fund industry has grown to over ₹68 lakh crore in 2026, with strong returns across equity categories. This ranking highlights the top 10 funds based on 1-year returns combined with risk-adjusted metrics and consistency over the past 5 years."
  source="funds" sortKey="return_1y"
  faqs={[
    { q: "Are these funds suitable for SIP?", a: "Most equity funds in this list are suitable for SIP investments with a 5+ year horizon. ELSS funds have a 3-year lock-in." },
    { q: "How are funds ranked?", a: "Funds are ranked by 1-year returns. Always check 3Y/5Y CAGR, expense ratio, fund manager track record and risk before investing." },
    { q: "Is past performance a guarantee?", a: "No. Past performance does not guarantee future returns. Diversify across categories and time horizons." },
  ]}
/>;

export const BestSIPFunds = () => <SEOLandingTemplate slug="best-sip-funds"
  title="Best SIP Mutual Funds 2026 | InvestingIQ"
  h1="Best Mutual Funds for SIP in 2026"
  description="Top mutual funds for SIP investment with strong 5-year CAGR and proven consistency."
  intro="SIP investing benefits from rupee cost averaging and compounding. This list features funds with consistent 5-year returns above 15% CAGR and high investor ratings."
  source="funds" sortKey="return_5y"
  filterFn={(f) => f.category === "Equity" && Number(f.return_5y) > 10}
  faqs={[
    { q: "What is the minimum SIP amount?", a: "Most funds allow SIP starting from ₹500/month. Some AMCs offer micro-SIPs from ₹100." },
    { q: "How long should I run my SIP?", a: "For equity funds, hold for 5+ years to maximize compounding and minimize volatility." },
  ]}
/>;

export const BestELSSFunds = () => <SEOLandingTemplate slug="best-elss-funds"
  title="Best ELSS Tax Saving Funds 2026 | InvestingIQ"
  h1="Best ELSS Funds for Tax Saving in 2026"
  description="Top ELSS mutual funds offering 80C tax deduction up to ₹1.5L with strong wealth creation potential."
  intro="ELSS (Equity Linked Savings Scheme) funds offer tax deduction under Section 80C with the shortest lock-in of 3 years. They invest predominantly in equity, offering market-linked returns alongside tax benefits."
  source="funds" sortKey="return_3y" filterFn={(f) => f.is_elss}
  faqs={[
    { q: "What is the ELSS lock-in period?", a: "ELSS funds have a 3-year lock-in — the shortest among 80C tax-saving instruments." },
    { q: "How much tax can I save?", a: "Investments up to ₹1.5 lakh in ELSS are deductible under Section 80C, saving up to ₹46,800 in taxes (30% bracket)." },
  ]}
/>;

export const BestSmallCapFunds = () => <SEOLandingTemplate slug="best-small-cap-funds"
  title="Best Small Cap Mutual Funds 2026 | InvestingIQ"
  h1="Best Small Cap Funds in India 2026"
  description="Top small cap mutual funds with explosive growth potential. Suitable for aggressive long-term investors."
  intro="Small cap funds invest in companies ranked beyond 250 by market cap. They carry high volatility but offer the highest growth potential — 5-year CAGR of 25-30% is common in this category."
  source="funds" sortKey="return_5y" filterFn={(f) => f.sub_category === "Small Cap"}
  faqs={[
    { q: "Are small cap funds risky?", a: "Yes — they can drop 30-50% in a downturn but recover strongly. Only invest with a 7+ year horizon and high risk tolerance." },
    { q: "How much should I allocate?", a: "Most advisors suggest 10-25% of equity allocation to small caps for aggressive investors under 40." },
  ]}
/>;

export const BestIndexFunds = () => <SEOLandingTemplate slug="best-index-funds"
  title="Best Index Funds 2026 — Low Cost Passive Investing | InvestingIQ"
  h1="Best Index Mutual Funds in India 2026"
  description="Lowest-cost Nifty 50 and Nifty Next 50 index funds with minimal tracking error."
  intro="Index funds passively track a benchmark like the Nifty 50, offering market returns at very low expense ratios (0.10-0.50%). Ideal for long-term wealth creation with minimal manager risk."
  source="funds" sortKey="expense_ratio" filterFn={(f) => f.sub_category === "Index"}
  faqs={[
    { q: "Are index funds better than active funds?", a: "Studies show 60-80% of active large cap funds underperform the index over 10 years after fees. Index funds offer reliable market returns." },
  ]}
/>;

export const BestETFsIndia = () => <SEOLandingTemplate slug="best-etfs-india"
  title="Best ETFs in India 2026 | InvestingIQ"
  h1="Best ETFs in India for 2026"
  description="Top exchange-traded funds in India by AUM, liquidity and tracking accuracy."
  intro="ETFs combine the diversification of mutual funds with stock-like real-time trading. India's ETF market crossed ₹8.5 lakh crore in 2026."
  source="etfs" sortKey="aum_cr"
  faqs={[
    { q: "Are ETFs better than index funds?", a: "ETFs trade in real-time and often have lower expense ratios, but require a Demat account and active liquidity." },
  ]}
/>;

export const GoldETFvsPhysical = () => <SEOLandingTemplate slug="gold-etf-vs-physical-gold"
  title="Gold ETF vs Physical Gold — Which is Better in 2026? | InvestingIQ"
  h1="Gold ETF vs Physical Gold"
  description="Detailed comparison of Gold ETFs vs physical gold for Indian investors in 2026."
  intro="Gold remains a critical portfolio diversifier in India. Investors now have multiple options: physical gold (coins/jewelry), Gold ETFs, Gold MFs, and Sovereign Gold Bonds (SGBs)."
  source="etfs" sortKey="aum_cr" filterFn={(f) => f.sub_class === "Gold"}
  compareTable={{
    col1: "Gold ETF", col2: "Physical Gold",
    rows: [
      ["Purity", "99.5% guaranteed (LBMA)", "Varies; risk of impurity"],
      ["Storage", "Demat — no storage cost", "Locker / safe required"],
      ["Liquidity", "Sell anytime in market hours", "Jewelers charge markdown"],
      ["Cost", "Expense 0.4-0.8%", "Making charges 8-25%"],
      ["Tax", "LTCG 12.5% after 2 years", "LTCG 20% with indexation"],
      ["Minimum Investment", "1 unit (~₹60)", "1 gram (~₹6,000)"],
    ],
  }}
  faqs={[
    { q: "Which is better — Gold ETF or SGB?", a: "SGB pays 2.5% interest annually + tax-free capital gains at maturity (after 8 years), but is illiquid. Gold ETFs offer better liquidity." },
  ]}
/>;

export const ETFvsMutualFund = () => <SEOLandingTemplate slug="etf-vs-mutual-fund"
  title="ETF vs Mutual Fund — Detailed Comparison 2026 | InvestingIQ"
  h1="ETF vs Mutual Fund"
  description="ETF vs Mutual Fund comparison: costs, liquidity, taxation, ease of investing."
  intro="Both ETFs and mutual funds offer pooled investments, but differ in how they're bought, sold and priced. The right choice depends on your investing style."
  source="compare"
  compareTable={{
    col1: "ETF", col2: "Mutual Fund",
    rows: [
      ["Trading", "Real-time on exchange", "EOD NAV-based"],
      ["Demat Required", "Yes", "No"],
      ["Expense Ratio", "0.05-0.50%", "0.30-2.00%"],
      ["Minimum Investment", "1 unit (price varies)", "₹500 SIP / ₹5,000 lumpsum"],
      ["SIP Available", "Limited", "Yes — flexible"],
      ["Liquidity", "Intra-day", "T+1 / T+3 redemption"],
      ["Management", "Mostly passive (index)", "Active or passive"],
    ],
  }}
  faqs={[{ q: "Can I SIP in ETFs?", a: "Some brokers allow ETF SIPs, but they're less seamless than mutual fund SIPs. For automated investing, MF SIPs remain easier." }]}
/>;

export const SIPvsLumpsum = () => <SEOLandingTemplate slug="sip-vs-lumpsum"
  title="SIP vs Lumpsum — Which is Better in 2026? | InvestingIQ"
  h1="SIP vs Lumpsum Investing"
  description="SIP vs Lumpsum: pros, cons and when each strategy works best."
  intro="The SIP vs Lumpsum debate is one of the most common questions in mutual fund investing. The right answer depends on market conditions, your cash flow, and behavioral comfort."
  source="compare"
  compareTable={{
    col1: "SIP", col2: "Lumpsum",
    rows: [
      ["Timing", "Removes market timing risk", "Requires good entry timing"],
      ["Cash Flow", "Suits monthly salary", "Needs large upfront capital"],
      ["Volatility", "Rupee cost averaging smooths it", "Vulnerable to short-term drops"],
      ["Returns (bull market)", "Lower than lumpsum", "Higher if entered early"],
      ["Returns (sideways/bear)", "Higher", "Lower"],
      ["Discipline", "Forces consistent investing", "Requires willpower"],
    ],
  }}
  faqs={[{ q: "What if I have a lumpsum and want to invest safely?", a: "Use a STP (Systematic Transfer Plan) — park lumpsum in a liquid fund and transfer monthly to equity. Combines lumpsum's deployment with SIP's risk management." }]}
/>;
