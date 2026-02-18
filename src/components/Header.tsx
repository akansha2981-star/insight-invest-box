import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, Menu, X, TrendingUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV_ITEMS = [
  { label: "Markets", href: "/markets", sub: ["Equity", "Derivatives", "Commodities", "Currency", "IPO"] },
  { label: "Stocks", href: "/stocks", sub: ["BSE", "NSE", "Top Gainers", "Top Losers", "52 Week High"] },
  { label: "News", href: "/news", sub: ["Markets", "Economy", "Companies", "Commodities", "Global"] },
  { label: "Economy", href: "/economy" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Tools", href: "/tools" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-header border-b border-surface sticky top-0 z-50">
      {/* Top bar */}
      <div className="border-b border-surface/50 px-4 py-1.5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>BSE: <span className="text-gain font-medium">OPEN</span></span>
            <span>NSE: <span className="text-gain font-medium">OPEN</span></span>
            <span className="hidden md:inline">Last updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden md:inline">₹ INR</span>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-foreground">{user.email?.split('@')[0]}</span>
                <button onClick={() => { supabase.auth.signOut(); navigate('/'); }} className="text-muted-foreground hover:text-loss transition-colors">Logout</button>
                <Link to="/admin" className="text-primary hover:text-primary/80 transition-colors font-medium">Admin</Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/admin/login" className="hover:text-foreground transition-colors">Login</Link>
                <span>|</span>
                <Link to="/admin/login" className="hover:text-foreground transition-colors">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="px-4 py-2.5">
        <div className="max-w-[1400px] mx-auto flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-primary rounded p-1.5">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-black text-xl tracking-tight text-foreground leading-none">MarketPulse</div>
              <div className="text-[9px] text-muted-foreground tracking-widest uppercase">Financial Intelligence</div>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md hidden md:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stocks, news, companies..."
              className="w-full bg-surface-2 border border-surface text-sm pl-9 pr-4 py-2 rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-surface-3 transition-all"
            />
          </div>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={item.href}
                  className="flex items-center gap-0.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded transition-all"
                >
                  {item.label}
                  {item.sub && <ChevronDown className="h-3 w-3" />}
                </Link>
                {item.sub && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-surface rounded shadow-2xl shadow-black/50 z-50 min-w-[160px] py-1">
                    {item.sub.map((sub) => (
                      <a key={sub} href="#" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
                        {sub}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="p-1.5 text-muted-foreground hover:text-foreground hidden md:flex transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <button
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-card border-t border-surface px-4 pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="block py-2.5 text-sm text-muted-foreground hover:text-foreground border-b border-surface/50 last:border-0 transition-colors"
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
