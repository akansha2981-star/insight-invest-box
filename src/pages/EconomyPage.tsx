import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { PageSectionsBanner } from "@/components/PageSectionsBanner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar
} from "recharts";
import { Landmark, TrendingUp, Globe, BarChart3, ArrowUp, ArrowDown } from "lucide-react";

const GDP_DATA = [
  { quarter: "Q1 FY22", gdp: 8.4 }, { quarter: "Q2 FY22", gdp: 8.4 },
  { quarter: "Q3 FY22", gdp: 5.4 }, { quarter: "Q4 FY22", gdp: 4.1 },
  { quarter: "Q1 FY23", gdp: 13.5 }, { quarter: "Q2 FY23", gdp: 6.3 },
  { quarter: "Q3 FY23", gdp: 4.4 }, { quarter: "Q4 FY23", gdp: 6.1 },
  { quarter: "Q1 FY24", gdp: 7.8 }, { quarter: "Q2 FY24", gdp: 7.6 },
  { quarter: "Q3 FY24", gdp: 8.4 }, { quarter: "Q4 FY24", gdp: 7.8 },
];

const INFLATION_DATA = [
  { month: "Mar", cpi: 5.66 }, { month: "Apr", cpi: 4.83 }, { month: "May", cpi: 4.75 },
  { month: "Jun", cpi: 5.08 }, { month: "Jul", cpi: 3.54 }, { month: "Aug", cpi: 3.65 },
  { month: "Sep", cpi: 5.49 }, { month: "Oct", cpi: 6.21 }, { month: "Nov", cpi: 5.48 },
  { month: "Dec", cpi: 5.69 }, { month: "Jan", cpi: 5.10 }, { month: "Feb", cpi: 5.09 },
];

const MACRO_INDICATORS = [
  { label: "GDP Growth (FY24)", value: "8.2%", change: "+0.4%", up: true, note: "FY23: 7.8%" },
  { label: "CPI Inflation", value: "5.09%", change: "-0.01%", up: false, note: "RBI target: 4%" },
  { label: "Repo Rate", value: "6.50%", change: "0.00%", up: null, note: "Unchanged since Feb 23" },
  { label: "Forex Reserves", value: "$645B", change: "+$2.3B", up: true, note: "All-time high" },
  { label: "Current Account", value: "-1.2% GDP", change: "-0.3%", up: false, note: "Q3 FY24" },
  { label: "Fiscal Deficit", value: "5.6% GDP", change: "-0.2%", up: true, note: "FY24 target: 5.8%" },
];

const RBI_ANNOUNCEMENTS = [
  { date: "Apr 5, 2024", title: "RBI keeps repo rate unchanged at 6.5%", category: "Monetary Policy" },
  { date: "Mar 28, 2024", title: "RBI releases draft guidelines on fintech regulations", category: "Regulation" },
  { date: "Feb 8, 2024", title: "RBI holds rates; projects FY25 GDP at 7%", category: "Monetary Policy" },
  { date: "Jan 15, 2024", title: "RBI introduces digital rupee pilot in retail segment", category: "CBDC" },
  { date: "Dec 20, 2023", title: "Inflation expected to moderate in H2 FY24: RBI", category: "Inflation" },
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

export default function EconomyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />
      <main className="max-w-[1440px] mx-auto px-4 py-6 space-y-8">

        <PageSectionsBanner pageKey="economy" />

        <div>
          <h1 className="text-2xl font-bold text-foreground">Indian Economy</h1>
          <p className="text-sm text-muted-foreground mt-1">GDP · Inflation · Monetary Policy · Fiscal Data</p>
        </div>

        {/* Macro indicators */}
        <section>
          <SectionHeading icon={Landmark} title="Key Macro Indicators" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {MACRO_INDICATORS.map((ind) => (
              <div key={ind.label} className="bg-white border border-border rounded-xl p-4 shadow-card">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">{ind.label}</div>
                <div className="number-font text-xl font-bold text-foreground mb-1">{ind.value}</div>
                <div className={`flex items-center gap-0.5 text-xs font-semibold ${ind.up === true ? "text-gain" : ind.up === false ? "text-loss" : "text-muted-foreground"}`}>
                  {ind.up === true && <ArrowUp className="h-3 w-3" />}
                  {ind.up === false && <ArrowDown className="h-3 w-3" />}
                  {ind.change}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{ind.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading icon={TrendingUp} title="GDP Growth Rate (%)" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={GDP_DATA} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quarter" tick={{ fontSize: 8 }} interval={1} angle={-30} textAnchor="end" height={40} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, "GDP Growth"]} />
                <Bar dataKey="gdp" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-card p-5">
            <SectionHeading icon={BarChart3} title="CPI Inflation Trend (%)" />
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={INFLATION_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[3, 7]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, "CPI"]} />
                <Line type="monotone" dataKey="cpi" stroke="hsl(4,90%,50%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* RBI Announcements */}
        <section>
          <SectionHeading icon={Landmark} title="RBI Announcements" />
          <div className="bg-white border border-border rounded-xl shadow-card divide-y divide-border overflow-hidden">
            {RBI_ANNOUNCEMENTS.map((a) => (
              <div key={a.title} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer group">
                <div className="shrink-0 text-xs text-muted-foreground font-medium pt-0.5 w-24">{a.date}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{a.title}</div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded mt-1 inline-block">{a.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
