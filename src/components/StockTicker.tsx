import { useEffect, useState, useCallback } from "react";
import { ArrowUp, ArrowDown, Wifi, WifiOff } from "lucide-react";
import { fetchLiveMarketQuotes } from "@/lib/liveMarketData";
import { isMarketOpen } from "@/lib/marketTime";

interface TickerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export function StockTicker() {
  const [stocks, setStocks] = useState<TickerStock[]>([]);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [marketOpen, setMarketOpen] = useState<boolean>(isMarketOpen());
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      const data = await fetchLiveMarketQuotes();
      const quotes = data.quotes;
      setMarketOpen(data.marketOpen ?? isMarketOpen());
      setLiveEnabled(data.live === true && data.source === "angelone");
      if (!quotes.length) return;
      setLastFetch(new Date());
      setStocks(quotes.map(q => ({ symbol: q.symbol, name: q.displayName, price: q.price, change: q.change, changePercent: q.changePercent })));
    } catch {
      // network error — keep existing data
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const liveInterval = setInterval(fetchLiveData, 30 * 1000);
    return () => clearInterval(liveInterval);
  }, [fetchLiveData]);

  const doubled = stocks.length ? [...stocks, ...stocks] : [];
  const showLive = liveEnabled && marketOpen;

  return (
    <div className="bg-ticker overflow-hidden py-2.5 border-b border-border">
      <div className="flex items-center">
        <div className={`text-white text-[10px] font-black px-3 py-1.5 shrink-0 z-10 uppercase tracking-widest mr-3 flex items-center gap-1 rounded-r-md ${showLive ? 'bg-[hsl(var(--gain))]' : 'bg-[hsl(var(--loss))]'}`}>
          {showLive ? (
            <><Wifi className="h-2.5 w-2.5" /> LIVE</>
          ) : (
            <><WifiOff className="h-2.5 w-2.5" /> {marketOpen ? 'LOADING' : 'CLOSED'}</>
          )}
        </div>
        {!marketOpen && stocks.length > 0 && (
          <div className="text-[10px] text-muted-foreground shrink-0 mr-3 hidden sm:block whitespace-nowrap">
            Market closed · showing last traded prices from previous session
          </div>
        )}
        <div className="overflow-hidden flex-1">
          {doubled.length === 0 ? (
            <div className="text-[12px] text-muted-foreground font-medium py-1">
              {marketOpen ? "Loading live NSE/BSE prices…" : "Fetching last close prices…"}
            </div>
          ) : (
            <div className="ticker-animate flex items-center gap-7 whitespace-nowrap" style={{ width: 'max-content' }}>
              {doubled.map((stock, i) => (
              <div key={`${stock.symbol}-${i}`} className="flex items-center gap-2 shrink-0">
                <span className="text-foreground/60 text-[11px] font-semibold tracking-wide">{stock.name}</span>
                <span className={`number-font text-[13px] font-bold ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[11px] flex items-center gap-0.5 ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {stock.changePercent >= 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                  {Math.abs(stock.changePercent).toFixed(2)}%
                </span>
                <span className="text-border text-base">|</span>
              </div>
              ))}
            </div>
          )}
        </div>
        {lastFetch && (
          <div className="text-muted-foreground text-[9px] px-3 shrink-0 hidden md:block">
            {marketOpen ? 'Updated' : 'Last close'} {lastFetch.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
