export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap?: string;
  high?: number;
  low?: number;
  open?: number;
  sector?: string;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

export const INDICES: IndexData[] = [
  { name: "SENSEX", value: 75320.45, change: 423.80, changePercent: 0.57, high: 75520.00, low: 74900.10 },
  { name: "NIFTY 50", value: 22831.20, change: 128.55, changePercent: 0.57, high: 22900.00, low: 22710.50 },
  { name: "BANK NIFTY", value: 49124.65, change: -198.30, changePercent: -0.40, high: 49400.00, low: 48950.25 },
  { name: "NIFTY IT", value: 38542.30, change: -215.10, changePercent: -0.55, high: 38800.00, low: 38400.80 },
  { name: "NIFTY MIDCAP", value: 52340.75, change: 312.40, changePercent: 0.60, high: 52500.00, low: 52100.50 },
];

// Updated with approximate Feb 2026 prices
export const TOP_GAINERS: StockData[] = [
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", price: 1407.90, change: 0.40, changePercent: 0.03, volume: "18.2M", sector: "Banking" },
  { symbol: "RELIANCE", name: "Reliance Industries", price: 1440.20, change: 17.20, changePercent: 1.21, volume: "22.5M", sector: "Energy" },
  { symbol: "WIPRO", name: "Wipro Ltd", price: 308.45, change: 5.30, changePercent: 1.75, volume: "9.8M", sector: "IT" },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1698.60, change: 28.40, changePercent: 1.70, volume: "5.6M", sector: "IT" },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12240.50, change: 185.30, changePercent: 1.54, volume: "2.1M", sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1748.40, change: 22.60, changePercent: 1.31, volume: "4.3M", sector: "Pharma" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 8924.35, change: 112.80, changePercent: 1.28, volume: "3.2M", sector: "Finance" },
  { symbol: "LT", name: "Larsen & Toubro", price: 3524.70, change: 38.90, changePercent: 1.12, volume: "6.1M", sector: "Infra" },
];

export const TOP_LOSERS: StockData[] = [
  { symbol: "TCS", name: "TCS Ltd", price: 2689.90, change: -27.50, changePercent: -1.01, volume: "8.2M", sector: "IT" },
  { symbol: "INFY", name: "Infosys Ltd", price: 1371.60, change: -19.60, changePercent: -1.41, volume: "12.4M", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1923.00, change: -2.70, changePercent: -0.29, volume: "20.1M", sector: "Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1624.80, change: -18.40, changePercent: -1.12, volume: "11.2M", sector: "Telecom" },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1124.50, change: -14.20, changePercent: -1.25, volume: "14.8M", sector: "Banking" },
  { symbol: "ONGC", name: "ONGC", price: 258.30, change: -4.80, changePercent: -1.82, volume: "22.3M", sector: "Energy" },
  { symbol: "NTPC", name: "NTPC Ltd", price: 342.15, change: -5.60, changePercent: -1.61, volume: "16.7M", sector: "Power" },
  { symbol: "ITC", name: "ITC Ltd", price: 468.90, change: -6.30, changePercent: -1.33, volume: "28.4M", sector: "FMCG" },
];

// Seed data — gets replaced by live NSE prices on load
export const TICKER_STOCKS: (StockData & { index?: string })[] = [
  { symbol: "SENSEX", name: "SENSEX", price: 75320.45, change: 423.80, changePercent: 0.57, volume: "" },
  { symbol: "NIFTY", name: "NIFTY", price: 22831.20, change: 128.55, changePercent: 0.57, volume: "" },
  { symbol: "RELIANCE", name: "RELIANCE", price: 1440.20, change: 17.20, changePercent: 1.21, volume: "" },
  { symbol: "TCS", name: "TCS", price: 2689.90, change: -27.50, changePercent: -1.01, volume: "" },
  { symbol: "HDFCBANK", name: "HDFC BANK", price: 1923.00, change: -2.70, changePercent: -0.29, volume: "" },
  { symbol: "INFY", name: "INFOSYS", price: 1371.60, change: -19.60, changePercent: -1.41, volume: "" },
  { symbol: "ICICIBANK", name: "ICICI BANK", price: 1407.90, change: 0.40, changePercent: 0.03, volume: "" },
  { symbol: "BHARTIARTL", name: "AIRTEL", price: 1624.80, change: -18.40, changePercent: -1.12, volume: "" },
  { symbol: "WIPRO", name: "WIPRO", price: 308.45, change: 5.30, changePercent: 1.75, volume: "" },
  { symbol: "AXISBANK", name: "AXIS BANK", price: 1124.50, change: -14.20, changePercent: -1.25, volume: "" },
  { symbol: "GOLD", name: "GOLD", price: 84250.00, change: 320.00, changePercent: 0.38, volume: "" },
  { symbol: "CRUDE", name: "CRUDE OIL", price: 6248.00, change: -52.00, changePercent: -0.82, volume: "" },
  { symbol: "USDINR", name: "USD/INR", price: 86.82, change: -0.12, changePercent: -0.14, volume: "" },
];

// Simulate live price fluctuations
export function getFluctuatedPrice(basePrice: number, baseChange: number): { price: number; change: number; changePercent: number } {
  const fluctuation = (Math.random() - 0.5) * basePrice * 0.001;
  const newPrice = +(basePrice + fluctuation).toFixed(2);
  const newChange = +(baseChange + fluctuation).toFixed(2);
  const originalPrice = basePrice - baseChange;
  const newChangePercent = +((newChange / originalPrice) * 100).toFixed(2);
  return { price: newPrice, change: newChange, changePercent: newChangePercent };
}
