export interface StockCatalogItem {
  symbol: string;
  name: string;
  sector: string;
}

export const STOCK_CATALOG: StockCatalogItem[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking" },
  { symbol: "INFY", name: "Infosys", sector: "IT" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { symbol: "WIPRO", name: "Wipro", sector: "IT" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infra" },
  { symbol: "ITC", name: "ITC", sector: "FMCG" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT" },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement" },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "FMCG" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "FMCG" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "IT" },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metal" },
  { symbol: "POWERGRID", name: "Power Grid", sector: "Power" },
  { symbol: "NTPC", name: "NTPC", sector: "Power" },
  { symbol: "ONGC", name: "ONGC", sector: "Energy" },
  { symbol: "COALINDIA", name: "Coal India", sector: "Energy" },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metal" },
  { symbol: "ADANIPORTS", name: "Adani Ports", sector: "Infra" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Finance" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Labs", sector: "Pharma" },
  { symbol: "DIVISLAB", name: "Divi's Labs", sector: "Pharma" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
  { symbol: "CIPLA", name: "Cipla", sector: "Pharma" },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Auto" },
  { symbol: "SBILIFE", name: "SBI Life", sector: "Insurance" },
  { symbol: "BPCL", name: "Bharat Petroleum", sector: "Energy" },
  { symbol: "GRASIM", name: "Grasim", sector: "Cement" },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Defence" },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Auto" },
  { symbol: "TRENT", name: "Trent", sector: "Retail" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Finance" },
  { symbol: "HDFCLIFE", name: "HDFC Life", sector: "Insurance" },
  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Finance" },
  { symbol: "TATACONSUM", name: "Tata Consumer", sector: "FMCG" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking" },
];

export const STOCK_CATALOG_BY_SYMBOL = STOCK_CATALOG.reduce<Record<string, StockCatalogItem>>((acc, item) => {
  acc[item.symbol] = item;
  return acc;
}, {});