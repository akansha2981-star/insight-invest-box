import { useState, useRef, useCallback } from "react";
import { Sparkles, Send, Loader2, X, ArrowRight, Building2, TrendingUp, Newspaper, Mic, MicOff } from "lucide-react";
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
  { icon: Newspaper, text: "Latest market analysis" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

function parseCards(text: string): { cleanText: string; cards: ResultCard[] } {
  const cards: ResultCard[] = [];
  const cleanText = text.replace(/<!--CARDS:\[(.*?)\]-->/gs, (_, json) => {
    try {
      const parsed = JSON.parse(`[${json}]`);
      cards.push(...parsed);
    } catch { /* ignore parse errors */ }
    return "";
  });
  return { cleanText: cleanText.trim(), cards };
}

const cardTypeConfig = {
  property: { icon: Building2, color: "bg-emerald-500", label: "Property" },
  stock: { icon: TrendingUp, color: "bg-primary", label: "Stock" },
  article: { icon: Newspaper, color: "bg-amber-500", label: "Article" },
};

export function AIAssistantBar() {
  const [query, setQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState("");
  const [cards, setCards] = useState<ResultCard[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
          } catch { /* partial json, wait for more */ }
        }
      }

      // Final parse
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
    <div className="bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(221,75%,32%)] to-[hsl(var(--primary))]">
      <div className="max-w-[1440px] mx-auto px-4 py-4">
        {/* Input area */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isStreaming ? (
                <div className="relative">
                  <Sparkles className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-amber-400 rounded-full animate-ping" />
                </div>
              ) : (
                <Sparkles className="h-4.5 w-4.5 text-white/50" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Ask AI — 'Best 2BHK in Mumbai under ₹80L' or 'Top IT stocks to buy'..."
              className="w-full h-11 pl-11 pr-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-white placeholder:text-white/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/25 focus:bg-white/15 transition-all"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isStreaming}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-30 text-white transition-all"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Suggestion chips */}
        {!isOpen && (
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold shrink-0">Try</span>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s.text)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white/90 text-xs font-medium transition-all shrink-0"
              >
                <s.icon className="h-3 w-3" />
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Response area */}
        {isOpen && (
          <div className="mt-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-amber-300/80 font-medium">AI is analyzing...</span>
                  </div>
                ) : (
                  <span className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    AI Analysis Complete
                  </span>
                )}
              </div>
              <button onClick={handleClose} className="text-white/40 hover:text-white/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-3 max-h-[360px] overflow-y-auto">
              {error && (
                <p className="text-red-300 text-sm">{error}</p>
              )}
              {response && (
                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                  {response}
                </div>
              )}

              {/* Result cards */}
              {cards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
                  {cards.map((card, i) => {
                    const config = cardTypeConfig[card.type] || cardTypeConfig.article;
                    const Icon = config.icon;
                    return (
                      <Link
                        key={`${card.id}-${i}`}
                        to={card.link}
                        className="group flex items-start gap-3 p-3 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25 transition-all"
                      >
                        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                          {card.image ? (
                            <img src={card.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Icon className="h-5 w-5 text-white/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.color} text-white`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-white/90 text-xs font-semibold truncate group-hover:text-white transition-colors">
                            {card.title}
                          </p>
                          {card.subtitle && (
                            <p className="text-white/45 text-[11px] truncate">{card.subtitle}</p>
                          )}
                          {card.price && (
                            <p className="text-amber-300/80 text-xs font-bold mt-0.5">{card.price}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 shrink-0 mt-1 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
