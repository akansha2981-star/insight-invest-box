import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { INDICES, type IndexData } from "@/data/mockStocks";

export function MarketIndices() {
  const [indices, setIndices] = useState<IndexData[]>(INDICES);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndices(prev =>
        prev.map(idx => {
          const fluct = (Math.random() - 0.5) * idx.value * 0.001;
          const newVal = +(idx.value + fluct).toFixed(2);
          const newChange = +(idx.change + fluct).toFixed(2);
          const base = idx.value - idx.change;
          return {
            ...idx,
            value: newVal,
            change: newChange,
            changePercent: +((newChange / base) * 100).toFixed(2),
          };
        })
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {indices.map((idx) => {
        const isGain = idx.change >= 0;
        return (
          <div
            key={idx.name}
            className="bg-card border border-surface rounded-lg p-4 card-hover cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{idx.name}</span>
              <Activity className={`h-3.5 w-3.5 ${isGain ? 'text-gain' : 'text-loss'}`} />
            </div>
            <div className={`number-font text-xl font-bold ${isGain ? 'text-gain' : 'text-loss'}`}>
              {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 mt-1 ${isGain ? 'text-gain' : 'text-loss'}`}>
              {isGain ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span className="text-xs font-semibold">
                {isGain ? '+' : ''}{idx.change.toFixed(2)} ({isGain ? '+' : ''}{idx.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>H: {idx.high.toLocaleString('en-IN')}</span>
              <span>L: {idx.low.toLocaleString('en-IN')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
