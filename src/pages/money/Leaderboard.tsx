import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Bot, CheckCircle2, Loader2, Minus, Play, Sparkles, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const db = supabase as any;
const pc = (n?: number) => (n === undefined || n === null ? "-" : (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%");
const tone = (n?: number) => (n === undefined ? "" : n > 0 ? "text-primary" : n < 0 ? "text-destructive" : "");

export function Leaderboard({ isAdmin, onStrategiesChanged }: { isAdmin: boolean; onStrategiesChanged?: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [prev, setPrev] = useState<Map<string, number>>(new Map());
  const [runs, setRuns] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: dates } = await db.from("swing_leaderboard_snapshots").select("snap_date").order("snap_date", { ascending: false }).limit(200);
    const uniq = [...new Set((dates ?? []).map((d: any) => d.snap_date))] as string[];
    if (uniq[0]) { const { data } = await db.from("swing_leaderboard_snapshots").select("*").eq("snap_date", uniq[0]).order("rank"); setRows(data ?? []); }
    if (uniq[1]) { const { data } = await db.from("swing_leaderboard_snapshots").select("strategy_key,rank").eq("snap_date", uniq[1]); setPrev(new Map((data ?? []).map((r: any) => [r.strategy_key, r.rank]))); }
    const { data: r } = await db.from("swing_ai_runs").select("*").order("started_at", { ascending: false }).limit(10); setRuns(r ?? []);
    const { data: p } = await db.from("swing_ai_proposals").select("*").order("created_at", { ascending: false }).limit(60); setProps(p ?? []);
  };
  useEffect(() => { load(); }, []);
  const running = runs[0]?.status === "running";
  useEffect(() => { if (!running) return; const id = setInterval(() => load().then(() => onStrategiesChanged?.()), 8000); return () => clearInterval(id); }, [running]);

  const runNow = async () => {
    setBusy(true); const { data, error } = await supabase.functions.invoke("swing-ai-coach", { body: { force: true } }); setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? "Could not start the AI analysis");
    toast.success(data?.skipped ?? "AI analysis started. Results appear here in a few minutes."); load();
  };
  const [approving, setApproving] = useState<string | null>(null);
  const approve = async (p: any) => {
    if (!confirm(`Apply "${p.name}"? It failed the automatic test: ${p.reason}`)) return;
    setApproving(p.id); const { data, error } = await supabase.functions.invoke("swing-ai-coach", { body: { approve_id: p.id } }); setApproving(null);
    if (error || data?.error) return toast.error(data?.error ?? "Could not apply this change");
    toast.success("Change applied as a new version"); load(); onStrategiesChanged?.();
  };

  const last = runs[0];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />AI Coach</CardTitle>
          {isAdmin && <Button size="sm" onClick={runNow} disabled={busy || running}>{running || busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}{running ? "AI is working..." : "Run AI analysis now"}</Button>}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Every weekday after market close the AI reviews each strategy's results, finds what goes wrong and proposes fixes or brand-new strategies. A change is adopted automatically only if it beats the current version on prices it was never tuned on. No strategy is guaranteed to make money.</p>
          {last && <div className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs"><Badge variant={last.status === "done" ? "default" : last.status === "running" ? "secondary" : "destructive"}>{last.status === "running" ? `Working (${last.phase})` : last.status}</Badge><span className="text-muted-foreground">{new Date(last.started_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · {last.proposals_count} ideas · {last.adopted_count} adopted</span></div>
            {last.summary && <p className="mt-2">{last.summary}</p>}
            {last.error && <p className="mt-2 text-destructive">{last.error}</p>}
          </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leaderboard {rows[0] && <span className="text-sm font-normal text-muted-foreground">· {rows[0].snap_date}</span>}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {!rows.length ? <p className="p-4 text-sm text-muted-foreground">The first leaderboard appears after the AI's first run.</p> :
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Strategy</TableHead><TableHead className="text-right">Return</TableHead><TableHead className="text-right">Unseen test</TableHead><TableHead className="text-right">Win rate</TableHead><TableHead className="text-right">Drawdown</TableHead><TableHead className="text-right">Trades</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r) => { const p = prev.get(r.strategy_key); const mv = p ? p - r.rank : 0; const f = r.metrics.full, t = r.metrics.test; return (
              <TableRow key={r.id}>
                <TableCell className="font-semibold"><span className="flex items-center gap-1">{r.rank}{mv > 0 ? <ArrowUp className="h-3 w-3 text-primary" /> : mv < 0 ? <ArrowDown className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-muted-foreground" />}</span></TableCell>
                <TableCell><span className="flex items-center gap-2">{r.name}{r.source === "ai" && <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />AI</Badge>}</span></TableCell>
                <TableCell className={"text-right " + tone(f.ret)}>{pc(f.ret)}</TableCell>
                <TableCell className={"text-right " + tone(t?.ret)}>{pc(t?.ret)}</TableCell>
                <TableCell className="text-right">{f.win.toFixed(0)}%</TableCell>
                <TableCell className="text-right">{f.dd.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{f.trades}</TableCell>
                <TableCell className="text-right">{f.trades < 5 ? "-" : Number(r.score).toFixed(1)}</TableCell>
              </TableRow>); })}</TableBody>
          </Table>}
        </CardContent>
      </Card>

      {last?.diagnosis?.length > 0 && <Card>
        <CardHeader><CardTitle>What the AI found</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">{last.diagnosis.map((d: any, i: number) => (
          <div key={i} className="rounded-md border border-border p-3 text-sm"><div className="font-medium">{rows.find((r) => r.strategy_key === d.key)?.name ?? d.key}</div><p className="mt-1 text-muted-foreground"><b className="text-foreground">Fault:</b> {d.fault}</p><p className="mt-1 text-muted-foreground"><b className="text-foreground">Fix:</b> {d.fix}</p></div>))}
        </CardContent>
      </Card>}

      <Card>
        <CardHeader><CardTitle>AI strategy changes</CardTitle><p className="text-xs text-muted-foreground">Changes that pass the unseen-price test are applied automatically (your custom strategies get a new version; old versions are kept). Admins can approve a rejected change by hand.</p></CardHeader>
        <CardContent className="space-y-2">{!props.length ? <p className="text-sm text-muted-foreground">No AI changes yet.</p> : props.map((p) => (
          <div key={p.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">{p.adopted ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}<span className="font-medium">{p.name}</span><Badge variant="outline">{p.kind === "new" ? "New strategy" : `Improves ${rows.find((r) => r.strategy_key === p.parent_key)?.name ?? p.parent_key}`}</Badge><Badge variant={p.adopted ? "default" : "secondary"}>{p.approved_at ? "Approved by admin" : p.adopted ? "Auto-applied" : "Rejected"}</Badge><span className="ml-auto text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</span>
              {isAdmin && !p.adopted && p.definition && <Button size="sm" variant="outline" className="h-7" disabled={approving === p.id} onClick={() => approve(p)}>{approving === p.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}Approve</Button>}</div>
            {p.fault && <p className="mt-1 text-muted-foreground"><b className="text-foreground">Fault:</b> {p.fault}</p>}
            {p.change_summary && <p className="mt-1"><b>Change:</b> {p.change_summary}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{p.reason}{p.test && <> · unseen test {pc(p.test.ret)}, win {Number(p.test.win).toFixed(0)}%, drawdown {Number(p.test.dd).toFixed(1)}%, {p.test.trades} trades</>}{p.parent_test && <> · current version {pc(p.parent_test.ret)}</>}</p>
          </div>))}
        </CardContent>
      </Card>
    </div>
  );
}
