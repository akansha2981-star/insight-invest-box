// 20-strategy engine with a common risk model, next-open execution, SL/TP1/TP2/trailing,
// Indian delivery charges and slippage. Same code is used for backtests and for
// live "deployments" (auto buy/sell from a start date on live NSE/BSE daily data).
import type { Bar } from "./engine";
import { computeAll, rsi, sma, ema, type IndicatorRow } from "./indicators";

export interface Ctx {
  sym: string; b: Bar[]; r: IndicatorRow[];
  rsi2: number[]; sma5: number[]; hi20: number[]; lo10: number[]; hi252: number[];
  ret21: number[]; ret63: number[]; ret126: number[]; ret252: number[];
  bwPct: number[]; volRatio: number[]; wkUp: boolean[]; mom: number[]; rank: number[];
}
export interface EntryPlan { sl: number; tp1R?: number; tp2R?: number; tp1Abs?: number; tp2Abs?: number; trail?: number; trailAfterTp1?: boolean; maxHold?: number; score?: number; note: string }
export interface OpenPos { entryIdx: number; entry: number; stop: number; tp1: number | null; tp2: number | null; tp1Hit: boolean }
export interface StrategyDef {
  key: string; name: string; family: string; buyRule: string; sellRule: string; slRule: string; tpRule: string;
  entry: (c: Ctx, i: number) => EntryPlan | null;
  exit?: (c: Ctx, i: number, p: OpenPos) => string | null;
  regimes?: ("bull" | "sideways" | "bear")[];
}

const N = (x: number | null | undefined) => (x === null || x === undefined ? NaN : x);
const ok = (...x: (number | null | undefined)[]) => x.every((v) => Number.isFinite(N(v)));
const crossUp = (a: (number | null)[], b: (number | null)[], i: number) => i > 0 && ok(a[i], b[i], a[i - 1], b[i - 1]) && N(a[i - 1]) <= N(b[i - 1]) && N(a[i]) > N(b[i]);
const colCache = new WeakMap<IndicatorRow[], Map<string, (number | null)[]>>();
const col = <K extends keyof IndicatorRow>(r: IndicatorRow[], k: K) => { // memoized: identical values, avoids rebuilding columns per bar
  let m = colCache.get(r); if (!m) { m = new Map(); colCache.set(r, m); }
  let a = m.get(k as string); if (!a) { a = r.map((x) => x[k] as unknown as number | null); m.set(k as string, a); } return a;
};

export function buildCtx(sym: string, b: Bar[]): Ctx {
  const r = computeAll(b, false); const c = b.map((x) => x.close);
  const hiN = (n: number, lag: number) => b.map((_, i) => (i - lag - n + 1 < 0 ? NaN : Math.max(...b.slice(i - lag - n + 1, i - lag + 1).map((x) => x.high))));
  const lo10 = b.map((_, i) => (i < 10 ? NaN : Math.min(...b.slice(i - 10, i).map((x) => x.low))));
  const hi252 = b.map((_, i) => (i < 60 ? NaN : Math.max(...b.slice(Math.max(0, i - 251), i + 1).map((x) => x.high))));
  const ret = (n: number) => c.map((x, i) => (i < n ? NaN : ((x - c[i - n]) / c[i - n]) * 100));
  const ret21 = ret(21), ret63 = ret(63), ret126 = ret(126), ret252 = ret(252);
  const bw = r.map((x) => N(x.bbWidth));
  const bwPct = bw.map((w, i) => { if (!Number.isFinite(w) || i < 60) return NaN; const win = bw.slice(Math.max(0, i - 120), i).filter(Number.isFinite); return (win.filter((v) => v < w).length / (win.length || 1)) * 100; });
  const volRatio = r.map((x) => (x.volMa ? x.volume / x.volMa : NaN));
  // Weekly resample (Mon-based week key), running weekly close vs weekly EMA20/EMA50
  const wkKey = (d: string) => { const t = new Date(d + "T00:00:00Z"); const day = (t.getUTCDay() + 6) % 7; return new Date(t.getTime() - day * 86400000).toISOString().slice(0, 10); };
  const weeks: string[] = []; const wClose: number[] = []; const dayWeek: number[] = [];
  b.forEach((x) => { const k = wkKey(x.date); if (weeks.at(-1) !== k) { weeks.push(k); wClose.push(x.close); } else wClose[wClose.length - 1] = x.close; dayWeek.push(weeks.length - 1); });
  const we20 = ema(wClose, 20), we50 = ema(wClose, 50);
  const wkUp = dayWeek.map((w) => ok(we20[w], we50[w]) && wClose[w] > we20[w] && we20[w] > we50[w]);
  const mom = c.map((_, i) => (ok(ret21[i], ret63[i], ret126[i]) ? 0.2 * ret21[i] + 0.2 * ret63[i] + 0.3 * ret126[i] + 0.3 * (Number.isFinite(ret252[i]) ? ret252[i] : ret126[i]) : NaN));
  return { sym, b, r, rsi2: rsi(c, 2), sma5: sma(c, 5), hi20: hiN(20, 1), lo10, hi252, ret21, ret63, ret126, ret252, bwPct, volRatio, wkUp, mom, rank: c.map(() => NaN) };
}

