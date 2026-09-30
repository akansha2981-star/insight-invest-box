// Swing strategy engine: pluggable rule registry + long-only backtester.
// New strategies are added as DB rows that reference a rule_type + params,
// so admins can create variants without rebuilding the app.

export interface Bar { date: string; open: number; high: number; low: number; close: number; volume: number }
export type Signal = 1 | -1 | 0; // buy / sell / hold

export interface RuleDef {
  label: string;
  params: { key: string; label: string; default: number }[];
  run: (bars: Bar[], p: Record<string, number>) => Signal[];
}

const sma = (v: number[], n: number) => v.map((_, i) => (i < n - 1 ? NaN : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));
const ema = (v: number[], n: number) => {
  const k = 2 / (n + 1); const out: number[] = [];
  v.forEach((x, i) => out.push(i === 0 ? x : x * k + out[i - 1] * (1 - k)));
  return out;
};
const rsi = (v: number[], n: number) => {
  const out: number[] = Array(v.length).fill(NaN); let g = 0, l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1]; const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; l += dn / n; if (i === n) out[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
  }
  return out;
};
const cross = (a: number[], b: number[], i: number): Signal =>
  i < 1 || [a[i], b[i], a[i - 1], b[i - 1]].some(Number.isNaN) ? 0 : a[i - 1] <= b[i - 1] && a[i] > b[i] ? 1 : a[i - 1] >= b[i - 1] && a[i] < b[i] ? -1 : 0;

export const RULES: Record<string, RuleDef> = {
  ma_cross: {
    label: "Moving Average Crossover",
    params: [{ key: "fast", label: "Fast period", default: 20 }, { key: "slow", label: "Slow period", default: 50 }],
    run: (b, p) => { const c = b.map((x) => x.close); const f = sma(c, p.fast), s = sma(c, p.slow); return c.map((_, i) => cross(f, s, i)); },
  },
  rsi: {
    label: "RSI Reversal",
    params: [{ key: "period", label: "RSI period", default: 14 }, { key: "oversold", label: "Oversold", default: 30 }, { key: "overbought", label: "Overbought", default: 70 }],
    run: (b, p) => { const r = rsi(b.map((x) => x.close), p.period); return r.map((v, i) => (i < 1 || Number.isNaN(r[i - 1]) ? 0 : r[i - 1] < p.oversold && v >= p.oversold ? 1 : r[i - 1] > p.overbought && v <= p.overbought ? -1 : 0)); },
  },
  breakout: {
    label: "Breakout",
    params: [{ key: "lookback", label: "Lookback days", default: 20 }],
    run: (b, p) => b.map((x, i) => {
      if (i < p.lookback) return 0; const w = b.slice(i - p.lookback, i);
      return x.close > Math.max(...w.map((y) => y.high)) ? 1 : x.close < Math.min(...w.map((y) => y.low)) ? -1 : 0;
    }),
  },
  macd: {
    label: "MACD",
    params: [{ key: "fast", label: "Fast EMA", default: 12 }, { key: "slow", label: "Slow EMA", default: 26 }, { key: "signal", label: "Signal EMA", default: 9 }],
    run: (b, p) => { const c = b.map((x) => x.close); const f = ema(c, p.fast), s = ema(c, p.slow); const m = f.map((v, i) => v - s[i]); const sg = ema(m, p.signal); return c.map((_, i) => (i < p.slow ? 0 : cross(m, sg, i))); },
  },
  volume_breakout: {
    label: "Volume Breakout",
    params: [{ key: "lookback", label: "Lookback days", default: 20 }, { key: "multiplier", label: "Volume multiplier", default: 1.5 }],
    run: (b, p) => b.map((x, i) => {
      if (i < p.lookback) return 0; const w = b.slice(i - p.lookback, i);
      const avgV = w.reduce((a, y) => a + y.volume, 0) / w.length;
      if (x.close > Math.max(...w.map((y) => y.high)) && x.volume > avgV * p.multiplier) return 1;
      return x.close < Math.min(...w.map((y) => y.low)) ? -1 : 0;
    }),
  },
};

