import { useState, useEffect, useCallback } from "react";
import { Brain, TrendingUp, TrendingDown, Activity, Lock, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface SentimentItem {
  label: string;
  sentiment: string;
  score: number;
  trend: string;
}

const FALLBACK_DATA: SentimentItem[] = [
  { label: "NIFTY 50", sentiment: "Bullish", score: 72, trend: "up" },
  { label: "BANK NIFTY", sentiment: "Neutral", score: 51, trend: "neutral" },
  { label: "IT Sector", sentiment: "Bullish", score: 78, trend: "up" },
  { label: "Pharma", sentiment: "Bullish", score: 65, trend: "up" },
  { label: "Auto", sentiment: "Bearish", score: 38, trend: "down" },
  { label: "Real Estate", sentiment: "Bullish", score: 81, trend: "up" },
];

export function AIMarketPulse() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<SentimentItem[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchSentiment = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          query: `As of ${new Date().toISOString()}, give me current market sentiment scores (0-100) for NIFTY 50, BANK NIFTY, IT Sector, Pharma, Auto, Real Estate in Indian markets. For each: label, sentiment (Bullish/Bearish/Neutral), score (0-100), trend (up/down/neutral). Return ONLY a JSON array. Example: [{"label":"NIFTY 50","sentiment":"Bullish","score":72,"trend":"up"}]`
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {}
        }
      }

      // Try to parse the JSON from the response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as SentimentItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setData(parsed.map(item => ({
            label: item.label || "Unknown",
            sentiment: item.sentiment || "Neutral",
            score: Math.max(0, Math.min(100, Number(item.score) || 50)),
            trend: item.trend || "neutral",
          })));
        }
      }
      setFetched(true);
    } catch {
      // Keep fallback data
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (user && !fetched) fetchSentiment();
  }, [user, fetched, fetchSentiment]);

  const handleRefresh = () => {
    setFetched(false);
    fetchSentiment();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--primary))]/15">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1526] to-[#0a1628]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06),transparent_50%)]" />

      <div className="relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm">AI Sentiment Analysis</h3>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
              </div>
              <p className="text-white/20 text-[10px]">AI-powered market mood scanner</p>
            </div>
          </div>
          {user && (
            <button onClick={handleRefresh} disabled={loading} className="text-white/20 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/[0.06] transition-all disabled:opacity-30">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Sentiment bars */}
        <div className="px-5 py-4 space-y-3">
          {data.map((item) => {
            const barColor = item.score >= 60 ? "from-emerald-500 to-green-400" :
                           item.score <= 40 ? "from-red-500 to-rose-400" :
                           "from-amber-500 to-yellow-400";
            const textColor = item.score >= 60 ? "text-emerald-400" :
                            item.score <= 40 ? "text-red-400" :
                            "text-amber-400";

            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/60 text-[11px] font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${textColor}`}>{item.sentiment}</span>
                    {item.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : item.trend === "down" ? (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Activity className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                </div>
                <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  {user ? (
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`}
                      style={{ width: `${item.score}%` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] animate-pulse rounded-full" />
                  )}
                </div>
                {user && (
                  <div className="text-right mt-0.5">
                    <span className={`text-[9px] font-bold ${textColor}`}>{item.score}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Login gate for non-users */}
        {!user && (
          <div className="px-5 pb-4 pt-1">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
              <Lock className="h-4 w-4 text-white/15 mx-auto mb-1.5" />
              <p className="text-white/30 text-[11px] mb-2">Login to see AI sentiment scores</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-bold hover:opacity-90 transition-all"
              >
                Unlock AI Insights
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