/** Cross-sectional momentum percentile (0-100) per date across the universe. */
export function rankUniverse(ctxs: Ctx[]) {
  const byDate = new Map<string, { c: Ctx; i: number; m: number }[]>();
  ctxs.forEach((c) => c.b.forEach((x, i) => { if (Number.isFinite(c.mom[i])) { const a = byDate.get(x.date) ?? []; a.push({ c, i, m: c.mom[i] }); byDate.set(x.date, a); } }));
  byDate.forEach((a) => { a.sort((x, y) => x.m - y.m); a.forEach((e, k) => (e.c.rank[e.i] = a.length > 1 ? (k / (a.length - 1)) * 100 : 50)); });
}

const atrOf = (c: Ctx, i: number) => N(c.r[i].atr);
const std = (c: Ctx, i: number, slAtr: number, note: string, extra: Partial<EntryPlan> = {}): EntryPlan | null => {
  const a = atrOf(c, i); if (!Number.isFinite(a)) return null;
  return { sl: c.b[i].close - slAtr * a, tp1R: 2, tp2R: 4, trail: 2, trailAfterTp1: true, note, ...extra };
};
const swingLow = (c: Ctx, i: number, n = 10) => Math.min(...c.b.slice(Math.max(0, i - n + 1), i + 1).map((x) => x.low));

