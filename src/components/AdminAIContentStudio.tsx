import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Loader2, TrendingUp, RefreshCw, PenTool, CheckCircle2,
  AlertCircle, Eye, Save, X, Search, BarChart3, Tag, Target
} from "lucide-react";

interface Topic {
  title: string;
  primary_keyword: string;
  search_volume: number;
  difficulty: "Low" | "Medium" | "High";
  intent: string;
  category: string;
  rationale: string;
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
}

type Stage = "idle" | "discovering" | "config" | "writing" | "review";

export function AdminAIContentStudio() {
  const [stage, setStage] = useState<Stage>("idle");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [wordLimit, setWordLimit] = useState(1500);
  const [keywordDensity, setKeywordDensity] = useState(1.5);
  const [draft, setDraft] = useState<DraftArticle | null>(null);
  const [saving, setSaving] = useState(false);

  async function discoverTopics() {
    setStage("discovering");
    setError(null);
    setSuccess(null);
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
          wordLimit,
          keywordDensity,
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

  async function approveAndSave(publish: boolean) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const slug = (draft.slug || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 80);
      const { error: insErr } = await supabase.from("blog_posts").insert({
        title: draft.title,
        slug,
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
      setSuccess(`Article ${publish ? "published" : "saved as draft"} successfully.`);
      setStage("idle");
      setDraft(null);
      setActiveTopic(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  const diffColor = (d: string) =>
    d === "Low" ? "bg-green-100 text-green-700" :
    d === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-2.5">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Content Studio</h1>
            <p className="text-sm text-muted-foreground">Research trending Indian finance topics & generate SEO-optimised articles</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
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
              AI scans trending searches across Stocks, Mutual Funds, Real Estate, Personal Finance, Tax, IPO & Crypto — India-focused only.
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

      {/* Topics list */}
      {topics.length > 0 && (
        <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-foreground">{topics.length} Trending Topics</h3>
            </div>
            <button onClick={discoverTopics} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="divide-y divide-border">
            {topics.map((t, i) => (
              <div key={i} className="p-5 hover:bg-muted/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">{t.category}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${diffColor(t.difficulty)}`}>{t.difficulty}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{t.intent}</span>
                    </div>
                    <h4 className="font-bold text-foreground text-base leading-snug mb-1">{t.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Tag className="h-3 w-3" /> {t.primary_keyword}
                    </div>
                    <p className="text-xs text-muted-foreground italic">{t.rationale}</p>
                  </div>
                  <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2 md:w-48 shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground number-font">{t.search_volume.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">est. searches/mo</div>
                    </div>
                    <button
                      onClick={() => openWriter(t)}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:shadow-lg transition-all"
                    >
                      <PenTool className="h-3.5 w-3.5" /> Write with AI
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Modal */}
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
            <input
              type="range" min={500} max={4000} step={100}
              value={wordLimit}
              onChange={e => setWordLimit(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>500</span><span>4000 words</span>
            </div>
          </label>

          <label className="block mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Keyword Density</span>
              <span className="text-sm font-bold text-primary number-font">{keywordDensity.toFixed(1)}%</span>
            </div>
            <input
              type="range" min={0.5} max={4} step={0.1}
              value={keywordDensity}
              onChange={e => setKeywordDensity(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0.5% (subtle)</span><span>4% (aggressive)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Recommended: 1-2% for natural SEO. Primary keyword will appear ~{Math.round((wordLimit*keywordDensity)/100)} times.</p>
          </label>

          <div className="flex gap-2">
            <button onClick={() => setStage("idle")} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={generateArticle}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg"
            >
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
            <p className="text-sm text-muted-foreground">Researching, structuring, optimising for SEO. This may take 30-60 seconds.</p>
          </div>
        </Modal>
      )}

      {/* Review modal */}
      {stage === "review" && draft && (
        <Modal onClose={() => setStage("idle")} title="Review Generated Article" wide>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Words" value={draft.word_count.toString()} />
            <Stat label="Keyword Hits" value={draft.keyword_occurrences.toString()} />
            <Stat label="Actual Density" value={`${draft.actual_density}%`} />
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

          <div className="border border-border rounded-lg max-h-[50vh] overflow-y-auto p-4 mb-4 bg-white">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: draft.html_content }} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setStage("config")} className="px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted">
              <Eye className="h-4 w-4 inline mr-1" /> Regenerate
            </button>
            <button
              onClick={() => approveAndSave(false)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Approve & Save Draft
            </button>
            <button
              onClick={() => approveAndSave(true)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve & Publish
            </button>
          </div>
        </Modal>
      )}

      {topics.length === 0 && stage === "idle" && (
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
