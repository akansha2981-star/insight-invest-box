// Safe, declarative rule engine for the Strategy Builder and Scanner. Rules are plain JSON
// (no code execution) and compile into the same StrategyDef used by the 20 built-in strategies.
import type { Ctx, StrategyDef, EntryPlan } from "./strategies20";

export const FIELDS: { key: string; label: string; group: string }[] = [
  { key: "close", label: "Close", group: "Price" }, { key: "open", label: "Open", group: "Price" }, { key: "high", label: "High", group: "Price" }, { key: "low", label: "Low", group: "Price" },
  { key: "sma20", label: "SMA 20", group: "Moving averages" }, { key: "sma50", label: "SMA 50", group: "Moving averages" }, { key: "sma100", label: "SMA 100", group: "Moving averages" }, { key: "sma200", label: "SMA 200", group: "Moving averages" },
  { key: "ema20", label: "EMA 20", group: "Moving averages" }, { key: "ema50", label: "EMA 50", group: "Moving averages" }, { key: "ema200", label: "EMA 200", group: "Moving averages" },
  { key: "rsi", label: "RSI 14", group: "Momentum" }, { key: "rsi2", label: "RSI 2", group: "Momentum" }, { key: "macd", label: "MACD", group: "Momentum" }, { key: "macdSignal", label: "MACD signal", group: "Momentum" }, { key: "macdHist", label: "MACD histogram", group: "Momentum" },
  { key: "stochK", label: "Stochastic %K", group: "Momentum" }, { key: "cci", label: "CCI 20", group: "Momentum" }, { key: "willR", label: "Williams %R", group: "Momentum" }, { key: "mfi", label: "MFI 14", group: "Momentum" }, { key: "roc", label: "ROC 12", group: "Momentum" },
  { key: "adx", label: "ADX", group: "Trend" }, { key: "pdi", label: "+DI", group: "Trend" }, { key: "mdi", label: "-DI", group: "Trend" }, { key: "psar", label: "Parabolic SAR", group: "Trend" }, { key: "stLine", label: "SuperTrend line", group: "Trend" },
  { key: "bbUpper", label: "Bollinger upper", group: "Volatility" }, { key: "bbMid", label: "Bollinger middle", group: "Volatility" }, { key: "bbLower", label: "Bollinger lower", group: "Volatility" }, { key: "atr", label: "ATR 14", group: "Volatility" }, { key: "atrPct", label: "ATR % of price", group: "Volatility" },
  { key: "hi20", label: "Highest high (20, prior)", group: "Range" }, { key: "lo10", label: "Lowest low (10, prior)", group: "Range" }, { key: "hi252", label: "52-week high", group: "Range" }, { key: "dcUpper", label: "Donchian upper", group: "Range" }, { key: "dcLower", label: "Donchian lower", group: "Range" },
  { key: "ret21", label: "% change 1 month", group: "Change" }, { key: "ret63", label: "% change 3 months", group: "Change" }, { key: "ret126", label: "% change 6 months", group: "Change" }, { key: "chg1", label: "% change today", group: "Change" },
  { key: "volume", label: "Volume", group: "Volume" }, { key: "volMa", label: "Volume MA 20", group: "Volume" }, { key: "volRatio", label: "Volume ratio (vs MA20)", group: "Volume" },
];
export const fieldLabel = (k: string) => FIELDS.find((f) => f.key === k)?.label ?? k;

export type Op = "gt" | "lt" | "crossAbove" | "crossBelow";
export const OPS: { key: Op; label: string }[] = [{ key: "gt", label: "is greater than" }, { key: "lt", label: "is less than" }, { key: "crossAbove", label: "crosses above" }, { key: "crossBelow", label: "crosses below" }];
export interface Cond { type: "cond"; left: string; op: Op; right: { kind: "field"; key: string; mult: number } | { kind: "num"; value: number } }
export interface Group { type: "group"; logic: "AND" | "OR"; items: (Cond | Group)[] }
export interface CustomDef { entry: Group; exit: Group | null; slAtr: number; tpAtr: number; trailAtr: number; maxHold: number; regimes: ("bull" | "sideways" | "bear")[] }

export const newCond = (): Cond => ({ type: "cond", left: "close", op: "gt", right: { kind: "field", key: "ema50", mult: 1 } });
export const newGroup = (logic: "AND" | "OR" = "AND"): Group => ({ type: "group", logic, items: [newCond()] });

function val(c: Ctx, i: number, k: string): number {
  if (i < 0) return NaN; const r = c.r[i] as any; const b = c.b[i];
  switch (k) {
    case "rsi2": return c.rsi2[i]; case "hi20": return c.hi20[i]; case "lo10": return c.lo10[i]; case "hi252": return c.hi252[i];
    case "ret21": return c.ret21[i]; case "ret63": return c.ret63[i]; case "ret126": return c.ret126[i]; case "volRatio": return c.volRatio[i];
    case "chg1": return i > 0 ? ((b.close - c.b[i - 1].close) / c.b[i - 1].close) * 100 : NaN;
    case "atrPct": return r.atr ? (r.atr / b.close) * 100 : NaN;
    case "stLine": return r.stUp ?? r.stDown ?? NaN;
    default: { const v = r[k]; return v === null || v === undefined ? NaN : +v; }
  }
}
const rightVal = (c: Ctx, i: number, cd: Cond) => (cd.right.kind === "num" ? cd.right.value : val(c, i, cd.right.key) * (cd.right.mult || 1));

