import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, X, TrendingUp, ChevronDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/SearchBar";
import { MobileSearchModal } from "@/components/MobileSearchModal";
import logoImg from "@/assets/logo-investingiq.png";

const NAV_ITEMS = [
  { label: "Markets", href: "/markets", sub: [
    { label: "BSE / NSE", href: "/markets" },
    { label: "Derivatives", href: "/markets" },
    { label: "Commodities", href: "/markets" },
    { label: "Currency", href: "/markets" },
    { label: "Global Markets", href: "/markets" },
    { label: "IPO Corner", href: "/markets" },
  ]},
  { label: "Stocks", href: "/stocks", sub: [
    { label: "Top Gainers", href: "/stocks" },
    { label: "Top Losers", href: "/stocks" },
    { label: "Stock Screener", href: "/stocks" },
    { label: "52W High / Low", href: "/stocks" },
    { label: "Stock Reviews", href: "/stocks/reviews" },
    { label: "Most Active", href: "/stocks" },
  ]},
  { label: "Stock Reviews", href: "/stocks/reviews" },
  { label: "News", href: "/news", sub: [
    { label: "Markets", href: "/news" },
    { label: "Economy", href: "/economy" },
    { label: "Companies", href: "/news" },
    { label: "Budget 2026", href: "/news" },
    { label: "Commodities", href: "/markets" },
    { label: "Global", href: "/news" },
  ]},
  { label: "Economy", href: "/economy" },
  { label: "Real Estate", href: "/real-estate", sub: [
    { label: "Buy Property", href: "/real-estate" },
    { label: "Rent Property", href: "/real-estate" },
    { label: "Price Trends", href: "/real-estate" },
    { label: "Interior Design", href: "/real-estate" },
    { label: "Services", href: "/real-estate" },
  ]},
  { label: "MF & ETF", href: "/mf" },
  { label: "Crypto", href: "/crypto" },
  { label: "Portfolio", href: "/portfolio" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [mobileSearch, setMobileSearch] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      {/* Dark top strip */}
      <div className="bg-slate-900 text-white/80 text-xs">
        <div className="max-w-[1440px] mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>BSE: <span className="text-emerald-400 font-semibold">OPEN</span></span>
            <span className="text-white/20">|</span>
            <span>NSE: <span className="text-emerald-400 font-semibold">OPEN</span></span>
            <span className="text-white/20 hidden md:inline">|</span>
            <span className="hidden md:inline">MCX: <span className="text-emerald-400 font-semibold">OPEN</span></span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-white/60">Hi, {user.email?.split('@')[0]}</span>
                <Link to="/admin" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Admin Portal →</Link>
                <button onClick={() => supabase.auth.signOut()} className="text-white/40 hover:text-white/70 transition-colors">Logout</button>
              </>
            ) : (
              <>
                <Link to="/admin/login" className="hover:text-white transition-colors">Login</Link>
                <span className="text-white/20">|</span>
                <Link to="/admin/login" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main header row */}
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center gap-5">
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <img src={logoImg} alt="InvestingIQ" className="h-9 w-auto group-hover:scale-105 transition-transform" />
          <div>
            <div className="font-black text-[22px] text-foreground tracking-tight leading-none">Investing IQ</div>
            <div className="text-[9px] font-bold text-muted-foreground tracking-[0.2em] uppercase">Financial Intelligence</div>
          </div>
        </Link>

        <SearchBar />

        <nav className="hidden lg:flex items-center">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => setActiveDropdown(item.label)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to={item.href}
                className={`flex items-center gap-0.5 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  activeDropdown === item.label ? 'text-primary bg-primary/8' : 'text-foreground/75 hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
                {item.sub && <ChevronDown className={`h-3.5 w-3.5 ml-0.5 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />}
              </Link>
              {item.sub && activeDropdown === item.label && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-xl shadow-card-lg z-50 min-w-[200px] py-2">
                  {item.sub.map((sub) => (
                    <Link key={sub.label} to={sub.href} className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-primary hover:bg-blue-50 transition-colors">
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile search button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            onClick={() => setMobileSearch(true)}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button className="hidden md:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-border px-4 pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="block py-3 text-sm font-medium text-foreground border-b border-border/50 last:border-0 hover:text-primary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <MobileSearchModal open={mobileSearch} onClose={() => setMobileSearch(false)} />
    </header>
  );
}
