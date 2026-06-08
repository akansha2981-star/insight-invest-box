import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Calculator, TrendingUp, Target, Home, GraduationCap, Heart, Flame, PiggyBank, Briefcase, Wallet, Layers } from "lucide-react";

const TOOLS = [
  { l: "SIP Calculator", h: "/tools/sip", icon: TrendingUp, d: "Calculate mutual fund SIP returns" },
  { l: "Step-Up SIP Calculator", h: "/tools/step-up-sip", icon: TrendingUp, d: "SIP with annual increase" },
  { l: "Lumpsum Calculator", h: "/tools/lumpsum-calculator", icon: Wallet, d: "One-time investment growth" },
  { l: "SWP Calculator", h: "/tools/swp-calculator", icon: PiggyBank, d: "Systematic withdrawal plan" },
  { l: "Goal SIP Planner", h: "/tools/goal-sip", icon: Target, d: "Plan SIP for any goal" },
  { l: "Retirement SIP", h: "/tools/retirement-sip", icon: Home, d: "Retirement corpus planner" },
  { l: "Child Education SIP", h: "/tools/child-education-sip", icon: GraduationCap, d: "Education goal planner" },
  { l: "Marriage SIP", h: "/tools/marriage-sip", icon: Heart, d: "Wedding fund planner" },
  { l: "Inflation Adjusted SIP", h: "/tools/inflation-sip", icon: TrendingUp, d: "Real returns calculator" },
  { l: "FIRE Calculator", h: "/tools/fire-calculator", icon: Flame, d: "Financial independence target" },
  { l: "Portfolio Analyzer", h: "/tools/portfolio-analyzer", icon: Briefcase, d: "Analyze your MF portfolio" },
  { l: "EMI Calculator", h: "/tools/emi", icon: Calculator, d: "Loan EMI breakup" },
  { l: "FD Calculator", h: "/tools/fd", icon: Calculator, d: "Fixed deposit returns" },
  { l: "Tax Calculator", h: "/tools/tax", icon: Calculator, d: "Income tax estimator" },
  { l: "Stock Screener", h: "/tools/screener", icon: Layers, d: "Advanced stock filters" },
  { l: "Portfolio Tester", h: "/tools/portfolio", icon: Briefcase, d: "Backtest portfolios" },
];

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>Financial Calculators & Tools | InvestingIQ</title>
        <meta name="description" content="16+ free financial calculators: SIP, Step-Up SIP, Goal SIP, Retirement, FIRE, EMI, FD, Tax, Portfolio Analyzer and more." />
        <link rel="canonical" href="https://www.investingiq.in/tools" />
      </Helmet>
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-8 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Financial Calculators & Tools</h1>
          <p className="text-white/80 max-w-2xl">Free calculators for SIP, retirement, FIRE, loans, taxes and mutual fund portfolio analysis.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TOOLS.map(t => (
            <Link key={t.h} to={t.h} className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3"><t.icon className="h-5 w-5 text-primary" /></div>
              <div className="font-bold text-sm">{t.l}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.d}</div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
