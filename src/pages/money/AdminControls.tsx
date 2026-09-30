import { useEffect, useState } from "react";
import { ShieldCheck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STRATEGIES } from "@/lib/swing/strategies20";
import { describe } from "@/lib/swing/rules";
import type { Controls } from "@/lib/swing/limits";
import type { CustomRow } from "./StrategyBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const db = supabase as any;

export function AdminControls({ controls, onSaved }: { controls: Controls; onSaved: () => void }) {
  const [c, setC] = useState<Controls>(controls);
  const [all, setAll] = useState<(CustomRow & { user_id: string })[]>([]);
  useEffect(() => setC(controls), [controls]);
  useEffect(() => { db.from("swing_custom_strategies").select("*").order("created_at", { ascending: false }).then(({ data }: any) => setAll(data ?? [])); }, []);
  const toggle = (k: string) => setC({ ...c, disabled: c.disabled.includes(k) ? c.disabled.filter((x) => x !== k) : [...c.disabled, k] });
  const save = async () => {
    const v = { ...c, defaultRisk: Math.min(c.maxRisk, c.defaultRisk) };
    const { error } = await db.from("swing_settings").upsert({ key: "controls", value: v, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message); toast.success("Desk controls saved for all users"); onSaved();
  };
  const num = (l: string, k: "defaultRisk" | "maxRisk" | "maxPositions", min: number, max: number, step: number) => <div><Label className="text-xs">{l}</Label><Input type="number" min={min} max={max} step={step} value={c[k]} onChange={(e) => setC({ ...c, [k]: Math.min(max, Math.max(min, +e.target.value)) })} /></div>;
  const users = new Map<string, number>(); all.forEach((r) => users.set(r.user_id, users.size + (users.has(r.user_id) ? 0 : 1)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />Risk settings for everyone</CardTitle><Button onClick={save}><Save className="mr-1 h-4 w-4" />Save controls</Button></div>
          <p className="text-xs text-muted-foreground">These limits apply to every user's auto-trading and test lab forms.</p></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">{num("Default risk per trade (%)", "defaultRisk", 0.25, 5, 0.25)}{num("Maximum risk per trade (%)", "maxRisk", 0.25, 5, 0.25)}{num("Maximum open stocks", "maxPositions", 1, 20, 1)}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Built-in strategies ({STRATEGIES.length - c.disabled.filter((k) => !k.startsWith("custom:")).length} enabled)</CardTitle><p className="text-xs text-muted-foreground">Disabled strategies are hidden from non-admin users everywhere on the desk.</p></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">{STRATEGIES.map((s) => <label key={s.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span><span className="font-medium">{s.name}</span> <span className="text-xs text-muted-foreground">{s.family}</span></span><Switch checked={!c.disabled.includes(s.key)} onCheckedChange={() => toggle(s.key)} /></label>)}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Everyone's custom strategies ({all.length} versions)</CardTitle><p className="text-xs text-muted-foreground">Turn a version off to hide it from its owner's desk. Versions themselves are never edited.</p></CardHeader>
        <CardContent className="space-y-2">{!all.length && <p className="text-sm text-muted-foreground">No custom strategies yet.</p>}
          {all.map((r) => { const k = `custom:${r.id}`; return <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"><div className="min-w-0"><div className="font-medium">{r.name} <Badge variant="outline">v{r.version}</Badge> <span className="text-xs text-muted-foreground">User {users.get(r.user_id)} · {new Date(r.created_at).toLocaleDateString("en-IN")}</span></div><div className="truncate text-xs text-muted-foreground">{describe(r.definition.entry)}</div></div><Switch checked={!c.disabled.includes(k)} onCheckedChange={() => toggle(k)} /></div>; })}
        </CardContent>
      </Card>
    </div>
  );
}
