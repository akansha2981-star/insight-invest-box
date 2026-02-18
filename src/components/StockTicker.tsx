import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import { TICKER_STOCKS } from "@/data/mockStocks";

export function StockTicker() {
  const [stocks, setStocks] = useState(TICKER_STOCKS);

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev =>
        prev.map(s => ({
          ...s,
          price: +(s.price * (1 + (Math.random() - 0.5) * 0.0008)).toFixed(2),
        }))
      );
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const doubled = [...stocks, ...stocks];

  return (
    <div className="bg-ticker overflow-hidden py-2.5 border-b border-white/10">
      <div className="flex items-center">
        <div className="bg-[hsl(var(--loss))] text-white text-[10px] font-black px-4 py-1.5 shrink-0 z-10 uppercase tracking-widest mr-3">
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-animate flex items-center gap-7 whitespace-nowrap" style={{ width: 'max-content' }}>
            {doubled.map((stock, i) => (
              <div key={`${stock.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
                <span className="text-white/60 text-[11px] font-semibold tracking-wide">{stock.name}</span>
                <span className={`number-font text-[13px] font-bold ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[11px] flex items-center gap-0.5 ${stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stock.changePercent >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                  {Math.abs(stock.changePercent).toFixed(2)}%
                </span>
                <span className="text-white/15 text-base">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
