import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Loader2, TrendingUp, RefreshCw, PenTool, CheckCircle2,
  AlertCircle, Eye, Save, X, Search, BarChart3, Tag, Target,
  Bookmark, ShieldCheck, Link2, AlertTriangle, Trash2, Rocket
} from "lucide-react";

interface Topic {
  title: string;
  primary_keyword: string;
  search_volume: number;
  difficulty: "Low" | "Medium" | "High";
  intent: string;
  category: string;
  rationale: string;
  source?: string;
}

interface DraftArticle {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  category: string;
  tags: string[];
  html_content: string;
  word_count: number;
  keyword_occurrences: number;
  actual_density: number;
  internal_links_count?: number;
}

type AuditCheck = { id: string; category: string; label: string; status: "pass" | "warn" | "fail"; detail?: string; weight: number };
interface AuditResult {
  score: number;
  checks: AuditCheck[];
  summary: Record<string, number>;
}

type Stage = "idle" | "discovering" | "config" | "writing" | "review" | "auditing" | "audit-review";

const SAVED_KEY = "iiq_saved_topics_v1";

export function AdminAIContentStudio() {
  const [stage, setStage] = useState<Stage>("idle");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [savedTopics, setSavedTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [wordLimit, setWordLimit] = useState(1500);
  const [keywordDensity, setKeywordDensity] = useState(1.5);
  const [draft, setDraft] = useState<DraftArticle | null>(null);
  const [saving, setSaving] = useState(false);

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  // Load saved topics from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSavedTopics(JSON.parse(raw));
    } catch {}
  }, []);

  function persistSaved(next: Topic[]) {
    setSavedTopics(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
  }

  function saveTopic(t: Topic) {
    if (savedTopics.some(s => s.title === t.title)) {
      setSuccess("Topic already in saved list.");
      return;
    }
    persistSaved([t, ...savedTopics]);
    setSuccess(`Saved "${t.title}" for later.`);
  }

  function removeSaved(title: string) {
    persistSaved(savedTopics.filter(s => s.title !== title));
  }

  async function discoverTopics() {
    setStage("discovering");
    setError(null); setSuccess(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-content-studio", {
        body: { action: "discover-topics" },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setTopics(data?.topics || []);
      setStage("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to discover topics");
      setStage("idle");
    }
  }

  function openWriter(t: Topic) {
    setActiveTopic(t);
    setWordLimit(1500);
    setKeywordDensity(1.5);
    setDraft(null);
    setAudit(null);
    setImprovements([]);
    setPreviousScore(null);
    setStage("config");
  }

  async function generateArticle() {
    if (!activeTopic) return;
    setStage("writing");
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-content-studio", {
        body: {
          action: "write-article",
          topic: activeTopic.title,
          primaryKeyword: activeTopic.primary_keyword,
          category: activeTopic.category,
          wordLimit, keywordDensity,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setDraft(data as DraftArticle);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to write article");
      setStage("config");
    }
  }

  async function runSeoAudit() {
    if (!draft || !activeTopic) return;
    setStage("auditing");
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-content-studio", {
        body: {
          action: "seo-audit",
          article: draft,
          primaryKeyword: activeTopic.primary_keyword,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setDraft(data.article);
      setAudit(data.audit);
      setImprovements(data.improvements || []);
      setPreviousScore(data.previous_score ?? null);
      setStage("audit-review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
      setStage("review");
    }
  }

  async function approveAndSave(publish: boolean) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const slug = (draft.slug || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 80);
      const { error: insErr } = await supabase.from("blog_posts").insert({
        title: draft.title, slug,
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        excerpt: draft.excerpt,
        category: draft.category,
        tags: draft.tags,
        content: draft.html_content,
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
        author_name: "InvestingIQ AI Desk",
      });
      if (insErr) throw new Error(insErr.message);
      setSuccess(`Article ${publish ? "published live" : "saved as draft"} (SEO score ${audit?.score ?? "—"}).`);
      setStage("idle");
      setDraft(null); setActiveTopic(null); setAudit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  const diffColor = (d: string) =>
    d === "Low" ? "bg-green-100 text-green-700" :
    d === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

  const scoreColor = (s: number) =>
    s >= 90 ? "from-green-500 to-emerald-600" :
    s >= 75 ? "from-blue-500 to-indigo-600" :
    s >= 60 ? "from-amber-500 to-orange-600" : "from-red-500 to-rose-600";

  const renderTopicCard = (t: Topic, i: number, isSaved = false) => (
    <div key={`${isSaved ? "s" : "d"}-${i}-${t.title}`} className="p-5 hover:bg-muted/40 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">{t.category}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${diffColor(t.difficulty)}`}>{t.difficulty}</span>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{t.intent}</span>
            {t.source && !isSaved && (
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> {t.source}
              </span>
            )}
            {isSaved && (
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Bookmark className="h-2.5 w-2.5" /> Saved
              </span>
            )}
          </div>
          <h4 className="font-bold text-foreground text-base leading-snug mb-1">{t.title}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Tag className="h-3 w-3" /> {t.primary_keyword}
          </div>
          <p className="text-xs text-muted-foreground italic">{t.rationale}</p>
        </div>
        <div className="flex md:flex-col items-center md:items-end gap-2 md:w-48 shrink-0">
          <div className="text-right">
            <div className="text-xl font-bold text-foreground number-font">{t.search_volume.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">est. searches/mo</div>
          </div>
          <div className="flex gap-1.5">
            {!isSaved ? (
              <button
                onClick={() => saveTopic(t)}
                title="Save for later"
                className="flex items-center gap-1 bg-white border border-border text-foreground px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-muted"
              >
                <Bookmark className="h-3.5 w-3.5" /> Save
              </button>
            ) : (
              <button
                onClick={() => removeSaved(t.title)}
                title="Remove"
                className="flex items-center gap-1 bg-white border border-border text-red-600 px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => openWriter(t)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:shadow-lg transition-all"
            >
              <PenTool className="h-3.5 w-3.5" /> Write with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Group audit checks by category
  const groupedChecks = audit?.checks.reduce<Record<string, AuditCheck[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {}) || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-2.5">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Content Studio</h1>
            <p className="text-sm text-muted-foreground">Research → Write → Deep 70+ point SEO audit → Publish</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Discover panel */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-200 mb-2">
              <TrendingUp className="h-3.5 w-3.5" /> Step 1 — Topic Research
            </div>
            <h2 className="text-xl font-bold mb-1">Discover what India is searching now</h2>
            <p className="text-sm text-white/70 max-w-xl">
              Live pull from <strong>Google Trends India</strong>, <strong>Economic Times</strong> & <strong>Moneycontrol</strong> — AI curates only Investment, Stocks, MF, Real Estate, Tax, IPO & Crypto topics.
            </p>
          </div>
          <button
            onClick={discoverTopics}
            disabled={stage === "discovering"}
            className="flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors disabled:opacity-60 shrink-0"
          >
            {stage === "discovering" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {topics.length ? "Refresh Topics" : "Find Trending Topics"}
          </button>
        </div>
      </div>

      {/* Saved topics */}
      {savedTopics.length > 0 && (
        <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-purple-50/40">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-purple-700" />
              <h3 className="font-bold text-foreground">Saved for Later ({savedTopics.length})</h3>
            </div>
            <button onClick={() => persistSaved([])} className="text-xs text-muted-foreground hover:text-red-600 flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
          </div>
          <div className="divide-y divide-border">
            {savedTopics.map((t, i) => renderTopicCard(t, i, true))}
          </div>
        </div>
      )}

      {/* Live topics */}
      {topics.length > 0 && (
        <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-foreground">{topics.length} Trending Topics (Live)</h3>
            </div>
            <button onClick={discoverTopics} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="divide-y divide-border">
            {topics.map((t, i) => renderTopicCard(t, i, false))}
          </div>
        </div>
      )}

      {/* Config modal */}
      {stage === "config" && activeTopic && (
        <Modal onClose={() => setStage("idle")} title="Article Settings">
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Topic</div>
            <div className="font-bold text-sm text-foreground">{activeTopic.title}</div>
            <div className="text-xs text-muted-foreground mt-1">Primary keyword: <span className="font-semibold">{activeTopic.primary_keyword}</span></div>
          </div>

          <label className="block mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Target className="h-4 w-4" /> Word Limit</span>
              <span className="text-sm font-bold text-primary number-font">{wordLimit}</span>
            </div>
            <input type="range" min={500} max={4000} step={100} value={wordLimit} onChange={e => setWordLimit(Number(e.target.value))} className="w-full accent-purple-600" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>500</span><span>4000 words</span></div>
          </label>

          <label className="block mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Keyword Density</span>
              <span className="text-sm font-bold text-primary number-font">{keywordDensity.toFixed(1)}%</span>
            </div>
            <input type="range" min={0.5} max={4} step={0.1} value={keywordDensity} onChange={e => setKeywordDensity(Number(e.target.value))} className="w-full accent-purple-600" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>0.5% (subtle)</span><span>4% (aggressive)</span></div>
            <p className="text-[11px] text-muted-foreground mt-2">Recommended: 1-2%. Primary keyword appears ~{Math.round((wordLimit*keywordDensity)/100)} times.</p>
          </label>

          <div className="flex gap-2">
            <button onClick={() => setStage("idle")} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
            <button onClick={generateArticle} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg">
              <Sparkles className="h-4 w-4" /> Generate Article
            </button>
          </div>
        </Modal>
      )}

      {/* Writing loader */}
      {stage === "writing" && (
        <Modal onClose={() => {}} title="Writing in Progress" hideClose>
          <div className="py-8 text-center">
            <div className="relative inline-flex mb-4">
              <div className="absolute inset-0 rounded-full bg-purple-600/30 blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 rounded-full p-5">
                <Sparkles className="h-8 w-8 text-white animate-pulse" />
              </div>
            </div>
            <h3 className="font-bold text-foreground mb-1">AI is writing your article…</h3>
            <p className="text-sm text-muted-foreground">Researching, embedding internal links, optimising for SEO. 30-60 seconds.</p>
          </div>
        </Modal>
      )}

      {/* Auditing loader */}
      {stage === "auditing" && (
        <Modal onClose={() => {}} title="Running Deep SEO Audit" hideClose>
          <div className="py-8 text-center">
            <div className="relative inline-flex mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-600/30 blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-emerald-600 to-blue-600 rounded-full p-5">
                <ShieldCheck className="h-8 w-8 text-white animate-pulse" />
              </div>
            </div>
            <h3 className="font-bold text-foreground mb-1">Running 70+ SEO checks…</h3>
            <p className="text-sm text-muted-foreground">Auditing meta, headings, keywords, links, schema, E-E-A-T. Auto-fixing gaps.</p>
          </div>
        </Modal>
      )}

      {/* Review modal — pre-audit */}
      {stage === "review" && draft && (
        <Modal onClose={() => setStage("idle")} title="Review Generated Article" wide>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Words" value={draft.word_count.toString()} />
            <Stat label="KW Hits" value={draft.keyword_occurrences.toString()} />
            <Stat label="Density" value={`${draft.actual_density}%`} />
            <Stat label="Internal Links" value={(draft.internal_links_count ?? 0).toString()} />
          </div>

          <div className="mb-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Meta Title</div>
            <div className="text-sm font-semibold text-foreground bg-muted px-3 py-2 rounded">{draft.meta_title}</div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Meta Description</div>
            <div className="text-sm text-foreground bg-muted px-3 py-2 rounded">{draft.meta_description}</div>
            <div className="flex flex-wrap gap-1">
              {draft.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{tag}</span>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-lg max-h-[45vh] overflow-y-auto p-4 mb-4 bg-white">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: draft.html_content }} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-xs text-blue-900 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Next step runs <strong>70+ deep SEO checks</strong> (meta, headings, keyword placement, internal/external links, schema, E-E-A-T, India focus, readability) and auto-optimises any gaps before you publish.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setStage("config")} className="px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted">
              <Eye className="h-4 w-4 inline mr-1" /> Regenerate
            </button>
            <button onClick={() => approveAndSave(false)} disabled={saving} className="px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Save className="h-4 w-4 inline mr-1" />} Save Draft (skip audit)
            </button>
            <button onClick={runSeoAudit} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg">
              <ShieldCheck className="h-4 w-4" /> Approve → Run Deep SEO Audit
            </button>
          </div>
        </Modal>
      )}

      {/* Audit review modal */}
      {stage === "audit-review" && draft && audit && (
        <Modal onClose={() => setStage("review")} title="SEO Audit Report" wide>
          {/* Score hero */}
          <div className={`bg-gradient-to-br ${scoreColor(audit.score)} rounded-2xl p-5 mb-4 text-white`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-1">Deep SEO Score</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-5xl font-bold number-font">{audit.score}</div>
                  <div className="text-2xl font-semibold text-white/70">/100</div>
                  {previousScore !== null && previousScore !== audit.score && (
                    <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">↑ from {previousScore}</span>
                  )}
                </div>
                <div className="text-xs text-white/80 mt-1">
                  {audit.summary.passed} passed · {audit.summary.warnings} warnings · {audit.summary.failed} failed · {audit.summary.total_checks} total checks
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Mini label="Words" v={audit.summary.word_count} />
                <Mini label="Density" v={`${audit.summary.keyword_density}%`} />
                <Mini label="Internal" v={audit.summary.internal_links} icon={<Link2 className="h-3 w-3" />} />
                <Mini label="H2s" v={audit.summary.h2_count} />
              </div>
            </div>
          </div>

          {improvements.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-sm">
                <Sparkles className="h-4 w-4" /> AI Optimisations Applied ({improvements.length})
              </div>
              <ul className="space-y-1 text-xs text-emerald-900">
                {improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />{imp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Checks by category */}
          <div className="border border-border rounded-xl divide-y divide-border max-h-[45vh] overflow-y-auto mb-4">
            {Object.entries(groupedChecks).map(([cat, list]) => (
              <div key={cat} className="p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat}</div>
                <div className="space-y-1.5">
                  {list.map(c => (
                    <div key={c.id} className="flex items-start gap-2 text-xs">
                      {c.status === "pass" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />}
                      {c.status === "warn" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />}
                      {c.status === "fail" && <X className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />}
                      <span className={`flex-1 ${c.status === "fail" ? "text-red-700 font-medium" : c.status === "warn" ? "text-amber-700" : "text-foreground"}`}>
                        {c.label}
                        {c.detail && <span className="text-muted-foreground ml-1">({c.detail})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-semibold text-primary">Preview optimised article HTML</summary>
            <div className="border border-border rounded-lg max-h-[40vh] overflow-y-auto p-4 mt-2 bg-white">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: draft.html_content }} />
            </div>
          </details>

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setStage("review")} className="px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted">
              ← Back to draft
            </button>
            <button onClick={() => approveAndSave(false)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as Draft
            </button>
            <button onClick={() => approveAndSave(true)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Approve & Publish Live
            </button>
          </div>
        </Modal>
      )}

      {topics.length === 0 && savedTopics.length === 0 && stage === "idle" && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Click "Find Trending Topics" above to get started.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
      <div className="text-lg font-bold text-foreground number-font">{value}</div>
    </div>
  );
}

function Mini({ label, v, icon }: { label: string; v: string | number; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-white/70 font-bold flex items-center gap-1">{icon}{label}</div>
      <div className="text-sm font-bold number-font">{v}</div>
    </div>
  );
}

function Modal({ children, onClose, title, wide, hideClose }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean; hideClose?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className={`bg-background rounded-2xl shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="font-bold text-foreground">{title}</h3>
          {!hideClose && (
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
