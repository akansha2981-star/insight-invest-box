import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, Send, Loader2, X, ArrowRight, Building2, TrendingUp, Newspaper, Shield, Brain, Search, BarChart3, Zap, MessageSquare, Cpu, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

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
  property: { icon: Building2, gradient: "from-emerald-500 to-teal-600", label: "Property", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  stock: { icon: TrendingUp, gradient: "from-blue-500 to-indigo-600", label: "Stock", bg: "bg-blue-500/10", text: "text-blue-400" },
  article: { icon: Newspaper, gradient: "from-amber-500 to-orange-600", label: "Article", bg: "bg-amber-500/10", text: "text-amber-400" },
};

/* Animated mesh gradient background */
function AIMeshBG({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary glow */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full transition-all duration-[2000ms] ease-in-out ${active ? "bg-cyan-500/25 scale-150" : "bg-cyan-500/8 scale-100"}`} style={{ filter: "blur(80px)" }} />
      {/* Secondary glow */}
      <div className={`absolute -bottom-24 -right-24 w-80 h-80 rounded-full transition-all duration-[2000ms] ease-in-out delay-300 ${active ? "bg-violet-500/20 scale-150" : "bg-violet-500/5 scale-100"}`} style={{ filter: "blur(80px)" }} />
      {/* Accent glow */}
      <div className={`absolute top-1/2 left-1/3 w-60 h-60 rounded-full transition-all duration-[1500ms] ease-in-out ${active ? "bg-amber-400/15 scale-125" : "bg-amber-400/3 scale-75"}`} style={{ filter: "blur(60px)" }} />
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      {/* Scan line effect when active */}
      {active && (
        <div className="absolute inset-0">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-[scan_3s_ease-in-out_infinite]" style={{
            animation: "scan 3s ease-in-out infinite",
          }} />
        </div>
      )}
    </div>
  );
}

/* Thinking indicator with wave animation */
function AIThinkingWave() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-gradient-to-t from-cyan-500 to-cyan-300"
          style={{
            animation: `wave 1.2s ease-in-out ${i * 0.1}s infinite`,
            height: "12px",
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes orbitPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34, 211, 238, 0); }
        }
      `}</style>
    </div>
  );
}

