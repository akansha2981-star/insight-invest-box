import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Globe, Database } from "lucide-react";

interface ForexLog {
  id: string; started_at: string; completed_at: string | null;
  status: string; source: string | null; trigger_type: string;
  rates_updated: number; history_rows: number; error: string | null;
}
interface Rate { code: string; rate_usd: number; updated_at: string; source: string; }

export function AdminForexMonitor() {
  const [logs, setLogs] = useState<ForexLog[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [{ data: logsRes }, { data: ratesRes }] = await Promise.all([
      supabase.functions.invoke("forex-rates", { body: { action: "logs" } }),
      supabase.functions.invoke("forex-rates", { body: { action: "rates" } }),
    ]);
    setLogs(logsRes?.logs ?? []);
    setRates(ratesRes?.rates ?? []);
  }
  useEffect(() => { load(); }, []);

  async function refresh() {
    setLoading(true); setError(null);
    const { data, error } = await supabase.functions.invoke("forex-rates", { body: { action: "refresh" } });
    setLoading(false);
    if (error || data?.error) { setError(error?.message ?? data?.error); return; }
    load();
  }

  const last = logs[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Globe className="h-6 w-6 text-primary" /> Forex Rates Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily auto-refresh at midnight IST. Source: Frankfurter (ECB) + global forex fallbacks.</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-card">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Refreshing…" : "Refresh now"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Currencies tracked" value={rates.length} icon={Database} />
        <Stat label="Last status" value={last?.status ?? "—"} icon={CheckCircle} />
        <Stat label="Last source" value={last?.source ?? "—"} icon={Globe} />
        <Stat label="Last run" value={last ? new Date(last.started_at).toLocaleString("en-IN") : "—"} icon={Clock} />
      </div>

      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">Latest rates (per 1 USD)</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-5 py-2.5">Code</th><th className="text-left px-5 py-2.5">Rate (per USD)</th><th className="text-left px-5 py-2.5">Source</th><th className="text-left px-5 py-2.5">Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map(r => (
                <tr key={r.code} className="hover:bg-muted/20">
                  <td className="px-5 py-2 font-bold">{r.code}</td>
                  <td className="px-5 py-2 number-font">{Number(r.rate_usd).toFixed(4)}</td>
                  <td className="px-5 py-2 text-xs text-muted-foreground">{r.source}</td>
                  <td className="px-5 py-2 text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-bold">Refresh log</h2></div>
        {logs.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm">No runs yet</div> : (
          <div className="divide-y divide-border">
            {logs.map(l => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {l.status === "success" ? <CheckCircle className="h-4 w-4 text-gain" /> : l.status === "error" ? <AlertTriangle className="h-4 w-4 text-loss" /> : <Clock className="h-4 w-4 text-amber-600" />}
                    {new Date(l.started_at).toLocaleString("en-IN")} · {l.trigger_type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {l.source} · {l.rates_updated} rates · {l.history_rows} history rows{l.error ? ` · ${l.error}` : ""}
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${l.status === "success" ? "badge-gain" : l.status === "error" ? "bg-red-50 text-red-700 border border-red-200" : "badge-neutral"}`}>{l.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-card">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3"><Icon className="h-5 w-5 text-primary" /></div>
      <div className="text-xl font-bold text-foreground number-font break-all">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 font-medium">{label}</div>
    </div>
  );
}
