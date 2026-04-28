import { useState, useEffect, useCallback } from "react";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchLiveMarketQuotes } from "@/lib/liveMarketData";
import { isMarketOpen } from "@/lib/marketTime";

interface LiveStock {
  symbol: string;
  displayName: string;
  price: number;
  change: number;
  changePercent: number;
  exchange?: string;
}

const SECTORS: Record<string, string> = {
  RELIANCE: "Energy", TCS: "IT", INFY: "IT", WIPRO: "IT", HCLTECH: "IT",
  HDFCBANK: "Banking", ICICIBANK: "Banking", AXISBANK: "Banking", SBIN: "Banking", KOTAKBANK: "Banking",
  BHARTIARTL: "Telecom", MARUTI: "Auto", SUNPHARMA: "Pharma", BAJFINANCE: "Finance",
  LT: "Infra", ITC: "FMCG",
};

// Indices to exclude from gainers/losers
const EXCLUDE = new Set(["NIFTY", "SENSEX", "BANKNIFTY", "NIFTYIT", "GOLD", "CRUDE", "USDINR"]);

function StockRow({ stock, rank, up }: { stock: LiveStock; rank: number; up: boolean }) {
  const sector = SECTORS[stock.symbol] ?? "—";
  return (
    <tr className="group cursor-pointer transition-colors hover:bg-muted/30">
      <td className="px-3 py-3 border-b border-border/40">
        <span className="text-[11px] text-muted-foreground font-bold w-5 inline-block">{rank}</span>
      </td>
      <td className="px-3 py-3 border-b border-border/40">
        <div>
          <div className="font-black text-[13px] text-foreground group-hover:text-primary transition-colors">{stock.symbol}</div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[120px] mt-0.5">{stock.displayName}</div>
        </div>
      </td>
      <td className="px-3 py-3 border-b border-border/40 hidden sm:table-cell">
        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">{sector}</span>
      </td>
      <td className="px-3 py-3 border-b border-border/40 text-right">
        <div className="number-font text-[13px] font-bold text-foreground">₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div className="text-[10px] text-muted-foreground">{up ? '+' : '-'}₹{Math.abs(stock.change).toFixed(2)}</div>
      </td>
      <td className="px-3 py-3 border-b border-border/40 text-right">
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-black px-2 py-0.5 rounded border ${up ? 'badge-gain' : 'badge-loss'}`}>
          {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {up ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      </td>
    </tr>
  );
}

export function GainersLosers() {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');
  const [allStocks, setAllStocks] = useState<LiveStock[]>([]);
  const [isLive, setIsLive] = useState(false);

  const fetchLive = useCallback(async () => {
    try {
      const data = await fetchLiveMarketQuotes();
      if (data.source !== "angelone") return;
      const quotes = data.quotes.filter(q => !EXCLUDE.has(q.symbol));
      if (!quotes.length) return;
      setAllStocks(quotes);
      setIsLive(data.live === true && data.source === "angelone");
    } catch {
      // ignore — keep previous state
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 30 * 1000);
    return () => clearInterval(id);
  }, [fetchLive]);

  // Sort live data by changePercent for true gainers/losers
  const sorted = [...allStocks].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter(s => s.changePercent > 0).slice(0, 8);
  const losers = sorted.filter(s => s.changePercent < 0).slice(-8).reverse();
  const isGainers = tab === 'gainers';
  const stocks = isGainers ? gainers : losers;
  const hasData = allStocks.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('gainers')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold transition-colors ${
            isGainers
              ? 'text-gain border-b-2 border-gain bg-[hsl(var(--gain-light))]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Top Gainers
        </button>
        <button
          onClick={() => setTab('losers')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold transition-colors ${
            !isGainers
              ? 'text-loss border-b-2 border-loss bg-[hsl(var(--loss-light))]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <TrendingDown className="h-4 w-4" /> Top Losers
        </button>
      </div>

      {!hasData ? (
        <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <WifiOff className="h-5 w-5" />
          {isMarketOpen() ? 'Loading live data from NSE/BSE…' : 'Market Closed · Live data resumes at 9:15 AM IST'}
        </div>
      ) : stocks.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No {isGainers ? 'gainers' : 'losers'} in the tracked list right now.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stock</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Sector</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Price</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground">% Change</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock, i) => (
                <StockRow key={stock.symbol} stock={stock} rank={i + 1} up={isGainers} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-border p-3 flex items-center justify-between bg-muted/10">
        <span className="text-[10px] text-muted-foreground">
          {isLive && isMarketOpen() ? 'Live · NSE/BSE' : isMarketOpen() ? 'Connecting…' : 'Last traded prices'}
        </span>
        <Link to="/stocks" className="text-[12px] font-bold text-primary hover:text-primary/80 transition-colors">
          View All Stocks →
        </Link>
      </div>
    </div>
  );
}
