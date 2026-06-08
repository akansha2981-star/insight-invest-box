import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock,
  Search, ShieldCheck, TrendingUp, FileText, Filter, ChevronRight, Database,
} from "lucide-react";

type Run = {
  id: string; started_at: string; completed_at: string | null; status: string;
  pages_scanned: number; proposals_created: number; seo_findings: number; keywords_found: number;
  trigger_type: string; summary: any; error: string | null;
};

type Proposal = {
  id: string; run_id: string; target_type: string; target_id: string | null;
  target_url: string | null; target_label: string | null;
  field: string; old_value: any; new_value: any;
  category: string; priority: string; confidence: number; reason: string | null;
  keywords: string[] | null; status: string; created_at: string;
};

type Finding = {
  id: string; run_id: string; check_key: string; check_label: string;
  page_url: string; severity: string; status: string; details: string | null;
};

type Keyword = {
  id: string; keyword: string; volume_score: number; source: string;
  mapped_target_type: string | null; mapped_reason: string | null; discovered_at: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  content_refresh: "Content Refresh",
  seo: "SEO",
  data_integrity: "Data Integrity",
  trending_keyword: "Trending Keyword",
  schema: "Schema",
  broken_element: "Broken Element",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

export function AdminAIOptimizer() {
  const [tab, setTab] = useState<"overview" | "queue" | "seo" | "keywords" | "history">("overview");
  const [runs, setRuns] = useState<Run[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function fetchAll() {
    const [r, p, f, k] = await Promise.all([
      supabase.from("optimizer_runs").select("*").order("started_at", { ascending: false }).limit(20),
      supabase.from("optimizer_proposals").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("seo_audit_findings").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase.from("trending_keywords").select("*").order("discovered_at", { ascending: false }).limit(100),
    ]);
    setRuns((r.data as any) ?? []);
    setProposals((p.data as any) ?? []);
    setFindings((f.data as any) ?? []);
    setKeywords((k.data as any) ?? []);
  }

  useEffect(() => { fetchAll(); }, []);

  const latestRun = runs[0];
  const pending = proposals.filter(p => p.status === "pending");
  const approved = proposals.filter(p => p.status === "approved");
  const published = proposals.filter(p => p.status === "published");

  const filteredProposals = useMemo(() => {
    if (filter === "all") return pending;
    if (filter === "approved") return approved;
    if (filter === "published") return published;
    return pending.filter(p => p.category === filter);
  }, [filter, pending, approved, published]);

  async function runScan() {
    setScanning(true); setError(null);
    const { data, error } = await supabase.functions.invoke("content-optimizer", { body: { action: "scan" } });
    setScanning(false);
    if (error || data?.error) { setError(error?.message ?? data?.error ?? "Scan failed"); return; }
    await fetchAll();
  }

  async function act(action: "approve" | "reject" | "apply", ids: string[]) {
    if (!ids.length) return;
    setBusy(true); setError(null);
    const { data, error } = await supabase.functions.invoke("content-optimizer", {
      body: { action, proposal_ids: ids },
    });
    setBusy(false);
    if (error || data?.error) { setError(error?.message ?? data?.error); return; }
    setSelected(new Set());
    await fetchAll();
  }

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const stats = [
    { label: "Pages scanned", value: latestRun?.pages_scanned ?? 0, icon: Search },
    { label: "Pending review", value: pending.length, icon: Clock },
    { label: "Approved (ready)", value: approved.length, icon: CheckCircle },
    { label: "Published", value: published.length, icon: Database },
    { label: "SEO findings", value: latestRun?.seo_findings ?? 0, icon: ShieldCheck },
    { label: "Keywords found", value: latestRun?.keywords_found ?? 0, icon: TrendingUp },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Content & SEO Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily AI scans propose refreshes, SEO fixes, and trending-keyword updates across the whole site (Blog excluded).
            Nothing publishes without your approval.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll}
            className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
          <button onClick={runScan} disabled={scanning}
            className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 shadow-card">
            <Sparkles className={`h-4 w-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning ? "Scanning…" : "Run AI Scan Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />{error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-4 shadow-card">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground number-font">{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {[
          { id: "overview", label: "Overview" },
          { id: "queue", label: `Review Queue (${pending.length + approved.length})` },
          { id: "seo", label: "SEO Audit" },
          { id: "keywords", label: "Trending Keywords" },
          { id: "history", label: "Run History" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-gradient-to-br from-primary/5 to-purple-50 border border-primary/20 rounded-xl p-5">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> What this engine does
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Scans every dynamic section daily (Blog excluded — manual)",
                "Detects stale content, broken numbers, missing SEO meta",
                "Auto-discovers trending finance keywords",
                "Runs a 70-point SEO audit per page",
                "Routes every change through your approval queue",
                "Publishes only what you approve — full audit trail",
              ].map(x => (
                <li key={x} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gain shrink-0 mt-0.5" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-bold text-foreground mb-3">Latest run</h2>
            {latestRun ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span className="font-semibold">{new Date(latestRun.started_at).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`font-semibold ${latestRun.status === "success" ? "text-gain" : "text-amber-600"}`}>{latestRun.status}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trigger</span><span className="font-semibold">{latestRun.trigger_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Proposals</span><span className="font-semibold">{latestRun.proposals_created}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SEO findings</span><span className="font-semibold">{latestRun.seo_findings}</span></div>
                {latestRun.summary?.proposals_by_category && (
                  <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Category breakdown</summary>
                    <pre className="mt-2 bg-muted/30 rounded p-2 overflow-auto">{JSON.stringify(latestRun.summary.proposals_by_category, null, 2)}</pre>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No runs yet. Click "Run AI Scan Now" to begin.</p>
            )}
          </div>
        </div>
      )}

      {tab === "queue" && (
        <div className="space-y-4">
          {/* Filters + bulk actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {[
              ["all", `All pending (${pending.length})`],
              ["content_refresh", "Content"],
              ["seo", "SEO"],
              ["data_integrity", "Data"],
              ["trending_keyword", "Keywords"],
              ["schema", "Schema"],
              ["approved", `Approved (${approved.length})`],
              ["published", `Published (${published.length})`],
            ].map(([id, label]) => (
              <button key={id} onClick={() => { setFilter(id); setSelected(new Set()); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  filter === id ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"
                }`}>
                {label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button disabled={!selected.size || busy} onClick={() => act("reject", [...selected])}
                className="flex items-center gap-1 text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-loss disabled:opacity-40">
                <XCircle className="h-3.5 w-3.5" /> Reject ({selected.size})
              </button>
              <button disabled={!selected.size || busy} onClick={() => act("approve", [...selected])}
                className="flex items-center gap-1 text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-green-50 hover:text-gain disabled:opacity-40">
                <CheckCircle className="h-3.5 w-3.5" /> Approve ({selected.size})
              </button>
              <button disabled={busy} onClick={() => act("approve", pending.filter(p => p.confidence >= 0.85).map(p => p.id))}
                className="flex items-center gap-1 text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-muted disabled:opacity-40">
                Approve all high-confidence
              </button>
              <button disabled={!approved.length || busy} onClick={() => act("apply", approved.map(p => p.id))}
                className="flex items-center gap-1 text-xs font-semibold bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40">
                <Sparkles className="h-3.5 w-3.5" /> Publish approved ({approved.length})
              </button>
            </div>
          </div>

          {/* Proposals */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">No proposals here.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredProposals.map(p => (
                  <div key={p.id} className="px-4 py-3 hover:bg-muted/20">
                    <div className="flex items-start gap-3">
                      {p.status === "pending" && (
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)}
                          className="mt-1 h-4 w-4 rounded border-border" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[p.priority] ?? PRIORITY_BADGE.low}`}>{p.priority}</span>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{CATEGORY_LABEL[p.category] ?? p.category}</span>
                          <span className="text-[10px] text-muted-foreground">conf {(p.confidence * 100).toFixed(0)}%</span>
                          {p.status !== "pending" && (
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              p.status === "approved" ? "bg-blue-50 text-blue-700"
                              : p.status === "published" ? "bg-green-50 text-gain"
                              : "bg-red-50 text-loss"
                            }`}>{p.status}</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-foreground truncate">
                          {p.target_label ?? `${p.target_type} · ${p.field}`}
                        </div>
                        {p.reason && <div className="text-xs text-muted-foreground mt-0.5">{p.reason}</div>}
                        <div className="mt-2 grid md:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-red-50/40 border border-red-100 rounded p-2">
                            <div className="text-[9px] font-bold uppercase text-red-700 mb-0.5">Current</div>
                            <pre className="whitespace-pre-wrap break-words text-muted-foreground max-h-32 overflow-auto">{formatVal(p.old_value)}</pre>
                          </div>
                          <div className="bg-green-50/40 border border-green-100 rounded p-2">
                            <div className="text-[9px] font-bold uppercase text-gain mb-0.5">Proposed</div>
                            <pre className="whitespace-pre-wrap break-words text-foreground max-h-32 overflow-auto">{formatVal(p.new_value)}</pre>
                          </div>
                        </div>
                        {p.target_url && <a href={p.target_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline mt-2 inline-flex items-center gap-1">View page <ChevronRight className="h-3 w-3" /></a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "seo" && (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">70-Point SEO Audit (latest run)</h2>
            <span className="text-xs text-muted-foreground">{findings.filter(f => f.run_id === latestRun?.id).length} checks</span>
          </div>
          {findings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No audit yet — run a scan.</div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left text-[11px] font-bold uppercase text-muted-foreground">
                    <th className="px-4 py-2">Status</th><th className="px-4 py-2">Check</th><th className="px-4 py-2">Page</th><th className="px-4 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {findings.filter(f => !latestRun || f.run_id === latestRun.id).slice(0, 800).map(f => (
                    <tr key={f.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2">
                        {f.status === "pass" ? <span className="text-[10px] font-bold uppercase bg-green-50 text-gain px-1.5 py-0.5 rounded">pass</span>
                          : f.status === "warn" ? <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">warn</span>
                          : <span className="text-[10px] font-bold uppercase bg-red-50 text-loss px-1.5 py-0.5 rounded">fail</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-foreground">{f.check_label}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-xs">{f.page_url}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{f.details ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "keywords" && (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold text-foreground">Trending finance keywords discovered</h2>
          </div>
          {keywords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Run a scan to discover trending keywords.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] font-bold uppercase text-muted-foreground">
                  <th className="px-4 py-2">Keyword</th><th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Suggested target</th><th className="px-4 py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keywords.map(k => (
                  <tr key={k.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-sm font-semibold text-foreground">{k.keyword}</td>
                    <td className="px-4 py-2"><div className="flex items-center gap-2"><div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${k.volume_score}%` }}/></div><span className="text-xs number-font">{k.volume_score}</span></div></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{k.mapped_target_type ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{k.mapped_reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No runs yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {runs.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {new Date(r.started_at).toLocaleString("en-IN")}
                        <span className="ml-2 text-[10px] uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{r.trigger_type}</span>
                        {r.status === "success" && <span className="ml-2 text-[10px] uppercase bg-green-50 text-gain px-1.5 py-0.5 rounded">success</span>}
                        {r.status === "running" && <span className="ml-2 text-[10px] uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">running</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.pages_scanned} scanned · {r.proposals_created} proposals · {r.seo_findings} SEO · {r.keywords_found} keywords
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatVal(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object" && "value" in v) v = (v as any).value;
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
