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
  { name: "SENSEX", value: 73827.33, change: 812.45, changePercent: 1.11, high: 74012.50, low: 73020.80 },
  { name: "NIFTY 50", value: 22378.40, change: 238.95, changePercent: 1.08, high: 22450.10, low: 22150.30 },
  { name: "BANK NIFTY", value: 48223.15, change: -142.30, changePercent: -0.29, high: 48520.00, low: 48050.25 },
  { name: "NIFTY IT", value: 37845.60, change: 512.20, changePercent: 1.37, high: 37920.50, low: 37350.80 },
  { name: "NIFTY MIDCAP", value: 44987.25, change: 325.10, changePercent: 0.73, high: 45120.00, low: 44720.50 },
];

export const TOP_GAINERS: StockData[] = [
  { symbol: "INFY", name: "Infosys Ltd", price: 1847.25, change: 52.40, changePercent: 2.92, volume: "12.4M", sector: "IT" },
  { symbol: "TCS", name: "TCS Ltd", price: 4182.60, change: 98.15, changePercent: 2.40, volume: "8.2M", sector: "IT" },
  { symbol: "WIPRO", name: "Wipro Ltd", price: 512.80, change: 11.35, changePercent: 2.26, volume: "9.8M", sector: "IT" },
  { symbol: "HCLTECH", name: "HCL Technologies", price: 1623.45, change: 34.20, changePercent: 2.15, volume: "5.6M", sector: "IT" },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 11842.35, change: 234.50, changePercent: 2.02, volume: "2.1M", sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1342.70, change: 24.80, changePercent: 1.88, volume: "4.3M", sector: "Pharma" },
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2741.50, change: 48.30, changePercent: 1.79, volume: "18.7M", sector: "Energy" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7284.15, change: 118.60, changePercent: 1.66, volume: "3.2M", sector: "Finance" },
];

export const TOP_LOSERS: StockData[] = [
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1187.45, change: -34.60, changePercent: -2.83, volume: "11.2M", sector: "Telecom" },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1082.30, change: -28.45, changePercent: -2.56, volume: "14.8M", sector: "Banking" },
  { symbol: "ONGC", name: "ONGC", price: 243.80, change: -6.15, changePercent: -2.46, volume: "22.3M", sector: "Energy" },
  { symbol: "NTPC", name: "NTPC Ltd", price: 362.55, change: -7.80, changePercent: -2.11, volume: "16.7M", sector: "Power" },
  { symbol: "COALINDIA", name: "Coal India", price: 456.20, change: -8.90, changePercent: -1.91, volume: "13.5M", sector: "Mining" },
  { symbol: "ITC", name: "ITC Ltd", price: 432.15, change: -7.45, changePercent: -1.70, volume: "28.4M", sector: "FMCG" },
  { symbol: "ADANIPORTS", name: "Adani Ports", price: 1312.40, change: -21.30, changePercent: -1.60, volume: "6.8M", sector: "Infra" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1623.70, change: -25.80, changePercent: -1.56, volume: "20.1M", sector: "Banking" },
];

export const TICKER_STOCKS: (StockData & { index?: string })[] = [
  { symbol: "SENSEX", name: "SENSEX", price: 73827.33, change: 812.45, changePercent: 1.11, volume: "" },
  { symbol: "NIFTY", name: "NIFTY", price: 22378.40, change: 238.95, changePercent: 1.08, volume: "" },
  { symbol: "RELIANCE", name: "RELIANCE", price: 2741.50, change: 48.30, changePercent: 1.79, volume: "" },
  { symbol: "TCS", name: "TCS", price: 4182.60, change: 98.15, changePercent: 2.40, volume: "" },
  { symbol: "HDFCBANK", name: "HDFC BANK", price: 1623.70, change: -25.80, changePercent: -1.56, volume: "" },
  { symbol: "INFY", name: "INFOSYS", price: 1847.25, change: 52.40, changePercent: 2.92, volume: "" },
  { symbol: "ICICIBANK", name: "ICICI BANK", price: 1087.45, change: 12.30, changePercent: 1.14, volume: "" },
  { symbol: "BHARTIARTL", name: "AIRTEL", price: 1187.45, change: -34.60, changePercent: -2.83, volume: "" },
  { symbol: "WIPRO", name: "WIPRO", price: 512.80, change: 11.35, changePercent: 2.26, volume: "" },
  { symbol: "AXISBANK", name: "AXIS BANK", price: 1082.30, change: -28.45, changePercent: -2.56, volume: "" },
  { symbol: "GOLD", name: "GOLD", price: 72450.00, change: 380.00, changePercent: 0.53, volume: "" },
  { symbol: "CRUDE", name: "CRUDE OIL", price: 6824.00, change: -45.00, changePercent: -0.66, volume: "" },
  { symbol: "USDINR", name: "USD/INR", price: 83.12, change: -0.14, changePercent: -0.17, volume: "" },
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
