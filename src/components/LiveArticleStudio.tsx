import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Activity, CheckCircle2, Clock, ExternalLink, Loader2, Play, Radio, Save, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

type LogRow = { id: number; job_id: string | null; stage: string; status: string; message: string; detail: Record<string, unknown>; created_at: string };
type Job = { id: string; job_key: string; status: string; stage: string; stats: Record<string, number> | null; error: string | null; started_at: string; completed_at: string | null; trigger_type: string };
type Live = { id: string; job_id: string; topic: string; status: string; partial_text: string; chars: number; draft_id: string | null; updated_at: string };
type Draft = { id: string; headline: string; slug: string; status: string; topic: string | null; content: string | null; summary: string | null; meta_title: string | null; meta_description: string | null; meta_keywords: string[] | null; seo_score: number | null; created_at: string; published_at: string | null; source_summary: { engine?: string; sources?: { url: string; publisher: string; kind: string }[]; claims?: { claim: string }[]; keyword?: { keyword?: string; volume?: number } | null } | null; insights: { checks?: { name: string; ok: boolean; detail: string }[] } | null };

const STAGES = ["audit_site", "discover", "dedupe", "retrieve", "verify", "keywords", "draft", "checks", "publish", "done"];
const STAGE_LABEL: Record<string, string> = { audit_site: "Site audit", discover: "Web search", dedupe: "Duplicate check", retrieve: "Reading sources", verify: "Fact verification", keywords: "Keyword research", draft: "Writing", checks: "SEO & quality checks", publish: "Publishing", done: "Complete" };

