import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Newspaper, Sparkles, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, Edit3, Send, TrendingUp, Tag, Filter, ChevronDown, ChevronUp, Save, Loader2,
} from "lucide-react";

type Run = {
  id: string; started_at: string; completed_at: string | null; status: string;
  requested_count: number; discovered: number; generated: number; failed: number;
  trigger_type: string; summary: any; error: string | null;
};

type Draft = {
  id: string; run_id: string | null; status: string;
  topic: string; category: string; tags: string[] | null; trending: boolean;
  headline: string; slug: string; summary: string | null; content: string | null;
  read_time_min: number; meta_title: string | null; meta_description: string | null;
  meta_keywords: string[] | null; featured_image_url: string | null;
  insights: any; seo_score: number; internal_links: any;
  created_at: string; published_at: string | null;
};

const CATEGORIES = [
  "Stock Market", "Mutual Funds", "Real Estate", "Economy", "Personal Finance",
  "IPOs", "Banking", "Cryptocurrency", "Taxation", "Government Policies",
  "Global Markets", "Business News",
];

const COUNT_OPTIONS = [10, 25, 50, 100];

export function AdminNewsEngine() {
  const [tab, setTab] = useState<"pending" | "approved" | "published" | "rejected" | "history">("pending");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [count, setCount] = useState(10);
  const [categories, setCategories] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Record<string, Partial<Draft>>>({});
  const [activeRun, setActiveRun] = useState<Run | null>(null);

  async function fetchAll() {
    const [d, r] = await Promise.all([
      supabase.from("news_drafts").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("news_runs").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    setDrafts((d.data as any) ?? []);
    setRuns((r.data as any) ?? []);
  }
  useEffect(() => { fetchAll(); }, []);

  // Poll active run while generating
  useEffect(() => {
    if (!generating && !activeRun) return;
    const id = setInterval(fetchAll, 2500);
    return () => clearInterval(id);
  }, [generating, activeRun]);

  const pending = useMemo(() => drafts.filter(d => d.status === "pending"), [drafts]);
  const approved = useMemo(() => drafts.filter(d => d.status === "approved"), [drafts]);
  const published = useMemo(() => drafts.filter(d => d.status === "published"), [drafts]);
  const rejected = useMemo(() => drafts.filter(d => d.status === "rejected"), [drafts]);

  const filteredDrafts = tab === "pending" ? pending : tab === "approved" ? approved : tab === "published" ? published : tab === "rejected" ? rejected : [];

  const tracker = {
    discovered: runs[0]?.discovered ?? 0,
    generated: drafts.length,
    approved: approved.length,
    published: published.length,
    categoriesUpdated: new Set(drafts.map(d => d.category)).size,
    seoStrong: drafts.filter(d => d.seo_score >= 80).length,
    internalLinks: drafts.reduce((acc, d) => acc + (Array.isArray(d.internal_links) ? d.internal_links.length : 0), 0),
    schemas: drafts.filter(d => d.insights && Object.keys(d.insights).length > 0).length,
  };

  async function generateNews() {
    setGenerating(true); setError(null); setInfo(null);
    const { data, error } = await supabase.functions.invoke("news-engine", {
      body: { action: "generate", count, categories },
    });
    setGenerating(false);
    if (error || data?.error) {
      setError(error?.message ?? data?.error ?? "Generation failed");
      return;
    }
    setInfo(`Discovered ${data?.discovered ?? 0}, generated ${data?.generated ?? 0} drafts. Review them in the Pending tab.`);
    await fetchAll();
  }

  async function act(action: "approve" | "reject" | "publish", ids: string[]) {
    if (!ids.length) { setError("Nothing selected for this action."); return; }
    setBusy(true); setError(null); setInfo(null);
    const body: any = action === "publish"
      ? { action: "publish", draft_ids: ids }
      : { action, draft_ids: ids };
    const { data, error } = await supabase.functions.invoke("news-engine", { body });
    setBusy(false);
    if (error || data?.error) { setError(error?.message ?? data?.error); return; }
    const errs = Array.isArray(data?.errors) ? data.errors : [];
    if (errs.length) setError(`${action} completed for ${data?.published ?? data?.updated ?? 0}. ${errs.length} failed: ${errs.slice(0,3).map((e: any) => e.error).join("; ")}`);
    else setInfo(`${action === "publish" ? "Published" : action === "approve" ? "Approved" : "Rejected"} ${data?.published ?? data?.updated ?? ids.length} article(s).`);
    setSelected(new Set());
    await fetchAll();
  }

  async function regenerate(id: string) {
    setBusy(true); setError(null);
    const { data, error } = await supabase.functions.invoke("news-engine", { body: { action: "regenerate", draft_id: id } });
    setBusy(false);
    if (error || data?.error) setError(error?.message ?? data?.error);
    else setInfo("Article regenerated. Review the updated draft.");
    await fetchAll();
  }

  async function saveEdit(id: string) {
    const patch = editing[id]; if (!patch) return;
    setBusy(true); setError(null);
    const { data, error } = await supabase.functions.invoke("news-engine", { body: { action: "edit", draft_id: id, patch } });
    setBusy(false);
    if (error || data?.error) setError(error?.message ?? data?.error);
    else {
      setInfo("Changes saved.");
      setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
    await fetchAll();
  }

  function toggle(id: string) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  }
  function toggleExpand(id: string) {
    const next = new Set(expanded); next.has(id) ? next.delete(id) : next.add(id); setExpanded(next);
  }
  function patchField(id: string, field: keyof Draft, value: any) {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
  }
  function val<K extends keyof Draft>(d: Draft, k: K): any {
    return editing[d.id]?.[k] ?? d[k];
  }

  const latestRun = runs[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" /> Smart Financial News Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            AI discovers trending finance topics, drafts original SEO-ready articles with deep insight blocks,
            and queues them for your approval. Nothing publishes without you.
          </p>
        </div>
      </div>

      {/* Generate strip */}
      <div className="bg-gradient-to-br from-primary/5 to-purple-50 border border-primary/20 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Articles to generate</label>
            <div className="flex gap-1">
              {COUNT_OPTIONS.map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg border ${count === n ? "bg-primary text-white border-primary" : "bg-white border-border hover:bg-muted"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Categories (optional — leave empty for all)</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${categories.includes(c) ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:bg-muted"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button disabled={generating} onClick={generateNews}
            className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 shadow-card">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Discover & Generate"}
          </button>
        </div>
        {latestRun && (
          <div className="text-xs text-muted-foreground">
            Latest run: {new Date(latestRun.started_at).toLocaleString("en-IN")} · status {latestRun.status} · discovered {latestRun.discovered} · generated {latestRun.generated} · failed {latestRun.failed}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {info && <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex gap-2 text-sm text-gain"><CheckCircle className="h-4 w-4 shrink-0" />{info}</div>}

      {/* Live tracker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Topics discovered", value: tracker.discovered, icon: TrendingUp },
          { label: "Generated", value: tracker.generated, icon: Sparkles },
          { label: "Approved", value: tracker.approved, icon: CheckCircle },
          { label: "Published", value: tracker.published, icon: Send },
          { label: "Categories", value: tracker.categoriesUpdated, icon: Tag },
          { label: "SEO strong", value: tracker.seoStrong, icon: TrendingUp },
          { label: "Internal links", value: tracker.internalLinks, icon: Filter },
          { label: "Schemas", value: tracker.schemas, icon: Newspaper },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-3 shadow-card">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-1.5">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground number-font">{s.value}</div>
            <div className="text-[10px] text-muted-foreground font-medium leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-1 overflow-x-auto">
        {[
          { id: "pending", label: `Pending (${pending.length})` },
          { id: "approved", label: `Approved (${approved.length})` },
          { id: "published", label: `Published (${published.length})` },
          { id: "rejected", label: `Rejected (${rejected.length})` },
          { id: "history", label: "Generation Logs" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as any); setSelected(new Set()); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {(tab === "pending" || tab === "approved") && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setSelected(new Set(filteredDrafts.map(d => d.id)))}
            className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-muted">Select all</button>
          <button onClick={() => setSelected(new Set())}
            className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-muted">Clear</button>
          {tab === "pending" && (
            <>
              <button disabled={busy || !selected.size} onClick={() => act("reject", [...selected])}
                className="flex items-center gap-1 text-xs font-semibold border border-border rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-loss disabled:opacity-40">
                <XCircle className="h-3.5 w-3.5" /> Reject ({selected.size})
              </button>
              <button disabled={busy || !selected.size} onClick={() => act("approve", [...selected])}
                className="flex items-center gap-1 text-xs font-semibold bg-gain text-white rounded-lg px-3 py-1.5 hover:bg-gain/90 disabled:opacity-40">
                <CheckCircle className="h-3.5 w-3.5" /> Approve ({selected.size})
              </button>
              <button disabled={busy || !pending.length} onClick={() => act("approve", pending.map(d => d.id))}
                className="text-xs font-semibold bg-gain/90 text-white rounded-lg px-3 py-1.5 hover:bg-gain disabled:opacity-40">
                Approve All Pending
              </button>
            </>
          )}
          {tab === "approved" && (
            <button disabled={busy || !approved.length} onClick={() => act("publish", approved.map(d => d.id))}
              className="flex items-center gap-1 text-xs font-semibold bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary/90 disabled:opacity-40">
              <Send className="h-3.5 w-3.5" /> Publish All Approved ({approved.length})
            </button>
          )}
        </div>
      )}

      {/* Drafts list */}
      {tab !== "history" && (
        <div className="space-y-3">
          {filteredDrafts.length === 0 ? (
            <div className="bg-white border border-border rounded-xl text-center py-16 text-muted-foreground text-sm">
              No articles in this state. {tab === "pending" && "Click \"Discover & Generate\" above to create some."}
            </div>
          ) : filteredDrafts.map(d => {
            const isOpen = expanded.has(d.id);
            const isEditing = !!editing[d.id];
            return (
              <div key={d.id} className="bg-white border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start gap-3">
                  {(tab === "pending" || tab === "approved") && (
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)}
                      className="mt-1.5 h-4 w-4 rounded border-border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">{d.category}</span>
                      {d.trending && <span className="text-[10px] font-bold uppercase bg-red-50 text-loss px-1.5 py-0.5 rounded flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />trending</span>}
                      <span className="text-[10px] text-muted-foreground">{d.read_time_min} min read</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${d.seo_score >= 80 ? "bg-green-50 text-gain" : d.seo_score >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-loss"}`}>
                        SEO {d.seo_score}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(d.created_at).toLocaleString("en-IN")}</span>
                    </div>
                    {isEditing ? (
                      <input value={val(d, "headline") ?? ""} onChange={e => patchField(d.id, "headline", e.target.value)}
                        className="w-full text-base font-bold border border-border rounded px-2 py-1 mb-2" />
                    ) : (
                      <h3 className="text-base font-bold text-foreground leading-snug">{d.headline}</h3>
                    )}
                    {isEditing ? (
                      <textarea value={val(d, "summary") ?? ""} onChange={e => patchField(d.id, "summary", e.target.value)}
                        rows={2} className="w-full text-sm text-muted-foreground border border-border rounded px-2 py-1 mt-1" />
                    ) : (
                      d.summary && <p className="text-sm text-muted-foreground mt-1">{d.summary}</p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <button onClick={() => toggleExpand(d.id)} className="text-[11px] font-semibold border border-border rounded px-2 py-1 hover:bg-muted flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {isOpen ? "Hide" : "Preview"}
                        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {d.status !== "published" && (
                        isEditing ? (
                          <>
                            <button onClick={() => saveEdit(d.id)} disabled={busy} className="text-[11px] font-semibold bg-primary text-white rounded px-2 py-1 hover:bg-primary/90 flex items-center gap-1 disabled:opacity-50">
                              <Save className="h-3 w-3" /> Save
                            </button>
                            <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[d.id]; return n; })} className="text-[11px] font-semibold border border-border rounded px-2 py-1 hover:bg-muted">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setEditing(prev => ({ ...prev, [d.id]: {} }))} className="text-[11px] font-semibold border border-border rounded px-2 py-1 hover:bg-muted flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> Edit
                          </button>
                        )
                      )}
                      {d.status !== "published" && (
                        <button onClick={() => regenerate(d.id)} disabled={busy} className="text-[11px] font-semibold border border-border rounded px-2 py-1 hover:bg-muted flex items-center gap-1 disabled:opacity-50">
                          <RefreshCw className="h-3 w-3" /> Regenerate
                        </button>
                      )}
                      {d.status === "pending" && (
                        <>
                          <button onClick={() => act("approve", [d.id])} disabled={busy} className="text-[11px] font-semibold bg-gain text-white rounded px-2 py-1 hover:bg-gain/90 flex items-center gap-1 disabled:opacity-50">
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button onClick={() => act("reject", [d.id])} disabled={busy} className="text-[11px] font-semibold border border-border text-loss rounded px-2 py-1 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                      {d.status === "approved" && (
                        <button onClick={() => act("publish", [d.id])} disabled={busy} className="text-[11px] font-semibold bg-primary text-white rounded px-2 py-1 hover:bg-primary/90 flex items-center gap-1 disabled:opacity-50">
                          <Send className="h-3 w-3" /> Publish
                        </button>
                      )}
                      {d.status === "published" && d.slug && (
                        <a href={`/news/${d.slug}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                          <Eye className="h-3 w-3" /> View live
                        </a>
                      )}
                    </div>

                    {/* Preview expansion */}
                    {isOpen && (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        <div className="text-xs grid sm:grid-cols-2 gap-3">
                          <div><span className="font-semibold">Meta title:</span> <span className="text-muted-foreground">{d.meta_title}</span></div>
                          <div><span className="font-semibold">Meta desc:</span> <span className="text-muted-foreground">{d.meta_description}</span></div>
                          <div><span className="font-semibold">Keywords:</span> <span className="text-muted-foreground">{(d.meta_keywords ?? []).join(", ")}</span></div>
                          <div><span className="font-semibold">Tags:</span> <span className="text-muted-foreground">{(d.tags ?? []).join(", ")}</span></div>
                        </div>
                        {d.content && (
                          <div className="text-sm bg-muted/20 border border-border rounded p-3 max-h-[400px] overflow-auto prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: d.content }} />
                        )}
                        {d.insights && Object.keys(d.insights).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer font-semibold text-muted-foreground">AI Insight blocks (14)</summary>
                            <pre className="mt-2 bg-muted/20 border border-border rounded p-2 overflow-auto max-h-64">{JSON.stringify(d.insights, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No runs yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] font-bold uppercase text-muted-foreground">
                  <th className="px-4 py-2">Started</th><th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Requested</th><th className="px-4 py-2">Discovered</th>
                  <th className="px-4 py-2">Generated</th><th className="px-4 py-2">Failed</th>
                  <th className="px-4 py-2">Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-xs">{new Date(r.started_at).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2"><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${r.status === "success" ? "bg-green-50 text-gain" : r.status === "running" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-loss"}`}>{r.status}</span></td>
                    <td className="px-4 py-2 number-font">{r.requested_count}</td>
                    <td className="px-4 py-2 number-font">{r.discovered}</td>
                    <td className="px-4 py-2 number-font text-gain font-semibold">{r.generated}</td>
                    <td className="px-4 py-2 number-font text-loss">{r.failed}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.trigger_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