export const STRATEGIES: StrategyDef[] = [
  { key: "donchian", name: "Enhanced Donchian Breakout", family: "Breakout",
    buyRule: "Close > previous 20-day high AND Close > EMA50 AND EMA50 > SMA200 AND ADX > 20 AND Volume > 1.5x Vol MA20",
    sellRule: "SL, TP2, 10-day low breakdown or trailing stop", slRule: "max(Entry - 2xATR, recent swing low)", tpRule: "TP1 2R, TP2 4R, then trail Close - 2xATR",
    entry: (c, i) => { const r = c.r[i], x = c.b[i]; if (!(ok(c.hi20[i], r.ema50, r.sma200, r.adx, c.volRatio[i]) && x.close > c.hi20[i] && x.close > N(r.ema50) && N(r.ema50) > N(r.sma200) && N(r.adx) > 20 && c.volRatio[i] > 1.5)) return null;
      const p = std(c, i, 2, "20-day breakout with trend + volume"); if (!p) return null; const sw = swingLow(c, i - 1); if (sw > p.sl && sw < x.close) p.sl = sw; return p; },
    exit: (c, i) => (ok(c.lo10[i]) && c.b[i].close < c.lo10[i] ? "10-day Donchian breakdown" : null) },
  { key: "ema_cross", name: "Enhanced 20/50 EMA Crossover", family: "Trend",
    buyRule: "EMA20 crosses above EMA50 AND EMA50 > EMA200 AND ADX > 20 AND RSI > 50 AND Close > EMA50 (no trade if ADX < 15)",
    sellRule: "EMA20 < EMA50, SL or trailing stop", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R, trail Close - 2xATR",
    entry: (c, i) => { const r = c.r[i]; return crossUp(col(c.r, "ema20"), col(c.r, "ema50"), i) && ok(r.ema200, r.adx, r.rsi) && N(r.ema50) > N(r.ema200) && N(r.adx) > 20 && N(r.rsi) > 50 && c.b[i].close > N(r.ema50) ? std(c, i, 2, "EMA 20/50 bullish cross in uptrend") : null; },
    exit: (c, i) => (N(c.r[i].ema20) < N(c.r[i].ema50) ? "EMA20 below EMA50" : null) },
  { key: "golden_cross", name: "Enhanced 50/200 SMA Golden Cross", family: "Trend",
    buyRule: "SMA50 crosses above SMA200 AND Close > SMA200 AND ADX > 20", sellRule: "SMA50 < SMA200, SL or trailing", slRule: "Entry - 2.5xATR", tpRule: "TP1 2R, rest trailing 2.5xATR",
    entry: (c, i) => { const r = c.r[i]; return crossUp(col(c.r, "sma50"), col(c.r, "sma200"), i) && c.b[i].close > N(r.sma200) && N(r.adx) > 20 ? std(c, i, 2.5, "Golden cross confirmed", { tp2R: undefined, trail: 2.5 }) : null; },
    exit: (c, i) => (N(c.r[i].sma50) < N(c.r[i].sma200) ? "SMA50 below SMA200" : null) },
  { key: "macd_trend", name: "Enhanced MACD Trend Following", family: "Momentum",
    buyRule: "MACD crosses above Signal AND MACD > 0 AND Close > EMA50 AND ADX > 20 AND histogram rising", sellRule: "MACD crosses below Signal, SL or trailing", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const r = c.r[i]; return crossUp(col(c.r, "macd"), col(c.r, "macdSignal"), i) && N(r.macd) > 0 && c.b[i].close > N(r.ema50) && N(r.adx) > 20 && N(r.macdHist) > N(c.r[i - 1].macdHist) ? std(c, i, 2, "MACD bullish cross above zero") : null; },
    exit: (c, i) => (N(c.r[i].macd) < N(c.r[i].macdSignal) ? "MACD bearish cross" : null) },
  { key: "momentum_6_12", name: "6-12 Month Momentum", family: "Momentum",
    buyRule: "6M return > 10% AND Close > SMA200 AND SMA50 > SMA200 AND RSI 50-75 AND composite momentum in top 20% of universe", sellRule: "Close < SMA200, momentum rank drops below 50% or trailing", slRule: "Entry - 2.5xATR", tpRule: "TP1 2R, rest trailing 2.5xATR",
    entry: (c, i) => { const r = c.r[i]; return ok(c.ret126[i], r.sma200, c.rank[i]) && c.ret126[i] > 10 && c.b[i].close > N(r.sma200) && N(r.sma50) > N(r.sma200) && N(r.rsi) >= 50 && N(r.rsi) <= 75 && c.rank[i] >= 80 && !(c.rank[i - 1] >= 80) ? std(c, i, 2.5, "Top-quintile momentum", { tp2R: undefined, trail: 2.5 }) : null; },
    exit: (c, i) => (c.b[i].close < N(c.r[i].sma200) ? "Close below SMA200" : c.rank[i] < 50 ? "Momentum rank fell" : null) },
  { key: "rsi_20_80", name: "RSI 20/80 Mean Reversion (Filtered)", family: "Mean reversion",
    buyRule: "Close > SMA200 AND RSI dipped < 20 AND Close <= lower Bollinger, then RSI turns up", sellRule: "Middle band, 2R, SL or 10 days", slRule: "Entry - 1.5xATR", tpRule: "Middle Bollinger band or 2R",
    entry: (c, i) => { const r = c.r[i], p = c.r[i - 1]; return i > 1 && ok(r.sma200, p?.rsi, p?.bbLower) && c.b[i].close > N(r.sma200) && N(p.rsi) < 20 && c.b[i - 1].close <= N(p.bbLower) && N(r.rsi) > N(p.rsi) ? std(c, i, 1.5, "Oversold reversal in uptrend", { tp1R: 2, tp2R: undefined, trail: undefined, maxHold: 10 }) : null; },
    exit: (c, i) => (c.b[i].close >= N(c.r[i].bbMid) ? "Reached middle band" : null) },
  { key: "rsi2", name: "RSI(2) Short-Term Mean Reversion", family: "Mean reversion",
    buyRule: "Close > SMA200 AND RSI(2) < 10, then RSI(2) turns up", sellRule: "2R, Close > SMA5, SL or 5 sessions", slRule: "Entry - 1.5xATR", tpRule: "2R or SMA5 recovery",
    entry: (c, i) => (i > 1 && ok(c.r[i].sma200, c.rsi2[i - 1]) && c.b[i].close > N(c.r[i].sma200) && c.rsi2[i - 1] < 10 && c.rsi2[i] > c.rsi2[i - 1] ? std(c, i, 1.5, "RSI(2) snap-back", { tp1R: 2, tp2R: undefined, trail: undefined, maxHold: 5 }) : null),
    exit: (c, i) => (ok(c.sma5[i]) && c.b[i].close > c.sma5[i] ? "Recovered above SMA5" : null) },
  { key: "adx_di", name: "ADX + DI Trend", family: "Trend",
    buyRule: "+DI crosses above -DI AND ADX > 25 AND Close > EMA50 AND EMA50 > EMA200", sellRule: "-DI > +DI, ADX < 20 or trailing", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const r = c.r[i]; return crossUp(col(c.r, "pdi"), col(c.r, "mdi"), i) && N(r.adx) > 25 && c.b[i].close > N(r.ema50) && N(r.ema50) > N(r.ema200) ? std(c, i, 2, "Directional trend confirmed") : null; },
    exit: (c, i) => (N(c.r[i].mdi) > N(c.r[i].pdi) ? "-DI above +DI" : N(c.r[i].adx) < 20 ? "ADX trend failure" : null) },
  { key: "bb_breakout", name: "Bollinger Band Breakout + Volume", family: "Volatility",
    buyRule: "Band width was < 30th percentile (squeeze) AND Close > upper band AND Volume > 1.5x MA20 AND ADX > 20", sellRule: "Middle band breakdown, SL, trailing, TP", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R, trail 2xATR",
    entry: (c, i) => { const r = c.r[i]; const squeeze = c.bwPct.slice(Math.max(0, i - 5), i).some((v) => v < 30); return squeeze && c.b[i].close > N(r.bbUpper) && c.volRatio[i] > 1.5 && N(r.adx) > 20 ? std(c, i, 2, "Squeeze breakout on volume") : null; },
    exit: (c, i) => (c.b[i].close < N(c.r[i].bbMid) ? "Middle band breakdown" : null) },
  { key: "bb_revert", name: "Bollinger Mean Reversion", family: "Mean reversion",
    buyRule: "Close > SMA200 AND prior close <= lower band AND RSI < 30, then close returns inside band", sellRule: "Middle band / upper band, SL or 10 sessions", slRule: "Entry - 1.5xATR", tpRule: "TP1 middle band, TP2 upper band",
    entry: (c, i) => { const r = c.r[i], p = c.r[i - 1]; if (!(i > 1 && ok(r.sma200, p?.bbLower, p?.rsi) && c.b[i].close > N(r.sma200) && c.b[i - 1].close <= N(p.bbLower) && N(p.rsi) < 30 && c.b[i].close > N(r.bbLower))) return null;
      return std(c, i, 1.5, "Re-entered bands in uptrend", { tp1R: undefined, tp2R: undefined, tp1Abs: N(r.bbMid), tp2Abs: N(r.bbUpper), trail: undefined, maxHold: 10 }); } },
  { key: "volume_breakout", name: "Volume Breakout", family: "Breakout",
    buyRule: "Close > previous 20-day high AND Volume >= 2x MA20 AND Close > EMA50 AND ADX > 20", sellRule: "Close back below breakout level or trailing", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const r = c.r[i]; return ok(c.hi20[i]) && c.b[i].close > c.hi20[i] && c.volRatio[i] >= 2 && c.b[i].close > N(r.ema50) && N(r.adx) > 20 ? std(c, i, 2, "Breakout on 2x volume") : null; },
    exit: (c, i, p) => (c.b[i].close < N(c.hi20[p.entryIdx - 1]) ? "Breakout failure" : null) },
  { key: "high52", name: "52-Week High Momentum Breakout", family: "Momentum",
    buyRule: "Close / 52W high >= 0.90 AND Close > previous 20-day high AND Volume > 1.5x MA20 AND Close > SMA200", sellRule: "Trailing 2.5xATR, SL or Close < EMA50", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R, trail 2.5xATR",
    entry: (c, i) => { const r = c.r[i], x = c.b[i]; return ok(c.hi252[i], c.hi20[i], r.sma200) && x.close / c.hi252[i] >= 0.9 && x.close > c.hi20[i] && c.volRatio[i] > 1.5 && x.close > N(r.sma200) ? std(c, i, 2, "Near 52W high breakout", { trail: 2.5 }) : null; },
    exit: (c, i) => (c.b[i].close < N(c.r[i].ema50) ? "Trend breakdown (below EMA50)" : null) },
  { key: "atr_breakout", name: "ATR Volatility Breakout", family: "Volatility",
    buyRule: "Close > previous close + 1xATR AND Volume > 1.5x MA20 AND EMA20 > EMA50", sellRule: "TP 4xATR, SL or trailing Close - 2xATR", slRule: "Entry - 2xATR", tpRule: "Single target 2R (= 4xATR)",
    entry: (c, i) => { const r = c.r[i], a = atrOf(c, i - 1); return i > 1 && ok(a, r.ema20, r.ema50) && c.b[i].close > c.b[i - 1].close + a && c.volRatio[i] > 1.5 && N(r.ema20) > N(r.ema50) ? std(c, i, 2, "Volatility expansion day", { tp1R: undefined, tp2R: 2, trailAfterTp1: false }) : null; } },
  { key: "ema_pullback", name: "EMA 20/50 Pullback", family: "Trend",
    buyRule: "EMA20 > EMA50 > EMA200 AND Low <= EMA20 AND Close > EMA20 AND Close > Open (bullish rejection)", sellRule: "EMA20 < EMA50 or trailing", slRule: "Below recent swing low (or 1.5xATR)", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const r = c.r[i], x = c.b[i]; if (!(ok(r.ema20, r.ema50, r.ema200) && N(r.ema20) > N(r.ema50) && N(r.ema50) > N(r.ema200) && x.low <= N(r.ema20) && x.close > N(r.ema20) && x.close > x.open)) return null;
      const p = std(c, i, 1.5, "Pullback to EMA20 rejected"); if (!p) return null; const sw = swingLow(c, i, 5) * 0.995; if (sw < x.close && sw > x.close - 3 * atrOf(c, i)) p.sl = sw; return p; },
    exit: (c, i) => (N(c.r[i].ema20) < N(c.r[i].ema50) ? "EMA20 below EMA50" : null) },
  { key: "supertrend", name: "SuperTrend + Trend Filter", family: "Trend",
    buyRule: "SuperTrend flips bullish AND Close > EMA50 AND EMA50 > EMA200 AND ADX > 20", sellRule: "SuperTrend flips bearish", slRule: "SuperTrend line", tpRule: "TP1 2R, then SuperTrend trailing",
    entry: (c, i) => { const r = c.r[i]; if (!(i > 1 && r.stTrend && !c.r[i - 1].stTrend && c.b[i].close > N(r.ema50) && N(r.ema50) > N(r.ema200) && N(r.adx) > 20 && ok(r.stUp))) return null; return { sl: N(r.stUp), tp1R: 2, note: "SuperTrend turned up in uptrend" }; },
    exit: (c, i, p) => { const r = c.r[i]; if (!r.stTrend) return "SuperTrend flipped bearish"; if (ok(r.stUp)) p.stop = Math.max(p.stop, N(r.stUp)); return null; } },
  { key: "macd_rsi", name: "MACD + RSI Confirmation", family: "Momentum",
    buyRule: "MACD > Signal AND MACD > 0 AND RSI 50-70 AND Close > EMA50 (fresh alignment); score +1 if Volume > 1.2x MA20", sellRule: "MACD bearish cross, RSI < 45 or trailing", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const cond = (k: number) => { const r = c.r[k]; return ok(r.macd, r.macdSignal, r.rsi, r.ema50) && N(r.macd) > N(r.macdSignal) && N(r.macd) > 0 && N(r.rsi) > 50 && N(r.rsi) < 70 && c.b[k].close > N(r.ema50); };
      return i > 1 && cond(i) && !cond(i - 1) ? std(c, i, 2, "MACD and RSI aligned", { score: c.volRatio[i] > 1.2 ? 5 : 4 }) : null; },
    exit: (c, i) => (N(c.r[i].macd) < N(c.r[i].macdSignal) ? "MACD bearish cross" : N(c.r[i].rsi) < 45 ? "RSI below 45" : null) },
  { key: "pv_momentum", name: "Price + Volume Momentum (8-factor)", family: "Multi-factor",
    buyRule: "Score >= 6 of 8: Close>SMA50, Close>SMA200, EMA50>EMA200, RSI 50-70, 6M return > 0, Volume ratio > 1.5, 52W ratio > 0.90, ADX > 20", sellRule: "Score falls below 4 or trailing", slRule: "Entry - 2xATR", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const s = pvScore(c, i); return s >= 6 && pvScore(c, i - 1) < 6 ? std(c, i, 2, `Signal score ${s}/8`, { score: s }) : null; },
    exit: (c, i) => (pvScore(c, i) < 4 ? "Momentum score deteriorated" : null) },
  { key: "cup_handle", name: "Cup & Handle", family: "Pattern",
    buyRule: "Cup depth 10-35% over ~60 bars, right side recovers to 90%+ of left peak, shallow handle; Close > handle high AND Volume > 1.5x MA20", sellRule: "Measured move target, SL below handle", slRule: "Below handle low", tpRule: "Breakout + cup depth",
    entry: (c, i) => { if (i < 70) return null; const b = c.b; const x = b[i];
      const left = b.slice(i - 65, i - 30); const lp = Math.max(...left.map((y) => y.high)); const lpIdx = i - 65 + left.findIndex((y) => y.high === lp);
      const cup = b.slice(lpIdx, i - 6); const low = Math.min(...cup.map((y) => y.low)); const depth = (lp - low) / lp;
      const right = Math.max(...b.slice(i - 20, i - 6).map((y) => y.high)); const handle = b.slice(i - 6, i); const hh = Math.max(...handle.map((y) => y.high)), hl = Math.min(...handle.map((y) => y.low));
      if (!(depth >= 0.1 && depth <= 0.35 && right >= 0.9 * lp && hl > low + 0.5 * (lp - low) && (hh - hl) / hh < 0.12 && x.close > hh && c.volRatio[i] > 1.5)) return null;
      return { sl: hl * 0.995, tp2Abs: hh + (lp - low), note: `Cup depth ${(depth * 100).toFixed(0)}%` }; } },
  { key: "vcp", name: "VCP Breakout", family: "Pattern",
    buyRule: "Close > SMA50 > SMA200, 3+ contracting ranges with higher lows and drying volume; Close > pivot AND Volume > 1.5x MA20", sellRule: "SL, TP or ATR trailing", slRule: "Below latest contraction low", tpRule: "TP1 2R, TP2 4R, trail 2xATR",
    entry: (c, i) => { if (i < 60) return null; const r = c.r[i]; if (!(ok(r.sma50, r.sma200) && c.b[i].close > N(r.sma50) && N(r.sma50) > N(r.sma200))) return null;
      const seg = [0, 1, 2, 3].map((k) => c.b.slice(i - 60 + k * 15, i - 45 + k * 15)); const rng = seg.map((s) => { const h = Math.max(...s.map((y) => y.high)), l = Math.min(...s.map((y) => y.low)); return { h, l, d: (h - l) / h, v: s.reduce((a, y) => a + y.volume, 0) / s.length }; });
      const contracting = rng[1].d < rng[0].d && rng[2].d < rng[1].d && rng[3].d < rng[2].d; const higherLows = rng[2].l > rng[1].l && rng[3].l > rng[2].l;
      if (!(contracting && higherLows && rng[3].v < rng[0].v && c.b[i].close > rng[3].h * 0.999 && c.b[i].close >= Math.max(...c.b.slice(i - 15, i).map((y) => y.high)) && c.volRatio[i] > 1.5)) return null;
      return { sl: rng[3].l * 0.995, tp1R: 2, tp2R: 4, trail: 2, trailAfterTp1: true, note: `Contractions ${rng.map((x) => (x.d * 100).toFixed(0)).join("/")}%` }; } },
  { key: "mtf", name: "Multi-Timeframe Trend + Momentum", family: "Multi-factor",
    buyRule: "Weekly Close > weekly EMA20 > weekly EMA50 AND Daily Close > EMA50 AND RSI > 50 AND MACD > Signal AND Volume > 1.2x MA20", sellRule: "Daily Close < EMA50, MACD bearish or trailing", slRule: "Entry - 2x daily ATR", tpRule: "TP1 2R, TP2 4R",
    entry: (c, i) => { const cond = (k: number) => { const r = c.r[k]; return c.wkUp[k] && c.b[k].close > N(r.ema50) && N(r.rsi) > 50 && N(r.macd) > N(r.macdSignal); };
      return i > 1 && cond(i) && !cond(i - 1) && c.volRatio[i] > 1.2 ? std(c, i, 2, "Weekly + daily trend aligned") : null; },
    exit: (c, i) => (c.b[i].close < N(c.r[i].ema50) ? "Daily close below EMA50" : N(c.r[i].macd) < N(c.r[i].macdSignal) ? "MACD bearish" : null) },
];

