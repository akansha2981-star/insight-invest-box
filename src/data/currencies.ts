export interface CurrencyMeta { code: string; name: string; symbol: string; }

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar",symbol: "$" },
  { code: "EUR", name: "Euro",symbol: "€" },
  { code: "GBP", name: "British Pound",symbol: "£" },
  { code: "INR", name: "Indian Rupee",symbol: "₹" },
  { code: "JPY", name: "Japanese Yen",symbol: "¥" },
  { code: "AUD", name: "Australian Dollar",symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar",symbol: "C$" },
  { code: "CHF", name: "Swiss Franc",symbol: "Fr" },
  { code: "CNY", name: "Chinese Yuan",symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar",symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar",symbol: "S$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "AED", name: "UAE Dirham",symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal",symbol: "﷼" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "MXN", name: "Mexican Peso",symbol: "$" },
  { code: "BRL", name: "Brazilian Real",symbol: "R$" },
  { code: "KRW", name: "South Korean Won",symbol: "₩" },
  { code: "TRY", name: "Turkish Lira",symbol: "₺" },
  { code: "SEK", name: "Swedish Krona",symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone",symbol: "kr" },
  { code: "DKK", name: "Danish Krone",symbol: "kr" },
  { code: "THB", name: "Thai Baht",symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah",symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit",symbol: "RM" },
  { code: "PHP", name: "Philippine Peso",symbol: "₱" },
  { code: "PLN", name: "Polish Zloty",symbol: "zł" },
  { code: "CZK", name: "Czech Koruna",symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint",symbol: "Ft" },
  { code: "ILS", name: "Israeli Shekel",symbol: "₪" },
];

export const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map(c => [c.code, c]));

export const TRENDING_PAIRS: Array<[string, string]> = [
  ["USD", "INR"], ["INR", "USD"], ["EUR", "INR"], ["GBP", "INR"],
  ["USD", "EUR"], ["EUR", "USD"], ["AUD", "INR"], ["INR", "AUD"],
  ["USD", "JPY"], ["USD", "CAD"], ["USD", "AED"], ["INR", "SGD"],
];

export function formatMoney(value: number, code: string) {
  const meta = CURRENCY_MAP[code];
  const symbol = meta?.symbol ?? "";
  try {
    return `${symbol} ${value.toLocaleString("en-US", { maximumFractionDigits: value >= 1000 ? 2 : 4, minimumFractionDigits: 2 })}`;
  } catch { return `${symbol} ${value.toFixed(2)}`; }
}
