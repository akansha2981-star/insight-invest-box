import { useState, useEffect } from "react";
import { Brain, Lock, Sparkles, TrendingUp, BarChart2, Shield, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

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

export function AIInsightTeaser({ variant, context }: AIInsightTeaserProps) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Don't show if user is logged in (they'll see the actual AI panels)
  if (user) return null;

  const content = TEASER_CONTENT[variant];
  const isHomepage = variant === "homepage";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isHomepage ? 'border-cyan-500/20' : 'border-white/10'}`}>
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

        {/* Features */}
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

        {/* CTA */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Lock className="h-3.5 w-3.5" />
          Login to Unlock AI Features
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <p className="text-white/15 text-[9px] text-center mt-2">Free for all registered users</p>
      </div>
    </div>
  );
}