export function evalCond(c: Ctx, i: number, cd: Cond): boolean {
  const l = val(c, i, cd.left), r = rightVal(c, i, cd); if (!Number.isFinite(l) || !Number.isFinite(r)) return false;
  if (cd.op === "gt") return l > r; if (cd.op === "lt") return l < r;
  const lp = val(c, i - 1, cd.left), rp = rightVal(c, i - 1, cd); if (!Number.isFinite(lp) || !Number.isFinite(rp)) return false;
  return cd.op === "crossAbove" ? lp <= rp && l > r : lp >= rp && l < r;
}
export function evalGroup(c: Ctx, i: number, g: Group): boolean {
  if (!g.items.length) return false;
  const res = (x: Cond | Group) => (x.type === "cond" ? evalCond(c, i, x) : evalGroup(c, i, x));
  return g.logic === "AND" ? g.items.every(res) : g.items.some(res);
}
export function describe(g: Group): string {
  return g.items.map((x) => x.type === "group" ? `(${describe(x)})` : `${fieldLabel(x.left)} ${OPS.find((o) => o.key === x.op)!.label} ${x.right.kind === "num" ? x.right.value : (x.right.mult !== 1 ? x.right.mult + " x " : "") + fieldLabel(x.right.key)}`).join(` ${g.logic} `);
}

export function compileCustom(id: string, name: string, version: number, d: CustomDef): StrategyDef & { regimes: CustomDef["regimes"]; custom: true } {
  return {
    key: `custom:${id}`, name: `${name} v${version}`, family: "Custom", custom: true, regimes: d.regimes,
    buyRule: describe(d.entry), sellRule: d.exit ? describe(d.exit) + " (or stop / target)" : "Stop loss, take profit" + (d.trailAtr ? ", trailing stop" : "") + (d.maxHold ? ` or ${d.maxHold} sessions` : ""),
    slRule: `Entry - ${d.slAtr} x ATR`, tpRule: `Entry + ${d.tpAtr} x ATR` + (d.trailAtr ? `, trail ${d.trailAtr} x ATR after target 1` : ""),
    entry: (c, i): EntryPlan | null => {
      if (!evalGroup(c, i, d.entry)) return null; const a = val(c, i, "atr"); if (!Number.isFinite(a)) return null; const px = c.b[i].close;
      return { sl: px - d.slAtr * a, tp1Abs: px + (d.tpAtr / 2) * a, tp2Abs: px + d.tpAtr * a, trail: d.trailAtr || undefined, trailAfterTp1: true, maxHold: d.maxHold || undefined, note: "Custom rule" };
    },
    exit: d.exit ? (c, i) => (evalGroup(c, i, d.exit!) ? "Custom exit rule" : null) : undefined,
  };
}

export const PRESETS: { name: string; g: Group }[] = [
  { name: "Trend + momentum (spec example)", g: { type: "group", logic: "AND", items: [
    { type: "cond", left: "close", op: "gt", right: { kind: "field", key: "ema50", mult: 1 } }, { type: "cond", left: "ema50", op: "gt", right: { kind: "field", key: "ema200", mult: 1 } },
    { type: "cond", left: "rsi", op: "gt", right: { kind: "num", value: 55 } }, { type: "cond", left: "volRatio", op: "gt", right: { kind: "num", value: 2 } }] } },
  { name: "20-day breakout", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "close", op: "gt", right: { kind: "field", key: "hi20", mult: 1 } }, { type: "cond", left: "volRatio", op: "gt", right: { kind: "num", value: 1.5 } }] } },
  { name: "Near 52-week high", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "close", op: "gt", right: { kind: "field", key: "hi252", mult: 0.97 } }] } },
  { name: "RSI oversold", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "rsi", op: "lt", right: { kind: "num", value: 30 } }] } },
  { name: "RSI overbought", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "rsi", op: "gt", right: { kind: "num", value: 70 } }] } },
  { name: "MACD bullish cross", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "macd", op: "crossAbove", right: { kind: "field", key: "macdSignal", mult: 1 } }] } },
  { name: "Golden cross (50/200)", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "sma50", op: "crossAbove", right: { kind: "field", key: "sma200", mult: 1 } }] } },
  { name: "Strong trend (ADX > 25, +DI > -DI)", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "adx", op: "gt", right: { kind: "num", value: 25 } }, { type: "cond", left: "pdi", op: "gt", right: { kind: "field", key: "mdi", mult: 1 } }] } },
  { name: "Volume spike (2x)", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "volRatio", op: "gt", right: { kind: "num", value: 2 } }] } },
  { name: "Bollinger breakout", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "close", op: "gt", right: { kind: "field", key: "bbUpper", mult: 1 } }] } },
  { name: "Above SuperTrend", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "close", op: "gt", right: { kind: "field", key: "stLine", mult: 1 } }, { type: "cond", left: "close", op: "gt", right: { kind: "field", key: "sma200", mult: 1 } }] } },
  { name: "High volatility (ATR > 3%)", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "atrPct", op: "gt", right: { kind: "num", value: 3 } }] } },
  { name: "6-month momentum > 20%", g: { type: "group", logic: "AND", items: [{ type: "cond", left: "ret126", op: "gt", right: { kind: "num", value: 20 } }, { type: "cond", left: "close", op: "gt", right: { kind: "field", key: "sma50", mult: 1 } }] } },
];
