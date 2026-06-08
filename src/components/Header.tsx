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
  { label: "Stock Analysis", href: "/stocks/reviews", sub: [
    { label: "All Stock Reviews", href: "/stocks/reviews" },
    { label: "Strong Buy Picks", href: "/stocks/reviews?rating=STRONG+BUY" },
    { label: "Buy Recommendations", href: "/stocks/reviews?rating=BUY" },
    { label: "Hold Calls", href: "/stocks/reviews?rating=HOLD" },
    { label: "Featured Analysis", href: "/stocks/reviews?featured=1" },
    { label: "Stock Screener", href: "/tools/screener" },
  ]},
  { label: "News", href: "/news", sub: [
    { label: "Markets", href: "/news" },
    { label: "Economy", href: "/economy" },
    { label: "Companies", href: "/news" },
    { label: "Budget 2026", href: "/news" },
    { label: "Commodities", href: "/markets" },
    { label: "Global", href: "/news" },
  ]},
  { label: "Real Estate", href: "/real-estate", sub: [
    { label: "Buy Property", href: "/real-estate" },
    { label: "Rent Property", href: "/real-estate" },
    { label: "PG / Paying Guest", href: "/real-estate" },
    { label: "Price Trends", href: "/real-estate" },
    { label: "Interior Design", href: "/real-estate" },
    { label: "Services", href: "/real-estate" },
  ]},
  { label: "MF & ETF", href: "/mf" },
  { label: "Crypto", href: "/crypto" },
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
      {/* Top row: Logo + Search + Actions */}
      <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <img src={logoImg} alt="InvestingIQ" className="h-11 md:h-14 w-auto -my-1 group-hover:scale-105 transition-transform" />
          <div className="hidden sm:block">
            <div className="font-black text-[19px] text-foreground tracking-tight leading-none">Investing IQ</div>
            <div className="text-[8px] font-bold text-muted-foreground tracking-[0.2em] uppercase mt-0.5">Financial Intelligence</div>
          </div>
        </Link>

        <div className="flex-1 max-w-2xl mx-auto hidden md:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Mobile search button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            onClick={() => setMobileSearch(true)}
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            className="hidden md:flex p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>

          <div className="hidden md:flex items-center gap-1.5 ml-1 text-sm">
            {user ? (
              <>
                <Link to="/admin" className="px-3 py-1.5 text-foreground/80 hover:text-primary font-medium transition-colors">
                  Admin
                </Link>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-3 py-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 py-1.5 text-foreground/80 hover:text-primary font-medium transition-colors">
                  Login
                </Link>
                <Link to="/login?mode=signup" className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors text-[13px]">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Bottom row: Navigation */}
      <div className="hidden lg:block border-t border-border/60 bg-white">
        <div className="max-w-[1440px] mx-auto px-4">
          <nav className="flex items-center gap-0.5 -mb-px">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.sub ? (
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                    className={`flex items-center gap-1 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors border-b-2 ${
                      activeDropdown === item.label
                        ? 'text-primary border-primary'
                        : 'text-foreground/80 border-transparent hover:text-primary'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    className="flex items-center px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors border-b-2 border-transparent text-foreground/80 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                )}
                {item.sub && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 bg-white border border-border rounded-xl shadow-card-lg z-50 min-w-[220px] py-2">
                    <Link to={item.href} onClick={() => setActiveDropdown(null)} className="block px-4 py-2.5 text-sm font-semibold text-primary hover:bg-blue-50 transition-colors border-b border-border/60 mb-1">
                      All {item.label} →
                    </Link>
                    {item.sub.map((sub) => (
                      <Link key={sub.label} to={sub.href} onClick={() => setActiveDropdown(null)} className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-primary hover:bg-blue-50 transition-colors">
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
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
