import { Plus, Trash2, Brackets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELDS, OPS, newCond, newGroup, type Cond, type Group } from "@/lib/swing/rules";

const sel = "h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground";
const groups = [...new Set(FIELDS.map((f) => f.group))];
const FieldSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <select aria-label={label} className={sel} value={value} onChange={(e) => onChange(e.target.value)}>
    {groups.map((g) => <optgroup key={g} label={g}>{FIELDS.filter((f) => f.group === g).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>)}
  </select>
);

function CondRow({ c, onChange, onRemove }: { c: Cond; onChange: (c: Cond) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FieldSelect label="Indicator" value={c.left} onChange={(v) => onChange({ ...c, left: v })} />
      <select aria-label="Comparison" className={sel} value={c.op} onChange={(e) => onChange({ ...c, op: e.target.value as Cond["op"] })}>{OPS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
      <select aria-label="Compare with" className={sel} value={c.right.kind} onChange={(e) => onChange({ ...c, right: e.target.value === "num" ? { kind: "num", value: 50 } : { kind: "field", key: "ema50", mult: 1 } })}><option value="field">indicator</option><option value="num">number</option></select>
      {c.right.kind === "num"
        ? <Input aria-label="Value" type="number" className="h-8 w-24 text-xs" value={c.right.value} onChange={(e) => onChange({ ...c, right: { kind: "num", value: +e.target.value } })} />
        : <><Input aria-label="Multiplier" type="number" step={0.05} className="h-8 w-16 text-xs" value={c.right.mult} onChange={(e) => onChange({ ...c, right: { ...(c.right as any), mult: +e.target.value || 1 } })} /><span className="text-xs text-muted-foreground">x</span>
          <FieldSelect label="Other indicator" value={c.right.key} onChange={(v) => onChange({ ...c, right: { ...(c.right as any), key: v } })} /></>}
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove} aria-label="Remove condition"><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

export function RuleEditor({ g, onChange, onRemove, depth = 0 }: { g: Group; onChange: (g: Group) => void; onRemove?: () => void; depth?: number }) {
  const set = (i: number, x: Cond | Group) => onChange({ ...g, items: g.items.map((y, k) => (k === i ? x : y)) });
  const del = (i: number) => onChange({ ...g, items: g.items.filter((_, k) => k !== i) });
  return (
    <div className={"space-y-2 rounded-md border p-2 " + (depth ? "border-dashed border-primary/40 bg-primary/5" : "border-border")}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Match</span>
        <div className="flex rounded-md border border-border">{(["AND", "OR"] as const).map((l) => <button key={l} onClick={() => onChange({ ...g, logic: l })} className={"px-2 py-1 font-mono " + (g.logic === l ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{l === "AND" ? "ALL (AND)" : "ANY (OR)"}</button>)}</div>
        {onRemove && <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={onRemove}><Trash2 className="mr-1 h-3 w-3" />Remove group</Button>}
      </div>
      {g.items.map((x, i) => x.type === "cond"
        ? <CondRow key={i} c={x} onChange={(c) => set(i, c)} onRemove={() => del(i)} />
        : <RuleEditor key={i} g={x} depth={depth + 1} onChange={(n) => set(i, n)} onRemove={() => del(i)} />)}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7" onClick={() => onChange({ ...g, items: [...g.items, newCond()] })}><Plus className="mr-1 h-3 w-3" />Condition</Button>
        {depth < 2 && <Button size="sm" variant="outline" className="h-7" onClick={() => onChange({ ...g, items: [...g.items, newGroup(g.logic === "AND" ? "OR" : "AND")] })}><Brackets className="mr-1 h-3 w-3" />Nested group</Button>}
      </div>
    </div>
  );
}
