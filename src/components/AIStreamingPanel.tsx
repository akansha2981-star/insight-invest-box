import { useState, useRef, useCallback } from "react";
import { Brain, X, Loader2, Sparkles, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIStreamingPanelProps {
  title: string;
  subtitle?: string;
  actions: { key: string; label: string; icon?: React.ReactNode }[];
  functionName: string;
  payload: Record<string, any>;
  accentColor?: string;
}

async function streamFromEdge(
  functionName: string,
  body: Record<string, any>,
  token: string,
  signal: AbortSignal,
  onDelta: (text: string) => void,
) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial */ }
    }
  }
}

export function AIStreamingPanel({ title, subtitle, actions, functionName, payload, accentColor = "cyan" }: AIStreamingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleAction = useCallback(async (actionKey: string) => {
    setIsOpen(true);
    setActiveAction(actionKey);
    setIsStreaming(true);
    setResponse("");
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      let fullText = "";
      await streamFromEdge(
        functionName,
        { ...payload, action: actionKey },
        token,
        controller.signal,
        (delta) => {
          fullText += delta;
          setResponse(fullText);
        },
      );
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Something went wrong");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [functionName, payload]);

  const handleClose = () => {
    abortRef.current?.abort();
    setIsOpen(false);
    setResponse("");
    setError(null);
    setActiveAction(null);
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; gradient: string; glow: string }> = {
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-500", gradient: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/20" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-500", gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/20" },
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-500", gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500", gradient: "from-amber-500 to-orange-600", glow: "shadow-amber-500/20" },
  };

  const colors = colorMap[accentColor] || colorMap.cyan;

  return (
    <div className="bg-[#0d1526] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg ${colors.glow}`}>
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm">{title}</h3>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>AI</span>
            </div>
            {subtitle && <p className="text-white/30 text-[11px]">{subtitle}</p>}
          </div>
        </div>
        {isOpen && (
          <button onClick={handleClose} className="text-white/20 hover:text-white/60 p-1.5 rounded-lg hover:bg-white/[0.06] transition-all">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-white/[0.04]">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => handleAction(a.key)}
            disabled={isStreaming}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
              activeAction === a.key && isStreaming
                ? `bg-gradient-to-r ${colors.gradient} text-white border-transparent shadow-lg ${colors.glow}`
                : `bg-white/[0.03] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/15 hover:bg-white/[0.06]`
            } disabled:opacity-40`}
          >
            {a.icon || <Sparkles className="h-3 w-3" />}
            {a.label}
          </button>
        ))}
      </div>

      {/* Response area */}
      {isOpen && (
        <div className="px-5 py-5 max-h-[500px] overflow-y-auto">
          {isStreaming && !response && (
            <div className="flex items-center gap-3 text-white/40">
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin ${colors.text}`} />
                <div className="absolute inset-1 rounded-full bg-white/5 flex items-center justify-center">
                  <Cpu className="h-2.5 w-2.5" />
                </div>
              </div>
              <span className="text-xs font-medium">Analyzing data...</span>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/15 rounded-xl px-4 py-3">{error}</p>
          )}

          {response && (
            <div className="text-white/75 text-[13px] leading-relaxed">
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
                    <ul className="space-y-1.5 my-2">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className={`relative pl-4 text-white/60 text-[13px] leading-[1.7] before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-${accentColor}-500/40`}>
                      {children}
                    </li>
                  ),
                  hr: () => <div className="my-3 border-t border-white/[0.05]" />,
                  em: ({ children }) => (
                    <span className="text-white/30 text-[11px] italic">{children}</span>
                  ),
                }}
              >
                {response
                  .replace(/^#+\s*/gm, (m) => m)
                  .replace(/---\n\*.*?\*/gs, "")
                }
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Login prompt for unauthenticated users */}
      {!isOpen && (
        <div className="px-5 py-3">
          <p className="text-white/20 text-[10px]">Login required to use AI features</p>
        </div>
      )}
    </div>
  );
}
