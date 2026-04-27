// Lightweight static list used by the global search so users can find
// Mutual Funds, ETFs and Cryptocurrencies alongside stocks/articles.

export interface MFItem {
  name: string;
  category: string;
  ret1y?: string;
  href: string;
}

export interface CryptoItem {
  symbol: string;
  name: string;
  href: string;
}

export const TOP_MUTUAL_FUNDS: MFItem[] = [
  { name: "Mirae Asset Large Cap", category: "Large Cap", ret1y: "28.4%", href: "/mf" },
  { name: "Axis Bluechip Fund", category: "Large Cap", ret1y: "22.1%", href: "/mf" },
  { name: "Parag Parikh Flexi Cap", category: "Flexi Cap", ret1y: "31.6%", href: "/mf" },
  { name: "HDFC Mid-Cap Opportunities", category: "Mid Cap", ret1y: "42.8%", href: "/mf" },
  { name: "SBI Small Cap Fund", category: "Small Cap", ret1y: "38.2%", href: "/mf" },
  { name: "ICICI Pru Balanced Advantage", category: "Hybrid", ret1y: "18.2%", href: "/mf" },
  { name: "Nifty BeES", category: "ETF", ret1y: "+1.08%", href: "/mf" },
  { name: "Sensex ETF", category: "ETF", ret1y: "+1.11%", href: "/mf" },
  { name: "Gold BeES", category: "ETF", ret1y: "+0.52%", href: "/mf" },
  { name: "Bank BeES", category: "ETF", ret1y: "-0.42%", href: "/mf" },
];

export const TOP_CRYPTOS: CryptoItem[] = [
  { symbol: "BTC", name: "Bitcoin", href: "/crypto" },
  { symbol: "ETH", name: "Ethereum", href: "/crypto" },
  { symbol: "BNB", name: "BNB", href: "/crypto" },
  { symbol: "SOL", name: "Solana", href: "/crypto" },
  { symbol: "XRP", name: "XRP", href: "/crypto" },
  { symbol: "DOGE", name: "Dogecoin", href: "/crypto" },
  { symbol: "ADA", name: "Cardano", href: "/crypto" },
  { symbol: "AVAX", name: "Avalanche", href: "/crypto" },
];