export function pvScore(c: Ctx, i: number) {
  if (i < 1) return 0; const r = c.r[i], x = c.b[i];
  return [x.close > N(r.sma50), x.close > N(r.sma200), N(r.ema50) > N(r.ema200), N(r.rsi) >= 50 && N(r.rsi) <= 70, c.ret126[i] > 0, c.volRatio[i] > 1.5, x.close / c.hi252[i] > 0.9, N(r.adx) > 20].filter(Boolean).length;
}

// ---------- Costs (Indian equity delivery, approximate) ----------
export const SLIPPAGE = 0.0005; // 0.05% each side
export function charges(buyValue: number, sellValue: number) {
  const stt = 0.001 * (buyValue + sellValue);
  const exch = 0.0000297 * (buyValue + sellValue);
  const sebi = 0.000001 * (buyValue + sellValue);
  const stamp = 0.00015 * buyValue;
  const gst = 0.18 * (exch + sebi);
  const dp = sellValue > 0 ? 15.93 : 0;
  return stt + exch + sebi + stamp + gst + dp;
}

export interface SimTrade {
  strategy: string; symbol: string; exchange: string; timeframe: string; signal: "BUY";
  entryPrice: number; quantity: number; stopLoss: number; tp1: number | null; tp2: number | null; trailingStop: number | null;
  riskAmount: number; positionValue: number; entryDate: string; exitDate: string | null; exitReason: string | null; exitPrice: number | null;
  grossPnl: number; charges: number; slippage: number; netPnl: number; equityBefore: number; equityAfter: number | null; open: boolean; lastPrice: number; note: string; holdDays: number; rMultiple: number;
}
export interface PendingSignal { symbol: string; date: string; close: number; stopLoss: number; tp1: number | null; tp2: number | null; qty: number; note: string }
export interface SimResult {
  trades: SimTrade[]; equity: { date: string; value: number }[]; pending: PendingSignal[];
  startEquity: number; finalEquity: number; netReturn: number; winRate: number; profitFactor: number; maxDrawdown: number;
  expectancy: number; avgR: number; avgHold: number; sharpe: number; closedCount: number; totalCharges: number; cagr: number; from: string; to: string;
}
export type Regime = "bull" | "sideways" | "bear";
export interface RegimeDay { date: string; regime: Regime; close: number; sma50: number | null; sma200: number | null; adx: number | null; breadth: number }
/** Allowed regimes per strategy (spec: mean-reversion runs in Bull + Sideways, everything else Bull only). */
export const allowedRegimes = (def: StrategyDef): Regime[] => (def.regimes?.length ? def.regimes : def.family === "Mean reversion" ? ["bull", "sideways"] : ["bull"]);

