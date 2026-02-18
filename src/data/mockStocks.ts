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
  { name: "SENSEX", value: 83740.12, change: 312.45, changePercent: 0.37, high: 83924.00, low: 83340.20 },
  { name: "NIFTY 50", value: 25436.50, change: 94.80, changePercent: 0.37, high: 25490.00, low: 25280.10 },
  { name: "BANK NIFTY", value: 54628.35, change: -148.60, changePercent: -0.27, high: 54920.00, low: 54410.50 },
  { name: "NIFTY IT", value: 42186.70, change: 384.20, changePercent: 0.92, high: 42340.00, low: 41820.30 },
  { name: "NIFTY MIDCAP", value: 57842.40, change: 428.10, changePercent: 0.75, high: 58100.00, low: 57420.60 },
];

// Updated with accurate Feb 18, 2026 prices
export const TOP_GAINERS: StockData[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 1441.70, change: 18.70, changePercent: 1.31, volume: "22.5M", sector: "Energy" },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1892.40, change: 34.60, changePercent: 1.86, volume: "5.6M", sector: "IT" },
  { symbol: "WIPRO", name: "Wipro Ltd", price: 318.25, change: 5.80, changePercent: 1.86, volume: "9.8M", sector: "IT" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1862.30, change: 28.40, changePercent: 1.55, volume: "4.3M", sector: "Pharma" },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12148.60, change: 168.40, changePercent: 1.41, volume: "2.1M", sector: "Auto" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 9248.75, change: 118.30, changePercent: 1.30, volume: "3.2M", sector: "Finance" },
  { symbol: "LT", name: "Larsen & Toubro", price: 3692.40, change: 44.20, changePercent: 1.21, volume: "6.1M", sector: "Infra" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", price: 1408.40, change: 0.90, changePercent: 0.06, volume: "18.2M", sector: "Banking" },
];

export const TOP_LOSERS: StockData[] = [
  { symbol: "INFY", name: "Infosys Ltd", price: 1372.80, change: -18.40, changePercent: -1.32, volume: "12.4M", sector: "IT" },
  { symbol: "TCS", name: "TCS Ltd", price: 2694.70, change: -22.70, changePercent: -0.84, volume: "8.2M", sector: "IT" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1586.30, change: -21.40, changePercent: -1.33, volume: "11.2M", sector: "Telecom" },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1082.60, change: -16.80, changePercent: -1.53, volume: "14.8M", sector: "Banking" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1712.40, change: -8.20, changePercent: -0.48, volume: "20.1M", sector: "Banking" },
  { symbol: "ONGC", name: "ONGC", price: 234.80, change: -5.20, changePercent: -2.17, volume: "22.3M", sector: "Energy" },
  { symbol: "NTPC", name: "NTPC Ltd", price: 328.45, change: -6.10, changePercent: -1.82, volume: "16.7M", sector: "Power" },
  { symbol: "ITC", name: "ITC Ltd", price: 414.60, change: -7.30, changePercent: -1.73, volume: "28.4M", sector: "FMCG" },
];

// Seed data — gets replaced by live NSE prices on load (Feb 18, 2026)
export const TICKER_STOCKS: (StockData & { index?: string })[] = [
  { symbol: "SENSEX", name: "SENSEX", price: 83740.12, change: 312.45, changePercent: 0.37, volume: "" },
  { symbol: "NIFTY", name: "NIFTY 50", price: 25436.50, change: 94.80, changePercent: 0.37, volume: "" },
  { symbol: "RELIANCE", name: "RELIANCE", price: 1441.70, change: 18.70, changePercent: 1.31, volume: "" },
  { symbol: "TCS", name: "TCS", price: 2694.70, change: -22.70, changePercent: -0.84, volume: "" },
  { symbol: "HDFCBANK", name: "HDFC BANK", price: 1712.40, change: -8.20, changePercent: -0.48, volume: "" },
  { symbol: "INFY", name: "INFOSYS", price: 1372.80, change: -18.40, changePercent: -1.32, volume: "" },
  { symbol: "ICICIBANK", name: "ICICI BANK", price: 1408.40, change: 0.90, changePercent: 0.06, volume: "" },
  { symbol: "BHARTIARTL", name: "AIRTEL", price: 1586.30, change: -21.40, changePercent: -1.33, volume: "" },
  { symbol: "WIPRO", name: "WIPRO", price: 318.25, change: 5.80, changePercent: 1.86, volume: "" },
  { symbol: "AXISBANK", name: "AXIS BANK", price: 1082.60, change: -16.80, changePercent: -1.53, volume: "" },
  { symbol: "GOLD", name: "GOLD", price: 87450.00, change: 380.00, changePercent: 0.44, volume: "" },
  { symbol: "CRUDE", name: "CRUDE OIL", price: 6124.00, change: -48.00, changePercent: -0.78, volume: "" },
  { symbol: "USDINR", name: "USD/INR", price: 86.62, change: -0.08, changePercent: -0.09, volume: "" },
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
