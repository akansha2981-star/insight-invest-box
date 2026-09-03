import { useState } from "react";
import { Search, TrendingUp, BarChart3, ShieldCheck, ArrowRight, Newspaper, LineChart, Calculator, Building2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/bse-editorial-hero.jpg";

const POPULAR_SEARCHES = [
  "NIFTY 50 Analysis",
  "Best Mutual Funds",
  "Gold Price Today",
  "IPO Calendar",
  "Tax Saving ELSS",
];

const STATS = [
  { icon: BarChart3, value: "NSE + BSE", label: "Indian Market Coverage", detail: "Indices, equities and breadth", tone: "text-primary bg-primary/10" },
  { icon: TrendingUp, value: "1,200+", label: "Research Reviews", detail: "Targets, ratings and thesis", tone: "text-gain bg-gain-light" },
  { icon: RefreshCw, value: "30 sec", label: "Market Refresh", detail: "During standard market hours", tone: "text-primary bg-secondary" },
  { icon: ShieldCheck, value: "Research First", label: "Transparent Insights", detail: "Sources and disclosures shown", tone: "text-gold bg-gold-light" },
];

function StatCard({ stat }: { stat: typeof STATS[number] }) {
  const Icon = stat.icon;
  return (
    <div className="group flex min-h-[94px] items-center gap-3 border border-border bg-card p-3.5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-md sm:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${stat.tone}`}>
        <Icon className="h-5 w-5" strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <div className="font-home-display text-sm font-bold text-foreground sm:text-base">
          {stat.value}
        </div>
        <div className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground">{stat.label}</div>
        <div className="mt-1 hidden text-[10px] text-muted-foreground sm:block">{stat.detail}</div>
      </div>
    </div>
  );
}

const INTELLIGENCE_LINKS = [
  { icon: Newspaper, label: "Latest market news", detail: "Breaking updates and expert context", to: "/news-hub" },
  { icon: LineChart, label: "Stock research", detail: "Ratings, targets and investment thesis", to: "/stocks/reviews" },
  { icon: Calculator, label: "Financial calculators", detail: "Plan loans, SIPs, tax and goals", to: "/tools" },
  { icon: Building2, label: "Real estate intelligence", detail: "Prices, projects and locality trends", to: "/real-estate" },
];

export function HomeHero() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/news-hub?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <section className="border-b border-border bg-muted/30 font-home">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:py-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-primary">InvestingIQ Intelligence Desk</p>
            <h2 className="mt-1 font-home-display text-lg font-bold text-foreground sm:text-xl">Research the market from one place</h2>
          </div>
          <p className="hidden max-w-md text-right text-xs leading-5 text-muted-foreground md:block">Live Indian markets, institutional-style stock research, financial tools and property intelligence in one focused dashboard.</p>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {STATS.map(stat => <StatCard key={stat.label} stat={stat} />)}
        </div>

        <div className="grid overflow-hidden border border-border bg-card shadow-card-md lg:grid-cols-12">
          <div className="group relative min-h-[390px] overflow-hidden lg:col-span-8 lg:min-h-[460px]">
            <img
              src={heroImage}
              alt="Mumbai financial district representing Indian market intelligence"
              width={1536}
              height={864}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 max-w-3xl p-5 sm:p-8 lg:p-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-sm bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-gain-light" />
                India market intelligence
              </div>
              <h1 className="font-home-display text-3xl font-bold leading-tight text-primary-foreground sm:text-4xl lg:text-5xl">
                Smart investing starts with better research.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/85 sm:text-base">
                Real-time market data, expert analysis and AI-powered insights built for India's ambitious investors.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate("/stocks")} className="group/cta bg-card text-card-foreground hover:bg-card/90">
                  Explore Markets <ArrowRight className="transition-transform group-hover/cta:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/news-hub")} className="border-primary-foreground/60 bg-foreground/25 text-primary-foreground hover:bg-primary-foreground hover:text-foreground">
                  Market News
                </Button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col border-t border-border p-5 lg:col-span-4 lg:border-l lg:border-t-0 lg:p-6" aria-label="Search and market intelligence links">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-home-display text-sm font-bold uppercase text-foreground">Investor Desk</h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-gain">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gain" /> Live
              </span>
            </div>

            <form onSubmit={handleSearch} className="mb-4">
              <label htmlFor="hero-market-search" className="mb-2 block text-xs font-bold text-foreground">Search InvestingIQ</label>
              <div className="flex min-h-12 items-center border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <Search className="ml-3.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <input
                  id="hero-market-search"
                  type="search"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Stocks, news, funds, IPOs..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="sm" className="mr-1.5 shrink-0">Search</Button>
              </div>
            </form>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {POPULAR_SEARCHES.slice(0, 4).map(tag => (
                <button key={tag} type="button" onClick={() => setQuery(tag)} className="rounded-sm border border-border bg-muted/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
                  {tag}
                </button>
              ))}
            </div>

            <div className="divide-y divide-border border-y border-border">
              {INTELLIGENCE_LINKS.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.label} type="button" onClick={() => navigate(item.to)} className="group/link flex w-full items-center gap-3 py-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover/link:bg-primary group-hover/link:text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-foreground">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{item.detail}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover/link:translate-x-1 group-hover/link:text-primary" />
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
