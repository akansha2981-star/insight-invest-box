import { useEffect, useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Wifi, WifiOff } from "lucide-react";
import { INDICES, type IndexData } from "@/data/mockStocks";
import { supabase } from "@/integrations/supabase/client";

function MiniSparkline({ positive }: { positive: boolean }) {
  const points = positive
    ? "0,20 8,15 16,18 24,10 32,12 40,5 48,8 56,2"
    : "0,5 8,8 16,4 24,12 32,10 40,18 48,15 56,20";
  return (
    <svg width="56" height="22" viewBox="0 0 56 22" fill="none" className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "hsl(152,69%,31%)" : "hsl(4,90%,50%)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MarketIndices() {
  const [indices, setIndices] = useState<IndexData[]>(INDICES);
  const [liveEnabled, setLiveEnabled] = useState(false);

  const fetchLive = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stock-ticker");
      if (error || data?.error || !data?.quotes) return;

      const quotes = data.quotes as Array<{ symbol: string; price: number; change: number; changePercent: number; high?: number; low?: number }>;

      const nameMap: Record<string, string> = {
        "SENSEX": "SENSEX",
        "NIFTY": "NIFTY 50",
        "BANKNIFTY": "BANK NIFTY",
      };

      const matched = quotes.filter(q => nameMap[q.symbol]);
      if (!matched.length) return;

      setLiveEnabled(true);
      setIndices(prev =>
        prev.map(idx => {
          const q = matched.find(m => nameMap[m.symbol] === idx.name);
          if (!q) return idx;
          return {
            ...idx,
            value: q.price,
            change: q.change,
            changePercent: q.changePercent,
            ...(q.high ? { high: q.high } : {}),
            ...(q.low ? { low: q.low } : {}),
          };
        })
      );
    } catch {
      // keep mock data
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const liveInterval = setInterval(fetchLive, 60 * 1000);
    return () => clearInterval(liveInterval);
  }, [fetchLive]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs">
        {liveEnabled
          ? <><Wifi className="h-3 w-3 text-gain" /><span className="text-gain font-semibold">Live data from NSE/BSE</span></>
          : <><WifiOff className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Simulated data (market closed or loading…)</span></>
        }
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {indices.map((idx) => {
          const up = idx.change >= 0;
          return (
            <div
              key={idx.name}
              className="bg-white border border-border rounded-xl p-4 shadow-card hover:shadow-card-md card-hover cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{idx.name}</span>
                <MiniSparkline positive={up} />
              </div>
              <div className={`number-font text-[22px] font-bold leading-none mb-1 ${up ? 'text-gain' : 'text-loss'}`}>
                {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-gain' : 'text-loss'}`}>
                {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>{up ? '+' : ''}{idx.change.toFixed(2)}</span>
                <span className="font-normal opacity-80">({up ? '+' : ''}{idx.changePercent.toFixed(2)}%)</span>
              </div>
              <div className="flex justify-between mt-2.5 pt-2 border-t border-border text-[10px] text-muted-foreground">
                <span>H: <span className="text-foreground font-medium">{idx.high.toLocaleString('en-IN')}</span></span>
                <span>L: <span className="text-foreground font-medium">{idx.low.toLocaleString('en-IN')}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