/* AI Status indicator */
function AIStatus({ streaming }: { streaming: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${streaming ? "bg-cyan-400" : "bg-emerald-400"}`} />
        {streaming && (
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-cyan-400" style={{ animation: "orbitPulse 1.5s ease-in-out infinite" }} />
        )}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${streaming ? "text-cyan-300" : "text-white/30"}`}>
        {streaming ? "Analyzing" : "Ready"}
      </span>
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
  const [idleAnim, setIdleAnim] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen && !isStreaming) {
      const interval = setInterval(() => {
        setIdleAnim(true);
        setTimeout(() => setIdleAnim(false), 2500);
      }, 8000);
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
        const msg = e.message === "Failed to fetch" 
          ? "Network error — please check your connection and try again." 
          : (e.message || "Something went wrong");
        setError(msg);
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
    <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0d1526 30%, #111b33 60%, #0a0e1a 100%)" }}>
      <AIMeshBG active={isStreaming || idleAnim} />

      <div className="relative max-w-[1440px] mx-auto px-4 py-6 md:py-8">
        {/* Top bar: Brand + Status */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-700 ${isStreaming ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30" : "bg-white/[0.06] border border-white/10"}`}>
              <Brain className={`h-5 w-5 transition-colors duration-500 ${isStreaming ? "text-white" : "text-white/40"}`} />
              {isStreaming && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm tracking-tight">InvestingIQ Intelligence</h3>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/20">AI</span>
              </div>
              <p className="text-white/25 text-[11px] mt-0.5">Search properties, stocks & investments from our database</p>
            </div>
          </div>
          <AIStatus streaming={isStreaming} />
        </div>

        {/* Input area — premium glassmorphism */}
        <div className="relative group">
          {/* Outer glow ring */}
          <div className={`absolute -inset-[1px] rounded-2xl transition-all duration-700 ${
            isStreaming 
              ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 opacity-100" 
              : "bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-violet-500/0 opacity-0 group-focus-within:from-cyan-500/50 group-focus-within:via-blue-500/50 group-focus-within:to-violet-500/50 group-focus-within:opacity-100"
          }`} style={{ padding: "1px", borderRadius: "16px" }}>
            <div className="w-full h-full rounded-2xl" style={{ background: "#0d1526" }} />
          </div>
          
          <div className="relative flex items-center">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isStreaming ? (
                <AIThinkingWave />
              ) : (
                <Search className="h-5 w-5 text-white/20 group-focus-within:text-cyan-400/60 transition-colors duration-300" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Ask about properties, stocks, investments, market trends..."
              className="w-full h-14 pl-14 pr-16 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] text-white placeholder:text-white/20 text-sm font-medium focus:outline-none focus:bg-white/[0.07] transition-all duration-300"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isStreaming}
              className={`absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-300 ${
                query.trim() && !isStreaming
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
                  : "bg-white/[0.05] text-white/15"
              }`}
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Suggestion chips */}
        {!isOpen && (
          <div className="flex items-center gap-2.5 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            <MessageSquare className="h-3 w-3 text-white/15 shrink-0" />
            <span className="text-[10px] text-white/20 font-medium shrink-0">Try:</span>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s.text)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/15 text-white/35 hover:text-white/75 text-[11px] font-medium transition-all duration-300 shrink-0 group/chip"
              >
                <s.icon className="h-3 w-3 group-hover/chip:text-cyan-400/60 transition-colors" />
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Response area */}
        {isOpen && (
          <div className="mt-5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                {isStreaming ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-6 h-6">
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
                      <div className="absolute inset-1 rounded-full bg-cyan-400/10 flex items-center justify-center">
                        <Cpu className="h-2.5 w-2.5 text-cyan-400" />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-cyan-300 font-semibold block">Processing your query</span>
                      <span className="text-[10px] text-white/25">Searching internal database...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-xs text-white/50 font-medium">Analysis complete</span>
                  </div>
                )}
              </div>
              <button onClick={handleClose} className="text-white/20 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 max-h-[420px] overflow-y-auto scrollbar-hide">
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3">{error}</p>
              )}
              {response && (
                <div className="ai-response-content text-white/75 text-[13px] leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h3 className="text-white/90 text-sm font-semibold mt-4 mb-2 first:mt-0 flex items-center gap-2 border-b border-white/[0.06] pb-2">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h4 className="text-white/85 text-[13px] font-semibold mt-3 mb-1.5">{children}</h4>
                      ),
                      p: ({ children }) => (
                        <p className="text-white/60 text-[13px] leading-[1.7] mb-2">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <span className="text-white/90 font-semibold">{children}</span>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-2 my-2">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="relative pl-4 text-white/60 text-[13px] leading-[1.7] before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-cyan-500/40">
                          {children}
                        </li>
                      ),
                      hr: () => <div className="my-3 border-t border-white/[0.05]" />,
                      em: ({ children }) => (
                        <span className="text-white/30 text-[11px] italic">{children}</span>
                      ),
                      a: ({ href, children }) => (
                        <Link to={href || "#"} className="text-cyan-400/80 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/20 hover:decoration-cyan-400/50 transition-colors">
                          {children}
                        </Link>
                      ),
                    }}
                  >
                    {response
                      .replace(/---\n\*Data sourced.*?\*/gs, "")
                      .replace(/\*Data sourced.*?\*/gs, "")
                      .replace(/⚠️/g, "")
                      .replace(/🏠|📈|📰|🧮|📊/g, "")
                      .trim()}
                  </ReactMarkdown>
                </div>
              )}

              {/* Result cards */}
              {cards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                  {cards.map((card, i) => {
                    const config = cardTypeConfig[card.type] || cardTypeConfig.article;
                    const Icon = config.icon;
                    return (
                      <Link
                        key={`${card.id}-${i}`}
                        to={card.link}
                        className="group relative p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 w-10 h-10 rounded-xl overflow-hidden ${config.bg} flex items-center justify-center ring-1 ring-white/5`}>
                            {card.image ? (
                              <img src={card.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Icon className={`h-5 w-5 ${config.text}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${config.text}`}>
                              {config.label}
                            </span>
                            <p className="text-white/80 text-xs font-semibold truncate mt-0.5 group-hover:text-white transition-colors">
                              {card.title}
                            </p>
                            {card.subtitle && (
                              <p className="text-white/30 text-[11px] truncate mt-0.5">{card.subtitle}</p>
                            )}
                            {card.price && (
                              <p className="text-cyan-300/80 text-xs font-bold mt-1">{card.price}</p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="absolute top-4 right-4 h-3.5 w-3.5 text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-300" />
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Disclaimer */}
              {!isStreaming && response && (
                <div className="mt-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Shield className="h-3.5 w-3.5 text-white/15 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/20 leading-relaxed">
                    All data shown is sourced from InvestingIQ's internal database. Stock and market data referenced is sourced from official exchanges (NSE, BSE) and trusted platforms. InvestingIQ does not provide investment recommendations. This is for informational purposes only.
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