async function callAction(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in required");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-automation`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action, ...payload }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}
const ist = (v: string | null) => v ? new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium" }) : "—";

// Best-effort extraction of the article body from the streaming JSON
function liveBody(raw: string) {
  const grab = (key: string) => { const m = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`).exec(raw); return m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\\\/g, "\\") : ""; };
  const html = grab("content_html");
  return { title: grab("title"), meta: grab("meta_description"), text: html.replace(/<\/(p|h2|h3|li)>/g, "\n").replace(/<h2[^>]*>/g, "\n## ").replace(/<h3[^>]*>/g, "\n### ").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n") };
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = { completed: "Completed", done: "Completed", published: "Published", running: "Running", writing: "Running", pending: "Pending", saved: "Completed", failed: "Failed", rejected: "Rejected", paused: "Paused" };
  const v = s === "failed" || s === "rejected" ? "destructive" : s === "running" || s === "writing" ? "default" : "outline";
  return <Badge variant={v as "default"} className="gap-1 whitespace-nowrap">{s === "running" || s === "writing" ? <Loader2 className="h-3 w-3 animate-spin" /> : s === "failed" ? <XCircle className="h-3 w-3" /> : s === "pending" || s === "paused" ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{map[s] ?? s}</Badge>;
}

export function LiveArticleStudio() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [live, setLive] = useState<Live[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Draft>>({});
  const [runTimes, setRunTimes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const [l, j, w, d, s] = await Promise.all([
      supabase.from("news_activity_log").select("*").order("created_at", { ascending: false }).limit(150),
      supabase.from("news_automation_jobs").select("id,job_key,status,stage,stats,error,started_at,completed_at,trigger_type").order("started_at", { ascending: false }).limit(20),
      supabase.from("news_live_writing").select("*").order("updated_at", { ascending: false }).limit(10),
      supabase.from("news_drafts").select("id,headline,slug,status,topic,content,summary,meta_title,meta_description,meta_keywords,seo_score,created_at,published_at,source_summary,insights").order("created_at", { ascending: false }).limit(100),
      callAction("status").catch(() => null),
    ]);
    setLogs((l.data ?? []) as LogRow[]); setJobs((j.data ?? []) as Job[]); setLive((w.data ?? []) as Live[]); setDrafts(((d.data ?? []) as unknown as Draft[]).filter(x => x.source_summary?.engine === "news-automation"));
    if (s?.schedule) setRunTimes(((s.schedule.runTimes as string[] | undefined) ?? [s.schedule.startTime ?? "20:30"]).join(", "));
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase.channel("live-article-studio")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_activity_log" }, p => setLogs(prev => [p.new as LogRow, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "*", schema: "public", table: "news_live_writing" }, p => setLive(prev => { const n = p.new as Live; return [n, ...prev.filter(x => x.id !== n.id)].slice(0, 10); }))
      .on("postgres_changes", { event: "*", schema: "public", table: "news_automation_jobs" }, p => setJobs(prev => { const n = p.new as Job; return [n, ...prev.filter(x => x.id !== n.id)].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 20); }))
      .on("postgres_changes", { event: "*", schema: "public", table: "news_drafts" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const current = jobs[0];
  const stageIdx = current ? STAGES.indexOf(current.stage) : -1;
  const writing = live.find(x => x.status === "writing") ?? live[0];
  const wb = useMemo(() => liveBody(writing?.partial_text ?? ""), [writing?.partial_text]);
  const words = wb.text.trim() ? wb.text.trim().split(/\s+/).length : 0;
  const draft = drafts.find(d => d.id === selected) ?? null;
  const failedJobs = jobs.filter(j => j.status === "failed" || j.status === "paused");
  const shown = filter === "failed" ? [] : drafts.filter(d => filter === "all" || d.status === filter);

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => { setBusy(key); try { await fn(); toast.success(ok); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); } };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end gap-3 border border-border rounded-md bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold mr-auto"><Radio className="h-4 w-4 text-primary animate-pulse" />Live Article Studio <span className="text-xs font-normal text-muted-foreground">Updates automatically from the server</span></div>
      <div><Label htmlFor="run-times" className="text-xs">Daily run times (IST, comma separated)</Label><Input id="run-times" className="w-56" value={runTimes} onChange={e => setRunTimes(e.target.value)} placeholder="08:30, 20:30" /></div>
      <Button variant="outline" disabled={busy === "times"} onClick={() => void act("times", () => callAction("settings_set", { settings: { runTimes: runTimes.split(",").map(s => s.trim()).filter(Boolean), enabled: true } }), "Schedule saved")}><Save />Save schedule</Button>
      <Button disabled={busy === "run"} onClick={() => void act("run", () => callAction("run_now"), "Run started — it continues in the background")}>{busy === "run" ? <Loader2 className="animate-spin" /> : <Play />}Run now</Button>
    </div>
    <p className="text-xs text-muted-foreground -mt-4">The server checks the schedule every hour on the half-hour (IST), so times like 08:30 or 20:30 start on time. Runs keep going after you close this page.</p>

    <div className="grid lg:grid-cols-3 gap-4">
      <div className="border border-border rounded-md bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Current run</h3>
        {!current ? <p className="text-sm text-muted-foreground">No runs yet.</p> : <>
          <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{current.job_key}</span><StatusBadge s={current.status} /></div>
          <Progress value={Math.round(((stageIdx + (current.status === "done" ? 1 : 0)) / (STAGES.length)) * 100)} />
          <p className="text-sm">Stage: <b>{STAGE_LABEL[current.stage] ?? current.stage}</b></p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">{[["Sources found", "discovered"], ["Read", "retrieved"], ["Verified", "verified"], ["Held", "held"], ["Drafted", "drafted"], ["Published", "published"]].map(([l, k]) => <div key={k} className="border border-border rounded p-2"><div className="text-lg font-bold tabular-nums">{current.stats?.[k] ?? 0}</div>{l}</div>)}</div>
          <p className="text-xs text-muted-foreground">Started {ist(current.started_at)}{current.completed_at ? ` · Finished ${ist(current.completed_at)}` : ""}</p>
          {current.error && <p className="text-xs text-destructive">{current.error}</p>}
        </>}
      </div>
      <div className="lg:col-span-2 border border-border rounded-md bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">Live activity</h3>
        <div className="max-h-80 overflow-y-auto divide-y divide-border text-sm">
          {!logs.length && <p className="text-muted-foreground py-4">No activity recorded yet. Events appear here the moment the server does something.</p>}
          {logs.map(l => <div key={l.id} className="py-2 flex gap-3 items-start"><span className="text-[11px] text-muted-foreground tabular-nums w-36 shrink-0">{ist(l.created_at)}</span><StatusBadge s={l.status} /><div className="min-w-0"><span className="text-xs text-muted-foreground mr-2">{STAGE_LABEL[l.stage] ?? l.stage}</span><span className="break-words">{l.message}</span>{Array.isArray(l.detail?.urls) && <ul className="text-[11px] text-muted-foreground mt-1">{(l.detail.urls as string[]).slice(0, 5).map(u => <li key={u} className="truncate">{u}</li>)}</ul>}</div></div>)}
        </div>
      </div>
    </div>

    <div className="border border-border rounded-md bg-card p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold mr-auto">Live writing</h3>{writing && <><StatusBadge s={writing.status} /><span className="text-xs text-muted-foreground">{words} words · updated {ist(writing.updated_at)}</span></>}</div>
      {!writing ? <p className="text-sm text-muted-foreground">Writing starts only after a topic passes fact verification (3 independent publishers including an official source).</p> : <>
        <p className="text-xs text-muted-foreground">Topic: {writing.topic}</p>
        {wb.title && <h4 className="text-lg font-bold">{wb.title}</h4>}
        {wb.meta && <p className="text-xs text-muted-foreground">Meta description: {wb.meta}</p>}
        <Progress value={Math.min(100, Math.round(words / 10))} />
        <pre className="whitespace-pre-wrap text-sm font-sans max-h-96 overflow-y-auto">{wb.text || "Preparing…"}</pre>
      </>}
    </div>

    <div className="border border-border rounded-md bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold mr-auto">Articles</h3>{["all", "pending", "published", "rejected", "failed"].map(f => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "pending" ? "Drafts" : f === "failed" ? `Failed jobs (${failedJobs.length})` : f[0].toUpperCase() + f.slice(1)}</Button>)}</div>
      {filter === "failed" ? (!failedJobs.length ? <p className="text-sm text-muted-foreground">No failed jobs.</p> : failedJobs.map(j => <div key={j.id} className="text-sm border-b border-border py-2"><b>{j.job_key}</b> · {STAGE_LABEL[j.stage] ?? j.stage} · <span className="text-destructive">{j.error}</span></div>))
        : !shown.length ? <p className="text-sm text-muted-foreground">No automated articles yet. Only real articles written by the system appear here.</p>
        : <div className="divide-y divide-border">{shown.map(d => <button key={d.id} className="w-full text-left py-2 flex flex-wrap gap-2 items-center hover:bg-muted/40 px-2 rounded" onClick={() => { setSelected(d.id); setEdit({ headline: d.headline, content: d.content ?? "", meta_title: d.meta_title ?? "", meta_description: d.meta_description ?? "" }); }}><span className="font-medium mr-auto">{d.headline}</span><span className="text-xs text-muted-foreground">SEO {d.seo_score ?? 0}</span><StatusBadge s={d.status} /><span className="text-xs text-muted-foreground">{ist(d.created_at)}</span></button>)}</div>}
    </div>

    {draft && <div className="border border-border rounded-md bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold mr-auto">Article preview</h3><StatusBadge s={draft.status} />{draft.status === "published" && <a className="text-sm text-primary inline-flex items-center gap-1" href={`https://www.investingiq.in/news/${draft.slug}`} target="_blank" rel="noreferrer">Open live article <ExternalLink className="h-3 w-3" /></a>}</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label className="text-xs">Title</Label><Input value={edit.headline ?? ""} onChange={e => setEdit({ ...edit, headline: e.target.value })} disabled={draft.status === "published"} /></div>
          <div><Label className="text-xs">SEO title ({(edit.meta_title ?? "").length})</Label><Input value={edit.meta_title ?? ""} onChange={e => setEdit({ ...edit, meta_title: e.target.value })} disabled={draft.status === "published"} /></div>
          <div><Label className="text-xs">Meta description ({(edit.meta_description ?? "").length})</Label><Textarea rows={3} value={edit.meta_description ?? ""} onChange={e => setEdit({ ...edit, meta_description: e.target.value })} disabled={draft.status === "published"} /></div>
          <p className="text-xs">Keywords: {(draft.meta_keywords ?? []).join(", ") || "—"}{draft.source_summary?.keyword?.volume ? ` · "${draft.source_summary.keyword.keyword}" ≈ ${draft.source_summary.keyword.volume}/month (Semrush)` : ""}</p>
          <div><p className="text-xs font-semibold mb-1">Sources</p><ul className="text-xs space-y-1">{(draft.source_summary?.sources ?? []).map(s => <li key={s.url} className="truncate"><Badge variant="outline" className="mr-1">{s.kind === "primary" ? "Official" : "News"}</Badge><a href={s.url} target="_blank" rel="noreferrer" className="text-primary">{s.publisher}</a></li>)}</ul></div>
          <div><p className="text-xs font-semibold mb-1">Verified facts</p><ul className="text-xs list-disc pl-4 space-y-1">{(draft.source_summary?.claims ?? []).map((c, i) => <li key={i}>{c.claim}</li>)}</ul></div>
          <div><p className="text-xs font-semibold mb-1">Checks</p><div className="flex flex-wrap gap-1">{(draft.insights?.checks ?? []).map(c => <Badge key={c.name} variant={c.ok ? "outline" : "destructive"} title={c.detail}>{c.name}</Badge>)}</div></div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Content (HTML) · {(edit.content ?? "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length} words</Label>
          <Textarea rows={12} className="font-mono text-xs" value={edit.content ?? ""} onChange={e => setEdit({ ...edit, content: e.target.value })} disabled={draft.status === "published"} />
          <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto border border-border rounded p-3" dangerouslySetInnerHTML={{ __html: edit.content ?? "" }} />
        </div>
      </div>
      {draft.status === "pending" && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!!busy} onClick={() => void act("save", () => callAction("save_draft", { draft_id: draft.id, draft: edit }), "Draft saved")}><Save />Save</Button>
        <Button disabled={!!busy} onClick={() => void act("pub", async () => { await callAction("save_draft", { draft_id: draft.id, draft: edit }); return callAction("approve", { draft_id: draft.id }); }, "Approved and published; sitemap updated")}><Send />Approve & publish</Button>
        <Button variant="ghost" disabled={!!busy} onClick={() => void act("rej", () => callAction("reject", { draft_id: draft.id }), "Draft rejected")}><XCircle />Reject</Button>
      </div>}
    </div>}
  </div>;
}
