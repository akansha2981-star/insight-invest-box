import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Sparkles, Newspaper, RefreshCw, Loader2, Search, CheckCircle2, X, Download } from "lucide-react";

export default function AdminMutualFunds() {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [discoverCount, setDiscoverCount] = useState(10);
  const [discoverCategory, setDiscoverCategory] = useState("");
  const [discoverTheme, setDiscoverTheme] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [discovering, setDiscovering] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async () => { const { data } = await supabase.from("mf_funds").select("*").order("scheme_name"); setFunds(data ?? []); };
  useEffect(() => { load(); }, []);

  const log = (m: string) => setLogs(l => [`${new Date().toLocaleTimeString()} · ${m}`, ...l].slice(0, 30));

  const invoke = async (label: string, action: string, body: any = {}) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("mf-engine", { body: { action, ...body } });
      if (error) throw error;
      log(`${label}: ${JSON.stringify(data?.result || data)}`);
      toast.success(`${label} complete`);
      await load();
    } catch (e: any) {
      toast.error(`${label} failed: ${e.message}`);
      log(`${label} FAILED: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Mutual Funds & ETFs Admin</h2>
        <p className="text-sm text-muted-foreground">Refresh NAVs from AMFI, generate AI analysis, and create MF news.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <button onClick={() => invoke("Refresh NAVs", "refresh-nav")} disabled={!!loading} className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl text-left disabled:opacity-50">
          {loading === "refresh-nav" ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          <div className="font-bold mt-2">Refresh NAV Data</div>
          <div className="text-xs opacity-90">Fetch latest NAVs from AMFI feed</div>
        </button>
        <button onClick={() => invoke("Generate MF News", "generate-news")} disabled={!!loading} className="bg-violet-600 hover:bg-violet-700 text-white p-4 rounded-xl text-left disabled:opacity-50">
          {loading === "generate-news" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Newspaper className="h-5 w-5" />}
          <div className="font-bold mt-2">Generate News</div>
          <div className="text-xs opacity-90">AI-generated daily MF news (3 articles)</div>
        </button>
        <div className="bg-card border border-border p-4 rounded-xl">
          <Database className="h-5 w-5 text-primary" />
          <div className="font-bold mt-2">{funds.length} funds tracked</div>
          <div className="text-xs text-muted-foreground">Use AI Analyze per fund below</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase"><tr><th className="text-left p-3">Fund</th><th className="text-right p-3">NAV</th><th className="text-right p-3">1Y</th><th className="text-right p-3">AI Status</th><th className="text-right p-3">Actions</th></tr></thead>
          <tbody>
            {funds.map(f => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3"><div className="font-semibold">{f.scheme_name}</div><div className="text-xs text-muted-foreground">{f.fund_house}</div></td>
                <td className="p-3 text-right">₹{Number(f.nav).toFixed(2)}</td>
                <td className="p-3 text-right">{Number(f.return_1y).toFixed(2)}%</td>
                <td className="p-3 text-right text-xs">{f.ai_summary ? <span className="text-emerald-600">Generated</span> : <span className="text-muted-foreground">Pending</span>}</td>
                <td className="p-3 text-right">
                  <button onClick={() => invoke(`AI Analyze ${f.scheme_name}`, "ai-analyze", { fundId: f.id })} disabled={!!loading} className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50">
                    {loading === "ai-analyze" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length > 0 && (
        <div className="bg-black text-emerald-300 rounded-xl p-4 font-mono text-xs space-y-1 max-h-60 overflow-y-auto">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
