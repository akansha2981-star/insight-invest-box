// Static / non-DB pages exposed to global search
export type StaticPage = {
  title: string;
  subtitle: string;
  href: string;
  category: "Tools" | "Sections" | "Company" | "Guides";
  keywords: string[];
};

export const STATIC_PAGES: StaticPage[] = [
  // Tools / Calculators
  { title: "SIP Calculator", subtitle: "Calculate mutual fund SIP returns", href: "/tools/sip", category: "Tools", keywords: ["sip", "calculator", "mutual fund", "investment", "returns"] },
  { title: "EMI Calculator", subtitle: "Home, car & personal loan EMI", href: "/calculators/emi-calculator", category: "Tools", keywords: ["emi", "loan", "calculator", "home loan", "car loan", "interest"] },
  { title: "FD Calculator", subtitle: "Fixed deposit maturity calculator", href: "/tools/fd", category: "Tools", keywords: ["fd", "fixed deposit", "calculator", "maturity", "interest"] },
  { title: "Income Tax Calculator", subtitle: "Old vs new regime tax calculator", href: "/tools/tax", category: "Tools", keywords: ["tax", "income tax", "calculator", "regime", "deduction"] },
  { title: "Stock Screener", subtitle: "Filter stocks by criteria", href: "/tools/screener", category: "Tools", keywords: ["screener", "filter", "stock", "pe", "marketcap"] },
  { title: "Portfolio Tester", subtitle: "Backtest your portfolio", href: "/tools/portfolio", category: "Tools", keywords: ["portfolio", "backtest", "tester"] },

  // Major sections
  { title: "Markets Overview", subtitle: "Indices, sectors, FII/DII", href: "/markets", category: "Sections", keywords: ["market", "indices", "sensex", "nifty", "fii", "dii"] },
  { title: "Stocks", subtitle: "Live quotes & analysis", href: "/stocks", category: "Sections", keywords: ["stocks", "equity", "shares", "live"] },
  { title: "Stock Reviews", subtitle: "Analyst ratings & investment thesis", href: "/stocks/reviews", category: "Sections", keywords: ["review", "analysis", "rating", "buy", "sell", "hold"] },
  { title: "Mutual Funds", subtitle: "Top funds, NAV, returns", href: "/mf", category: "Sections", keywords: ["mutual fund", "mf", "nav", "etf"] },
  { title: "Crypto", subtitle: "Cryptocurrency prices & news", href: "/crypto", category: "Sections", keywords: ["crypto", "bitcoin", "ethereum", "btc", "eth"] },
  { title: "Real Estate", subtitle: "Buy, rent & PG listings", href: "/real-estate", category: "Sections", keywords: ["property", "real estate", "buy", "rent", "pg", "flat", "apartment", "bhk"] },
  { title: "Economy", subtitle: "GDP, inflation, RBI policy", href: "/economy", category: "Sections", keywords: ["economy", "gdp", "inflation", "rbi", "repo"] },
  { title: "News & Analysis", subtitle: "Breaking market news", href: "/news", category: "Sections", keywords: ["news", "latest", "update", "analysis", "budget"] },
  { title: "Portfolio", subtitle: "Track your investments", href: "/portfolio", category: "Sections", keywords: ["portfolio", "holdings", "watchlist"] },

  // Company
  { title: "About Us", subtitle: "About InvestingIQ", href: "/about", category: "Company", keywords: ["about", "company", "team"] },
  { title: "Careers", subtitle: "Join our team", href: "/careers", category: "Company", keywords: ["career", "jobs", "hiring"] },
  { title: "Contact", subtitle: "Get in touch", href: "/contact", category: "Company", keywords: ["contact", "support", "help"] },
  { title: "Privacy Policy", subtitle: "How we handle your data", href: "/privacy", category: "Company", keywords: ["privacy", "policy", "data"] },
  { title: "Terms of Service", subtitle: "Terms & conditions", href: "/terms", category: "Company", keywords: ["terms", "conditions", "legal"] },
  { title: "Sitemap", subtitle: "All pages", href: "/sitemap", category: "Company", keywords: ["sitemap", "pages"] },
];

export function searchStaticPages(query: string, limit = 4): StaticPage[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return STATIC_PAGES.filter(p => {
    return (
      p.title.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q) || q.includes(k))
    );
  }).slice(0, limit);
}
