import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Lock, ArrowRight, RefreshCw, Zap, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface AIArticleSummaryProps {
  title: string;
  content: string;
  category?: string | null;
}

export function AIArticleSummary({ title, content, category }: AIArticleSummaryProps) {
  const [user, setUser] = useState<any>(null);
  const [keyPoints, setKeyPoints] = useState("");
  const [quickSummary, setQuickSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"keypoints" | "quick">("keypoints");
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchSummary = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setKeyPoints("");
    setQuickSummary("");

    const truncatedContent = content.slice(0, 3000);
    const prompt = `Analyze this ${category || 'financial'} article and provide TWO sections:

## Key Points
List 4-5 key takeaways as bullet points. Each point should be one sentence.

## In 30 Seconds
Write a 2-3 sentence summary that captures the essence of this article.

Article Title: ${title}
Article Content: ${truncatedContent}

RULES: Be concise. No emojis. Use clean markdown. Focus on actionable insights for Indian investors.
Timestamp: ${Date.now()}`;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: prompt }),
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

      const clean = fullText.replace(/<!--CARDS:\[.*?\]-->/gs, "").trim();

      // Split into sections
      const keyPointsMatch = clean.match(/## Key Points\s*([\s\S]*?)(?=## In 30|$)/i);
      const quickMatch = clean.match(/## In 30 Seconds?\s*([\s\S]*?)$/i);

      setKeyPoints(keyPointsMatch?.[1]?.trim() || clean);
      setQuickSummary(quickMatch?.[1]?.trim() || "");
      setFetched(true);
    } catch {
      setKeyPoints("Unable to generate summary. Please try again.");
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [title, content, category, loading]);

  useEffect(() => {
    if (user && !fetched && content) fetchSummary();
  }, [user, fetched, content, fetchSummary]);

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-[#0a0f1e] to-[#0d1526] rounded-xl border border-white/[0.08] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-white font-bold text-sm">AI Article Summary</span>
          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI</span>
        </div>
        <p className="text-white/30 text-xs mb-3">Get Key Points and 30-second summaries powered by AI</p>
        <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-bold hover:opacity-90 transition-all">
          <Lock className="h-3 w-3" /> Login to Unlock <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0a0f1e] to-[#0d1526] rounded-xl border border-white/[0.08] overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("keypoints")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-[11px] font-bold transition-colors ${
            activeTab === "keypoints" ? "text-emerald-400 border-b-2 border-emerald-400 bg-white/[0.02]" : "text-white/30 hover:text-white/50"
          }`}
        >
          <Zap className="h-3 w-3" /> Key Points
        </button>
        <button
          onClick={() => setActiveTab("quick")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-[11px] font-bold transition-colors ${
            activeTab === "quick" ? "text-emerald-400 border-b-2 border-emerald-400 bg-white/[0.02]" : "text-white/30 hover:text-white/50"
          }`}
        >
          <BookOpen className="h-3 w-3" /> In 30 Seconds
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-3 py-6 justify-center">
            <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
            <span className="text-white/40 text-sm">AI is reading the article...</span>
          </div>
        ) : (
          <div className="text-white/70 text-[13px] leading-relaxed [&_p]:mb-2 [&_li]:mb-1 [&_strong]:text-white/90 [&_ul]:space-y-1">
            <ReactMarkdown>{activeTab === "keypoints" ? keyPoints : (quickSummary || "Summary not available for this article.")}</ReactMarkdown>
          </div>
        )}

        {fetched && (
          <button
            onClick={() => { setFetched(false); fetchSummary(); }}
            disabled={loading}
            className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400/60 hover:text-emerald-400 transition-colors disabled:opacity-30"
          >
            <RefreshCw className="h-3 w-3" /> Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
