export interface CurrencyMeta { code: string; name: string; flag: string; symbol: string; }

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar",          flag: "🇺🇸", symbol: "$" },
  { code: "EUR", name: "Euro",               flag: "🇪🇺", symbol: "€" },
  { code: "GBP", name: "British Pound",      flag: "🇬🇧", symbol: "£" },
  { code: "INR", name: "Indian Rupee",       flag: "🇮🇳", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen",       flag: "🇯🇵", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar",  flag: "🇦🇺", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar",    flag: "🇨🇦", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc",        flag: "🇨🇭", symbol: "Fr" },
  { code: "CNY", name: "Chinese Yuan",       flag: "🇨🇳", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar",   flag: "🇭🇰", symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar",   flag: "🇸🇬", symbol: "S$" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿", symbol: "NZ$" },
  { code: "AED", name: "UAE Dirham",         flag: "🇦🇪", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal",        flag: "🇸🇦", symbol: "﷼" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", symbol: "R" },
  { code: "MXN", name: "Mexican Peso",       flag: "🇲🇽", symbol: "$" },
  { code: "BRL", name: "Brazilian Real",     flag: "🇧🇷", symbol: "R$" },
  { code: "KRW", name: "South Korean Won",   flag: "🇰🇷", symbol: "₩" },
  { code: "TRY", name: "Turkish Lira",       flag: "🇹🇷", symbol: "₺" },
  { code: "SEK", name: "Swedish Krona",      flag: "🇸🇪", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone",    flag: "🇳🇴", symbol: "kr" },
  { code: "DKK", name: "Danish Krone",       flag: "🇩🇰", symbol: "kr" },
  { code: "THB", name: "Thai Baht",          flag: "🇹🇭", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah",  flag: "🇮🇩", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit",  flag: "🇲🇾", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso",    flag: "🇵🇭", symbol: "₱" },
  { code: "PLN", name: "Polish Zloty",       flag: "🇵🇱", symbol: "zł" },
  { code: "CZK", name: "Czech Koruna",       flag: "🇨🇿", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint",   flag: "🇭🇺", symbol: "Ft" },
  { code: "ILS", name: "Israeli Shekel",     flag: "🇮🇱", symbol: "₪" },
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
