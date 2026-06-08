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

  const discover = async () => {
    setDiscovering(true);
    setCandidates([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("mf-engine", {
        body: { action: "discover-funds", count: discoverCount, category: discoverCategory || undefined, theme: discoverTheme || undefined },
      });
      if (error) throw error;
      const list = data?.result?.candidates ?? [];
      setCandidates(list);
      setSelected(new Set(list.map((_: any, i: number) => i)));
      log(`Discovered ${list.length} fund candidates`);
      toast.success(`AI suggested ${list.length} funds — review & approve`);
    } catch (e: any) {
      toast.error(`Discover failed: ${e.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const approveImport = async () => {
    const picked = candidates.filter((_, i) => selected.has(i));
    if (!picked.length) { toast.error("Select at least one fund"); return; }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mf-engine", {
        body: { action: "import-funds", candidates: picked },
      });
      if (error) throw error;
      const r = data?.result;
      toast.success(`Imported ${r.imported}, failed ${r.failed}`);
      log(`Import: ${r.imported} ok, ${r.failed} failed`);
      setCandidates([]);
      setSelected(new Set());
      await load();
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const toggle = (i: number) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
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

      {/* AI Discovery */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 text-white rounded-xl p-5 border border-cyan-800/40">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-black">Discover New Funds with AI</h3>
        </div>
        <p className="text-xs text-slate-300 mb-4">AI suggests popular SEBI-registered funds not already in your database. Review, approve, and import — analysis runs automatically.</p>

        <div className="grid sm:grid-cols-4 gap-2 mb-3">
          <div>
            <label className="text-[10px] uppercase text-slate-400">Count</label>
            <input type="number" min={1} max={30} value={discoverCount} onChange={e => setDiscoverCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-slate-400">Category (optional)</label>
            <select value={discoverCategory} onChange={e => setDiscoverCategory(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
              <option value="">Any</option>
              <option>Equity</option><option>Debt</option><option>Hybrid</option><option>ELSS</option><option>Index</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase text-slate-400">Theme / strategy (optional)</label>
            <input value={discoverTheme} onChange={e => setDiscoverTheme(e.target.value)} placeholder="e.g. small cap, dividend yield, flexicap" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm" />
          </div>
        </div>

        <button onClick={discover} disabled={discovering || importing} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm px-4 py-2 rounded inline-flex items-center gap-2 disabled:opacity-50">
          {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Discover with AI
        </button>

        {candidates.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{selected.size} of {candidates.length} selected</div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(new Set(candidates.map((_, i) => i)))} className="text-xs text-cyan-300 hover:text-cyan-200">Select all</button>
                <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-200">Clear</button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {candidates.map((c, i) => (
                <label key={i} className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition ${selected.has(i) ? "bg-cyan-950/60 border-cyan-700" : "bg-slate-800/40 border-slate-700 hover:border-slate-600"}`}>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="mt-1 accent-cyan-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{c.scheme_name}</div>
                    <div className="text-[11px] text-slate-400">{c.fund_house} · {c.category}{c.sub_category ? ` / ${c.sub_category}` : ""} · {c.risk_level} {c.scheme_code ? `· AMFI ${c.scheme_code}` : ""}</div>
                    {c.rationale && <div className="text-xs text-slate-300 mt-1">{c.rationale}</div>}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={approveImport} disabled={importing || !selected.size} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-4 py-2 rounded inline-flex items-center gap-2 disabled:opacity-50">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve & Import ({selected.size})
              </button>
              <button onClick={() => { setCandidates([]); setSelected(new Set()); }} disabled={importing} className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded inline-flex items-center gap-1">
                <X className="h-4 w-4" /> Discard
              </button>
            </div>
          </div>
        )}
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
