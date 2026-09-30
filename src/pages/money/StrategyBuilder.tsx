import { useMemo, useState } from "react";
import { Wrench, Save, History, Trash2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { simulate, type Ctx, type RegimeDay } from "@/lib/swing/strategies20";
import { compileCustom, newGroup, describe, PRESETS, type CustomDef, type Group } from "@/lib/swing/rules";
import { RuleEditor } from "./RuleEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const db = supabase as any;
export interface CustomRow { id: string; family_id: string; name: string; version: number; definition: CustomDef; created_at: string }
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "");
const blank = (): CustomDef => ({ entry: PRESETS[0].g, exit: null, slAtr: 2, tpAtr: 4, trailAtr: 2, maxHold: 0, regimes: ["bull"] });

export function StrategyBuilder({ ctxs, regime, userId, rows, onSaved }: { ctxs: Ctx[]; regime: Map<string, RegimeDay> | null; userId: string; rows: CustomRow[]; onSaved: () => void }) {
  const [name, setName] = useState("My strategy");
  const [family, setFamily] = useState<string | null>(null);
  const [d, setD] = useState<CustomDef>(blank());
  const [preview, setPreview] = useState<CustomDef | null>(null);
  const res = useMemo(() => (preview && ctxs.length ? simulate(compileCustom("preview", name, 0, preview), ctxs, { capital: 100000, regime }) : null), [preview, ctxs, regime, name]);
  const families = useMemo(() => { const m = new Map<string, CustomRow[]>(); rows.forEach((r) => m.set(r.family_id, [...(m.get(r.family_id) ?? []), r])); return [...m.values()].map((v) => v.sort((a, b) => b.version - a.version)); }, [rows]);

  const save = async () => {
    const nm = name.trim(); if (!nm || nm.length > 80) return toast.error("Give the strategy a name (max 80 letters)");
    if (!d.entry.items.length) return toast.error("Add at least one buy condition");
    const fam = family ? families.find((f) => f[0].family_id === family) : undefined;
    const version = fam ? fam[0].version + 1 : 1;
    const { error } = await db.from("swing_custom_strategies").insert({ user_id: userId, name: nm, version, definition: d, ...(fam ? { family_id: family } : {}) });
    if (error) return toast.error(error.message);
    toast.success(`Saved ${nm} v${version}. Earlier versions are kept unchanged.`); onSaved();
  };
  const load = (r: CustomRow, asNew = false) => { setName(r.name); setD(r.definition); setFamily(asNew ? null : r.family_id); setPreview(r.definition); };
  const removeFamily = async (fid: string) => { if (!confirm("Delete all versions of this strategy?")) return; await db.from("swing_custom_strategies").delete().eq("family_id", fid); onSaved(); };
  const toggleRegime = (r: CustomDef["regimes"][number]) => setD({ ...d, regimes: d.regimes.includes(r) ? d.regimes.filter((x) => x !== r) : [...d.regimes, r] });

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-primary" />Strategy builder {family && <Badge variant="outline">editing: saves as a new version</Badge>}</CardTitle>
          <p className="text-xs text-muted-foreground">Build rules from indicators. No code runs from the browser; rules are stored as data. Every save creates a new version and old versions are never overwritten.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3"><div className="md:col-span-2"><Label className="text-xs">Name</Label><Input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="flex items-end"><Button variant="outline" size="sm" onClick={() => { setFamily(null); setD(blank()); setName("My strategy"); }}>New strategy</Button></div></div>
          <div><div className="mb-1 text-xs font-bold uppercase text-emerald-600">BUY when</div><RuleEditor g={d.entry} onChange={(g: Group) => setD({ ...d, entry: g })} /></div>
          <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-destructive">SELL early when (optional)<Switch checked={!!d.exit} onCheckedChange={(v) => setD({ ...d, exit: v ? { type: "group", logic: "OR", items: [{ type: "cond", left: "close", op: "lt", right: { kind: "field", key: "ema50", mult: 1 } }] } : null })} /></div>
            {d.exit && <RuleEditor g={d.exit} onChange={(g) => setD({ ...d, exit: g })} />}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><Label className="text-xs">Stop loss (x ATR)</Label><Input type="number" min={0.5} max={10} step={0.25} value={d.slAtr} onChange={(e) => setD({ ...d, slAtr: Math.min(10, Math.max(0.5, +e.target.value)) })} /></div>
            <div><Label className="text-xs">Take profit (x ATR)</Label><Input type="number" min={0.5} max={20} step={0.25} value={d.tpAtr} onChange={(e) => setD({ ...d, tpAtr: Math.min(20, Math.max(0.5, +e.target.value)) })} /></div>
            <div><Label className="text-xs">Trailing stop (x ATR, 0 = off)</Label><Input type="number" min={0} max={10} step={0.25} value={d.trailAtr} onChange={(e) => setD({ ...d, trailAtr: Math.min(10, Math.max(0, +e.target.value)) })} /></div>
            <div><Label className="text-xs">Max holding days (0 = none)</Label><Input type="number" min={0} max={250} value={d.maxHold} onChange={(e) => setD({ ...d, maxHold: Math.min(250, Math.max(0, Math.round(+e.target.value))) })} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs"><span className="text-muted-foreground">Buys allowed in:</span>{(["bull", "sideways", "bear"] as const).map((r) => <label key={r} className="flex items-center gap-1"><Switch checked={d.regimes.includes(r)} onCheckedChange={() => toggleRegime(r)} />{r === "bull" ? "Strong Bull" : r === "sideways" ? "Sideways" : "Bear"}</label>)}</div>
          <p className="text-xs text-muted-foreground">Risk per trade and position size follow the common engine (1% risk by default). Target 1 is half the take-profit distance; half the position sells there and the stop moves to the buy price.</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setPreview(d)}><Play className="mr-1 h-4 w-4" />Backtest</Button><Button onClick={save}><Save className="mr-1 h-4 w-4" />{family ? "Save as new version" : "Save strategy"}</Button></div>
          {res && <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-sm md:grid-cols-6">
            <div><div className="text-[11px] text-muted-foreground">Net return</div><div className={"font-bold " + tone(res.netReturn)}>{pct(res.netReturn)}</div></div>
            <div><div className="text-[11px] text-muted-foreground">Trades</div><div className="font-bold">{res.trades.length}</div></div>
            <div><div className="text-[11px] text-muted-foreground">Win rate</div><div className="font-bold">{res.winRate.toFixed(0)}%</div></div>
            <div><div className="text-[11px] text-muted-foreground">Profit factor</div><div className="font-bold">{res.profitFactor.toFixed(2)}</div></div>
            <div><div className="text-[11px] text-muted-foreground">Max drawdown</div><div className="font-bold text-destructive">-{res.maxDrawdown.toFixed(1)}%</div></div>
            <div><div className="text-[11px] text-muted-foreground">Period</div><div className="text-xs">{res.from} to {res.to}</div></div>
            <div className="col-span-full text-[11px] text-muted-foreground">₹1,00,000, market filter on, charges and slippage included. Save the strategy to use it in the tournament, robustness tests and live auto-trading.</div></div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" />My strategies and versions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!families.length && <p className="text-sm text-muted-foreground">No saved strategies yet.</p>}
          {families.map((f) => (
            <div key={f[0].family_id} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between"><div className="font-semibold">{f[0].name}</div><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeFamily(f[0].family_id)} aria-label="Delete strategy"><Trash2 className="h-3.5 w-3.5" /></Button></div>
              {f.map((r) => <div key={r.id} className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1 text-xs">
                <div className="min-w-0"><Badge variant={r === f[0] ? "default" : "outline"}>v{r.version}</Badge> <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span><div className="truncate text-muted-foreground" title={describe(r.definition.entry)}>{describe(r.definition.entry)}</div></div>
                <div className="flex shrink-0 gap-1"><Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => load(r)}>Edit</Button><Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => load(r, true)}>Copy</Button></div>
              </div>)}
            </div>))}
        </CardContent>
      </Card>
    </div>
  );
}
export { newGroup };
