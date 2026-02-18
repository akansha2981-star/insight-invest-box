import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { TOP_GAINERS, TOP_LOSERS, type StockData } from "@/data/mockStocks";
import { Link } from "react-router-dom";

function StockRow({ stock, rank }: { stock: StockData; rank: number }) {
  const up = stock.change >= 0;
  return (
    <tr className="group cursor-pointer">
      <td className="px-4 py-2.5 border-b border-border/60">
        <span className="text-xs text-muted-foreground font-medium w-5 inline-block">{rank}</span>
      </td>
      <td className="px-4 py-2.5 border-b border-border/60">
        <div>
          <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{stock.symbol}</div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[130px]">{stock.name}</div>
        </div>
      </td>
      <td className="px-4 py-2.5 border-b border-border/60 text-right">
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{stock.sector}</span>
      </td>
      <td className="px-4 py-2.5 border-b border-border/60 text-right">
        <div className="number-font text-sm font-semibold text-foreground">₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </td>
      <td className="px-4 py-2.5 border-b border-border/60 text-right">
        <span className={up ? 'badge-gain' : 'badge-loss'}>
          {up ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      </td>
    </tr>
  );
}

export function GainersLosers() {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');
  const stocks = tab === 'gainers' ? TOP_GAINERS : TOP_LOSERS;

  return (
    <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('gainers')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
            tab === 'gainers'
              ? 'text-gain border-b-2 border-gain bg-[hsl(var(--gain-light))]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <ArrowUp className="h-4 w-4" /> Top Gainers
        </button>
        <button
          onClick={() => setTab('losers')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
            tab === 'losers'
              ? 'text-loss border-b-2 border-loss bg-[hsl(var(--loss-light))]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <ArrowDown className="h-4 w-4" /> Top Losers
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">#</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">Stock</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">Sector</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">Price</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground border-b border-border">Change</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, i) => (
              <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border p-3.5 text-center bg-muted/20">
        <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
          View All {tab === 'gainers' ? 'Gainers' : 'Losers'} →
        </a>
      </div>
    </div>
  );
}
