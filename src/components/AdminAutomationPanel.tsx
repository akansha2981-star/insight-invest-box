import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, FileSearch, ListTree, Loader2, PauseCircle, Play, RefreshCw, Save, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

type Schedule = { enabled?: boolean; startTime?: string; endTime?: string; mode?: "review" | "auto"; dailyArticleLimit?: number; maxSourcesPerTopic?: number; maxRetries?: number; paused?: boolean; pausedReason?: string | null; topics?: string[] };
type HeldDraft = { id: string; headline: string; slug: string; category: string; seo_score: number; created_at: string; source_summary: { engine?: string; sources?: unknown[] } | null };
type AutomationJob = { id: string; job_key: string; run_date: string; trigger_type: string; status: string; stage: string; stats: { discovered?: number; retrieved?: number; drafted?: number; published?: number } | null; error: string | null; attempts: number; started_at: string; completed_at: string | null };
type AuditFinding = { id: string; kind: string; entity: string; target: string; detail: unknown; found_at: string; resolved: boolean };
type SitemapRun = { id: string; ran_at: string; trigger_type: string; status: string; total_urls: number; added: number; deactivated: number; validation: { ok?: boolean; issues?: string[] } | null; error: string | null };
type StatusPayload = { schedule: Schedule; connections: { firecrawl: boolean; semrush: boolean; ai: boolean }; jobs: AutomationJob[]; evidence_count: number; held_drafts: HeldDraft[]; findings: AuditFinding[]; sitemap_runs: SitemapRun[]; public_sitemap_note: string };

const DEFAULTS: Required<Pick<Schedule, "enabled" | "startTime" | "endTime" | "mode" | "dailyArticleLimit" | "maxSourcesPerTopic" | "maxRetries" | "paused">> & { topics: string[] } = { enabled: false, startTime: "20:00", endTime: "23:00", mode: "review", dailyArticleLimit: 3, maxSourcesPerTopic: 6, maxRetries: 3, paused: false, topics: [] };

