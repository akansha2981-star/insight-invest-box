import { useState, useEffect, useCallback } from "react";
import { Brain, Lock, Sparkles, TrendingUp, BarChart2, Shield, Zap, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface AIInsightTeaserProps {
  variant: "stock" | "news" | "property" | "homepage";
  context?: string;
}

const TEASER_CONTENT = {
  stock: {
    title: "AI Stock Intelligence",
    features: [
      { icon: Brain, label: "Deep Analysis", desc: "AI-powered fundamental & technical analysis" },
      { icon: Shield, label: "Risk Assessment", desc: "Identify hidden risks before investing" },
      { icon: BarChart2, label: "Peer Comparison", desc: "Compare against sector peers instantly" },
    ],
  },
  news: {
    title: "AI News Intelligence",
    features: [
      { icon: Sparkles, label: "Key Points", desc: "AI summarizes any article in 30 seconds" },
      { icon: TrendingUp, label: "Market Impact", desc: "Understand how news affects your stocks" },
      { icon: Zap, label: "Smart Alerts", desc: "Get notified about news that matters to you" },
    ],
  },
  property: {
    title: "AI Property Advisor",
    features: [
      { icon: Brain, label: "Investment Analysis", desc: "ROI projections & rental yield estimates" },
      { icon: BarChart2, label: "Price Predictions", desc: "AI-powered locality price trends" },
      { icon: Shield, label: "Risk Factors", desc: "Legal, construction & market risk alerts" },
    ],
  },
  homepage: {
    title: "AI-Powered Financial Intelligence",
    features: [
      { icon: Brain, label: "Smart Stock Analysis", desc: "Get AI insights on any listed stock" },
      { icon: Sparkles, label: "Natural Language Search", desc: "Ask questions like 'best IT stocks under ₹500'" },
      { icon: TrendingUp, label: "Market Predictions", desc: "AI sentiment analysis & trend signals" },
      { icon: Shield, label: "Portfolio Analysis", desc: "Risk assessment & rebalancing suggestions" },
    ],
  },
};

const INSIGHT_PROMPTS: Record<string, string> = {
  homepage: "Give a brief daily Indian market overview in 3-4 bullet points covering NIFTY trend, top sector, one stock to watch, and a key risk. Be concise, no more than 100 words total.",
  stock: "Give 3 quick stock market insights for Indian investors today. Cover one large-cap, one mid-cap trend, and one risk factor. Maximum 80 words.",
  news: "Summarize the most important financial news themes for Indian markets today in 3 bullet points. Maximum 60 words.",
  property: "Give 3 brief Indian real estate market insights covering price trends, top city, and investment outlook. Maximum 80 words.",
};

export function AIInsightTeaser({ variant, context }: AIInsightTeaserProps) {
  const [user, setUser] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchInsight = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: INSIGHT_PROMPTS[variant] }),
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
              setAiInsight(fullText.replace(/<!--CARDS:\[.*?\]-->/gs, "").trim());
            }
          } catch {}
        }
      }
      setLoaded(true);
    } catch {
      setAiInsight("Unable to load AI insights right now. Please try again later.");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [variant, loaded, loading]);

  // Auto-fetch for logged-in users
  useEffect(() => {
    if (user && !loaded) {
      fetchInsight();
    }
  }, [user, loaded, fetchInsight]);

  const content = TEASER_CONTENT[variant];
  const isHomepage = variant === "homepage";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isHomepage ? 'border-[hsl(var(--primary))]/20' : 'border-[hsl(var(--border))]'}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1526] to-[#0a1628]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.06),transparent_60%)]" />

      {/* Animated dots */}
      <div className="absolute top-4 right-4 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500/40 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative px-5 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-black text-[15px]">{content.title}</h3>
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">AI</span>
            </div>
            {context && <p className="text-white/25 text-[11px]">{context}</p>}
          </div>
        </div>

        {user ? (
          /* Logged in: show real AI insights */
          <div className="mb-4">
            {loading && !aiInsight ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                <span className="text-white/40 text-sm font-medium">AI is analyzing markets...</span>
              </div>
            ) : aiInsight ? (
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Live AI Insights</span>
                </div>
                <div className="text-white/70 text-[13px] leading-relaxed [&_p]:mb-2 [&_li]:mb-1 [&_strong]:text-white/90 [&_ul]:space-y-1 [&_li]:relative [&_li]:pl-3 [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[8px] [&_li]:before:w-1.5 [&_li]:before:h-1.5 [&_li]:before:rounded-full [&_li]:before:bg-cyan-500/40">
                  <ReactMarkdown>{aiInsight}</ReactMarkdown>
                </div>
                <button
                  onClick={() => { setLoaded(false); setAiInsight(""); }}
                  className="mt-3 text-[10px] font-bold text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> Refresh Insights
                </button>
              </div>
            ) : null}

            {/* Feature links */}
            <div className={`${isHomepage ? 'grid grid-cols-2 gap-2' : 'space-y-2'} mt-4`}>
              {content.features.map((f) => (
                <div key={f.label} className={`flex items-start gap-3 ${isHomepage ? 'bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]' : ''}`}>
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    <f.icon className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-white/80 text-[12px] font-semibold">{f.label}</div>
                    <div className="text-white/25 text-[11px] leading-snug">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Not logged in: show teaser */
          <>
            <div className={`${isHomepage ? 'grid grid-cols-2 gap-3' : 'space-y-2.5'} mb-5`}>
              {content.features.map((f) => (
                <div key={f.label} className={`flex items-start gap-3 ${isHomepage ? 'bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]' : ''}`}>
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    <f.icon className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-white/80 text-[12px] font-semibold">{f.label}</div>
                    <div className="text-white/25 text-[11px] leading-snug">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Login to Unlock AI Features
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="text-white/15 text-[9px] text-center mt-2">Free for all registered users</p>
          </>
        )}
      </div>
    </div>
  );
}
