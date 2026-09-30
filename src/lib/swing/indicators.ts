import type { Bar } from "./engine";

export const sma = (v: number[], n: number) => v.map((_, i) => (i < n - 1 ? NaN : v.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));
export const ema = (v: number[], n: number) => { const k = 2 / (n + 1); const o: number[] = []; v.forEach((x, i) => o.push(i === 0 ? x : x * k + o[i - 1] * (1 - k))); return o.map((x, i) => (i < n - 1 ? NaN : x)); };
export function rsi(v: number[], n = 14) {
  const out = Array(v.length).fill(NaN); let g = 0, l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; l += dn / n; if (i === n) out[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; out[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
  }
  return out;
}
export function macd(v: number[], f = 12, s = 26, sig = 9) {
  const k = (n: number) => { const a = 2 / (n + 1); const o: number[] = []; v.forEach((x, i) => o.push(i ? x * a + o[i - 1] * (1 - a) : x)); return o; };
  const ef = k(f), es = k(s); const line = ef.map((x, i) => x - es[i]);
  const a = 2 / (sig + 1); const sl: number[] = []; line.forEach((x, i) => sl.push(i ? x * a + sl[i - 1] * (1 - a) : x));
  return line.map((x, i) => (i < s ? { macd: NaN, signal: NaN, hist: NaN } : { macd: x, signal: sl[i], hist: x - sl[i] }));
}
export function bollinger(v: number[], n = 20, m = 2) {
  const mid = sma(v, n);
  return mid.map((mu, i) => { if (Number.isNaN(mu)) return { upper: NaN, mid: NaN, lower: NaN }; const w = v.slice(i - n + 1, i + 1); const sd = Math.sqrt(w.reduce((a, x) => a + (x - mu) ** 2, 0) / n); return { upper: mu + m * sd, mid: mu, lower: mu - m * sd }; });
}
/** VWAP: resets each session for intraday bars; rolling 20-bar for daily bars. */
export function vwap(b: Bar[], intraday: boolean) {
  let pv = 0, vol = 0, day = "";
  return b.map((x, i) => {
    const tp = (x.high + x.low + x.close) / 3;
    if (intraday) { const d = x.date.slice(0, 10); if (d !== day) { day = d; pv = 0; vol = 0; } pv += tp * x.volume; vol += x.volume; return vol ? pv / vol : tp; }
    const w = b.slice(Math.max(0, i - 19), i + 1); const V = w.reduce((a, y) => a + y.volume, 0);
    return V ? w.reduce((a, y) => a + ((y.high + y.low + y.close) / 3) * y.volume, 0) / V : tp;
  });
}
export function atr(b: Bar[], n = 14) {
  const tr = b.map((x, i) => (i ? Math.max(x.high - x.low, Math.abs(x.high - b[i - 1].close), Math.abs(x.low - b[i - 1].close)) : x.high - x.low));
  const o: number[] = []; tr.forEach((t, i) => o.push(i < n ? NaN : i === n ? tr.slice(1, n + 1).reduce((a, c) => a + c, 0) / n : (o[i - 1] * (n - 1) + t) / n));
  return o;
}
export function supertrend(b: Bar[], n = 10, m = 3) {
  const a = atr(b, n); let fu = NaN, fl = NaN, up = true;
  return b.map((x, i) => {
    if (Number.isNaN(a[i])) return { value: NaN, up: true };
    const hl = (x.high + x.low) / 2, bu = hl + m * a[i], bl = hl - m * a[i], pc = b[i - 1]?.close ?? x.close;
    fu = Number.isNaN(fu) || bu < fu || pc > fu ? bu : fu;
    fl = Number.isNaN(fl) || bl > fl || pc < fl ? bl : fl;
    if (up && x.close < fl) up = false; else if (!up && x.close > fu) up = true;
    return { value: up ? fl : fu, up };
  });
}

export function computeAll(b: Bar[], intraday: boolean) {
  const c = b.map((x) => x.close);
  const s20 = sma(c, 20), s50 = sma(c, 50), s200 = sma(c, 200), e20 = ema(c, 20), r = rsi(c), m = macd(c), bb = bollinger(c), vw = vwap(b, intraday), st = supertrend(b);
  const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
  return b.map((x, i) => ({
    ...x, sma20: r2(s20[i]), sma50: r2(s50[i]), sma200: r2(s200[i]), ema20: r2(e20[i]), rsi: r2(r[i]),
    macd: r2(m[i].macd), macdSignal: r2(m[i].signal), macdHist: r2(m[i].hist),
    bbUpper: r2(bb[i].upper), bbMid: r2(bb[i].mid), bbLower: r2(bb[i].lower), vwap: r2(vw[i]),
    stUp: st[i].up ? r2(st[i].value) : null, stDown: st[i].up ? null : r2(st[i].value), stTrend: st[i].up,
    upDay: x.close >= x.open,
  }));
}
export type IndicatorRow = ReturnType<typeof computeAll>[number];

/** Human-readable verdict per indicator for the latest bar. */
export function readout(rows: IndicatorRow[]) {
  const l = rows.at(-1); if (!l) return [];
  const v = (cond: boolean | null, bull: string, bear: string) => (cond === null ? { view: "Neutral", tone: 0, text: "Not enough data" } : cond ? { view: "Bullish", tone: 1, text: bull } : { view: "Bearish", tone: -1, text: bear });
  const n = (x: number | null) => (x === null ? "-" : x.toFixed(2));
  return [
    { name: "SMA 20 / 50", value: `${n(l.sma20)} / ${n(l.sma50)}`, ...v(l.sma20 && l.sma50 ? l.sma20 > l.sma50 : null, "Short trend above medium trend", "Short trend below medium trend") },
    { name: "SMA 200", value: n(l.sma200), ...v(l.sma200 ? l.close > l.sma200 : null, "Price above long-term average", "Price below long-term average") },
    { name: "EMA 20", value: n(l.ema20), ...v(l.ema20 ? l.close > l.ema20 : null, "Price above EMA 20", "Price below EMA 20") },
    { name: "RSI 14", value: n(l.rsi), ...(l.rsi === null ? v(null, "", "") : l.rsi > 70 ? { view: "Overbought", tone: -1, text: "Momentum stretched above 70" } : l.rsi < 30 ? { view: "Oversold", tone: 1, text: "Momentum stretched below 30" } : v(l.rsi >= 50, "Momentum positive (above 50)", "Momentum weak (below 50)")) },
    { name: "MACD 12/26/9", value: `${n(l.macd)} / ${n(l.macdSignal)}`, ...v(l.macd !== null && l.macdSignal !== null ? l.macd > l.macdSignal : null, "MACD above signal line", "MACD below signal line") },
    { name: "Bollinger 20,2", value: `${n(l.bbLower)} - ${n(l.bbUpper)}`, ...(l.bbUpper === null ? v(null, "", "") : l.close > l.bbUpper ? { view: "Overextended", tone: -1, text: "Closed above upper band" } : l.close < l.bbLower! ? { view: "Oversold", tone: 1, text: "Closed below lower band" } : v(l.close >= l.bbMid!, "Upper half of the bands", "Lower half of the bands")) },
    { name: "VWAP", value: n(l.vwap), ...v(l.vwap ? l.close > l.vwap : null, "Price above VWAP", "Price below VWAP") },
    { name: "Supertrend 10,3", value: n(l.stUp ?? l.stDown), ...v(l.stUp === null && l.stDown === null ? null : l.stTrend, "Uptrend in force", "Downtrend in force") },
  ];
}
