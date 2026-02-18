import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, X, TrendingUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/SearchBar";

const NAV_ITEMS = [
  { label: "Markets", href: "/markets", sub: ["BSE / NSE", "Derivatives", "Commodities", "Currency", "Global Markets", "IPO"] },
  { label: "Stocks", href: "/stocks", sub: ["Top Gainers", "Top Losers", "52W High", "52W Low", "Most Active", "Stock Screener"] },
  { label: "Stock Reviews", href: "/stocks/reviews" },
  { label: "News", href: "/news", sub: ["Markets", "Economy", "Companies", "Budget 2025", "Commodities", "Global"] },
  { label: "Economy", href: "/economy" },
  { label: "MF & ETF", href: "/mf" },
  { label: "Crypto", href: "/crypto" },
  { label: "Portfolio", href: "/portfolio" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

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
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="bg-red-600 rounded-lg p-2 group-hover:scale-105 transition-transform shadow-sm">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
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
                <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-xl shadow-card-lg z-50 min-w-[180px] py-2">
                  {item.sub.map((sub) => (
                    <a key={sub} href="#" className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-primary hover:bg-blue-50 transition-colors">
                      {sub}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
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
    </header>
  );
}
