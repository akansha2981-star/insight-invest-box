import { useEffect, useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Wifi, WifiOff } from "lucide-react";
import { TICKER_STOCKS } from "@/data/mockStocks";
import { supabase } from "@/integrations/supabase/client";
import { isMarketOpen } from "@/lib/marketTime";

interface TickerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export function StockTicker() {
  const [stocks, setStocks] = useState<TickerStock[]>(
    TICKER_STOCKS.map(s => ({ symbol: s.symbol, name: s.name, price: s.price, change: s.change, changePercent: s.changePercent }))
  );
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stock-ticker");
      if (error || data?.error || !data?.quotes) return;

      const quotes = data.quotes as Array<{ symbol: string; displayName: string; price: number; change: number; changePercent: number }>;
      if (!quotes.length) return;

      setLiveEnabled(true);
      setLastFetch(new Date());
      setStocks(prev => {
        const updated = [...prev];
        quotes.forEach(q => {
          const idx = updated.findIndex(s => s.symbol === q.symbol);
          if (idx === -1) return;
          updated[idx] = { ...updated[idx], price: q.price, change: q.change, changePercent: q.changePercent };
        });
        return updated;
      });
    } catch {
      // network error — keep existing data
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const liveInterval = setInterval(fetchLiveData, 30 * 1000);
    return () => clearInterval(liveInterval);
  }, [fetchLiveData]);

  const doubled = [...stocks, ...stocks];

  return (
    <div className="bg-ticker overflow-hidden py-2.5 border-b border-white/10">
      <div className="flex items-center">
        <div className={`text-white text-[10px] font-black px-3 py-1.5 shrink-0 z-10 uppercase tracking-widest mr-3 flex items-center gap-1 ${liveEnabled && isMarketOpen() ? 'bg-[hsl(var(--gain))]' : 'bg-[hsl(var(--loss))]'}`}>
          {liveEnabled && isMarketOpen() ? (
            <><Wifi className="h-2.5 w-2.5" /> LIVE</>
          ) : (
            <><WifiOff className="h-2.5 w-2.5" /> {isMarketOpen() ? 'LOADING' : 'CLOSED'}</>
          )}
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
        {lastFetch && (
          <div className="text-white/30 text-[9px] px-3 shrink-0 hidden md:block">
            Updated {lastFetch.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
