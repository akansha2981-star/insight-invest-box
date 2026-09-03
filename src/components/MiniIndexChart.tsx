import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import type { IndexData } from "@/data/mockStocks";
import { fetchLiveMarketQuotes } from "@/lib/liveMarketData";

const INITIAL_INDICES: IndexData[] = [
  { name: "NIFTY 50", value: 25367.45, change: -41, changePercent: -0.17, high: 25410.4, low: 25321.1 },
  { name: "SENSEX", value: 83740.1, change: -102.2, changePercent: -0.12, high: 83918.6, low: 83654.4 },
];

function generateChartPoints(baseValue: number, positive: boolean, count = 24): number[] {
  const points: number[] = [];
  let val = baseValue * 0.997;
  for (let i = 0; i < count; i++) {
    const drift = positive ? 0.0002 : -0.0002;
    val += val * (drift + (Math.random() - 0.48) * 0.002);
    points.push(val);
  }
  return points;
}

function AreaChart({ points, positive, width = 220, height = 60 }: { points: number[]; positive: boolean; width?: number; height?: number }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;

  const coords = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }));

  const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaD = `${lineD} L${coords[coords.length - 1].x},${height} L${coords[0].x},${height} Z`;

  const stroke = positive ? "hsl(var(--gain))" : "hsl(var(--loss))";
  const fillId = positive ? "areaGradGain" : "areaGradLoss";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="areaGradGain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--gain))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--gain))" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="areaGradLoss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${fillId})`} />
      <path d={lineD} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={stroke} />
    </svg>
  );
}

export function MiniIndexChart() {
  const [indices, setIndices] = useState<IndexData[]>(INITIAL_INDICES);
  const [active, setActive] = useState(0);

  const fetchLive = useCallback(async () => {
    try {
      const data = await fetchLiveMarketQuotes();
      if (data.source !== "angelone") return;
      const quotes = data.quotes.filter(q => q.symbol === "SENSEX" || q.symbol === "NIFTY");
      if (!quotes.length) return;
      setIndices(quotes.map(q => ({
        name: q.symbol === "NIFTY" ? "NIFTY 50" : q.displayName,
        value: q.price,
        change: q.change,
        changePercent: q.changePercent,
        high: q.high || q.price,
        low: q.low || q.price,
      })));
    } catch { /* keep previous live data */ }
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  const chartPoints = useMemo(() =>
    indices.map(idx => generateChartPoints(idx.value, idx.change >= 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indices.map(i => Math.round(i.value)).join(",")]
  );

  const idx = indices[active];

  if (!idx) return null;
  const up = idx.change >= 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-bold text-[13px] text-foreground">Intraday Chart</span>
        </div>
        <div className="flex gap-1">
          {indices.map((item, i) => (
            <button
              key={item.name}
              onClick={() => setActive(i)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                i === active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.name === "NIFTY 50" ? "NIFTY" : item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">{idx.name}</div>
            <div className={`number-font text-2xl font-black ${up ? "text-gain" : "text-loss"}`}>
              {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-lg ${
            up ? "bg-[hsl(var(--gain-light))] text-gain" : "bg-[hsl(var(--loss-light))] text-loss"
          }`}>
            {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            <span className="number-font">{up ? "+" : ""}{idx.change.toFixed(2)}</span>
            <span className="number-font text-[11px] opacity-80">({up ? "+" : ""}{idx.changePercent.toFixed(2)}%)</span>
          </div>
        </div>
        <AreaChart points={chartPoints[active]} positive={up} width={320} height={70} />
        <div className="flex justify-between mt-2 text-[9px] text-muted-foreground font-medium">
          <span>9:15</span><span>11:00</span><span>13:00</span><span>15:30</span>
        </div>
      </div>
    </div>
  );
}
