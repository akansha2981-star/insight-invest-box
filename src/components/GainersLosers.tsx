import { useState } from "react";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react";
import { TOP_GAINERS, TOP_LOSERS, type StockData } from "@/data/mockStocks";
import { Link } from "react-router-dom";

const VOLUMES: Record<string, string> = {
  ADANIPORTS: "₹1,240 Cr", TATAMOTORS: "₹988 Cr", INFY: "₹756 Cr",
  SUNPHARMA: "₹622 Cr", HCLTECH: "₹510 Cr", BAJFINANCE: "₹2,180 Cr",
  HDFC: "₹1,820 Cr", WIPRO: "₹480 Cr", SBIN: "₹2,340 Cr", TATASTEEL: "₹910 Cr"
};

function StockRow({ stock, rank, up }: { stock: StockData; rank: number; up: boolean }) {
  const vol = VOLUMES[stock.symbol] ?? "₹—";
  return (
    <tr className="group cursor-pointer transition-colors hover:bg-muted/30">
      <td className="px-3 py-3 border-b border-border/40">
        <span className="text-[11px] text-muted-foreground font-bold w-5 inline-block">{rank}</span>
      </td>
      <td className="px-3 py-3 border-b border-border/40">
        <div>
          <div className="font-black text-[13px] text-foreground group-hover:text-primary transition-colors">{stock.symbol}</div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[120px] mt-0.5">{stock.name}</div>
        </div>
      </td>
      <td className="px-3 py-3 border-b border-border/40 hidden sm:table-cell">
        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">{stock.sector}</span>
      </td>
      <td className="px-3 py-3 border-b border-border/40 text-right">
        <div className="number-font text-[13px] font-bold text-foreground">₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div className="text-[10px] text-muted-foreground">{up ? '+' : ''}₹{Math.abs(stock.change).toFixed(2)}</div>
      </td>
      <td className="px-3 py-3 border-b border-border/40 text-right">
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-black px-2 py-0.5 rounded border ${up ? 'badge-gain' : 'badge-loss'}`}>
          {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {up ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      </td>
      <td className="px-3 py-3 border-b border-border/40 text-right hidden md:table-cell">
        <div className="text-[11px] number-font text-muted-foreground">{vol}</div>
      </td>
    </tr>
  );
}

export function GainersLosers() {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');
  const isGainers = tab === 'gainers';
  const stocks = isGainers ? TOP_GAINERS : TOP_LOSERS;

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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Stock</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Sector</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Price</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Change</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Volume</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, i) => (
              <StockRow key={stock.symbol} stock={stock} rank={i + 1} up={isGainers} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border p-3 text-center bg-muted/10">
        <Link to="/stocks" className="text-[12px] font-bold text-primary hover:text-primary/80 transition-colors">
          View All {isGainers ? 'Gainers' : 'Losers'} →
        </Link>
      </div>
    </div>
  );
}