/**
 * Market regime from an equal-weight index of the whole universe (built from each stock's daily
 * open/high/low/close relative to its previous close). Strong Bull: Index > SMA200, SMA50 > SMA200, ADX > 20.
 * Bear: Index < SMA200 and SMA50 < SMA200. Anything else (incl. ADX < 20) is Sideways.
 */
export function marketRegime(ctxs: Ctx[]): Map<string, RegimeDay> {
  const agg = new Map<string, { o: number; h: number; l: number; c: number; n: number; above: number; tot: number }>();
  ctxs.forEach((cx) => cx.b.forEach((x, i) => {
    const a = agg.get(x.date) ?? { o: 0, h: 0, l: 0, c: 0, n: 0, above: 0, tot: 0 };
    const s200 = cx.r[i].sma200; if (s200) { a.tot++; if (x.close > s200) a.above++; }
    if (i > 0) { const p = cx.b[i - 1].close; if (p > 0) { a.o += x.open / p; a.h += x.high / p; a.l += x.low / p; a.c += x.close / p; a.n++; } }
    agg.set(x.date, a);
  }));
  const dates = [...agg.keys()].sort(); let lvl = 100; const bars: Bar[] = [];
  dates.forEach((d) => { const a = agg.get(d)!; if (!a.n) return; const o = lvl * a.o / a.n, h = lvl * a.h / a.n, l = lvl * a.l / a.n, c = lvl * a.c / a.n; bars.push({ date: d, open: o, high: Math.max(h, o, c), low: Math.min(l, o, c), close: c, volume: 0 } as Bar); lvl = c; });
  const rows = computeAll(bars, false); const out = new Map<string, RegimeDay>();
  rows.forEach((r) => {
    const a = agg.get(r.date)!; const bull = !!r.sma200 && !!r.sma50 && r.close > r.sma200 && r.sma50 > r.sma200 && (r.adx ?? 0) > 20;
    const bear = !!r.sma200 && !!r.sma50 && r.close < r.sma200 && r.sma50 < r.sma200;
    out.set(r.date, { date: r.date, regime: bull ? "bull" : bear ? "bear" : "sideways", close: +r.close.toFixed(2), sma50: r.sma50, sma200: r.sma200, adx: r.adx, breadth: a.tot ? Math.round((a.above / a.tot) * 100) : 0 });
  });
  return out;
}

