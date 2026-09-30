// Robustness analytics: Sortino, walk-forward (train/validation/out-of-sample + rolling),
// Monte Carlo trade reshuffling, benchmark comparison, market breadth and sector analysis.
import { simulate, type Ctx, type RegimeDay, type SimOpts, type SimResult, type StrategyDef } from "./strategies20";

export function sortino(equity: { value: number }[]) {
  const r = equity.slice(1).map((e, k) => e.value / equity[k].value - 1); if (!r.length) return 0;
  const mu = r.reduce((a, x) => a + x, 0) / r.length; const dn = Math.sqrt(r.reduce((a, x) => a + Math.min(0, x) ** 2, 0) / r.length);
  return dn ? (mu / dn) * Math.sqrt(248) : 0;
}
export function drawdown(values: number[]) { let peak = -Infinity, dd = 0; values.forEach((v) => { peak = Math.max(peak, v); dd = Math.max(dd, peak > 0 ? (peak - v) / peak : 0); }); return dd * 100; }

export const allDates = (ctxs: Ctx[]) => [...new Set(ctxs.flatMap((c) => c.b.map((x) => x.date)))].sort();

export interface Split { train: [string, string]; valid: [string, string]; oos: [string, string] }
export function defaultSplit(ctxs: Ctx[]): Split {
  const d = allDates(ctxs).slice(200); const at = (f: number) => d[Math.min(d.length - 1, Math.floor(d.length * f))];
  return { train: [d[0], at(0.5)], valid: [at(0.5), at(0.7)], oos: [at(0.7), d.at(-1)!] };
}
export function walkForward(def: StrategyDef, ctxs: Ctx[], s: Split, base: SimOpts) {
  const run = (p: [string, string]) => simulate(def, ctxs, { ...base, startDate: p[0], endDate: p[1] });
  const train = run(s.train), valid = run(s.valid), oos = run(s.oos);
  const passes = [train, valid, oos].filter((r) => r.netReturn > 0).length;
  const verdict = oos.netReturn > 0 && valid.netReturn > 0 ? "Robust" : oos.netReturn > 0 ? "Mixed" : train.netReturn > 0 ? "Fails out-of-sample" : "Weak";
  return { train, valid, oos, passes, verdict };
}
/** Rolling walk-forward: consecutive windows of `months` months. */
export function rolling(def: StrategyDef, ctxs: Ctx[], months: number, base: SimOpts) {
  const d = allDates(ctxs).slice(200); const out: { from: string; to: string; ret: number; trades: number; dd: number }[] = [];
  let i = 0; const step = Math.round(months * 21);
  while (i < d.length - 20) { const j = Math.min(d.length - 1, i + step); const r = simulate(def, ctxs, { ...base, startDate: d[i], endDate: d[j] }); out.push({ from: d[i], to: d[j], ret: +r.netReturn.toFixed(2), trades: r.trades.length, dd: +r.maxDrawdown.toFixed(1) }); i = j + 1; }
  return out;
}

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]; };
/** Reshuffles closed-trade returns (as % of equity at entry) many times. Simulation, not prediction. */
export function monteCarlo(res: SimResult, runs = 1000) {
  const closed = res.trades.filter((t) => !t.open && t.equityBefore > 0); if (closed.length < 5) return null;
  const rets = closed.map((t) => t.netPnl / t.equityBefore); const rand = rng(42);
  const dds: number[] = [], finals: number[] = [], streaks: number[] = []; const paths: number[][] = [];
  for (let k = 0; k < runs; k++) {
    const a = [...rets]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    let eq = res.startEquity; const path = [eq]; let st = 0, mx = 0;
    a.forEach((r) => { eq *= 1 + r; path.push(eq); st = r <= 0 ? st + 1 : 0; mx = Math.max(mx, st); });
    dds.push(drawdown(path)); finals.push(eq); streaks.push(mx); if (k < 40) paths.push(path);
  }
  const band = paths[0].map((_, i) => { const col = paths.map((p) => p[i]); return { trade: i, p5: Math.round(q(col, 0.05)), p50: Math.round(q(col, 0.5)), p95: Math.round(q(col, 0.95)) }; });
  return {
    runs, trades: closed.length, band,
    dd: { p5: q(dds, 0.05), p50: q(dds, 0.5), p95: q(dds, 0.95) }, final: { p5: q(finals, 0.05), p50: q(finals, 0.5), p95: q(finals, 0.95) },
    streak: { p50: q(streaks, 0.5), p95: q(streaks, 0.95) }, probLoss: (finals.filter((f) => f < res.startEquity).length / runs) * 100,
    probDd20: (dds.filter((d) => d > 20).length / runs) * 100,
  };
}

/** Buy & hold of the equal-weight index built from the scanned universe (used as benchmark). */
export function benchmark(regime: Map<string, RegimeDay>, from: string, to: string) {
  const pts = [...regime.values()].filter((r) => r.date >= from && r.date <= to); if (pts.length < 2) return { ret: 0, dd: 0, series: [] as { date: string; value: number }[] };
  const base = pts[0].close; const series = pts.map((p) => ({ date: p.date, value: p.close / base }));
  return { ret: (pts.at(-1)!.close / base - 1) * 100, dd: drawdown(pts.map((p) => p.close)), series };
}

