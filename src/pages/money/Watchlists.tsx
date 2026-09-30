import { useEffect, useMemo, useState } from "react";
import { ListPlus, Plus, Trash2, X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Ctx } from "@/lib/swing/strategies20";
import { sectorOf } from "@/lib/swing/robust";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const db = supabase as any;
interface WL { id: string; name: string; symbols: string[] }
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-destructive" : "text-muted-foreground");
const pct = (n: number) => (Number.isFinite(n) ? (n >= 0 ? "+" : "") + n.toFixed(2) + "%" : "-");

export function Watchlists({ ctxs, userId }: { ctxs: Ctx[]; userId: string }) {
  const [lists, setLists] = useState<WL[]>([]); const [active, setActive] = useState<string | null>(null);
  const [name, setName] = useState(""); const [q, setQ] = useState("");
  const load = async () => { const { data, error } = await db.from("swing_watchlists").select("id,name,symbols").order("created_at"); if (error) return toast.error(error.message); setLists(data ?? []); setActive((a) => a ?? data?.[0]?.id ?? null); };
  useEffect(() => { load(); }, []);
  const byS = useMemo(() => new Map(ctxs.map((c) => [c.sym, c])), [ctxs]);
  const wl = lists.find((l) => l.id === active);

  const create = async () => { const n = name.trim(); if (!n || n.length > 60) return toast.error("Name the watchlist (max 60 letters)"); const { data, error } = await db.from("swing_watchlists").insert({ user_id: userId, name: n }).select("id").single(); if (error) return toast.error(error.message); setName(""); setActive(data.id); load(); };
  const save = async (symbols: string[]) => { if (!wl) return; setLists(lists.map((l) => (l.id === wl.id ? { ...l, symbols } : l))); const { error } = await db.from("swing_watchlists").update({ symbols, updated_at: new Date().toISOString() }).eq("id", wl.id); if (error) toast.error(error.message); };
  const remove = async () => { if (!wl || !confirm(`Delete watchlist "${wl.name}"?`)) return; await db.from("swing_watchlists").delete().eq("id", wl.id); setActive(null); load(); };
  const matches = q.trim() ? ctxs.filter((c) => c.sym.includes(q.trim().toUpperCase()) && !wl?.symbols.includes(c.sym)).slice(0, 8) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 text-primary" />My watchlists</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lists.map((l) => <button key={l.id} onClick={() => setActive(l.id)} className={"flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm " + (l.id === active ? "border-primary bg-primary/5" : "border-border")}><span className="truncate font-medium">{l.name}</span><span className="text-xs text-muted-foreground">{l.symbols.length}</span></button>)}
          {!lists.length && <p className="text-xs text-muted-foreground">No watchlists yet.</p>}
          <div className="flex gap-1 pt-2"><Input maxLength={60} placeholder="New watchlist name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} /><Button size="icon" onClick={create} aria-label="Create watchlist"><ListPlus className="h-4 w-4" /></Button></div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">{wl?.name ?? "Choose or create a watchlist"}</CardTitle>{wl && <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}</div></CardHeader>
        {wl && <CardContent className="space-y-3">
          <div className="relative max-w-sm"><Input placeholder="Add stock (e.g. RELIANCE)" value={q} onChange={(e) => setQ(e.target.value)} />
            {matches.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow">{matches.map((c) => <button key={c.sym} className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { save([...wl.symbols, c.sym]); setQ(""); }}><span>{c.sym}</span><Plus className="h-3.5 w-3.5" /></button>)}</div>}</div>
          <p className="text-[11px] text-muted-foreground">Stocks come from the scanned list. To watch a new stock, add it first in Auto-trading (any searchable NSE share).</p>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Stock</TableHead><TableHead>Sector</TableHead><TableHead>Price</TableHead><TableHead>Today</TableHead><TableHead>1 month</TableHead><TableHead>6 months</TableHead><TableHead>RSI 14</TableHead><TableHead>Trend</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{wl.symbols.map((s) => { const c = byS.get(s); const i = (c?.b.length ?? 0) - 1; const b = c?.b[i], p = c?.b[i - 1]; const r = c?.r[i] as any; const chg = b && p ? ((b.close - p.close) / p.close) * 100 : NaN;
              return <TableRow key={s}><TableCell className="font-semibold">{s}</TableCell><TableCell className="text-xs">{sectorOf(s)}</TableCell><TableCell>{b ? "₹" + b.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "-"}</TableCell>
                <TableCell className={tone(chg)}>{pct(chg)}</TableCell><TableCell className={tone(c?.ret21[i] ?? 0)}>{pct(c?.ret21[i] ?? NaN)}</TableCell><TableCell className={tone(c?.ret126[i] ?? 0)}>{pct(c?.ret126[i] ?? NaN)}</TableCell>
                <TableCell>{r?.rsi != null ? (+r.rsi).toFixed(0) : "-"}</TableCell><TableCell className="text-xs">{b && r?.sma200 ? (b.close > r.sma200 ? "Above 200 DMA" : "Below 200 DMA") : "-"}</TableCell>
                <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${s}`} onClick={() => save(wl.symbols.filter((x) => x !== s))}><X className="h-3.5 w-3.5" /></Button></TableCell></TableRow>; })}</TableBody></Table></div>
          {!wl.symbols.length && <p className="text-sm text-muted-foreground">Empty. Add stocks above.</p>}
        </CardContent>}
      </Card>
    </div>
  );
}
