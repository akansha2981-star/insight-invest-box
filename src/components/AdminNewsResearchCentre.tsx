import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminNewsEngine } from "@/components/AdminNewsEngine";
import { AdminAutomationPanel } from "@/components/AdminAutomationPanel";
import { LiveArticleStudio } from "@/components/LiveArticleStudio";
import { AdminAIContentStudio } from "@/components/AdminAIContentStudio";
import { AdminSitemapManager } from "@/components/AdminSitemapManager";
import { AdminRealEstate } from "@/components/AdminRealEstate";
import { AlertCircle, ArrowUpRight, Building2, CheckCircle2, Copy, Download, ExternalLink, FileText, FlaskConical, ListTree, Loader2, Newspaper, Radio, RefreshCw, Search, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { articleWords, canonicalArticleUrl, inReportRange, istDate, publicationTrend, reportCsv, reportRange, type ReportPeriod } from "@/lib/newsResearchReports";

type NewsRun = { id: string; started_at: string; completed_at: string | null; status: string; discovered: number; generated: number; failed: number; trigger_type: string; error: string | null };
type NewsDraft = { id: string; run_id: string | null; topic: string; headline: string; category: string; slug: string; status: string; created_at: string; published_at: string | null; content: string | null; meta_title: string | null; meta_description: string | null; seo_score: number; source_summary: unknown; internal_links: unknown; blog_post_id: string | null; trending: boolean };
type PublishedPost = { id: string; title: string; slug: string; content: string; status: string | null; published_at: string | null; meta_title: string | null; meta_description: string | null; category: string | null };
type PropertyRecord = { id: string; title: string; slug: string; city: string; developer_name: string | null; rera_status: string | null; rera_id: string | null; source_urls: string[] | null; status: string | null; created_at: string; updated_at: string };
type ReportData = { runs: NewsRun[]; drafts: NewsDraft[]; posts: PublishedPost[]; properties: PropertyRecord[] };
const EMPTY: ReportData = { runs: [], drafts: [], posts: [], properties: [] };
const PERIODS: { value: ReportPeriod; label: string }[] = [{ value: "today", label: "Today" }, { value: "yesterday", label: "Yesterday" }, { value: "7days", label: "Last 7 Days" }, { value: "30days", label: "Last 30 Days" }, { value: "custom", label: "Custom Range" }];

async function readAll<T>(table: "news_runs" | "news_drafts" | "blog_posts" | "properties", fields: string, order: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select(fields).order(order, { ascending: false }).order("id").range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST" : "Not recorded";
}

function statusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  return status === "published" || status === "completed" ? "default" : status === "failed" || status === "rejected" ? "destructive" : "secondary";
}

async function copy(text: string, label: string) {
  if (!text.trim()) { toast.info(`No ${label.toLowerCase()} available`); return; }
  try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
  catch { toast.error("Clipboard access was blocked by your browser"); }
}

function download(rows: (string | number | null | undefined)[][], name: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", reportCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-12 text-center text-sm text-muted-foreground border-y border-border"><FileText className="h-7 w-7 mx-auto mb-3 opacity-50" />{children}</div>;
}

