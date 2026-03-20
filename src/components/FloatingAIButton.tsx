import { useState, useEffect } from "react";
import { Brain, X, Sparkles, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const AI_FEATURES = [
  { label: "AI Stock Analysis", desc: "Deep analysis of any stock", icon: "📊", path: "/stocks/reviews", requiresLogin: true },
  { label: "AI Smart Search", desc: "Search with natural language", icon: "🔍", path: "/", requiresLogin: true },
  { label: "AI Property Advisor", desc: "Real estate AI insights", icon: "🏠", path: "/real-estate", requiresLogin: true },
  { label: "AI Blog Writer", desc: "Generate financial articles", icon: "✍️", path: "/admin", requiresLogin: true },
  { label: "AI Portfolio Analysis", desc: "Analyze your investments", icon: "💼", path: "/portfolio", requiresLogin: true },
  { label: "AI Market Predictions", desc: "Sentiment & trend signals", icon: "📈", path: "/markets", requiresLogin: true },
];

export function FloatingAIButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pulse, setPulse] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Stop pulse after 10 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 10000);
    return () => clearTimeout(t);
  }, []);

  function handleFeatureClick(feature: typeof AI_FEATURES[0]) {
    if (!user) {
      navigate("/login");
    } else {
      navigate(feature.path);
    }
    setOpen(false);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] transition-opacity" onClick={() => setOpen(false)} />
      )}

      {/* Feature panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[999] w-[340px] max-h-[80vh] bg-[#0a0f1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-[15px]">InvestingIQ AI</h3>
                  <p className="text-white/30 text-[10px] font-medium">Powered by Advanced AI</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/5 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Features list */}
          <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
            {AI_FEATURES.map((f) => (
              <button
                key={f.label}
                onClick={() => handleFeatureClick(f)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-white/[0.06] transition-all group"
              >
                <span className="text-lg shrink-0">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-[13px] font-semibold group-hover:text-cyan-400 transition-colors">{f.label}</div>
                  <div className="text-white/30 text-[11px]">{f.desc}</div>
                </div>
                {!user ? (
                  <Lock className="h-3.5 w-3.5 text-white/15 shrink-0" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 text-white/15 group-hover:text-cyan-400 transition-colors shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Login CTA */}
          {!user && (
            <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => { navigate("/login"); setOpen(false); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Login to Unlock AI Features
              </button>
              <p className="text-white/15 text-[10px] text-center mt-2">Free AI-powered financial intelligence</p>
            </div>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-5 z-[999] w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-110 transition-all flex items-center justify-center group ${open ? 'rotate-180' : ''}`}
      >
        {/* Pulse ring */}
        {pulse && !open && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 animate-ping opacity-30" />
        )}
        {open ? (
          <X className="h-5 w-5 transition-transform" />
        ) : (
          <Brain className="h-6 w-6 transition-transform group-hover:scale-110" />
        )}
        {/* Badge */}
        {!open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm border-2 border-white">
            AI
          </span>
        )}
      </button>
    </>
  );
}
