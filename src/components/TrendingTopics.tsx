import { useMemo } from "react";
import { TrendingUp, Hash } from "lucide-react";
import { Link } from "react-router-dom";

const TRENDING_TAGS = [
  { tag: "RBI Policy", heat: 98, category: "Economy" },
  { tag: "IT Stocks", heat: 92, category: "Stocks" },
  { tag: "NIFTY 50", heat: 89, category: "Markets" },
  { tag: "Budget 2026", heat: 85, category: "Economy" },
  { tag: "Gold Price", heat: 82, category: "Commodities" },
  { tag: "RELIANCE", heat: 78, category: "Stocks" },
  { tag: "Crypto", heat: 75, category: "Crypto" },
  { tag: "FII Flow", heat: 72, category: "Markets" },
  { tag: "IPO Alert", heat: 70, category: "Markets" },
  { tag: "HDFC Bank", heat: 68, category: "Stocks" },
  { tag: "Mutual Funds", heat: 65, category: "MF" },
  { tag: "Crude Oil", heat: 62, category: "Commodities" },
  { tag: "Infosys", heat: 58, category: "Stocks" },
  { tag: "SIP Returns", heat: 55, category: "MF" },
  { tag: "Tax Saving", heat: 52, category: "Economy" },
];

const CATEGORY_ROUTES: Record<string, string> = {
  Economy: "/economy",
  Stocks: "/stocks",
  Markets: "/markets",
  Commodities: "/markets",
  Crypto: "/crypto",
  MF: "/mutual-funds",
};

function getTagSize(heat: number): string {
  if (heat >= 90) return "text-[14px] font-black";
  if (heat >= 80) return "text-[13px] font-bold";
  if (heat >= 70) return "text-[12px] font-semibold";
  if (heat >= 60) return "text-[11px] font-semibold";
  return "text-[10px] font-medium";
}

function getTagColor(heat: number): string {
  if (heat >= 90) return "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20";
  if (heat >= 75) return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
  if (heat >= 60) return "bg-muted text-foreground border-border hover:bg-accent";
  return "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted";
}

export function TrendingTopics() {
  const shuffled = useMemo(() => [...TRENDING_TAGS].sort(() => Math.random() - 0.5), []);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-2.5 flex items-center gap-2 bg-muted/30">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="font-bold text-[13px] text-foreground">Trending Now</span>
        <span className="ml-auto text-[9px] text-loss font-bold animate-pulse">● LIVE</span>
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {shuffled.map(item => (
          <Link
            key={item.tag}
            to={CATEGORY_ROUTES[item.category] ?? "/news"}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all cursor-pointer ${getTagSize(item.heat)} ${getTagColor(item.heat)}`}
          >
            <Hash className="h-2.5 w-2.5 opacity-50" />
            {item.tag}
            {item.heat >= 85 && <span className="text-[8px] ml-0.5">🔥</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