export function AdminNewsResearchCentre() {
  const [access, setAccess] = useState<"checking" | "admin" | "denied">("checking");
  const [data, setData] = useState<ReportData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [custom, setCustom] = useState({ start: istDate(new Date()), end: istDate(new Date()) });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<NewsDraft | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [runs, drafts, posts, properties] = await Promise.all([
        readAll<NewsRun>("news_runs", "id,started_at,completed_at,status,discovered,generated,failed,trigger_type,error", "started_at"),
        readAll<NewsDraft>("news_drafts", "id,run_id,topic,headline,category,slug,status,created_at,published_at,content,meta_title,meta_description,seo_score,source_summary,internal_links,blog_post_id,trending", "created_at"),
        readAll<PublishedPost>("blog_posts", "id,title,slug,content,status,published_at,meta_title,meta_description,category", "created_at"),
        readAll<PropertyRecord>("properties", "id,title,slug,city,developer_name,rera_status,rera_id,source_urls,status,created_at,updated_at", "created_at"),
      ]);
      setData({ runs, drafts, posts, properties }); setUpdated(new Date().toISOString());
    } catch (e) { setError(e instanceof Error ? e.message : "The daily report could not be loaded"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { if (active) { setAccess("denied"); setLoading(false); } return; }
      const { data: admin, error: roleError } = await supabase.rpc("has_role", { _user_id: session.session.user.id, _role: "admin" });
      if (active) { setAccess(admin === true && !roleError ? "admin" : "denied"); if (admin === true && !roleError) void load(); else setLoading(false); }
    };
    void verify();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) { setData(EMPTY); setAccess("denied"); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (access !== "admin") return;
    const interval = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    return () => clearInterval(interval);
  }, [access]);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [period, custom.start, custom.end, search, category]);
  const range = reportRange(period, new Date(), custom);
  const invalidRange = range.start > range.end;
  const runs = data.runs.filter(r => inReportRange(r.started_at, range));
  const drafts = data.drafts.filter(d => inReportRange(d.created_at, range));
  const posts = data.posts.filter(p => p.status === "published" && inReportRange(p.published_at, range));
  const postById = new Map(data.posts.map(p => [p.id, p]));
  const generatedPosts = data.drafts.filter(d => d.blog_post_id && postById.get(d.blog_post_id)?.status === "published" && inReportRange(postById.get(d.blog_post_id)?.published_at, range));
  const properties = data.properties.filter(p => inReportRange(p.created_at, range));
  const trend = useMemo(() => publicationTrend(data.posts.filter(p => p.status === "published" && p.published_at).map(p => p.published_at ?? ""), range), [data.posts, range.start, range.end]);
  const maxTrend = Math.max(1, ...trend.map(p => p.published));
  const barHeights = ["h-0.5", "h-3", "h-6", "h-9", "h-12", "h-14", "h-16", "h-20", "h-24", "h-28"];
  const filtered = generatedPosts.filter(d => (category === "all" || d.category === category) && `${d.headline} ${d.category}`.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(data.drafts.map(d => d.category))].sort();
  const currentRows = filtered.slice((page - 1) * 20, page * 20);
  const currentUrls = filtered.flatMap(d => { const p = d.blog_post_id ? postById.get(d.blog_post_id) : undefined; return p ? [canonicalArticleUrl(p.slug)] : []; });
  const failed = runs.filter(r => r.status === "failed" || r.error || r.failed > 0);
  const exportRows = (records: NewsDraft[]) => [["Headline", "Category", "Published at (IST)", "Word count", "Legacy SEO score", "Canonical URL"], ...records.map(d => { const p = d.blog_post_id ? postById.get(d.blog_post_id) : undefined; return [p?.title ?? d.headline, d.category, timestamp(p?.published_at ?? null), articleWords(p?.content), d.seo_score, p ? canonicalArticleUrl(p.slug) : ""]; })];

  if (access === "checking") return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Checking admin access…</div>;
  if (access === "denied") return <div className="p-8 space-y-3"><ShieldCheck className="text-primary h-8 w-8" /><h1 className="text-xl font-bold">Administrator access required</h1><p className="text-muted-foreground text-sm">This section is available only to administrators.</p></div>;

  return <section className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6 min-w-0">
    <header className="flex flex-wrap justify-between items-start gap-4 border-b border-border pb-5">
      <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2"><FlaskConical className="h-4 w-4" />EDITORIAL OPERATIONS <Badge variant="outline">Admin only</Badge></div><h1 className="text-xl sm:text-2xl font-bold">AI News & Research Centre</h1><p className="text-sm text-muted-foreground mt-2">InvestingIQ editorial desk · {updated ? `Updated ${timestamp(updated)}` : "Daily intelligence"}</p></div>
      <Button variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh report</Button>
    </header>
    {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error} · Figures below may reflect the last successful refresh.</span></div>}
    <Tabs defaultValue="live" className="min-w-0">
      <div className="overflow-x-auto pb-2"><TabsList className="h-auto justify-start gap-1 bg-transparent border-b border-border rounded-none p-0 pb-2">
        <TabsTrigger value="live"><Radio className="h-4 w-4 mr-2" />Live Article Studio</TabsTrigger>
        <TabsTrigger value="intelligence"><FileText className="h-4 w-4 mr-2" />AI Daily Intelligence</TabsTrigger>
        <TabsTrigger value="news"><Newspaper className="h-4 w-4 mr-2" />News Desk</TabsTrigger>
        <TabsTrigger value="studio"><Sparkles className="h-4 w-4 mr-2" />Content Studio</TabsTrigger>
        <TabsTrigger value="estate"><Building2 className="h-4 w-4 mr-2" />Real Estate</TabsTrigger>
        <TabsTrigger value="sitemap"><ListTree className="h-4 w-4 mr-2" />Sitemap</TabsTrigger>
        <TabsTrigger value="settings"><Settings2 className="h-4 w-4 mr-2" />Automation & Connections</TabsTrigger>
      </TabsList></div>

      <TabsContent value="live" className="mt-5"><LiveArticleStudio /></TabsContent>

      <TabsContent value="intelligence" className="space-y-6 mt-5">
        <div className="flex flex-wrap items-end gap-3">
          <div><Label htmlFor="research-period" className="text-xs">Report period · IST</Label><select id="research-period" value={period} onChange={e => setPeriod(e.target.value as ReportPeriod)} className="mt-1 h-10 w-full border border-input rounded-md bg-card text-sm px-3">{PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
          {period === "custom" && <><div><Label htmlFor="research-start" className="text-xs">From</Label><Input id="research-start" type="date" value={custom.start} onChange={e => setCustom({ ...custom, start: e.target.value })} /></div><div><Label htmlFor="research-end" className="text-xs">To</Label><Input id="research-end" type="date" value={custom.end} onChange={e => setCustom({ ...custom, end: e.target.value })} /></div></>}
          <span className="text-xs text-muted-foreground pb-3">{range.start} — {range.end}</span>
          <Button className="sm:ml-auto" variant="outline" disabled={loading || invalidRange} onClick={() => download([["Metric", "Value", "From", "To"], ["Topics discovered (stored run totals)", runs.reduce((n, r) => n + r.discovered, 0), range.start, range.end], ["Drafts created", drafts.length, range.start, range.end], ["News Engine articles published", generatedPosts.length, range.start, range.end], ["All articles published", posts.length, range.start, range.end], ["Article words published", posts.reduce((n, p) => n + articleWords(p.content), 0), range.start, range.end], ["Failed runs", failed.length, range.start, range.end]], `daily-intelligence-${range.start}-${range.end}.csv`)}><Download />Daily report</Button>
        </div>
        {invalidRange && <p role="alert" className="text-sm text-destructive">The end date must be on or after the start date.</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Topics discovered", value: runs.reduce((n, r) => n + r.discovered, 0), detail: "Stored News Engine run totals", icon: Search },
            { label: "Trending drafts", value: drafts.filter(d => d.trending).length, detail: "AI-shortlisted · not measured trends", icon: Sparkles },
            { label: "Articles generated", value: drafts.length, detail: "News Engine drafts created", icon: FileText },
            { label: "AI articles published", value: generatedPosts.length, detail: "Confirmed published article records", icon: CheckCircle2 },
            { label: "Awaiting review", value: drafts.filter(d => ["pending", "approved"].includes(d.status)).length, detail: "Pending and approved drafts", icon: ShieldCheck },
            { label: "Rejected drafts", value: drafts.filter(d => d.status === "rejected").length, detail: "Rejection reasons not recorded", icon: AlertCircle },
            { label: "Real estate records added", value: properties.length, detail: "Existing property catalogue", icon: Building2 },
            { label: "Published word count", value: posts.reduce((n, p) => n + articleWords(p.content), 0), detail: `${posts.length} articles · all publishing tools`, icon: FileText },
          ].map(stat => <div key={stat.label} className="border border-border rounded-md bg-card p-3 sm:p-4"><div className="flex items-start gap-2 text-xs text-muted-foreground"><stat.icon className="h-4 w-4 shrink-0 text-primary" /><span>{stat.label}</span></div><div className="text-2xl font-bold my-2 tabular-nums">{loading && !updated ? "—" : stat.value.toLocaleString("en-IN")}</div><p className="text-[11px] text-muted-foreground">{stat.detail}</p></div>)}
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 py-4 border-y border-border text-sm"><span>Research verification: <b className="font-semibold">Not yet connected</b></span><span>Unattended publishing: <b className="font-semibold">Automatic after checks</b></span><span>Search Console: <b className="font-semibold">Connected · site verification pending publish</b></span></div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 className="text-base font-semibold">Publication trend</h2><span className="text-xs text-muted-foreground">All published articles · cumulative total {trend.at(-1)?.cumulative ?? 0}</span></div>
          {!posts.length ? <Empty>No articles were published during this period.</Empty> : <div className="overflow-x-auto"><div className="flex items-end gap-2 h-44 border-b border-border pb-2 min-w-fit">{trend.map(point => <div key={point.date} className="flex flex-col items-center justify-end h-full min-w-10 flex-1 gap-1"><span className="text-[10px] tabular-nums">{point.published}</span><div className={`w-6 rounded-t-sm ${point.published ? "bg-primary" : "bg-muted"} ${barHeights[Math.round(point.published / maxTrend * 9)]}`} title={`${point.date}: ${point.published} published · ${point.cumulative} cumulative`} data-count={point.published} /><span className="text-[9px] text-muted-foreground whitespace-nowrap">{point.date.slice(5)}</span></div>)}</div></div>}
        </div>
        <Tabs defaultValue="articles">
          <div className="overflow-x-auto"><TabsList className="justify-start"><TabsTrigger value="articles">Published Articles</TabsTrigger><TabsTrigger value="topics">Topics & Sources</TabsTrigger><TabsTrigger value="projects">Real Estate Intelligence</TabsTrigger><TabsTrigger value="errors">Research & Errors</TabsTrigger><TabsTrigger value="performance">SEO Performance</TabsTrigger></TabsList></div>
          <TabsContent value="articles" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2"><div className="relative flex-1 min-w-40"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search published articles" placeholder="Search published articles" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div><select aria-label="Article category" className="h-10 border border-input rounded-md bg-card px-3 text-sm max-w-full" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!currentUrls.length} onClick={() => void copy(currentUrls.join("\n"), "URLs")}><Copy />Copy filtered URLs</Button><Button variant="outline" size="sm" disabled={!selected.size} onClick={() => void copy(filtered.filter(d => selected.has(d.id)).flatMap(d => { const p = d.blog_post_id ? postById.get(d.blog_post_id) : undefined; return p ? [canonicalArticleUrl(p.slug)] : []; }).join("\n"), "Selected URLs")}><Copy />Copy selected ({selected.size})</Button><Button variant="outline" size="sm" disabled={!filtered.length} onClick={() => download(exportRows(filtered), `published-urls-${range.start}.csv`)}><Download />Export URLs</Button><Button variant="ghost" size="sm" onClick={() => { const today = reportRange("today"); const urls = data.posts.filter(p => p.status === "published" && inReportRange(p.published_at, today)).map(p => canonicalArticleUrl(p.slug)); void copy(urls.join("\n"), "Today's URLs"); }}><Copy />Copy all URLs published today</Button></div>
            <p className="text-xs text-muted-foreground">News Engine publications only in the table. Today’s URL list includes all article tools. Copying does not submit or index a URL.</p>
            {!filtered.length ? <Empty>No News Engine articles were published in this period.</Empty> : <>
              <div className="max-w-full overflow-x-auto border-y border-border"><table className="w-full text-sm"><thead><tr className="bg-muted/40 text-xs text-muted-foreground"><th className="p-3"><Checkbox aria-label="Select displayed articles" checked={currentRows.length > 0 && currentRows.every(d => selected.has(d.id))} onCheckedChange={checked => setSelected(prev => { const next = new Set(prev); currentRows.forEach(d => checked ? next.add(d.id) : next.delete(d.id)); return next; })} /></th>{["Article", "Published · IST", "Words", "SEO*", "Actions"].map(h => <th key={h} className="p-3 text-left whitespace-nowrap font-medium">{h}</th>)}</tr></thead><tbody>{currentRows.map(d => { const p = d.blog_post_id ? postById.get(d.blog_post_id) : undefined; return <tr key={d.id} className="border-t border-border"><td className="p-3"><Checkbox aria-label={`Select ${d.headline}`} checked={selected.has(d.id)} onCheckedChange={checked => setSelected(prev => { const next = new Set(prev); if (checked) next.add(d.id); else next.delete(d.id); return next; })} /></td><td className="p-3 min-w-56 max-w-md"><div className="font-medium">{p?.title ?? d.headline}</div><div className="text-xs text-muted-foreground mt-1">{d.category} · <span className="text-gain">Published</span></div>{p && <a href={canonicalArticleUrl(p.slug)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary break-all">{canonicalArticleUrl(p.slug)}</a>}</td><td className="p-3 whitespace-nowrap text-xs">{timestamp(p?.published_at ?? null)}</td><td className="p-3 tabular-nums">{articleWords(p?.content)}</td><td className="p-3 tabular-nums">{d.seo_score}</td><td className="p-3"><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Preview ${d.headline}`} title="Preview article" onClick={() => setPreview(d)}><FileText /></Button><Button variant="ghost" size="icon" aria-label={`Copy URL for ${d.headline}`} title="Copy canonical URL" disabled={!p} onClick={() => p && void copy(canonicalArticleUrl(p.slug), "URL")}><Copy /></Button>{p && <Button asChild variant="ghost" size="icon" title="Open published article"><a aria-label={`Open ${d.headline}`} href={canonicalArticleUrl(p.slug)} target="_blank" rel="noopener noreferrer"><ArrowUpRight /></a></Button>}</div></td></tr>; })}</tbody></table></div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{filtered.length} articles · Page {page} of {Math.max(1, Math.ceil(filtered.length / 20))}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page * 20 >= filtered.length} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
            </>}
            <p className="text-xs text-muted-foreground">*Stored legacy SEO score is a formatting heuristic, not a fact-check or search ranking. Research scores are unavailable.</p>
          </TabsContent>
          <TabsContent value="topics" className="space-y-4 mt-4"><div className="bg-gold-light border border-border p-4 rounded-md text-sm flex gap-3"><AlertCircle className="h-4 w-4 text-gold shrink-0 mt-0.5" /><span>Existing source references are AI-suggested leads. The existing engine does not retrieve and independently verify source documents; these are not verified evidence.</span></div>{!drafts.length ? <Empty>No topics were stored in this period.</Empty> : drafts.slice(0, 100).map(d => <div key={d.id} className="py-4 border-b border-border"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium text-sm">{d.topic}</h3><Badge variant={statusVariant(d.status)}>{d.status}</Badge></div><p className="text-xs text-muted-foreground mt-1">{d.category} · {timestamp(d.created_at)} · {d.trending ? "AI-shortlisted" : "No trend evidence recorded"}</p><details className="mt-3 text-xs"><summary className="cursor-pointer text-primary">Stored source leads · unverified</summary><pre className="whitespace-pre-wrap break-words bg-muted/40 p-3 mt-2 rounded-md max-h-60 overflow-auto">{JSON.stringify(d.source_summary, null, 2) || "No source references stored"}</pre></details></div>)}{drafts.length > 100 && <p className="text-xs text-muted-foreground">Showing the latest 100 of {drafts.length} topics. Narrow the date range for earlier records.</p>}</TabsContent>
          <TabsContent value="projects" className="space-y-4 mt-4"><p className="text-xs text-muted-foreground">Existing catalogue records added during the period. A stored RERA status is not independent verification.</p>{!properties.length ? <Empty>No property records were added in this period.</Empty> : properties.map(p => <div key={p.id} className="py-4 border-b border-border"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold">{p.title}</h3><Badge variant="outline">Verification not recorded</Badge></div><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mt-3"><div><dt className="text-muted-foreground">City</dt><dd className="mt-1">{p.city}</dd></div><div><dt className="text-muted-foreground">Developer</dt><dd className="mt-1">{p.developer_name ?? "Not available"}</dd></div><div><dt className="text-muted-foreground">Reported RERA</dt><dd className="mt-1">{p.rera_status ?? "Not verified"} · {p.rera_id ?? "Not available"}</dd></div><div><dt className="text-muted-foreground">Record updated</dt><dd className="mt-1">{timestamp(p.updated_at)}</dd></div></dl><div className="flex flex-wrap gap-2 mt-3">{p.status === "active" && <Button variant="outline" size="sm" onClick={() => void copy(`https://www.investingiq.in/real-estate/${encodeURIComponent(p.slug)}`, "Project URL")}><Copy />Copy project URL</Button>}{p.source_urls?.filter(url => /^https:\/\//i.test(url)).map((url, i) => <Button key={`${url}-${i}`} asChild variant="ghost" size="sm"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink />Source {i + 1}</a></Button>)}</div></div>)}</TabsContent>
          <TabsContent value="errors" className="space-y-4 mt-4"><div className="flex flex-wrap gap-5 text-sm"><span>Failed / partial runs: <b>{failed.length}</b></span><span>Failed items: <b>{runs.reduce((n, r) => n + r.failed, 0)}</b></span><span>Retry history: <b>Not recorded</b></span></div>{!runs.length ? <Empty>No research runs in this period.</Empty> : <div className="space-y-3">{runs.map(r => <div key={r.id} className="border-b border-border py-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-medium">{timestamp(r.started_at)}</span><Badge variant={statusVariant(r.status)}>{r.status}</Badge></div><p className="text-xs text-muted-foreground mt-2">{r.trigger_type} · {r.discovered} discovered · {r.generated} generated · {r.failed} failed · Completed {timestamp(r.completed_at)}</p>{r.error && <p className="text-sm text-destructive mt-2 break-words">{r.error}</p>}</div>)}</div>}<p className="text-xs text-muted-foreground">Fact-check failures, provider costs and immutable publishing audit records are not recorded by the legacy engine.</p></TabsContent>
          <TabsContent value="performance" className="py-8 space-y-5"><h2 className="font-semibold">Google Search Console</h2><Badge variant="outline">Not connected</Badge><div className="grid grid-cols-2 md:grid-cols-4 gap-5">{["Impressions", "Clicks", "CTR", "Average position"].map(label => <div key={label} className="border-b border-border pb-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-2">—</p></div>)}</div><p className="text-sm text-muted-foreground">No Search Console performance data has been connected to this workspace. No indexing or ranking claims are made.</p><Button asChild variant="outline"><a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"><ExternalLink />Open Search Console</a></Button></TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="news"><AdminNewsEngine /></TabsContent>
      <TabsContent value="studio"><AdminAIContentStudio /></TabsContent>
      <TabsContent value="estate"><AdminRealEstate /></TabsContent>
      <TabsContent value="sitemap" className="pt-4"><AdminSitemapManager /></TabsContent>
      <TabsContent value="settings" className="space-y-6 mt-6">
        <AdminAutomationPanel />
      </TabsContent>
    </Tabs>
    <Dialog open={preview !== null} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle className="leading-snug pr-5">{preview?.headline}</DialogTitle></DialogHeader>{preview && <><p className="text-xs text-muted-foreground">{articleWords(preview.content)} words · {preview.category} · <Badge variant={statusVariant(preview.status)}>{preview.status}</Badge></p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void copy(preview.headline, "Headline")}><Copy />Headline</Button><Button variant="outline" size="sm" onClick={() => void copy(preview.meta_description ?? "", "Meta description")}><Copy />Meta description</Button><Button variant="outline" size="sm" onClick={() => { const doc = new DOMParser().parseFromString(preview.content ?? "", "text/html"); void copy(doc.body.textContent ?? "", "Article"); }}><Copy />Article</Button><Button variant="outline" size="sm" onClick={() => void copy(JSON.stringify(preview.source_summary, null, 2), "Source leads")}><Copy />Source leads</Button></div><div className="text-sm whitespace-pre-wrap leading-relaxed border-t border-border pt-4">{new DOMParser().parseFromString(preview.content ?? "", "text/html").body.textContent}</div></>}</DialogContent></Dialog>
  </section>;
}