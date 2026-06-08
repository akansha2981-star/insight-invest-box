import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Sparkles, AlertTriangle, CheckCircle, Clock, Undo2, Activity, FileText, LineChart, Home, Database } from "lucide-react";

interface ScanData {
  now: string;
  counts: {
    total_blogs: number; stale_blogs: number;
    total_reviews: number; stale_reviews: number;
    total_properties: number; stale_properties: number;
  };
  stale_samples: { blogs: any[]; reviews: any[]; properties: any[] };
}

interface LogRow {
  id: string; started_at: string; status: string;
  pages_refreshed: number; items_updated: number; items_archived: number; items_created: number;
  summary: any; actions: any[]; rolled_back_at: string | null;
}

export function AdminSmartRefresh() {
  const [scan, setScan] = useState<ScanData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { runScan(); fetchLogs(); }, []);

  async function fetchLogs() {
    const { data } = await supabase.from("refresh_logs").select("*").order("started_at", { ascending: false }).limit(15);
    setLogs((data as any) ?? []);
  }

  async function runScan() {
    setScanning(true); setError(null);
    const { data, error } = await supabase.functions.invoke("smart-refresh", { body: { action: "scan" } });
    setScanning(false);
    if (error || data?.error) { setError(error?.message ?? data?.error); return; }
    setScan(data);
  }

  async function runRefresh() {
    if (!confirm("Run Smart Refresh now? This will update timestamps on stale content, archive ancient drafts, and publish a fresh AI market summary.")) return;
    setRefreshing(true); setError(null);
    const { data, error } = await supabase.functions.invoke("smart-refresh", { body: { action: "refresh" } });
    setRefreshing(false);
    if (error || data?.error) { setError(error?.message ?? data?.error); return; }
    setLastResult(data);
    await Promise.all([runScan(), fetchLogs()]);
  }

  async function rollback(logId: string) {
    if (!confirm("Rollback this refresh run? Previously snapshotted blog posts will be restored.")) return;
    const { data, error } = await supabase.functions.invoke("smart-refresh", { body: { action: "rollback", log_id: logId } });
    if (error || data?.error) { alert(error?.message ?? data?.error); return; }
    alert(`Rolled back. Restored ${data.restored ?? 0} items.`);
    fetchLogs();
  }

  const c = scan?.counts;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Smart Refresh & Auto Update
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            One-click refresh of dynamic content, AI market summary publishing, stale-content cleanup, and rollback.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={runScan} disabled={scanning}
            className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> Rescan
          </button>
          <button onClick={runRefresh} disabled={refreshing}
            className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-card">
            <Sparkles className={`h-4 w-4 ${refreshing ? "animate-pulse" : ""}`} />
            {refreshing ? "Refreshing…" : "Run Smart Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Blogs", value: c?.total_blogs ?? "—", stale: c?.stale_blogs, icon: FileText },
          { label: "Stock Reviews", value: c?.total_reviews ?? "—", stale: c?.stale_reviews, icon: LineChart },
          { label: "Properties", value: c?.total_properties ?? "—", stale: c?.stale_properties, icon: Home },
          { label: "Last Scan", value: scan ? new Date(scan.now).toLocaleTimeString() : "—", stale: undefined, icon: Activity },
        ].map(s => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-5 shadow-card">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground number-font">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
            {s.stale !== undefined && (
              <div className={`text-[11px] mt-1 font-semibold ${s.stale ? "text-amber-600" : "text-gain"}`}>
                {s.stale} stale (&gt;30d)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* What it does */}
      <div className="bg-gradient-to-br from-primary/5 to-purple-50 border border-primary/20 rounded-xl p-5">
        <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><Database className="h-4 w-4" /> What Smart Refresh does</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
          {[
            "Detects content >30 days old across blogs, stock reviews, properties",
            "Refreshes updated_at timestamps to signal freshness to search engines",
            "Auto-publishes a fresh AI-generated daily market summary blog post",
            "Archives drafts that have been untouched for >180 days",
            "Writes a rollback snapshot so every change can be undone",
            "Logs every action with counts and timestamps for audit",
          ].map(x => (
            <li key={x} className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-gain shrink-0 mt-0.5" />{x}</li>
          ))}
        </ul>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="bg-white border border-border rounded-xl p-5 shadow-card">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gain" /> Last refresh summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              ["Pages refreshed", lastResult.summary?.pages_refreshed],
              ["Items updated", lastResult.summary?.items_updated],
              ["Items archived", lastResult.summary?.items_archived],
              ["New AI articles", lastResult.summary?.items_created],
            ].map(([l, v]) => (
              <div key={l as string}><div className="text-2xl font-bold number-font">{v ?? 0}</div><div className="text-xs text-muted-foreground">{l}</div></div>
            ))}
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-semibold">Action log ({lastResult.actions?.length ?? 0})</summary>
            <pre className="mt-2 bg-muted/30 rounded-lg p-3 overflow-auto text-[11px]">{JSON.stringify(lastResult.actions, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* History */}
      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Refresh history</h2>
          <span className="text-xs text-muted-foreground">{logs.length} runs</span>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No refresh runs yet</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {new Date(log.started_at).toLocaleString("en-IN")}
                      {log.rolled_back_at && <span className="ml-2 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">ROLLED BACK</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.pages_refreshed} refreshed · {log.items_updated} updated · {log.items_archived} archived · {log.items_created} created
                    </div>
                  </div>
                </div>
                {!log.rolled_back_at && (
                  <button onClick={() => rollback(log.id)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-loss border border-border rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors shrink-0">
                    <Undo2 className="h-3.5 w-3.5" /> Rollback
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
