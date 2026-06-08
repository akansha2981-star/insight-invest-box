import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { MarketIndices } from "@/components/MarketIndices";
import { GainersLosers } from "@/components/GainersLosers";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { PageSectionsBanner } from "@/components/PageSectionsBanner";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from "recharts";
import { Globe, TrendingUp, BarChart3, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";

const NIFTY_INTRADAY = Array.from({ length: 30 }, (_, i) => ({
  time: `${9 + Math.floor(i / 4)}:${String((i % 4) * 15).padStart(2, "0")}`,
  value: 22200 + Math.sin(i / 3) * 180 + Math.random() * 60,
}));

const SENSEX_INTRADAY = Array.from({ length: 30 }, (_, i) => ({
  time: `${9 + Math.floor(i / 4)}:${String((i % 4) * 15).padStart(2, "0")}`,
  value: 73500 + Math.sin(i / 3) * 400 + Math.random() * 150,
}));

const SECTOR_VOLUME = [
  { sector: "IT", volume: 1240 },
  { sector: "Banking", volume: 2180 },
  { sector: "Pharma", volume: 850 },
  { sector: "Auto", volume: 960 },
  { sector: "FMCG", volume: 720 },
  { sector: "Realty", volume: 430 },
  { sector: "Energy", volume: 1100 },
  { sector: "Metal", volume: 780 },
];

const GLOBAL_MARKETS = [
  { name: "Dow Jones", value: "38,654", change: "+0.76%", up: true, region: "US" },
  { name: "S&P 500", value: "5,137", change: "+0.82%", up: true, region: "US" },
  { name: "NASDAQ", value: "16,214", change: "+1.03%", up: true, region: "US" },
  { name: "FTSE 100", value: "7,728", change: "-0.15%", up: false, region: "UK" },
  { name: "Nikkei 225", value: "38,487", change: "+0.62%", up: true, region: "Asia" },
  { name: "Hang Seng", value: "16,512", change: "-0.44%", up: false, region: "Asia" },
  { name: "Shanghai", value: "3,054", change: "+0.31%", up: true, region: "Asia" },
  { name: "DAX", value: "17,842", change: "+0.55%", up: true, region: "EU" },
];

const DERIVATIVES = [
  { symbol: "NIFTY 22400 CE", ltp: "₹142.50", change: "+18.25", oi: "1.24 Cr", up: true },
  { symbol: "NIFTY 22400 PE", ltp: "₹78.30", change: "-22.40", oi: "0.98 Cr", up: false },
  { symbol: "BANKNIFTY 48000 CE", ltp: "₹312.00", change: "+42.15", oi: "0.56 Cr", up: true },
  { symbol: "BANKNIFTY 48000 PE", ltp: "₹198.50", change: "-31.20", oi: "0.44 Cr", up: false },
  { symbol: "RELIANCE 2800 CE", ltp: "₹28.40", change: "+5.60", oi: "0.32 Cr", up: true },
];

function SectionHeading({ icon: Icon, title }: { icon?: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 bg-red-600 rounded-full" />
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="font-bold text-base text-foreground">{title}</h2>
    </div>
  );
}

export default function MarketsPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [niftyData, setNiftyData] = useState(NIFTY_INTRADAY);

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date());
      setNiftyData(prev => {
        const last = prev[prev.length - 1];
        const newPoint = { time: "Live", value: last.value + (Math.random() - 0.5) * 80 };
        return [...prev.slice(1), newPoint];
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        {/* Admin-editable banner */}
        <PageSectionsBanner pageKey="markets" />

        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Markets</h1>
            <p className="text-sm text-muted-foreground mt-1">BSE / NSE · Derivatives · Commodities · Global</p>
          </div>
          <button onClick={() => setLastUpdated(new Date())} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </button>
        </div>

        {/* Live Indices */}
        <section>
          <SectionHeading icon={TrendingUp} title="Live Market Indices" />
          <MarketIndices />
        </section>

        {/* Intraday Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">NIFTY 50 — Intraday</h3>
              <span className="text-xs text-muted-foreground font-semibold bg-muted/60 px-2 py-0.5 rounded">~ Simulated</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={niftyData}>
                <defs>
                  <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152,69%,31%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(152,69%,31%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={4} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} width={55} tickFormatter={v => v.toLocaleString("en-IN")} />
                <Tooltip formatter={(v: any) => [Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }), "NIFTY"]} />
                <Area type="monotone" dataKey="value" stroke="hsl(152,69%,31%)" strokeWidth={2} fill="url(#niftyGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-foreground">SENSEX — Intraday</h3>
              <span className="text-xs text-muted-foreground font-semibold bg-muted/60 px-2 py-0.5 rounded">~ Simulated</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={SENSEX_INTRADAY}>
                <defs>
                  <linearGradient id="sensexGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={4} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} width={62} tickFormatter={v => v.toLocaleString("en-IN")} />
                <Tooltip formatter={(v: any) => [Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }), "SENSEX"]} />
                <Area type="monotone" dataKey="value" stroke="hsl(217,91%,60%)" strokeWidth={2} fill="url(#sensexGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sector Volume */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading icon={BarChart3} title="Sector-wise Volume (Cr)" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SECTOR_VOLUME} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sector" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="volume" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Global Markets */}
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold text-sm text-foreground">Global Markets</span>
            </div>
            <div className="divide-y divide-border">
              {GLOBAL_MARKETS.map((m) => (
                <div key={m.name} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">{m.region}</div>
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="number-font text-sm font-semibold text-foreground">{m.value}</span>
                    <span className={`flex items-center gap-0.5 text-xs font-bold ${m.up ? "text-gain" : "text-loss"}`}>
                      {m.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {m.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Derivatives */}
        <section>
          <SectionHeading title="Top F&O Contracts" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Symbol", "LTP", "Change", "OI", "Trend"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DERIVATIVES.map((d) => (
                    <tr key={d.symbol} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{d.symbol}</td>
                      <td className="px-5 py-3.5 number-font font-semibold">{d.ltp}</td>
                      <td className={`px-5 py-3.5 number-font font-bold ${d.up ? "text-gain" : "text-loss"}`}>{d.change}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{d.oi}</td>
                      <td className="px-5 py-3.5">
                        {d.up ? <ArrowUp className="h-4 w-4 text-gain" /> : <ArrowDown className="h-4 w-4 text-loss" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Gainers Losers */}
        <section>
          <SectionHeading icon={TrendingUp} title="Market Movers" />
          <GainersLosers />
        </section>

      <ComplianceDisclaimer variant="card" className="mt-8" />
      </main>
      <Footer />
    </div>
  );
}