export interface SimOpts { capital: number; riskPct?: number; startDate?: string; endDate?: string; maxPositions?: number; maxRiskPctOfPrice?: number; regime?: Map<string, RegimeDay> | null }

/** Portfolio-level simulation: signal at close, entry at next open, shared cash, max N positions. */
export function simulate(def: StrategyDef, ctxs: Ctx[], o: SimOpts): SimResult {
  const riskPct = (o.riskPct ?? 1) / 100, maxPos = o.maxPositions ?? 5, maxRiskPx = o.maxRiskPctOfPrice ?? 0.12;
  const dates = [...new Set(ctxs.flatMap((c) => c.b.map((x) => x.date)))].sort();
  const idx = ctxs.map((c) => new Map(c.b.map((x, i) => [x.date, i])));
  const start = o.startDate ?? dates[Math.min(dates.length - 1, 200)] ?? dates[0], end = o.endDate ?? "9999-12-31";
  const allowed = allowedRegimes(def);
  const regimeOk = (d: string) => { if (!o.regime) return true; const r = o.regime.get(d); return !r || allowed.includes(r.regime); };
  let cash = o.capital; const trades: SimTrade[] = []; const equity: { date: string; value: number }[] = [];
  type Live = { t: SimTrade; ci: number; pos: OpenPos; plan: EntryPlan; qtyLeft: number; realized: number; chg: number; slip: number; buyVal: number };
  const open: Live[] = []; let queued: { ci: number; i: number; plan: EntryPlan }[] = []; let pending: PendingSignal[] = [];
  const mtm = (d: string) => cash + open.reduce((a, l) => { const k = idx[l.ci].get(d); return a + l.qtyLeft * (k !== undefined ? ctxs[l.ci].b[k].close : l.t.lastPrice); }, 0);
  const sell = (l: Live, qty: number, px: number, d: string, reason: string | null, i: number) => {
    const fill = px * (1 - SLIPPAGE), val = qty * fill; const slip = qty * px * SLIPPAGE;
    const ch = charges(0, val); cash += val; l.qtyLeft -= qty; l.realized += (fill - l.t.entryPrice) * qty; l.chg += ch; l.slip += slip; cash -= ch;
    if (l.qtyLeft <= 0) {
      const t = l.t; t.exitDate = d; t.exitReason = reason; t.exitPrice = +px.toFixed(2); t.open = false; t.charges = +l.chg.toFixed(2); t.slippage = +l.slip.toFixed(2);
      t.grossPnl = +(l.realized + l.slip).toFixed(2); t.netPnl = +(l.realized - l.chg).toFixed(2);
      t.holdDays = i - l.pos.entryIdx; t.rMultiple = t.riskAmount ? +(t.netPnl / t.riskAmount).toFixed(2) : 0; t.equityAfter = Math.round(mtm(d));
    }
  };
  for (const d of dates) {
    if (d < start || d > end) continue;
    // 1) Execute queued entries at today's open
    const q = queued; queued = [];
    for (const e of q) {
      if (open.length >= maxPos || open.some((l) => l.ci === e.ci)) continue;
      const i = idx[e.ci].get(d); if (i === undefined) continue; const c = ctxs[e.ci], bar = c.b[i];
      const px = bar.open * (1 + SLIPPAGE); const R = px - e.plan.sl; if (!(R > 0) || R / px > maxRiskPx) continue;
      const eqBefore = mtm(d); const riskAmt = eqBefore * riskPct; let qty = Math.floor(riskAmt / R);
      const cost = (n: number) => n * px + charges(n * px, 0); while (qty > 0 && cost(qty) > cash) qty--; if (qty <= 0) continue;
      const buyCh = charges(qty * px, 0); cash -= qty * px + buyCh;
      const tp1 = e.plan.tp1Abs ?? (e.plan.tp1R ? px + e.plan.tp1R * R : null), tp2 = e.plan.tp2Abs ?? (e.plan.tp2R ? px + e.plan.tp2R * R : null);
      const t: SimTrade = { strategy: def.name, symbol: c.sym, exchange: "NSE", timeframe: "1D", signal: "BUY", entryPrice: +px.toFixed(2), quantity: qty, stopLoss: +e.plan.sl.toFixed(2),
        tp1: tp1 && tp1 > px ? +tp1.toFixed(2) : null, tp2: tp2 && tp2 > px ? +tp2.toFixed(2) : null, trailingStop: null, riskAmount: Math.round(qty * R), positionValue: Math.round(qty * px),
        entryDate: d, exitDate: null, exitReason: null, exitPrice: null, grossPnl: 0, charges: +buyCh.toFixed(2), slippage: +(qty * bar.open * SLIPPAGE).toFixed(2), netPnl: 0,
        equityBefore: Math.round(eqBefore), equityAfter: null, open: true, lastPrice: bar.close, note: e.plan.note, holdDays: 0, rMultiple: 0 };
      trades.push(t);
      open.push({ t, ci: e.ci, plan: e.plan, qtyLeft: qty, realized: 0, chg: buyCh, slip: t.slippage, buyVal: qty * px, pos: { entryIdx: i, entry: px, stop: e.plan.sl, tp1: t.tp1, tp2: t.tp2, tp1Hit: false } });
    }
    // 2) Manage open positions intraday + at close
    for (const l of [...open]) {
      const c = ctxs[l.ci]; const i = idx[l.ci].get(d); if (i === undefined) continue; const bar = c.b[i]; l.t.lastPrice = bar.close;
      const p = l.pos; let reason: string | null = null, px = 0;
      if (bar.low <= p.stop) { reason = p.tp1Hit ? (l.t.trailingStop ? "Trailing stop" : "Breakeven stop") : "Stop loss"; px = Math.min(bar.open, p.stop); }
      else {
        if (p.tp1 && !p.tp1Hit && bar.high >= p.tp1) {
          const half = p.tp2 || l.plan.trail ? Math.floor(l.qtyLeft / 2) : l.qtyLeft;
          if (half >= l.qtyLeft) { reason = "Take profit 1"; px = Math.max(bar.open, p.tp1); }
          else { if (half > 0) sell(l, half, Math.max(bar.open, p.tp1), d, null, i); p.tp1Hit = true; p.stop = Math.max(p.stop, p.entry); }
        }
        if (!reason && p.tp2 && bar.high >= p.tp2) { reason = "Take profit 2"; px = Math.max(bar.open, p.tp2); }
      }
      if (!reason) {
        const a = atrOf(c, i);
        if (l.plan.trail && Number.isFinite(a) && (!l.plan.trailAfterTp1 || p.tp1Hit || (!p.tp1 && !p.tp2))) { const ts = bar.close - l.plan.trail * a; if (ts > p.stop) { p.stop = ts; l.t.trailingStop = +ts.toFixed(2); } }
        const ex = def.exit?.(c, i, p); if (ex) { reason = ex; px = bar.close; }
        else if (l.plan.maxHold && i - p.entryIdx >= l.plan.maxHold) { reason = `Max holding ${l.plan.maxHold} sessions`; px = bar.close; }
      }
      l.t.stopLoss = +p.stop.toFixed(2);
      if (reason) { sell(l, l.qtyLeft, px, d, reason, i); open.splice(open.indexOf(l), 1); }
    }
    // 3) New signals at close -> queued for next open
    pending = [];
    if (regimeOk(d)) ctxs.forEach((c, ci) => {
      const i = idx[ci].get(d); if (i === undefined || i < 1) return; if (open.some((l) => l.ci === ci)) return;
      const plan = def.entry(c, i); if (!plan || !(plan.sl < c.b[i].close)) return;
      queued.push({ ci, i, plan });
      const R = c.b[i].close - plan.sl; const eq = mtm(d);
      pending.push({ symbol: c.sym, date: d, close: c.b[i].close, stopLoss: +plan.sl.toFixed(2), tp1: plan.tp1Abs ?? (plan.tp1R ? +(c.b[i].close + plan.tp1R * R).toFixed(2) : null), tp2: plan.tp2Abs ?? (plan.tp2R ? +(c.b[i].close + plan.tp2R * R).toFixed(2) : null), qty: Math.max(0, Math.floor((eq * riskPct) / R)), note: plan.note });
    });
    queued.sort((a, b) => (b.plan.score ?? 0) - (a.plan.score ?? 0));
    equity.push({ date: d, value: Math.round(mtm(d)) });
  }
  // Mark open trades to market
  open.forEach((l) => { const t = l.t; const unreal = (t.lastPrice - t.entryPrice) * l.qtyLeft; t.grossPnl = +(l.realized + unreal).toFixed(2); t.netPnl = +(l.realized + unreal - l.chg).toFixed(2); t.quantity = l.qtyLeft || t.quantity; t.holdDays = equity.length ? ctxs[l.ci].b.length - 1 - l.pos.entryIdx : 0; t.rMultiple = t.riskAmount ? +(t.netPnl / t.riskAmount).toFixed(2) : 0; });
  const closed = trades.filter((t) => !t.open); const wins = closed.filter((t) => t.netPnl > 0), losses = closed.filter((t) => t.netPnl <= 0);
  const finalEquity = equity.at(-1)?.value ?? o.capital; let peak = 0, dd = 0; equity.forEach((e) => { peak = Math.max(peak, e.value); dd = Math.max(dd, peak ? (peak - e.value) / peak : 0); });
  const rets = equity.slice(1).map((e, k) => e.value / equity[k].value - 1); const mu = rets.reduce((a, x) => a + x, 0) / (rets.length || 1); const sd = Math.sqrt(rets.reduce((a, x) => a + (x - mu) ** 2, 0) / (rets.length || 1));
  const gl = losses.reduce((a, t) => a - t.netPnl, 0), gw = wins.reduce((a, t) => a + t.netPnl, 0); const years = Math.max(equity.length / 248, 1 / 248);
  return {
    trades, equity, pending, startEquity: o.capital, finalEquity, netReturn: ((finalEquity - o.capital) / o.capital) * 100,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0, profitFactor: gl ? gw / gl : gw > 0 ? 99 : 0, maxDrawdown: dd * 100,
    expectancy: closed.length ? closed.reduce((a, t) => a + t.netPnl, 0) / closed.length : 0, avgR: closed.length ? closed.reduce((a, t) => a + t.rMultiple, 0) / closed.length : 0,
    avgHold: closed.length ? closed.reduce((a, t) => a + t.holdDays, 0) / closed.length : 0, sharpe: sd ? (mu / sd) * Math.sqrt(248) : 0, closedCount: closed.length,
    totalCharges: trades.reduce((a, t) => a + t.charges, 0), cagr: (Math.pow(finalEquity / o.capital, 1 / years) - 1) * 100, from: equity[0]?.date ?? "", to: equity.at(-1)?.date ?? "",
  };
}

export const strategyByKey = (k: string) => STRATEGIES.find((s) => s.key === k);
