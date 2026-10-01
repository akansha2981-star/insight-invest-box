import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Ctx, EntryPlan, FixedEntry, StrategyDef } from "./strategies20";

const db = supabase as any;
const istNow = () => new Date(Date.now() + 330 * 60000);

/**
 * Records every live BUY signal the first time it is seen (price + plan, server timestamp) and
 * returns all recorded buys, so a trade never disappears when the intraday price later moves.
 */
export function useFixedEntries(ctxs: Ctx[], defs: StrategyDef[]) {
  const [fixed, setFixed] = useState<Map<string, FixedEntry>>(new Map());
  const busy = useRef(false);

  useEffect(() => {
    if (!ctxs.length || !defs.length || busy.current) return;
    busy.current = true;
    (async () => {
      try {
        const ist = istNow(); const today = ist.toISOString().slice(0, 10);
        const since = new Date(ist.getTime() - 200 * 86400000).toISOString().slice(0, 10);
        const read = async () => (await db.from("swing_signal_log").select("strategy_key,strategy_name,symbol,signal_date,entry_price,plan").gte("signal_date", since).limit(10000)).data ?? [];
        let rows: any[] = await read();
        const have = new Map<string, any>(rows.map((r) => [`${r.strategy_key}|${r.symbol}|${r.signal_date}`, r]));

        // Today's signals on the latest (live) bar
        const fresh: { strategy_key: string; strategy_name: string; symbol: string; signal_date: string; entry_price: number; plan: EntryPlan }[] = [];
        for (const def of defs) for (const c of ctxs) {
          const i = c.b.length - 1; if (i < 1 || c.b[i].date !== today) continue;
          const key = `${def.key}|${c.sym}|${today}`; if (have.get(key)?.entry_price != null) continue;
          let plan: EntryPlan | null = null; try { plan = def.entry(c, i); } catch { plan = null; }
          if (!plan || !(plan.sl < c.b[i].close)) continue;
          fresh.push({ strategy_key: def.key, strategy_name: def.name, symbol: c.sym, signal_date: today, entry_price: +c.b[i].close.toFixed(2), plan: JSON.parse(JSON.stringify(plan)) });
        }
        if (fresh.length) {
          const add = fresh.filter((f) => !have.has(`${f.strategy_key}|${f.symbol}|${f.signal_date}`));
          if (add.length) await db.from("swing_signal_log").upsert(add, { onConflict: "strategy_key,symbol,signal_date", ignoreDuplicates: true });
          for (const f of fresh.filter((f) => have.has(`${f.strategy_key}|${f.symbol}|${f.signal_date}`)))
            await db.from("swing_signal_log").update({ entry_price: f.entry_price, plan: f.plan }).eq("strategy_key", f.strategy_key).eq("symbol", f.symbol).eq("signal_date", f.signal_date).is("entry_price", null);
          rows = await read();
        }
        const m = new Map<string, FixedEntry>();
        rows.forEach((r) => { if (r.entry_price != null && r.plan) m.set(`${r.strategy_key}|${r.symbol}|${r.signal_date}`, { price: +r.entry_price, plan: r.plan }); });
        setFixed((prev) => (prev.size === m.size && [...m.keys()].every((k) => prev.has(k)) ? prev : m));
      } finally { busy.current = false; }
    })();
  }, [ctxs, defs]);

  return fixed;
}
