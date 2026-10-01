// Forward-only live signal tracker: only signals on or after `start` are traded,
// each with a fixed capital per trade. Same entry/exit rules as simulate().
import { charges, SLIPPAGE, allowedRegimes, type Ctx, type RegimeDay, type StrategyDef } from "./strategies20";

export type LiveStatus = "SIGNAL" | "OPEN" | "RUNNING" | "CLOSED";
export interface LiveTrade {
  id: string; strategyKey: string; strategy: string; symbol: string; exchange: string; side: "BUY";
  signalDate: string; entryDate: string | null; exitDate: string | null; status: LiveStatus;
  entry: number; target: number | null; stop: number; exitPrice: number | null; cmp: number; qty: number;
  entryValue: number; currentValue: number; grossPnl: number; charges: number; netPnl: number; pnlPct: number; reason: string | null;
}

export function liveSignalTrades(defs: StrategyDef[], ctxs: Ctx[], start: string, regime: Map<string, RegimeDay> | null, capital = 10000): LiveTrade[] {
  const out: LiveTrade[] = [];
  for (const def of defs) {
    const allowed = allowedRegimes(def);
    const ok = (d: string) => { const r = regime?.get(d); return !r || allowed.includes(r.regime); };
    for (const c of ctxs) {
      const b = c.b; let i0 = b.findIndex((x) => x.date >= start); if (i0 < 1) continue;
      let busyUntil = -1;
      for (let i = i0; i < b.length; i++) {
        if (i <= busyUntil || !ok(b[i].date)) continue;
        const plan = def.entry(c, i); if (!plan || !(plan.sl < b[i].close)) continue;
        const base = { id: `${def.key}|${c.sym}|${b[i].date}`, strategyKey: def.key, strategy: def.name, symbol: c.sym, exchange: "NSE", side: "BUY" as const, signalDate: b[i].date };
        if (i + 1 >= b.length) { // signal today, buy at next open
          const R = b[i].close - plan.sl; const tp = plan.tp2Abs ?? plan.tp1Abs ?? (plan.tp2R ? b[i].close + plan.tp2R * R : plan.tp1R ? b[i].close + plan.tp1R * R : null);
          const qty = Math.floor(capital / b[i].close);
          out.push({ ...base, entryDate: null, exitDate: null, status: "SIGNAL", entry: b[i].close, target: tp ? +tp.toFixed(2) : null, stop: +plan.sl.toFixed(2), exitPrice: null, cmp: b[i].close, qty, entryValue: qty * b[i].close, currentValue: qty * b[i].close, grossPnl: 0, charges: 0, netPnl: 0, pnlPct: 0, reason: null });
          break;
        }
        const e = i + 1, px = b[e].open * (1 + SLIPPAGE), R = px - plan.sl; if (!(R > 0)) continue;
        const qty = Math.floor(capital / px); if (qty <= 0) continue;
        const tpRaw = plan.tp2Abs ?? (plan.tp2R ? px + plan.tp2R * R : null) ?? plan.tp1Abs ?? (plan.tp1R ? px + plan.tp1R * R : null);
        const tp = tpRaw && tpRaw > px ? tpRaw : null; let stop = plan.sl;
        let exitIdx = -1, exitPx = 0, reason: string | null = null;
        for (let k = e; k < b.length; k++) {
          const bar = b[k];
          if (bar.low <= stop) { exitIdx = k; exitPx = Math.min(bar.open, stop); reason = "Stop loss"; break; }
          if (tp && bar.high >= tp) { exitIdx = k; exitPx = Math.max(bar.open, tp); reason = "Target hit"; break; }
          const a = c.r[k].atr; if (plan.trail && a != null && Number.isFinite(a)) stop = Math.max(stop, bar.close - plan.trail * a);
          const ex = def.exit?.(c, k, { entryIdx: e, entry: px, stop, tp1: tp, tp2: null, tp1Hit: false }); if (ex) { exitIdx = k; exitPx = bar.close; reason = ex; break; }
          if (plan.maxHold && k - e >= plan.maxHold) { exitIdx = k; exitPx = bar.close; reason = `Max holding ${plan.maxHold} sessions`; break; }
        }
        const closed = exitIdx >= 0; const last = b.length - 1;
        const cmp = b[last].close; const sellPx = closed ? exitPx * (1 - SLIPPAGE) : cmp;
        const entryValue = qty * px, curValue = qty * sellPx;
        const ch = charges(entryValue, closed ? curValue : 0);
        const gross = curValue - entryValue, net = gross - ch;
        out.push({ ...base, entryDate: b[e].date, exitDate: closed ? b[exitIdx].date : null, status: closed ? "CLOSED" : e === last ? "OPEN" : "RUNNING",
          entry: +px.toFixed(2), target: tp ? +tp.toFixed(2) : null, stop: +stop.toFixed(2), exitPrice: closed ? +exitPx.toFixed(2) : null, cmp, qty,
          entryValue, currentValue: curValue, grossPnl: gross, charges: ch, netPnl: net, pnlPct: (net / entryValue) * 100, reason });
        busyUntil = closed ? exitIdx : last;
      }
    }
  }
  return out;
}
