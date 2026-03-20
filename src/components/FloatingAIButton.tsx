import { useState, useEffect, useRef, useCallback } from "react";
import { Brain, X, Send, Loader2, Sparkles, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const QUICK_PROMPTS = [
  "Top stocks to buy today",
  "Best properties in Mumbai",
  "Market outlook this week",
  "Compare IT vs Banking sector",
];

export function FloatingAIButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pulse, setPulse] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 10000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  useEffect(() => {
    if (open && user && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, user]);

  const handleSend = useCallback(async (text?: string) => {
    const query = (text || input).trim();
    if (!query || streaming) return;

    setInput("");
    const userMsg: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }

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
              setStreamText(fullText.replace(/<!--CARDS:\[.*?\]-->/gs, "").trim());
            }
          } catch {}
        }
      }

      const cleanText = fullText.replace(/<!--CARDS:\[.*?\]-->/gs, "").trim();
      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);
      setStreamText("");
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming]);

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] transition-opacity" onClick={handleClose} />
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[999] w-[380px] max-h-[70vh] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 flex flex-col">
          {/* Header */}
          <div className="relative px-5 pt-4 pb-3 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--primary))]/5 to-transparent shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/70 flex items-center justify-center shadow-md">
                  <Brain className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <h3 className="text-[hsl(var(--foreground))] font-black text-sm">InvestingIQ AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${streaming ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <p className="text-[hsl(var(--muted-foreground))] text-[10px] font-medium">
                      {streaming ? "Analyzing..." : "Ready to help"}
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={handleClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!user ? (
            /* Login gate */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
                <Lock className="h-7 w-7 text-[hsl(var(--primary))]" />
              </div>
              <h4 className="text-[hsl(var(--foreground))] font-bold text-base mb-2">Login to Chat with AI</h4>
              <p className="text-[hsl(var(--muted-foreground))] text-sm mb-5 leading-relaxed">
                Get AI-powered stock analysis, property insights, and market predictions.
              </p>
              <button
                onClick={() => { navigate("/login"); setOpen(false); }}
                className="px-6 py-3 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-bold hover:opacity-90 transition-all shadow-md flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Login to Unlock
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[200px] max-h-[400px]">
                {messages.length === 0 && !streaming && (
                  <div className="text-center py-6">
                    <Brain className="h-10 w-10 text-[hsl(var(--primary))]/20 mx-auto mb-3" />
                    <p className="text-[hsl(var(--muted-foreground))] text-sm font-medium mb-4">Ask me anything about stocks, properties, or markets</p>
                    <div className="space-y-2">
                      {QUICK_PROMPTS.map(p => (
                        <button
                          key={p}
                          onClick={() => handleSend(p)}
                          className="block w-full text-left px-3 py-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))] text-xs font-medium transition-colors border border-[hsl(var(--border))]"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-br-md"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-bl-md border border-[hsl(var(--border))]"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&_p]:mb-1.5 [&_p]:text-[13px] [&_li]:text-[13px] [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_strong]:font-semibold [&_ul]:my-1 [&_li]:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}

                {/* Streaming response */}
                {streaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                      {streamText ? (
                        <div className="prose prose-sm max-w-none text-[13px] [&_p]:mb-1.5 [&_p]:text-[13px] [&_li]:text-[13px] [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-[13px] [&_h3]:font-semibold [&_strong]:font-semibold">
                          <ReactMarkdown>{streamText}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="text-xs">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-[hsl(var(--border))] px-4 py-3 bg-[hsl(var(--card))]">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Ask about stocks, properties..."
                    className="flex-1 h-10 px-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] text-sm focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                    disabled={streaming}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || streaming}
                    className="h-10 w-10 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all shrink-0"
                  >
                    {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-5 z-[999] w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/70 text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center group"
      >
        {pulse && !open && (
          <span className="absolute inset-0 rounded-full bg-[hsl(var(--primary))] animate-ping opacity-30" />
        )}
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <Brain className="h-6 w-6 group-hover:scale-110 transition-transform" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm border-2 border-white">
            AI
          </span>
        )}
      </button>
    </>
  );
}
