import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, Send, Loader2, X, ArrowRight, Building2, TrendingUp, Newspaper, Shield, Brain, Search, BarChart3, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface ResultCard {
  type: "property" | "stock" | "article";
  id: string;
  title: string;
  subtitle?: string;
  price?: string;
  image?: string;
  link: string;
}

const SUGGESTIONS = [
  { icon: Building2, text: "Best properties under ₹1 Cr in Pune" },
  { icon: TrendingUp, text: "Top performing stocks this quarter" },
  { icon: Building2, text: "3 BHK apartments in Gurugram" },
  { icon: BarChart3, text: "Investment opportunities in Mumbai" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

function parseCards(text: string): { cleanText: string; cards: ResultCard[] } {
  const cards: ResultCard[] = [];
  const cleanText = text.replace(/<!--CARDS:\[(.*?)\]-->/gs, (_, json) => {
    try {
      const parsed = JSON.parse(`[${json}]`);
      cards.push(...parsed);
    } catch { /* ignore */ }
    return "";
  });
  return { cleanText: cleanText.trim(), cards };
}

const cardTypeConfig = {
  property: { icon: Building2, color: "bg-emerald-600", label: "Property" },
  stock: { icon: TrendingUp, color: "bg-[hsl(var(--primary))]", label: "Stock" },
  article: { icon: Newspaper, color: "bg-amber-600", label: "Article" },
};

/* Animated orb background */
function AIOrbs({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-20 -left-20 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/10 blur-3xl transition-all duration-1000 ${active ? "scale-150 opacity-80" : "scale-100 opacity-30"}`} />
      <div className={`absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-violet-500/15 to-indigo-600/10 blur-3xl transition-all duration-1000 delay-200 ${active ? "scale-150 opacity-70" : "scale-100 opacity-20"}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-500/5 blur-2xl transition-all duration-700 ${active ? "scale-125 opacity-60" : "scale-75 opacity-10"}`} />
    </div>
  );
}

/* Neural network dots animation */
function NeuralDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className="block w-1 h-1 rounded-full bg-cyan-400 animate-pulse"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: "1.2s" }}
        />
      ))}
    </div>
  );
}

export function AIAssistantBar() {
  const [query, setQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState("");
  const [cards, setCards] = useState<ResultCard[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseAnim, setPulseAnim] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Subtle idle pulse
  useEffect(() => {
    if (!isOpen && !isStreaming) {
      const interval = setInterval(() => {
        setPulseAnim(true);
        setTimeout(() => setPulseAnim(false), 2000);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isStreaming]);

  const handleSubmit = useCallback(async (q?: string) => {
    const input = (q || query).trim();
    if (!input || isStreaming) return;

    setIsOpen(true);
    setIsStreaming(true);
    setResponse("");
    setCards([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: input }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              const { cleanText, cards: newCards } = parseCards(fullText);
              setResponse(cleanText);
              if (newCards.length > 0) setCards(newCards);
            }
          } catch { /* partial json */ }
        }
      }

      const { cleanText, cards: finalCards } = parseCards(fullText);
      setResponse(cleanText);
      if (finalCards.length > 0) setCards(finalCards);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Something went wrong");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [query, isStreaming]);

  const handleClose = () => {
    abortRef.current?.abort();
    setIsOpen(false);
    setResponse("");
    setCards([]);
    setError(null);
    setQuery("");
  };

  const handleSuggestion = (text: string) => {
    setQuery(text);
    handleSubmit(text);
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-[hsl(221,50%,12%)] to-slate-950 border-b border-white/5">
      <AIOrbs active={isStreaming || pulseAnim} />
      <div className="relative max-w-[1440px] mx-auto px-4 py-5">
        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-500 ${isStreaming ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
            <Brain className={`h-3.5 w-3.5 transition-colors duration-500 ${isStreaming ? "text-cyan-400" : "text-white/40"}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${isStreaming ? "text-cyan-300" : "text-white/40"}`}>
              AI Assistant
            </span>
            {isStreaming && <NeuralDots />}
          </div>
          <span className="text-[10px] text-white/20 font-medium">Powered by InvestingIQ Intelligence</span>
        </div>

        {/* Input area */}
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1 group">
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-sm transition-opacity duration-500 ${isStreaming || pulseAnim ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"}`} />
            <div className="relative flex items-center">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                {isStreaming ? (
                  <div className="relative">
                    <Search className="h-4.5 w-4.5 text-cyan-400" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-cyan-400 rounded-full animate-ping" />
                  </div>
                ) : (
                  <Search className="h-4.5 w-4.5 text-white/30 group-focus-within:text-white/60 transition-colors" />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Ask anything — properties, stocks, investments, market insights..."
                className="w-full h-12 pl-12 pr-14 rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 text-white placeholder:text-white/25 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/30 focus:bg-white/[0.1] transition-all duration-300"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!query.trim() || isStreaming}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-20 disabled:from-white/10 disabled:to-white/10 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion chips */}
        {!isOpen && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <Zap className="h-3 w-3 text-amber-500/50 shrink-0" />
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s.text)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/15 text-white/40 hover:text-white/80 text-[11px] font-medium transition-all duration-300 shrink-0"
              >
                <s.icon className="h-3 w-3" />
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Response area */}
        {isOpen && (
          <div className="mt-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                {isStreaming ? (
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-5 h-5">
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                    </div>
                    <span className="text-xs text-cyan-300/90 font-semibold">Analyzing your query across our database...</span>
                  </div>
                ) : (
                  <span className="text-xs text-white/50 font-medium flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Analysis Complete — Results from InvestingIQ Database
                  </span>
                )}
              </div>
              <button onClick={handleClose} className="text-white/30 hover:text-white/70 p-1 rounded-lg hover:bg-white/10 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 max-h-[400px] overflow-y-auto">
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              {response && (
                <div className="text-white/75 text-sm leading-relaxed whitespace-pre-line">
                  {response}
                </div>
              )}

              {/* Result cards */}
              {cards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {cards.map((card, i) => {
                    const config = cardTypeConfig[card.type] || cardTypeConfig.article;
                    const Icon = config.icon;
                    return (
                      <Link
                        key={`${card.id}-${i}`}
                        to={card.link}
                        className="group relative flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/20 transition-all duration-300"
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-white/[0.08] flex items-center justify-center ring-1 ring-white/10">
                          {card.image ? (
                            <img src={card.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Icon className="h-5 w-5 text-white/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${config.color} text-white`}>
                            {config.label}
                          </span>
                          <p className="text-white/85 text-xs font-semibold truncate mt-1 group-hover:text-white transition-colors">
                            {card.title}
                          </p>
                          {card.subtitle && (
                            <p className="text-white/35 text-[11px] truncate">{card.subtitle}</p>
                          )}
                          {card.price && (
                            <p className="text-cyan-300/80 text-xs font-bold mt-0.5">{card.price}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-white/15 group-hover:text-white/50 group-hover:translate-x-0.5 shrink-0 mt-1 transition-all duration-300" />
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Disclaimer */}
              {!isStreaming && response && (
                <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <Shield className="h-3.5 w-3.5 text-white/25 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/25 leading-relaxed">
                    All data shown is sourced from InvestingIQ's internal database. Stock and market data referenced is sourced from official exchanges (NSE, BSE) and trusted platforms. InvestingIQ does not provide investment recommendations. This is for informational purposes only. Please consult a certified financial advisor before making investment decisions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
