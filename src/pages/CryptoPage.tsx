import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { PageSectionsBanner } from "@/components/PageSectionsBanner";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";

const BASE_CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", price: 68420.50, change: 1842.30, changePercent: 2.76, marketCap: "$1.34T", volume: "$42.8B", color: "#F7931A" },
  { symbol: "ETH", name: "Ethereum", price: 3284.75, change: -48.20, changePercent: -1.45, marketCap: "$394B", volume: "$18.2B", color: "#627EEA" },
  { symbol: "BNB", name: "BNB", price: 412.30, change: 8.45, changePercent: 2.09, marketCap: "$62.1B", volume: "$2.4B", color: "#F3BA2F" },
  { symbol: "SOL", name: "Solana", price: 184.20, change: 12.80, changePercent: 7.47, marketCap: "$81.4B", volume: "$6.8B", color: "#9945FF" },
  { symbol: "XRP", name: "XRP", price: 0.5842, change: -0.0124, changePercent: -2.08, marketCap: "$32.8B", volume: "$1.9B", color: "#00AAE4" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1624, change: 0.0082, changePercent: 5.32, marketCap: "$23.2B", volume: "$3.1B", color: "#C2A633" },
  { symbol: "ADA", name: "Cardano", price: 0.4812, change: -0.0214, changePercent: -4.26, marketCap: "$17.1B", volume: "$0.8B", color: "#0D1E2D" },
  { symbol: "AVAX", name: "Avalanche", price: 38.42, change: 2.14, changePercent: 5.91, marketCap: "$15.8B", volume: "$0.9B", color: "#E84142" },
];

const BTC_CHART = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  price: 62000 + Math.sin(i / 4) * 4000 + Math.random() * 2000 + i * 200,
}));

const MARKET_DOMINANCE = [
  { name: "BTC", value: 52.4, color: "#F7931A" },
  { name: "ETH", value: 17.8, color: "#627EEA" },
  { name: "BNB", value: 3.2, color: "#F3BA2F" },
  { name: "SOL", value: 4.1, color: "#9945FF" },
  { name: "Others", value: 22.5, color: "hsl(var(--muted-foreground))" },
];

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 bg-red-600 rounded-full" />
      <h2 className="font-bold text-base text-foreground">{title}</h2>
    </div>
  );
}

export default function CryptoPage() {
  const [cryptos, setCryptos] = useState(BASE_CRYPTOS);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCryptos(prev => prev.map(c => {
        const fluct = (Math.random() - 0.5) * c.price * 0.008;
        const newPrice = +(c.price + fluct).toFixed(c.price > 1 ? 2 : 4);
        const newChange = +(c.change + fluct).toFixed(c.price > 1 ? 2 : 4);
        return { ...c, price: newPrice, change: newChange, changePercent: +((newChange / (newPrice - newChange)) * 100).toFixed(2) };
      }));
      setLastUpdated(new Date());
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        <PageSectionsBanner pageKey="crypto" />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cryptocurrency</h1>
            <p className="text-sm text-muted-foreground mt-1">Live prices · Market cap · Dominance · Charts</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Live · {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        {/* Quick stat cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Market Cap", value: "$2.48T", sub: "+2.14% (24h)", up: true },
            { label: "24h Volume", value: "$148.2B", sub: "-5.8% vs yesterday", up: false },
            { label: "BTC Dominance", value: "52.4%", sub: "+0.3%", up: true },
            { label: "ETH Gas (Gwei)", value: "18", sub: "Low · Fast: 22", up: null },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border rounded-xl p-4 shadow-card">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">{s.label}</div>
              <div className="number-font text-xl font-bold text-foreground">{s.value}</div>
              <div className={`text-xs mt-1 font-semibold ${s.up === true ? "text-gain" : s.up === false ? "text-loss" : "text-muted-foreground"}`}>{s.sub}</div>
            </div>
          ))}
        </section>

        {/* BTC Chart + Dominance */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-border rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">Bitcoin (BTC) — 30 Day Price</h3>
              <span className="text-xs text-gain font-semibold bg-[hsl(var(--gain-light))] px-2 py-0.5 rounded">● LIVE</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={BTC_CHART}>
                <defs>
                  <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F7931A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F7931A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 8 }} interval={4} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} width={60} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, "BTC"]} />
                <Area type="monotone" dataKey="price" stroke="#F7931A" strokeWidth={2} fill="url(#btcGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading title="Market Dominance" />
            <div className="flex flex-col items-center">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={MARKET_DOMINANCE} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {MARKET_DOMINANCE.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, "Dominance"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 w-full mt-2">
                {MARKET_DOMINANCE.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-foreground">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live prices table */}
        <section>
          <SectionHeading title="Live Crypto Prices" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["#", "Coin", "Price (USD)", "24h Change", "Market Cap", "24h Volume"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cryptos.map((c, i) => (
                    <tr key={c.symbol} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: c.color }}>
                            {c.symbol[0]}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{c.symbol}</div>
                            <div className="text-[10px] text-muted-foreground">{c.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 number-font font-semibold text-foreground">
                        ${c.price.toLocaleString("en-US", { minimumFractionDigits: c.price > 1 ? 2 : 4 })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${c.changePercent >= 0 ? "text-gain" : "text-loss"}`}>
                          {c.changePercent >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(c.changePercent).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{c.marketCap}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{c.volume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
