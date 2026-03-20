import { useState, useEffect, useCallback } from "react";
import { Brain, Lock, ArrowRight, Loader2, RefreshCw, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export function AIStockRecommendations() {
  const [user, setUser] = useState<any>(null);
  const [recommendations, setRecommendations] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setRecommendations("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          query: "Suggest 5 Indian stocks worth watching right now across different sectors. For each stock give: name, symbol, sector, current sentiment (Bullish/Neutral/Bearish), and a one-line reason. Focus on a mix of large-cap and mid-cap. Format as a numbered list with bold stock names. Maximum 150 words.",
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
            if (c) {
              fullText += c;
              setRecommendations(fullText.replace(/<!--CARDS:\[.*?\]-->/gs, "").trim());
            }
          } catch {}
        }
      }
      setFetched(true);
    } catch {
      setRecommendations("Unable to load recommendations. Please try again.");
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (user && !fetched) fetchRecommendations();
  }, [user, fetched, fetchRecommendations]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--primary))]/20">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1526] to-[#0a1628]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08),transparent_60%)]" />

      <div className="relative px-5 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-[15px]">Stocks You May Like</h3>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">AI</span>
              </div>
              <p className="text-white/25 text-[11px]">AI-curated picks based on market trends</p>
            </div>
          </div>
          {user && fetched && (
            <button
              onClick={() => { setFetched(false); fetchRecommendations(); }}
              disabled={loading}
              className="text-white/20 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/[0.06] transition-all disabled:opacity-30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          )}
        </div>

        {user ? (
          <div>
            {loading && !recommendations ? (
              <div className="flex items-center gap-3 py-8 justify-center">
                <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                <span className="text-white/40 text-sm font-medium">AI is scanning markets...</span>
              </div>
            ) : recommendations ? (
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-4">
                <div className="text-white/70 text-[13px] leading-relaxed [&_p]:mb-2 [&_li]:mb-1.5 [&_strong]:text-white/90 [&_ol]:space-y-2 [&_li]:relative">
                  <ReactMarkdown>{recommendations}</ReactMarkdown>
                </div>
                <p className="text-white/15 text-[9px] mt-3 border-t border-white/[0.06] pt-2">
                  AI-generated suggestions. Not investment advice. Always do your own research.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/30 text-xs mb-3">Login to get personalized AI stock recommendations</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[11px] font-bold hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Login to Unlock
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
