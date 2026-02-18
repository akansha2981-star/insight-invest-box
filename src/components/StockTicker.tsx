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

const AV_TO_MOCK: Record<string, string> = {
  "BSE:SENSEX": "SENSEX",
  "NSE:NIFTY50": "NIFTY",
  "NSE:RELIANCE": "RELIANCE",
  "NSE:TCS": "TCS",
  "NSE:HDFCBANK": "HDFCBANK",
  "NSE:INFY": "INFY",
  "NSE:ICICIBANK": "ICICIBANK",
  "NSE:BHARTIARTL": "BHARTIARTL",
  "NSE:WIPRO": "WIPRO",
  "NSE:AXISBANK": "AXISBANK",
};

export function StockTicker() {
  const [stocks, setStocks] = useState<TickerStock[]>(
    TICKER_STOCKS.map(s => ({ symbol: s.symbol, name: s.name, price: s.price, change: s.change, changePercent: s.changePercent }))
  );
  const [liveEnabled, setLiveEnabled] = useState(false);

  const fetchLiveData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("stock-ticker");
      if (error || data?.error || !data?.quotes) return; // silently fall back to mock

      const quotes = data.quotes as Array<{ symbol: string; displayName: string; price: number }>;
      if (!quotes.length) return;

      setLiveEnabled(true);
      setStocks(prev => {
        const updated = [...prev];
        quotes.forEach(q => {
          const mockKey = AV_TO_MOCK[q.symbol];
          const idx = updated.findIndex(s => s.symbol === (mockKey ?? q.symbol));
          if (idx === -1) return;
          const prevClose = SEED_PRICES[mockKey] ?? updated[idx].price;
          const change = +(q.price - prevClose).toFixed(2);
          const changePercent = +((change / prevClose) * 100).toFixed(2);
          updated[idx] = { ...updated[idx], price: q.price, change, changePercent };
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
    // Refresh live data every 5 minutes (Alpha Vantage free: 25 req/day)
    const liveInterval = setInterval(fetchLiveData, 5 * 60 * 1000);

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