export function runRule(ruleType: string, bars: Bar[], params: Record<string, number>): Signal[] {
  const rule = RULES[ruleType]; if (!rule || bars.length === 0) return bars.map(() => 0);
  const p = Object.fromEntries(rule.params.map((d) => [d.key, Number(params?.[d.key] ?? d.default)]));
  return rule.run(bars, p);
}

export interface BacktestTrade { symbol: string; entryDate: string; entry: number; exitDate: string; exit: number; qty: number; pnl: number; open: boolean }
export interface BacktestResult { trades: BacktestTrade[]; winRate: number; totalReturn: number; maxDrawdown: number; finalValue: number; equity: { date: string; value: number }[] }

// Long-only: capital split equally across symbols, all-in per symbol on buy, flat on sell.
export function backtest(ruleType: string, params: Record<string, number>, bySymbol: Record<string, Bar[]>, capital = 50000): BacktestResult {
  const symbols = Object.keys(bySymbol).filter((s) => bySymbol[s].length);
  const trades: BacktestTrade[] = [];
  const daily = new Map<string, number>();
  if (!symbols.length) return { trades, winRate: 0, totalReturn: 0, maxDrawdown: 0, finalValue: capital, equity: [] };
  const slice = capital / symbols.length;
  for (const s of symbols) {
    const bars = bySymbol[s]; const sig = runRule(ruleType, bars, params);
    let cash = slice, qty = 0, entry = 0, entryDate = "";
    bars.forEach((b, i) => {
      if (sig[i] === 1 && qty === 0) { qty = Math.floor(cash / b.close); if (qty > 0) { entry = b.close; entryDate = b.date; cash -= qty * b.close; } }
      else if (sig[i] === -1 && qty > 0) { cash += qty * b.close; trades.push({ symbol: s, entryDate, entry, exitDate: b.date, exit: b.close, qty, pnl: (b.close - entry) * qty, open: false }); qty = 0; }
      daily.set(b.date, (daily.get(b.date) ?? 0) + cash + qty * b.close);
    });
    if (qty > 0) { const l = bars[bars.length - 1]; trades.push({ symbol: s, entryDate, entry, exitDate: l.date, exit: l.close, qty, pnl: (l.close - entry) * qty, open: true }); }
  }
  const equity = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: Math.round(value) }));
  let peak = 0, dd = 0;
  equity.forEach((e) => { peak = Math.max(peak, e.value); dd = Math.max(dd, peak ? (peak - e.value) / peak : 0); });
  const closed = trades.filter((t) => !t.open);
  const finalValue = equity.at(-1)?.value ?? capital;
  return { trades, winRate: closed.length ? (closed.filter((t) => t.pnl > 0).length / closed.length) * 100 : 0, totalReturn: ((finalValue - capital) / capital) * 100, maxDrawdown: dd * 100, finalValue, equity };
}

export function parseCsv(text: string): { symbol: string; trade_date: string; open: number; high: number; low: number; close: number; volume: number }[] {
  const lines = text.trim().split(/\r?\n/); const head = lines.shift()!.toLowerCase().split(",").map((h) => h.trim());
  const idx = (k: string) => head.findIndex((h) => h === k || h.startsWith(k));
  const [si, di, oi, hi, li, ci, vi] = ["symbol", "date", "open", "high", "low", "close", "volume"].map(idx);
  if ([si, di, oi, hi, li, ci].some((i) => i < 0)) throw new Error("CSV needs columns: symbol, date, open, high, low, close, volume");
  return lines.map((l) => l.split(",")).filter((c) => c.length >= head.length - 1).map((c) => ({
    symbol: c[si].trim().toUpperCase(), trade_date: new Date(c[di].trim()).toISOString().slice(0, 10),
    open: +c[oi], high: +c[hi], low: +c[li], close: +c[ci], volume: vi >= 0 ? Math.round(+c[vi] || 0) : 0,
  })).filter((r) => r.symbol && Number.isFinite(r.close));
}
