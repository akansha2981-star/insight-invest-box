import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TOP_GAINERS, TOP_LOSERS, type StockData } from "@/data/mockStocks";

function StockRow({ stock, rank }: { stock: StockData; rank: number }) {
  const isGain = stock.change >= 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface/50 last:border-0 hover:bg-surface-2/50 px-3 rounded cursor-pointer transition-colors group">
      <span className="text-xs text-muted-foreground w-4 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{stock.symbol}</span>
          <span className="text-xs bg-surface-3 text-muted-foreground px-1.5 py-0.5 rounded">{stock.sector}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
      </div>
      <div className="text-right">
        <div className="number-font text-sm font-semibold text-foreground">
          ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <div className={`flex items-center justify-end gap-0.5 text-xs ${isGain ? 'text-gain' : 'text-loss'}`}>
          {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isGain ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

export function GainersLosers() {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers');
  const stocks = tab === 'gainers' ? TOP_GAINERS : TOP_LOSERS;

  return (
    <div className="bg-card border border-surface rounded-lg overflow-hidden">
      <div className="flex border-b border-surface">
        <button
          onClick={() => setTab('gainers')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
            tab === 'gainers'
              ? 'text-gain border-b-2 border-gain bg-gain/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> Top Gainers
        </button>
        <button
          onClick={() => setTab('losers')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
            tab === 'losers'
              ? 'text-loss border-b-2 border-loss bg-loss/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingDown className="h-4 w-4" /> Top Losers
        </button>
      </div>
      <div className="p-1">
        {stocks.map((stock, i) => (
          <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
        ))}
      </div>
      <div className="border-t border-surface p-3 text-center">
        <a href="#" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          View All {tab === 'gainers' ? 'Gainers' : 'Losers'} →
        </a>
      </div>
    </div>
  );
}
