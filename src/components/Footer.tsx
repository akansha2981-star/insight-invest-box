import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white/70 mt-12">
      <div className="max-w-[1440px] mx-auto px-4 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-red-600 rounded-lg p-1.5">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-lg text-white">Investing IQ</span>
            </div>
            <p className="text-xs leading-relaxed text-white/50 mb-4">
              India's trusted financial intelligence platform. Real-time data, expert analysis, and comprehensive market coverage.
            </p>
            <ComplianceDisclaimer variant="footer" />
          </div>

          {[
            { title: "Markets", links: [
              { label: "Market Overview", to: "/markets" },
              { label: "Stocks", to: "/stocks" },
              { label: "Stock Reviews", to: "/stocks/reviews" },
              { label: "Mutual Funds", to: "/mf" },
              { label: "Crypto", to: "/crypto" },
            ]},
            { title: "News & Analysis", links: [
              { label: "Market News", to: "/news" },
              { label: "Economy", to: "/economy" },
              { label: "Real Estate", to: "/real-estate" },
              { label: "Portfolio", to: "/portfolio" },
            ]},
            { title: "Tools", links: [
              { label: "SIP Calculator", to: "/tools/sip" },
              { label: "EMI Calculator", to: "/tools/emi" },
              { label: "Stock Screener", to: "/tools/screener" },
              { label: "Portfolio Tester", to: "/tools/portfolio" },
              { label: "Tax Calculator", to: "/tools/tax" },
              { label: "FD Calculator", to: "/tools/fd" },
            ]},
            { title: "Company", links: [
              { label: "About Us", to: "/about" },
              { label: "Careers", to: "/careers" },
              { label: "Contact", to: "/contact" },
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Terms of Use", to: "/terms" },
              { label: "Sitemap", to: "/sitemap" },
            ]},
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-xs text-white/50 hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">&copy; 2026 Investing IQ Financial Media Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs">
            <span className="text-white/30">BSE: <span className="text-emerald-400">LIVE</span></span>
            <span className="text-white/30">NSE: <span className="text-emerald-400">LIVE</span></span>
            <span className="text-white/30">MCX: <span className="text-emerald-400">LIVE</span></span>
            <span className="text-white/30">CRYPTO: <span className="text-emerald-400">24/7</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