export const SECTORS: Record<string, string> = {
  HDFCBANK: "Banking", ICICIBANK: "Banking", AXISBANK: "Banking", KOTAKBANK: "Banking", SBIN: "Banking", INDUSINDBK: "Banking",
  TCS: "IT", INFY: "IT", WIPRO: "IT", HCLTECH: "IT", TECHM: "IT",
  MARUTI: "Auto", HEROMOTOCO: "Auto", EICHERMOT: "Auto", "M&M": "Auto",
  SUNPHARMA: "Pharma", DRREDDY: "Pharma", DIVISLAB: "Pharma", CIPLA: "Pharma", APOLLOHOSP: "Pharma",
  ITC: "FMCG", NESTLEIND: "FMCG", HINDUNILVR: "FMCG", TATACONSUM: "FMCG", ASIANPAINT: "FMCG", TITAN: "FMCG", TRENT: "FMCG",
  TATASTEEL: "Metal", JSWSTEEL: "Metal", COALINDIA: "Metal", GRASIM: "Metal", ULTRACEMCO: "Metal",
  RELIANCE: "Energy", ONGC: "Energy", BPCL: "Energy", NTPC: "Energy", POWERGRID: "Energy", ADANIENT: "Energy",
  BAJFINANCE: "Financial Services", BAJAJFINSV: "Financial Services", SBILIFE: "Financial Services", HDFCLIFE: "Financial Services", SHRIRAMFIN: "Financial Services", JIOFIN: "Financial Services",
  BHARTIARTL: "Telecom", LT: "Infrastructure", ADANIPORTS: "Infrastructure", BEL: "Infrastructure",
};
export const sectorOf = (s: string) => SECTORS[s] ?? "Other";

export function breadthAt(ctxs: Ctx[], date?: string) {
  const d = date ?? allDates(ctxs).at(-1)!; let adv = 0, dec = 0, a20 = 0, a50 = 0, a200 = 0, hi = 0, lo = 0, upV = 0, dnV = 0, n = 0;
  ctxs.forEach((c) => {
    const i = c.b.findIndex((x) => x.date === d); if (i < 1) return; const b = c.b[i], r = c.r[i]; n++;
    if (b.close > c.b[i - 1].close) { adv++; upV += b.volume; } else if (b.close < c.b[i - 1].close) { dec++; dnV += b.volume; }
    if (r.sma20 && b.close > r.sma20) a20++; if (r.sma50 && b.close > r.sma50) a50++; if (r.sma200 && b.close > r.sma200) a200++;
    const w = c.b.slice(Math.max(0, i - 251), i + 1); if (w.length > 200) { if (b.high >= Math.max(...w.map((x) => x.high))) hi++; if (b.low <= Math.min(...w.map((x) => x.low))) lo++; }
  });
  const p = (x: number) => (n ? Math.round((x / n) * 100) : 0);
  return { date: d, n, adv, dec, adRatio: dec ? adv / dec : adv, a20: p(a20), a50: p(a50), a200: p(a200), hi, lo, upV, dnV };
}
export function breadthHistory(ctxs: Ctx[], days = 250) {
  const maps = ctxs.map((c) => new Map(c.b.map((x, i) => [x.date, i])));
  return allDates(ctxs).slice(-days).map((d) => { let n = 0, a50 = 0, a200 = 0, adv = 0, dec = 0;
    ctxs.forEach((c, k) => { const i = maps[k].get(d); if (i === undefined || i < 1) return; const b = c.b[i], r = c.r[i]; n++; if (r.sma50 && b.close > r.sma50) a50++; if (r.sma200 && b.close > r.sma200) a200++; if (b.close > c.b[i - 1].close) adv++; else if (b.close < c.b[i - 1].close) dec++; });
    return { date: d, a50: n ? Math.round((a50 / n) * 100) : 0, a200: n ? Math.round((a200 / n) * 100) : 0, net: adv - dec }; });
}
export function sectorStats(ctxs: Ctx[]) {
  const g = new Map<string, Ctx[]>(); ctxs.forEach((c) => { const s = sectorOf(c.sym); g.set(s, [...(g.get(s) ?? []), c]); });
  const avg = (a: number[]) => { const f = a.filter(Number.isFinite); return f.length ? f.reduce((x, y) => x + y, 0) / f.length : NaN; };
  const all1m = avg(ctxs.map((c) => c.ret21[c.b.length - 1]));
  return [...g.entries()].map(([sector, cs]) => {
    const L = (c: Ctx) => c.b.length - 1;
    const d1 = avg(cs.map((c) => (c.b.at(-2) ? (c.b.at(-1)!.close / c.b.at(-2)!.close - 1) * 100 : NaN)));
    const m1 = avg(cs.map((c) => c.ret21[L(c)])), m3 = avg(cs.map((c) => c.ret63[L(c)])), m6 = avg(cs.map((c) => c.ret126[L(c)]));
    const a50 = Math.round((cs.filter((c) => c.r[L(c)].sma50 && c.b[L(c)].close > c.r[L(c)].sma50!).length / cs.length) * 100);
    const a200 = Math.round((cs.filter((c) => c.r[L(c)].sma200 && c.b[L(c)].close > c.r[L(c)].sma200!).length / cs.length) * 100);
    const vol = avg(cs.map((c) => c.volRatio[L(c)]));
    return { sector, stocks: cs.length, d1, m1, m3, m6, a50, a200, rs: m1 - all1m, vol, members: cs.map((c) => c.sym) };
  }).sort((a, b) => b.m1 - a.m1);
}
