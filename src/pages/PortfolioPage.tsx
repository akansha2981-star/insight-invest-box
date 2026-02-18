import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { PageSectionsBanner } from "@/components/PageSectionsBanner";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";
import { TrendingUp, ArrowUp, ArrowDown, Target, Briefcase, PieChart as PieIcon, Activity } from "lucide-react";

const PORTFOLIO_HOLDINGS = [
  { symbol: "RELIANCE", name: "Reliance Industries", qty: 25, avgPrice: 2420, cmp: 2741, invested: 60500, current: 68525, pnl: 8025, pnlPct: 13.26, up: true },
  { symbol: "TCS", name: "TCS Ltd", qty: 10, avgPrice: 3840, cmp: 4182, invested: 38400, current: 41820, pnl: 3420, pnlPct: 8.91, up: true },
  { symbol: "HDFCBANK", name: "HDFC Bank", qty: 30, avgPrice: 1680, cmp: 1623, invested: 50400, current: 48690, pnl: -1710, pnlPct: -3.39, up: false },
  { symbol: "INFY", name: "Infosys", qty: 20, avgPrice: 1620, cmp: 1847, invested: 32400, current: 36940, pnl: 4540, pnlPct: 14.01, up: true },
  { symbol: "ICICIBANK", name: "ICICI Bank", qty: 40, avgPrice: 980, cmp: 1087, invested: 39200, current: 43480, pnl: 4280, pnlPct: 10.92, up: true },
];

const ALLOCATION_DATA = [
  { name: "IT", value: 35, color: "hsl(217,91%,60%)" },
  { name: "Banking", value: 30, color: "hsl(152,69%,31%)" },
  { name: "Energy", value: 25, color: "hsl(38,92%,50%)" },
  { name: "Others", value: 10, color: "hsl(var(--muted-foreground))" },
];

const PORTFOLIO_TREND = Array.from({ length: 12 }, (_, i) => ({
  month: ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"][i],
  value: 200000 + Math.sin(i / 2) * 15000 + i * 8000 + Math.random() * 5000,
}));

const totalInvested = PORTFOLIO_HOLDINGS.reduce((s, h) => s + h.invested, 0);
const totalCurrent = PORTFOLIO_HOLDINGS.reduce((s, h) => s + h.current, 0);
const totalPnL = totalCurrent - totalInvested;
const totalPnLPct = ((totalPnL / totalInvested) * 100).toFixed(2);

function SectionHeading({ icon: Icon, title }: { icon?: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 bg-red-600 rounded-full" />
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="font-bold text-base text-foreground">{title}</h2>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        <PageSectionsBanner pageKey="portfolio" />

        <div>
          <h1 className="text-2xl font-bold text-foreground">My Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">Holdings · P&amp;L · Allocation · Performance</p>
        </div>

        {/* Summary cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Invested", value: `₹${totalInvested.toLocaleString("en-IN")}`, icon: Briefcase, color: "text-foreground", bg: "bg-muted" },
            { label: "Current Value", value: `₹${totalCurrent.toLocaleString("en-IN")}`, icon: Activity, color: "text-primary", bg: "bg-primary/8" },
            { label: "Total P&L", value: `₹${totalPnL.toLocaleString("en-IN")}`, icon: TrendingUp, color: totalPnL >= 0 ? "text-gain" : "text-loss", bg: totalPnL >= 0 ? "bg-[hsl(var(--gain-light))]" : "bg-red-50" },
            { label: "Returns", value: `${totalPnLPct}%`, icon: Target, color: Number(totalPnLPct) >= 0 ? "text-gain" : "text-loss", bg: "bg-muted" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-border rounded-xl p-5 shadow-card">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className={`number-font text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Portfolio trend + Allocation */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading icon={Activity} title="Portfolio Value — 12 Months" />
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={PORTFOLIO_TREND}>
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} width={50} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "Value"]} />
                <Area type="monotone" dataKey="value" stroke="hsl(217,91%,60%)" strokeWidth={2} fill="url(#portGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading icon={PieIcon} title="Sector Allocation" />
            <div className="flex flex-col items-center">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={ALLOCATION_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {ALLOCATION_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, "Allocation"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 w-full mt-2">
                {ALLOCATION_DATA.map((d) => (
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

        {/* Holdings table */}
        <section>
          <SectionHeading icon={Briefcase} title="Holdings" />
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["Stock", "Qty", "Avg Price", "CMP", "Invested", "Current Value", "P&L", "P&L %"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PORTFOLIO_HOLDINGS.map((h) => (
                    <tr key={h.symbol} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{h.symbol}</div>
                        <div className="text-[10px] text-muted-foreground">{h.name}</div>
                      </td>
                      <td className="px-5 py-3.5 number-font text-muted-foreground">{h.qty}</td>
                      <td className="px-5 py-3.5 number-font text-muted-foreground">₹{h.avgPrice.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 number-font font-semibold text-foreground">₹{h.cmp.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 number-font text-muted-foreground">₹{h.invested.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 number-font font-semibold text-foreground">₹{h.current.toLocaleString("en-IN")}</td>
                      <td className={`px-5 py-3.5 number-font font-bold ${h.up ? "text-gain" : "text-loss"}`}>
                        {h.up ? "+" : ""}₹{h.pnl.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${h.up ? "text-gain" : "text-loss"}`}>
                          {h.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(h.pnlPct).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t-2 border-border">
                    <td colSpan={4} className="px-5 py-3 font-bold text-sm text-foreground">Total</td>
                    <td className="px-5 py-3 number-font font-bold text-foreground">₹{totalInvested.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 number-font font-bold text-foreground">₹{totalCurrent.toLocaleString("en-IN")}</td>
                    <td className={`px-5 py-3 number-font font-bold ${totalPnL >= 0 ? "text-gain" : "text-loss"}`}>
                      {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toLocaleString("en-IN")}
                    </td>
                    <td className={`px-5 py-3 number-font font-bold ${Number(totalPnLPct) >= 0 ? "text-gain" : "text-loss"}`}>
                      {Number(totalPnLPct) >= 0 ? "+" : ""}{totalPnLPct}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
