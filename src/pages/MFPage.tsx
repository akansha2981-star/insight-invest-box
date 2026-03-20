import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { PageSectionsBanner } from "@/components/PageSectionsBanner";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import { Star } from "lucide-react";
import { TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

const TOP_FUNDS = [
  { name: "Mirae Asset Large Cap", category: "Large Cap", nav: "₹108.42", ret1y: "28.4%", ret3y: "18.2%", aum: "₹38,420 Cr", rating: 5, up: true },
  { name: "Axis Bluechip Fund", category: "Large Cap", nav: "₹56.18", ret1y: "22.1%", ret3y: "15.8%", aum: "₹32,184 Cr", rating: 5, up: true },
  { name: "Parag Parikh Flexi Cap", category: "Flexi Cap", nav: "₹74.32", ret1y: "31.6%", ret3y: "22.4%", aum: "₹55,248 Cr", rating: 5, up: true },
  { name: "HDFC Mid-Cap Opportunities", category: "Mid Cap", nav: "₹142.84", ret1y: "42.8%", ret3y: "28.1%", aum: "₹48,732 Cr", rating: 4, up: true },
  { name: "SBI Small Cap Fund", category: "Small Cap", nav: "₹198.24", ret1y: "38.2%", ret3y: "31.4%", aum: "₹24,816 Cr", rating: 4, up: true },
  { name: "ICICI Pru Balanced Advantage", category: "Hybrid", nav: "₹62.48", ret1y: "18.2%", ret3y: "14.6%", aum: "₹52,184 Cr", rating: 4, up: true },
];

const TOP_ETFS = [
  { name: "Nifty BeES", symbol: "NIFTYBEES", nav: "₹224.32", change: "+1.08%", up: true, aum: "₹18,420 Cr" },
  { name: "Sensex ETF", symbol: "SETFNIF50", nav: "₹738.18", change: "+1.11%", up: true, aum: "₹12,318 Cr" },
  { name: "Gold BeES", symbol: "GOLDBEES", nav: "₹56.42", change: "+0.52%", up: true, aum: "₹8,742 Cr" },
  { name: "IT ETF", symbol: "ITETF", nav: "₹186.24", change: "+1.84%", up: true, aum: "₹4,218 Cr" },
  { name: "Bank BeES", symbol: "BANKBEES", nav: "₹482.16", change: "-0.42%", up: false, aum: "₹9,842 Cr" },
];

const ASSET_ALLOCATION = [
  { name: "Equity", value: 55, color: "hsl(217,91%,60%)" },
  { name: "Debt", value: 25, color: "hsl(152,69%,31%)" },
  { name: "Hybrid", value: 12, color: "hsl(38,92%,50%)" },
  { name: "Gold", value: 5, color: "hsl(45,93%,47%)" },
  { name: "Others", value: 3, color: "hsl(var(--muted-foreground))" },
];

const SIP_TREND = [
  { month: "Mar", sip: 19270 }, { month: "Apr", sip: 20370 }, { month: "May", sip: 21262 },
  { month: "Jun", sip: 21261 }, { month: "Jul", sip: 23332 }, { month: "Aug", sip: 20782 },
  { month: "Sep", sip: 18873 }, { month: "Oct", sip: 16928 }, { month: "Nov", sip: 17073 },
  { month: "Dec", sip: 17610 }, { month: "Jan", sip: 18838 }, { month: "Feb", sip: 19187 },
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

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "text-amber-400" : "text-muted-foreground/30"}>★</span>
      ))}
    </div>
  );
}

export default function MFPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        <PageSectionsBanner pageKey="mf" />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Mutual Funds & ETFs</h1>
          <p className="text-sm text-muted-foreground mt-1">Top Performers · SIP Trends · ETF Tracker · Asset Allocation</p>
        </div>

        {/* Charts row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading title="Industry SIP Inflows (₹ Cr)" />
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SIP_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")} Cr`, "SIP Inflows"]} />
                <Line type="monotone" dataKey="sip" stroke="hsl(217,91%,60%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading title="MF Industry — Asset Allocation" />
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={ASSET_ALLOCATION} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {ASSET_ALLOCATION.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, "Allocation"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {ASSET_ALLOCATION.map((a) => (
                  <div key={a.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: a.color }} />
                    <span className="text-xs text-muted-foreground">{a.name}</span>
                    <span className="text-xs font-bold text-foreground ml-auto">{a.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Top Funds Table */}
        <section>
          <SectionHeading icon={TrendingUp} title="Top Performing Mutual Funds" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Fund Name", "Category", "NAV", "1Y Return", "3Y Return", "AUM", "Rating"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOP_FUNDS.map((f) => (
                    <tr key={f.name} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 font-semibold text-foreground max-w-[200px]">{f.name}</td>
                      <td className="px-5 py-3.5"><span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">{f.category}</span></td>
                      <td className="px-5 py-3.5 number-font font-semibold">{f.nav}</td>
                      <td className="px-5 py-3.5 number-font font-bold text-gain">{f.ret1y}</td>
                      <td className="px-5 py-3.5 number-font font-bold text-gain">{f.ret3y}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{f.aum}</td>
                      <td className="px-5 py-3.5"><Stars n={f.rating} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ETFs */}
        <section>
          <SectionHeading title="Top ETFs — Live NAV" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TOP_ETFS.map((etf) => (
              <div key={etf.symbol} className="bg-white border border-border rounded-xl p-4 shadow-card hover:shadow-card-md transition-all cursor-pointer">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">{etf.symbol}</div>
                <div className="font-bold text-sm text-foreground mb-1 line-clamp-1">{etf.name}</div>
                <div className="number-font text-lg font-bold text-foreground">{etf.nav}</div>
                <div className={`flex items-center gap-0.5 text-xs font-bold mt-1 ${etf.up ? "text-gain" : "text-loss"}`}>
                  {etf.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {etf.change}
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">{etf.aum}</div>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
