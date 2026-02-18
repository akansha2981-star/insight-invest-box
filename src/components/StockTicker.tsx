import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TICKER_STOCKS } from "@/data/mockStocks";

export function StockTicker() {
  const [stocks, setStocks] = useState(TICKER_STOCKS);

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev =>
        prev.map(stock => ({
          ...stock,
          price: +(stock.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(stock.price > 1000 ? 2 : 4),
        }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const doubled = [...stocks, ...stocks];

  return (
    <div className="bg-ticker border-b border-surface overflow-hidden py-2">
      <div className="flex items-center gap-0">
        <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 shrink-0 z-10 mr-2">
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-scroll flex items-center gap-6 whitespace-nowrap" style={{ width: 'max-content' }}>
            {doubled.map((stock, i) => (
              <div key={`${stock.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-foreground">{stock.name}</span>
                <span className={`number-font text-sm ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-xs flex items-center gap-0.5 ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {stock.changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
                <span className="text-surface-3 text-xs">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
