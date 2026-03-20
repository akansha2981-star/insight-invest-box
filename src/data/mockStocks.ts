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
  { name: "SENSEX", value: 74559.38, change: 352.14, changePercent: 0.47, high: 74600.00, low: 74200.00 },
  { name: "NIFTY 50", value: 23110.15, change: 108, changePercent: 0.47, high: 23150.00, low: 22980.00 },
  { name: "BANK NIFTY", value: 53548.20, change: 97.20, changePercent: 0.18, high: 53700.00, low: 53300.00 },
  { name: "NIFTY IT", value: 42186.70, change: 384.20, changePercent: 0.92, high: 42340.00, low: 41820.30 },
  { name: "NIFTY MIDCAP", value: 57842.40, change: 428.10, changePercent: 0.75, high: 58100.00, low: 57420.60 },
];

export const TOP_GAINERS: StockData[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 1398, change: 13.20, changePercent: 0.95, volume: "22.5M", sector: "Energy" },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1892.40, change: 34.60, changePercent: 1.86, volume: "5.6M", sector: "IT" },
  { symbol: "WIPRO", name: "Wipro Ltd", price: 191.19, change: 2.78, changePercent: 1.48, volume: "9.8M", sector: "IT" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1862.30, change: 28.40, changePercent: 1.55, volume: "4.3M", sector: "Pharma" },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 12148.60, change: 168.40, changePercent: 1.41, volume: "2.1M", sector: "Auto" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 9248.75, change: 118.30, changePercent: 1.30, volume: "3.2M", sector: "Finance" },
  { symbol: "LT", name: "Larsen & Toubro", price: 3692.40, change: 44.20, changePercent: 1.21, volume: "6.1M", sector: "Infra" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", price: 1258.40, change: 8.30, changePercent: 0.66, volume: "18.2M", sector: "Banking" },
];

export const TOP_LOSERS: StockData[] = [
  { symbol: "INFY", name: "Infosys Ltd", price: 1242, change: -41.10, changePercent: -3.24, volume: "12.4M", sector: "IT" },
  { symbol: "TCS", name: "TCS Ltd", price: 2386, change: -78, changePercent: -3.20, volume: "8.2M", sector: "IT" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1834, change: 7, changePercent: 0.38, volume: "11.2M", sector: "Telecom" },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1208.60, change: 1.60, changePercent: 0.13, volume: "14.8M", sector: "Banking" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 785, change: -13.20, changePercent: -1.65, volume: "20.1M", sector: "Banking" },
  { symbol: "ONGC", name: "ONGC", price: 234.80, change: -5.20, changePercent: -2.17, volume: "22.3M", sector: "Energy" },
  { symbol: "NTPC", name: "NTPC Ltd", price: 328.45, change: -6.10, changePercent: -1.82, volume: "16.7M", sector: "Power" },
  { symbol: "ITC", name: "ITC Ltd", price: 414.60, change: -7.30, changePercent: -1.73, volume: "28.4M", sector: "FMCG" },
];

// Seed data — gets replaced by live Angel One prices on load
export const TICKER_STOCKS: (StockData & { index?: string })[] = [
  { symbol: "SENSEX", name: "SENSEX", price: 74559.38, change: 352.14, changePercent: 0.47, volume: "" },
  { symbol: "NIFTY", name: "NIFTY 50", price: 23110.15, change: 108, changePercent: 0.47, volume: "" },
  { symbol: "BANKNIFTY", name: "BANK NIFTY", price: 53548.20, change: 97.20, changePercent: 0.18, volume: "" },
  { symbol: "RELIANCE", name: "RELIANCE", price: 1398, change: 13.20, changePercent: 0.95, volume: "" },
  { symbol: "TCS", name: "TCS", price: 2386, change: 30, changePercent: 1.27, volume: "" },
  { symbol: "HDFCBANK", name: "HDFC BANK", price: 785, change: -13.20, changePercent: -1.65, volume: "" },
  { symbol: "INFY", name: "INFOSYS", price: 1242, change: 21.20, changePercent: 1.74, volume: "" },
  { symbol: "ICICIBANK", name: "ICICI BANK", price: 1258.40, change: 8.30, changePercent: 0.66, volume: "" },
  { symbol: "BHARTIARTL", name: "AIRTEL", price: 1834, change: 7, changePercent: 0.38, volume: "" },
  { symbol: "WIPRO", name: "WIPRO", price: 191.19, change: 2.78, changePercent: 1.48, volume: "" },
  { symbol: "AXISBANK", name: "AXIS BANK", price: 1208.60, change: 1.60, changePercent: 0.13, volume: "" },
  { symbol: "MARUTI", name: "MARUTI", price: 12148.60, change: 168.40, changePercent: 1.41, volume: "" },
  { symbol: "SUNPHARMA", name: "SUN PHARMA", price: 1862.30, change: 28.40, changePercent: 1.55, volume: "" },
  { symbol: "BAJFINANCE", name: "BAJ FINANCE", price: 9248.75, change: 118.30, changePercent: 1.30, volume: "" },
  { symbol: "LT", name: "L&T", price: 3692.40, change: 44.20, changePercent: 1.21, volume: "" },
  { symbol: "ITC", name: "ITC", price: 414.60, change: -7.30, changePercent: -1.73, volume: "" },
  { symbol: "SBIN", name: "SBI", price: 782.50, change: 4.20, changePercent: 0.54, volume: "" },
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
