import { useState, useEffect } from "react";
import { Brain, TrendingUp, TrendingDown, Activity, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const SENTIMENT_DATA = [
  { label: "NIFTY 50", sentiment: "Bullish", score: 72, trend: "up" },
  { label: "BANK NIFTY", sentiment: "Neutral", score: 51, trend: "neutral" },
  { label: "IT Sector", sentiment: "Bullish", score: 78, trend: "up" },
  { label: "Pharma", sentiment: "Bullish", score: 65, trend: "up" },
  { label: "Auto", sentiment: "Bearish", score: 38, trend: "down" },
  { label: "Real Estate", sentiment: "Bullish", score: 81, trend: "up" },
];

export function AIMarketPulse() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1526] to-[#0a1628]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06),transparent_50%)]" />

      <div className="relative">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm">AI Market Pulse</h3>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">LIVE</span>
              </div>
              <p className="text-white/20 text-[10px]">AI-powered sentiment analysis</p>
            </div>
          </div>
          <Brain className="h-5 w-5 text-white/10" />
        </div>

        {/* Sentiment bars */}
        <div className="px-5 py-4 space-y-3">
          {SENTIMENT_DATA.map((item) => {
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-[11px] font-bold hover:opacity-90 transition-all"
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
