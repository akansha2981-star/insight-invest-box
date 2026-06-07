import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Sparkles, Copy, ExternalLink, FileCode2, CheckCircle2, Globe2, Clock, ListTree, Plus } from "lucide-react";

type Stats = {
  total_urls: number;
  last_generated_at: string | null;
  last_updated_at: string | null;
  last_added_count: number;
  base_url: string;
  source_breakdown: Record<string, number>;
  recent: Array<{ url: string; path: string; source: string; lastmod: string; first_seen: string }>;
  public_sitemap_url: string;
};

const SOURCE_LABEL: Record<string, string> = {
  static: "Static Pages",
  blog: "Blog Articles",
  stock_review: "Stock Reviews",
  property: "Properties",
  re_city: "Real Estate Cities",
};

function formatDate(s: string | null | undefined) {
  if (!s) return "Never";
  try { return new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); } catch { return s; }
}

export function AdminSitemapManager() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewXml, setPreviewXml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://www.investingiq.in");

  async function invoke(action: string, extra: any = {}) {
    const { data, error } = await supabase.functions.invoke("sitemap-manager", {
      body: { action, ...extra },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  }

  async function loadStats() {
    setLoading(true);
    try {
      const data = await invoke("stats");
      setStats(data);
      if (data?.base_url) setBaseUrl(data.base_url);
    } catch (e: any) {
      toast.error(e.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStats(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await invoke("generate", { base_url: baseUrl });
      toast.success(`Sitemap generated: ${data.total_urls} URLs (${data.added} new, ${data.deactivated} removed)`);
      await loadStats();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const data = await invoke("refresh", { base_url: baseUrl });
      if (data.added > 0) {
        toast.success(`${data.added} new URL${data.added === 1 ? "" : "s"} added to sitemap`);
      } else {
        toast.info("No new URLs found. Sitemap is up to date.");
      }
      await loadStats();
    } catch (e: any) {
      toast.error(e.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const data = await invoke("preview-xml");
      setPreviewXml(data.xml || "");
    } catch (e: any) {
      toast.error(e.message || "Preview failed");
    } finally {
      setLoadingPreview(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  const sitemapUrl = stats?.public_sitemap_url || "";
  const gscUrl = sitemapUrl ? `https://search.google.com/search-console/sitemaps?resource_id=${encodeURIComponent(baseUrl)}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListTree className="h-6 w-6 text-primary" />
            Sitemap Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-generate and maintain your XML sitemap. Google-compliant. Excludes admin, login, and private pages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing || generating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Sitemap
          </Button>
          <Button onClick={handleGenerate} disabled={generating || refreshing}>
            <Sparkles className={`h-4 w-4 mr-2 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Generating…" : "Generate Sitemap"}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Globe2 className="h-3.5 w-3.5" /> Total URLs</div>
          <div className="text-3xl font-bold mt-1">{loading ? "…" : (stats?.total_urls ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Plus className="h-3.5 w-3.5" /> Newly Added (last run)</div>
          <div className="text-3xl font-bold mt-1 text-emerald-600">{loading ? "…" : (stats?.last_added_count ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Last Generated</div>
          <div className="text-sm font-semibold mt-2">{formatDate(stats?.last_generated_at)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Last Updated</div>
          <div className="text-sm font-semibold mt-2">{formatDate(stats?.last_updated_at)}</div>
        </Card>
      </div>

      {/* Source breakdown */}
      {stats && Object.keys(stats.source_breakdown || {}).length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">URLs by Source</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.source_breakdown).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-sm py-1.5 px-3">
                {SOURCE_LABEL[k] || k}: <span className="ml-1.5 font-bold">{v}</span>
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Public URL + submit to Google */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Globe2 className="h-4 w-4" /> Public Sitemap URL</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Site base URL (used inside the sitemap)</label>
            <div className="flex gap-2 mt-1">
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://www.investingiq.in" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Live XML endpoint (submit this to Google Search Console)</label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={sitemapUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(sitemapUrl, "Sitemap URL")}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" asChild>
                <a href={sitemapUrl} target="_blank" rel="noopener noreferrer" title="Open sitemap"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Submit this URL once to Google Search Console. The file is regenerated from your database on every "Generate Sitemap" run and goes live with the next deploy/publish of the site.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Open Google Search Console
              </a>
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={loadingPreview}>
              <FileCode2 className="h-4 w-4 mr-2" /> {loadingPreview ? "Loading…" : "Preview XML"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Recently added */}
      {stats?.recent && stats.recent.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Recently Added URLs</h3>
          <div className="space-y-1.5 max-h-80 overflow-auto">
            {stats.recent.map((r) => (
              <div key={r.url} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b last:border-0">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1 font-mono text-xs">{r.path}</a>
                <Badge variant="outline" className="text-xs">{SOURCE_LABEL[r.source] || r.source}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.first_seen)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* XML preview */}
      {previewXml !== null && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">XML Preview</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(previewXml, "XML")}><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</Button>
              <Button variant="ghost" size="sm" onClick={() => setPreviewXml(null)}>Close</Button>
            </div>
          </div>
          <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-96 font-mono">{previewXml}</pre>
        </Card>
      )}
    </div>
  );
}