async function callAction(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in required");
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-automation`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action, ...payload }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body;
}

function timestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST" : "Not recorded";
}

function ConnBadge({ label, ok }: { label: string; ok: boolean }) {
  return <Badge variant={ok ? "default" : "outline"} className="gap-1">{ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{label}: {ok ? "Connected" : "Not configured"}</Badge>;
}

export function AdminAutomationPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyDraft, setBusyDraft] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULTS);
  const [topicsText, setTopicsText] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const payload = await callAction("status");
      setStatus(payload);
      const s = { ...DEFAULTS, ...(payload.schedule ?? {}) };
      setForm(s);
      setTopicsText((s.topics ?? []).join("\n"));
    } catch (e) { setError(e instanceof Error ? e.message : "Automation status could not be loaded"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const topics = topicsText.split("\n").map(t => t.trim()).filter(Boolean);
      const result = await callAction("settings_set", { settings: { ...form, topics } });
      setStatus(prev => prev ? { ...prev, schedule: result.schedule } : prev);
      toast.success("Automation settings saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Settings could not be saved"); }
    finally { setSaving(false); }
  }

  async function runNow() {
    setRunning(true);
    try {
      const result = await callAction("run_now");
      toast.success(result.status === "done" ? "Run completed" : `Run started · stage: ${result.stage ?? result.status}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "The run could not be started"); }
    finally { setRunning(false); }
  }

  async function refreshSitemap() {
    setRefreshing(true);
    try {
      const result = await callAction("sitemap_refresh");
      if (result.status === "ok") toast.success(`Sitemap refresh ok · ${result.total_urls} URLs · ${result.added} added`);
      else toast.error(`Sitemap refresh failed: ${(result.validation?.issues ?? []).join("; ") || result.error || "validation"}`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Sitemap refresh failed"); }
    finally { setRefreshing(false); }
  }

  async function reviewDraft(draft: HeldDraft, approve: boolean) {
    setBusyDraft(draft.id);
    try {
      const result = await callAction(approve ? "approve" : "reject", { draft_id: draft.id });
      toast.success(approve ? `Published: ${result.url}` : "Draft rejected");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : approve ? "The draft could not be published" : "The draft could not be rejected"); }
    finally { setBusyDraft(null); }
  }

  if (loading && !status) return <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading automation status…</div>;
  if (error && !status) return <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span></div>;

  const latestJob = status?.jobs[0];
  const openFindings = (status?.findings ?? []).filter(f => !f.resolved).slice(0, 20);
  const latestSitemap = status?.sitemap_runs[0];

  return <div className="space-y-8">
    <div className="flex flex-wrap items-center gap-2">
      <ConnBadge label="Firecrawl research" ok={!!status?.connections.firecrawl} />
      <ConnBadge label="Semrush keywords" ok={!!status?.connections.semrush} />
      <ConnBadge label="AI generation" ok={!!status?.connections.ai} />
      <Badge variant="outline">Evidence documents: {(status?.evidence_count ?? 0).toLocaleString("en-IN")}</Badge>
      <Button variant="outline" size="sm" className="ml-auto" disabled={loading} onClick={() => void load()}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
    </div>

    <div className="flex gap-3 p-4 bg-gold-light border border-border rounded-md">
      <ShieldCheck className="h-5 w-5 text-gold shrink-0" />
      <div className="text-sm">
        <h2 className="font-semibold">Publishing gate</h2>
        <p className="text-muted-foreground mt-1">Drafts publish only when at least three independent publishers — including a primary official source — back the topic, or a narrow official announcement is retrieved. In review mode every passing draft is held here for your approval; auto mode is available but scheduled runs should stay off until the first verified article has been approved end-to-end.</p>
        <p className="text-muted-foreground mt-1">{status?.public_sitemap_note}</p>
      </div>
    </div>

    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Schedule & settings</h2>
        <div className="flex items-center gap-2">
          {status?.schedule.paused && <Badge variant="destructive" className="gap-1"><PauseCircle className="h-3 w-3" />Paused</Badge>}
          <Badge variant={status?.schedule.enabled ? "default" : "secondary"}>{status?.schedule.enabled ? "Scheduled runs on" : "Scheduled runs off"}</Badge>
        </div>
      </div>
      {status?.schedule.paused && status.schedule.pausedReason && <p className="text-xs text-destructive">Pause reason: {status.schedule.pausedReason}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 border border-border rounded-md bg-card p-4">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v === true }))} />Enable scheduled runs</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.paused} onCheckedChange={v => setForm(f => ({ ...f, paused: v === true }))} />Pause all runs</label>
        <div><Label htmlFor="auto-mode" className="text-xs">Publishing mode</Label><select id="auto-mode" className="mt-1 h-9 w-full border border-input rounded-md bg-card text-sm px-2" value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as "review" | "auto" }))}><option value="review">Review — hold every draft for approval</option><option value="auto">Auto — publish passing drafts</option></select></div>
        <div><Label htmlFor="auto-start" className="text-xs">Window start (IST)</Label><Input id="auto-start" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
        <div><Label htmlFor="auto-end" className="text-xs">Window end (IST)</Label><Input id="auto-end" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
        <div><Label htmlFor="auto-limit" className="text-xs">Max articles per day (1–10)</Label><Input id="auto-limit" type="number" min={1} max={10} value={form.dailyArticleLimit} onChange={e => setForm(f => ({ ...f, dailyArticleLimit: Number(e.target.value) || 1 }))} /></div>
        <div><Label htmlFor="auto-sources" className="text-xs">Max sources per topic (1–10)</Label><Input id="auto-sources" type="number" min={1} max={10} value={form.maxSourcesPerTopic} onChange={e => setForm(f => ({ ...f, maxSourcesPerTopic: Number(e.target.value) || 1 }))} /></div>
        <div><Label htmlFor="auto-retries" className="text-xs">Max retries (0–5)</Label><Input id="auto-retries" type="number" min={0} max={5} value={form.maxRetries} onChange={e => setForm(f => ({ ...f, maxRetries: Number(e.target.value) || 0 }))} /></div>
        <div className="sm:col-span-2 lg:col-span-3"><Label htmlFor="auto-topics" className="text-xs">Research topics (one per line, max 10)</Label><textarea id="auto-topics" rows={3} className="mt-1 w-full border border-input rounded-md bg-card text-sm p-2" value={topicsText} onChange={e => setTopicsText(e.target.value)} placeholder="RBI policy\nUnion budget\nGold prices" /></div>
        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save settings</Button>
          <Button variant="outline" onClick={() => void runNow()} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <Play />}Run now</Button>
          <Button variant="outline" onClick={() => void refreshSitemap()} disabled={refreshing}>{refreshing ? <Loader2 className="animate-spin" /> : <ListTree />}Refresh sitemap now</Button>
        </div>
      </div>
      {latestJob && <p className="text-xs text-muted-foreground">Latest run: {timestamp(latestJob.started_at)} · {latestJob.trigger_type} · stage <b>{latestJob.stage}</b> · status <b>{latestJob.status}</b> · {latestJob.stats?.discovered ?? 0} discovered · {latestJob.stats?.drafted ?? 0} drafted · {latestJob.stats?.published ?? 0} published{latestJob.error ? ` · ${latestJob.error}` : ""}</p>}
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-semibold">Held drafts awaiting review ({status?.held_drafts.length ?? 0})</h2>
      {!status?.held_drafts.length ? <p className="text-sm text-muted-foreground border-y border-border py-6 text-center">No automation drafts are waiting. Drafts appear here only after passing the evidence gate.</p> : status.held_drafts.map(d => <div key={d.id} className="border border-border rounded-md bg-card p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-sm">{d.headline}</h3>
          <p className="text-xs text-muted-foreground mt-1">{d.category} · {timestamp(d.created_at)} · {d.source_summary?.sources?.length ?? 0} linked evidence sources · legacy SEO score {d.seo_score}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={busyDraft === d.id} onClick={() => void reviewDraft(d, true)}>{busyDraft === d.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Approve & publish</Button>
          <Button size="sm" variant="outline" disabled={busyDraft === d.id} onClick={() => void reviewDraft(d, false)}><XCircle />Reject</Button>
        </div>
      </div>)}
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-semibold">Sitemap history</h2>
      {latestSitemap && <p className="text-xs text-muted-foreground">Latest refresh: {timestamp(latestSitemap.ran_at)} · {latestSitemap.status} · {latestSitemap.total_urls} URLs{latestSitemap.validation?.issues?.length ? ` · issues: ${latestSitemap.validation.issues.join("; ")}` : ""}{latestSitemap.error ? ` · ${latestSitemap.error}` : ""}</p>}
      <div className="max-w-full overflow-x-auto border-y border-border">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/40 text-xs text-muted-foreground">{["Ran · IST", "Trigger", "Status", "URLs", "Added", "Deactivated"].map(h => <th key={h} className="p-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>{(status?.sitemap_runs ?? []).map(r => <tr key={r.id} className="border-t border-border"><td className="p-3 text-xs whitespace-nowrap">{timestamp(r.ran_at)}</td><td className="p-3 text-xs">{r.trigger_type}</td><td className="p-3"><Badge variant={r.status === "ok" ? "default" : "destructive"}>{r.status}</Badge></td><td className="p-3 tabular-nums">{r.total_urls}</td><td className="p-3 tabular-nums">{r.added}</td><td className="p-3 tabular-nums">{r.deactivated}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-semibold flex items-center gap-2"><FileSearch className="h-4 w-4 text-primary" />Open audit findings ({openFindings.length})</h2>
      {!openFindings.length ? <p className="text-sm text-muted-foreground border-y border-border py-6 text-center">No unresolved audit findings.</p> : <ul className="space-y-2">{openFindings.map(f => <li key={f.id} className="border-b border-border py-2 text-sm flex flex-wrap gap-x-3"><Badge variant="outline">{f.kind}</Badge><span className="font-medium">{f.entity}</span><span className="text-muted-foreground text-xs break-all">{f.target}</span></li>)}</ul>}
    </section>

    <section className="space-y-3">
      <h2 className="text-base font-semibold">Run history</h2>
      <div className="max-w-full overflow-x-auto border-y border-border">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/40 text-xs text-muted-foreground">{["Started · IST", "Trigger", "Status", "Stage", "Attempts", "Error"].map(h => <th key={h} className="p-3 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>{(status?.jobs ?? []).map(j => <tr key={j.id} className="border-t border-border"><td className="p-3 text-xs whitespace-nowrap">{timestamp(j.started_at)}</td><td className="p-3 text-xs">{j.trigger_type}</td><td className="p-3"><Badge variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>{j.status}</Badge></td><td className="p-3 text-xs">{j.stage}</td><td className="p-3 tabular-nums">{j.attempts}</td><td className="p-3 text-xs text-destructive break-all max-w-64">{j.error ?? "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
