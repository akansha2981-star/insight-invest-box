import { useEffect, useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Wifi, WifiOff, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import { INDICES, type IndexData } from "@/data/mockStocks";
import { supabase } from "@/integrations/supabase/client";
import { isMarketOpen } from "@/lib/marketTime";

function generateSparkPoints(baseValue: number, positive: boolean, count = 20): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let val = baseValue * 0.998;
  for (let i = 0; i < count; i++) {
    const drift = positive ? 0.00015 : -0.00015;
    val += val * (drift + (Math.random() - 0.48) * 0.0015);
    points.push({ x: i, y: val });
  }
  return points;
}

function HoverAreaChart({ points, positive, width = 140, height = 40 }: {
  points: { x: number; y: number }[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const vals = points.map(p => p.y);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pad = 2;

  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (width - pad * 2),
    y: pad + (1 - (p.y - min) / range) * (height - pad * 2),
  }));

  const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaD = `${lineD} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z`;

  const stroke = positive ? "hsl(var(--gain))" : "hsl(var(--loss))";
  const fillId = positive ? "hoverGradGain" : "hoverGradLoss";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="hoverGradGain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--gain))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--gain))" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="hoverGradLoss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${fillId})`} />
      <path d={lineD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="2.5" fill={stroke} />
    </svg>
  );
}

export function MarketIndices() {
  const [indices, setIndices] = useState<IndexData[]>(INDICES);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<string | null>(null);

  const [openMap, setOpenMap] = useState<Record<string, number>>({});

  const fetchLive = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stock-ticker");
      if (error || data?.error || !data?.quotes) return;
      // Only treat as live when source is angelone
      if (data.source !== "angelone") return;

      const quotes = data.quotes as Array<{ symbol: string; price: number; change: number; changePercent: number; high?: number; low?: number; open?: number }>;

      const nameMap: Record<string, string> = {
        "SENSEX": "SENSEX",
        "NIFTY": "NIFTY 50",
        "BANKNIFTY": "BANK NIFTY",
        "NIFTYIT": "NIFTY IT",
      };

      const matched = quotes.filter(q => nameMap[q.symbol]);
      if (!matched.length) return;

      setLiveEnabled(true);
      const newOpens: Record<string, number> = {};
      matched.forEach(q => { if (q.open) newOpens[nameMap[q.symbol]] = q.open; });
      setOpenMap(prev => ({ ...prev, ...newOpens }));

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
      // keep previous data
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const liveInterval = setInterval(fetchLive, 30 * 1000);
    return () => clearInterval(liveInterval);
  }, [fetchLive]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs">
        {liveEnabled && isMarketOpen()
          ? <><Wifi className="h-3 w-3 text-gain" /><span className="text-gain font-semibold">Live data from NSE/BSE</span></>
          : <><WifiOff className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">{isMarketOpen() ? 'Loading live data...' : 'Market Closed · Showing last traded prices'}</span></>
        }
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {indices.map((idx) => {
          const up = idx.change >= 0;
          const isExpanded = expandedIdx === idx.name;
          const isHovered = hoveredIdx === idx.name;
          const sparkPoints = generateSparkPoints(idx.value, up);
          const rangePercent = idx.high && idx.low && (idx.high - idx.low) > 0
            ? ((idx.value - idx.low) / (idx.high - idx.low)) * 100
            : 50;

          return (
            <div
              key={idx.name}
              className={`bg-white border rounded-xl shadow-card cursor-pointer group relative overflow-hidden transition-all duration-300 ${
                isExpanded ? 'border-primary/30 shadow-card-lg ring-1 ring-primary/10' : 'border-border hover:shadow-card-md hover:border-primary/15'
              }`}
              onMouseEnter={() => setHoveredIdx(idx.name)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setExpandedIdx(isExpanded ? null : idx.name)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{idx.name}</span>
                    {up ? <TrendingUp className="h-3 w-3 text-gain opacity-60" /> : <TrendingDown className="h-3 w-3 text-loss opacity-60" />}
                  </div>
                  <button className="text-muted-foreground/50 hover:text-primary transition-colors">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className={`number-font text-[22px] font-bold leading-none mb-1 ${up ? 'text-gain' : 'text-loss'}`}>
                  {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-gain' : 'text-loss'}`}>
                  {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  <span>{up ? '+' : ''}{idx.change.toFixed(2)}</span>
                  <span className="font-normal opacity-80">({up ? '+' : ''}{idx.changePercent.toFixed(2)}%)</span>
                </div>

                {/* Hover mini-chart */}
                <div className={`mt-2 transition-all duration-300 overflow-hidden ${isHovered || isExpanded ? 'max-h-[50px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <HoverAreaChart points={sparkPoints} positive={up} />
                </div>

                <div className="flex justify-between mt-2.5 pt-2 border-t border-border text-[10px] text-muted-foreground">
                  <span>H: <span className="text-foreground font-medium">{idx.high.toLocaleString('en-IN')}</span></span>
                  <span>L: <span className="text-foreground font-medium">{idx.low.toLocaleString('en-IN')}</span></span>
                </div>
              </div>

              {/* Expanded detail panel */}
              <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[200px]' : 'max-h-0'}`}>
                <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                  {/* Day range bar */}
                  <div>
                    <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Day Range</div>
                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${up ? 'bg-gain' : 'bg-loss'}`}
                        style={{ width: `${rangePercent}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 shadow-sm transition-all duration-500"
                        style={{ left: `calc(${rangePercent}% - 5px)`, borderColor: up ? 'hsl(var(--gain))' : 'hsl(var(--loss))' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                      <span>{idx.low.toLocaleString('en-IN')}</span>
                      <span>{idx.high.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/40 rounded-lg p-2">
                      <div className="text-[9px] text-muted-foreground">Open</div>
                      <div className="number-font text-[12px] font-semibold text-foreground">
                        {(idx.value - idx.change).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2">
                      <div className="text-[9px] text-muted-foreground">Prev Close</div>
                      <div className="number-font text-[12px] font-semibold text-foreground">
                        {(idx.value - idx.change).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
