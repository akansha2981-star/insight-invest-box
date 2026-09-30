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

const hh = (b: Bar[], i: number, n: number) => Math.max(...b.slice(i - n + 1, i + 1).map((x) => x.high));
const ll = (b: Bar[], i: number, n: number) => Math.min(...b.slice(i - n + 1, i + 1).map((x) => x.low));
export function adx(b: Bar[], n = 14) {
  const out = Array(b.length).fill(NaN), pdiA = Array(b.length).fill(NaN), mdiA = Array(b.length).fill(NaN);
  let tr = 0, pdm = 0, mdm = 0, adxv = NaN; const dx: number[] = [];
  for (let i = 1; i < b.length; i++) {
    const up = b[i].high - b[i - 1].high, dn = b[i - 1].low - b[i].low;
    const t = Math.max(b[i].high - b[i].low, Math.abs(b[i].high - b[i - 1].close), Math.abs(b[i].low - b[i - 1].close));
    const p = up > dn && up > 0 ? up : 0, m = dn > up && dn > 0 ? dn : 0;
    if (i <= n) { tr += t; pdm += p; mdm += m; } else { tr = tr - tr / n + t; pdm = pdm - pdm / n + p; mdm = mdm - mdm / n + m; }
    if (i >= n) {
      const pdi = (100 * pdm) / (tr || 1e-9), mdi = (100 * mdm) / (tr || 1e-9); pdiA[i] = pdi; mdiA[i] = mdi;
      const d = (100 * Math.abs(pdi - mdi)) / (pdi + mdi || 1e-9); dx.push(d);
      if (dx.length === n) adxv = dx.reduce((a, c) => a + c, 0) / n; else if (dx.length > n) adxv = (adxv * (n - 1) + d) / n;
      out[i] = adxv;
    }
  }
  return { adx: out, pdi: pdiA, mdi: mdiA };
}
export function stochastic(b: Bar[], n = 14, d = 3) {
  const k = b.map((x, i) => (i < n - 1 ? NaN : (100 * (x.close - ll(b, i, n))) / (hh(b, i, n) - ll(b, i, n) || 1e-9)));
  return { k, d: k.map((_, i) => (i < n + d - 2 ? NaN : k.slice(i - d + 1, i + 1).reduce((a, c) => a + c, 0) / d)) };
}
export function obv(b: Bar[]) { let o = 0; return b.map((x, i) => (i ? (o += x.close > b[i - 1].close ? x.volume : x.close < b[i - 1].close ? -x.volume : 0) : o)); }
export function ichimoku(b: Bar[]) {
  const mid = (i: number, n: number) => (i < n - 1 ? NaN : (hh(b, i, n) + ll(b, i, n)) / 2);
  return b.map((_, i) => { const tenkan = mid(i, 9), kijun = mid(i, 26), j = i - 26;
    const spanA = j >= 0 ? (mid(j, 9) + mid(j, 26)) / 2 : NaN, spanB = j >= 0 ? mid(j, 52) : NaN; return { tenkan, kijun, spanA, spanB }; });
}
export function cci(b: Bar[], n = 20) {
  const tp = b.map((x) => (x.high + x.low + x.close) / 3), m = sma(tp, n);
  return tp.map((t, i) => { if (Number.isNaN(m[i])) return NaN; const md = tp.slice(i - n + 1, i + 1).reduce((a, x) => a + Math.abs(x - m[i]), 0) / n; return (t - m[i]) / (0.015 * (md || 1e-9)); });
}
export const williamsR = (b: Bar[], n = 14) => b.map((x, i) => (i < n - 1 ? NaN : (-100 * (hh(b, i, n) - x.close)) / (hh(b, i, n) - ll(b, i, n) || 1e-9)));
export const roc = (v: number[], n = 12) => v.map((x, i) => (i < n ? NaN : ((x - v[i - n]) / v[i - n]) * 100));
export function mfi(b: Bar[], n = 14) {
  const tp = b.map((x) => (x.high + x.low + x.close) / 3);
  return b.map((_, i) => { if (i < n) return NaN; let pos = 0, neg = 0;
    for (let j = i - n + 1; j <= i; j++) { const f = tp[j] * b[j].volume; if (tp[j] > tp[j - 1]) pos += f; else if (tp[j] < tp[j - 1]) neg += f; }
    return 100 - 100 / (1 + pos / (neg || 1e-9)); });
}
export function psar(b: Bar[], step = 0.02, max = 0.2) {
  if (b.length < 2) return b.map(() => ({ value: NaN, up: true }));
  let up = b[1].close >= b[0].close, af = step, ep = up ? b[0].high : b[0].low, sar = up ? b[0].low : b[0].high;
  const out = [{ value: NaN, up }];
  for (let i = 1; i < b.length; i++) {
    sar = sar + af * (ep - sar);
    if (up) { sar = Math.min(sar, b[i - 1].low, b[Math.max(0, i - 2)].low); if (b[i].low < sar) { up = false; sar = ep; ep = b[i].low; af = step; } else if (b[i].high > ep) { ep = b[i].high; af = Math.min(af + step, max); } }
    else { sar = Math.max(sar, b[i - 1].high, b[Math.max(0, i - 2)].high); if (b[i].high > sar) { up = true; sar = ep; ep = b[i].high; af = step; } else if (b[i].low < ep) { ep = b[i].low; af = Math.min(af + step, max); } }
    out.push({ value: sar, up });
  }
  return out;
}
export const donchian = (b: Bar[], n = 20) => b.map((_, i) => (i < n ? { upper: NaN, lower: NaN } : { upper: hh(b, i - 1, n), lower: ll(b, i - 1, n) }));
/** Classic pivots from the previous bar. */
export const pivots = (b: Bar[]) => b.map((_, i) => { const p = b[i - 1]; if (!p) return { pp: NaN, r1: NaN, s1: NaN, r2: NaN, s2: NaN };
  const pp = (p.high + p.low + p.close) / 3; return { pp, r1: 2 * pp - p.low, s1: 2 * pp - p.high, r2: pp + (p.high - p.low), s2: pp - (p.high - p.low) }; });

