import { useEffect, useState, useCallback } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { TICKER_STOCKS } from "@/data/mockStocks";
import { supabase } from "@/integrations/supabase/client";

interface TickerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Seed prices from mock data for change calculation when live prices arrive
const SEED_PRICES: Record<string, number> = {};
TICKER_STOCKS.forEach(s => { SEED_PRICES[s.symbol] = s.price - s.change; });

// Map Alpha Vantage symbol → mock data for prev-close baseline
const SYMBOL_MAP: Record<string, (typeof TICKER_STOCKS)[number]> = {};
TICKER_STOCKS.forEach(s => { SYMBOL_MAP[s.symbol] = s; });


export function StockTicker() {
  const [stocks, setStocks] = useState<TickerStock[]>(
    TICKER_STOCKS.map(s => ({ symbol: s.symbol, name: s.name, price: s.price, change: s.change, changePercent: s.changePercent }))
  );
  const [liveEnabled, setLiveEnabled] = useState(false);

  const fetchLiveData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stock-ticker");
      if (error || data?.error || !data?.quotes) return; // silently fall back to mock

      const quotes = data.quotes as Array<{ symbol: string; displayName: string; price: number; change: number; changePercent: number }>;
      if (!quotes.length) return;

      setLiveEnabled(true);
      setStocks(prev => {
        const updated = [...prev];
        quotes.forEach(q => {
          // New format: symbol is already the mock key (e.g. "RELIANCE")
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
    // Try to fetch live data on mount
    fetchLiveData();
    // Refresh every 3 hours — free tier is 25 req/day (5 symbols × ~8 refreshes = 40, close enough)
    const liveInterval = setInterval(fetchLiveData, 3 * 60 * 60 * 1000);

    // Local micro-fluctuation every 6s to keep ticker animated
    const flickerInterval = setInterval(() => {
      setStocks(prev =>
        prev.map(s => ({
          ...s,
          price: +(s.price * (1 + (Math.random() - 0.5) * 0.0006)).toFixed(2),
        }))
      );
    }, 6000);

    return () => {
      clearInterval(liveInterval);
      clearInterval(flickerInterval);
    };
  }, [fetchLiveData]);

  const doubled = [...stocks, ...stocks];

  return (
    <div className="bg-ticker overflow-hidden py-2.5 border-b border-white/10">
      <div className="flex items-center">
        <div className="bg-[hsl(var(--loss))] text-white text-[10px] font-black px-4 py-1.5 shrink-0 z-10 uppercase tracking-widest mr-3">
          {liveEnabled ? "LIVE" : "LIVE"}
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
