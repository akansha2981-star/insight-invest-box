import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-header border-t border-surface mt-12">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-primary rounded p-1">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-black text-lg text-foreground">MarketPulse</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              India's leading financial intelligence platform. Real-time data, expert analysis, and market insights.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Disclaimer: MarketPulse is for informational purposes only. Not investment advice.
            </p>
          </div>

          {[
            {
              title: "Markets", links: ["BSE", "NSE", "Sensex", "Nifty 50", "Commodities", "Currencies"]
            },
            {
              title: "News", links: ["Market News", "Economy", "Companies", "Global Markets", "Budget 2025", "IPO News"]
            },
            {
              title: "Tools", links: ["Portfolio Tracker", "SIP Calculator", "EMI Calculator", "Stock Screener", "Mutual Funds"]
            },
            {
              title: "Company", links: ["About Us", "Contact", "Careers", "Privacy Policy", "Terms of Use", "Advertise"]
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-foreground text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-surface mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2025 MarketPulse. All rights reserved. Data provided for informational purposes only.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>BSE: <span className="text-gain">LIVE</span></span>
            <span>NSE: <span className="text-gain">LIVE</span></span>
            <span>MCX: <span className="text-gain">LIVE</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