export function computeAll(b: Bar[], intraday: boolean) {
  const c = b.map((x) => x.close);
  const s20 = sma(c, 20), s50 = sma(c, 50), s200 = sma(c, 200), e20 = ema(c, 20), r = rsi(c), m = macd(c), bb = bollinger(c), vw = vwap(b, intraday), st = supertrend(b);
  const s100 = sma(c, 100), e50 = ema(c, 50), e200 = ema(c, 200), ax = adx(b), at = atr(b), so = stochastic(b), ob = obv(b), ic = ichimoku(b), cc = cci(b), wr = williamsR(b), rc = roc(c), mf = mfi(b), ps = psar(b), dc = donchian(b), pv = pivots(b), vma = sma(b.map((x) => x.volume), 20);
  const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
  return b.map((x, i) => ({
    ...x, sma20: r2(s20[i]), sma50: r2(s50[i]), sma200: r2(s200[i]), ema20: r2(e20[i]), rsi: r2(r[i]),
    macd: r2(m[i].macd), macdSignal: r2(m[i].signal), macdHist: r2(m[i].hist),
    bbUpper: r2(bb[i].upper), bbMid: r2(bb[i].mid), bbLower: r2(bb[i].lower), vwap: r2(vw[i]),
    stUp: st[i].up ? r2(st[i].value) : null, stDown: st[i].up ? null : r2(st[i].value), stTrend: st[i].up,
    sma100: r2(s100[i]), ema50: r2(e50[i]), ema200: r2(e200[i]), bbWidth: r2(bb[i].mid ? (bb[i].upper - bb[i].lower) / bb[i].mid : NaN),
    adx: r2(ax.adx[i]), pdi: r2(ax.pdi[i]), mdi: r2(ax.mdi[i]), atr: r2(at[i]), stochK: r2(so.k[i]), stochD: r2(so.d[i]), obv: ob[i],
    tenkan: r2(ic[i].tenkan), kijun: r2(ic[i].kijun), spanA: r2(ic[i].spanA), spanB: r2(ic[i].spanB), cci: r2(cc[i]), willR: r2(wr[i]), roc: r2(rc[i]), mfi: r2(mf[i]),
    psar: r2(ps[i].value), psarUp: ps[i].up, dcUpper: r2(dc[i].upper), dcLower: r2(dc[i].lower),
    pp: r2(pv[i].pp), r1: r2(pv[i].r1), s1: r2(pv[i].s1), r2: r2(pv[i].r2), s2: r2(pv[i].s2), volMa: r2(vma[i]),
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
    { name: "SMA 100", value: n(l.sma100), ...v(l.sma100 ? l.close > l.sma100 : null, "Price above SMA 100", "Price below SMA 100") },
    { name: "EMA 50 / 200", value: `${n(l.ema50)} / ${n(l.ema200)}`, ...v(l.ema50 && l.ema200 ? l.ema50 > l.ema200 : null, "EMA 50 above EMA 200", "EMA 50 below EMA 200") },
    { name: "BB Bandwidth", value: n(l.bbWidth), view: l.bbWidth === null ? "Neutral" : l.bbWidth < 0.06 ? "Squeeze" : "Expanding", tone: 0, text: l.bbWidth !== null && l.bbWidth < 0.06 ? "Volatility contracting; breakout watch" : "Volatility normal/expanding" },
    { name: "ADX 14", value: `${n(l.adx)} (+DI ${n(l.pdi)} / -DI ${n(l.mdi)})`, ...(l.adx === null ? v(null, "", "") : l.adx < 20 ? { view: "No trend", tone: 0, text: "Weak or no trend (ADX < 20)" } : v((l.pdi ?? 0) > (l.mdi ?? 0), `Trend strength ${l.adx > 25 ? "strong" : "developing"}, +DI leads`, `Trend strength ${l.adx > 25 ? "strong" : "developing"}, -DI leads`)) },
    { name: "ATR 14", value: n(l.atr), view: "Volatility", tone: 0, text: l.atr ? `${((l.atr / l.close) * 100).toFixed(2)}% of price per bar` : "Not enough data" },
    { name: "Stochastic 14,3", value: `${n(l.stochK)} / ${n(l.stochD)}`, ...(l.stochK === null ? v(null, "", "") : l.stochK > 80 ? { view: "Overbought", tone: -1, text: "%K above 80" } : l.stochK < 20 ? { view: "Oversold", tone: 1, text: "%K below 20" } : v(l.stochK > (l.stochD ?? 0), "%K above %D", "%K below %D")) },
    { name: "OBV", value: l.obv.toLocaleString("en-IN"), ...v(rows.length > 20 ? l.obv > rows[rows.length - 21].obv : null, "Volume flow rising (20 bars)", "Volume flow falling (20 bars)") },
    { name: "Ichimoku", value: `T ${n(l.tenkan)} / K ${n(l.kijun)}`, ...v(l.spanA !== null && l.spanB !== null ? l.close > Math.max(l.spanA, l.spanB) : null, "Price above the cloud", "Price at or below the cloud") },
    { name: "CCI 20", value: n(l.cci), ...(l.cci === null ? v(null, "", "") : l.cci > 100 ? { view: "Overbought", tone: -1, text: "CCI above +100" } : l.cci < -100 ? { view: "Oversold", tone: 1, text: "CCI below -100" } : v(l.cci >= 0, "CCI positive", "CCI negative")) },
    { name: "Williams %R 14", value: n(l.willR), ...(l.willR === null ? v(null, "", "") : l.willR > -20 ? { view: "Overbought", tone: -1, text: "Above -20" } : l.willR < -80 ? { view: "Oversold", tone: 1, text: "Below -80" } : v(l.willR > -50, "Upper half of range", "Lower half of range")) },
    { name: "ROC 12", value: n(l.roc) + "%", ...v(l.roc === null ? null : l.roc > 0, "Positive rate of change", "Negative rate of change") },
    { name: "MFI 14", value: n(l.mfi), ...(l.mfi === null ? v(null, "", "") : l.mfi > 80 ? { view: "Overbought", tone: -1, text: "Money flow above 80" } : l.mfi < 20 ? { view: "Oversold", tone: 1, text: "Money flow below 20" } : v(l.mfi >= 50, "Money flowing in", "Money flowing out")) },
    { name: "Parabolic SAR", value: n(l.psar), ...v(l.psar === null ? null : l.psarUp, "SAR below price (uptrend)", "SAR above price (downtrend)") },
    { name: "Donchian 20", value: `${n(l.dcLower)} - ${n(l.dcUpper)}`, ...(l.dcUpper === null ? v(null, "", "") : l.close > l.dcUpper ? { view: "Breakout", tone: 1, text: "Closed above 20-bar high" } : l.close < l.dcLower! ? { view: "Breakdown", tone: -1, text: "Closed below 20-bar low" } : { view: "In range", tone: 0, text: "Inside the channel" }) },
    { name: "Pivot Points", value: `S1 ${n(l.s1)} / P ${n(l.pp)} / R1 ${n(l.r1)}`, ...v(l.pp === null ? null : l.close > l.pp, "Trading above pivot", "Trading below pivot") },
    { name: "Volume vs MA 20", value: `${l.volume.toLocaleString("en-IN")} / ${l.volMa?.toLocaleString("en-IN") ?? "-"}`, view: l.volMa && l.volume > 1.5 * l.volMa ? "High volume" : "Normal", tone: 0, text: l.volMa ? `${(l.volume / l.volMa).toFixed(2)}x average volume` : "Not enough data" },
    { name: "Supertrend 10,3", value: n(l.stUp ?? l.stDown), ...v(l.stUp === null && l.stDown === null ? null : l.stTrend, "Uptrend in force", "Downtrend in force") },
  ];
}
