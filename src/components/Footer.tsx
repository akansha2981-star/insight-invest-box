import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

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
            <p className="text-[10px] text-white/30 leading-relaxed">
              Disclaimer: Information provided is for educational purposes only and does not constitute financial advice.
            </p>
          </div>

          {[
            { title: "Markets", links: ["BSE / NSE", "F&O", "Commodities", "Currency", "Global Markets", "IPO"] },
            { title: "News & Analysis", links: ["Market News", "Economy", "Companies", "Budget 2025", "Mutual Funds", "Crypto"] },
            { title: "Tools", links: ["SIP Calculator", "EMI Calculator", "Stock Screener", "Portfolio Tracker", "Tax Calculator", "FD Calculator"] },
            { title: "Company", links: ["About Us", "Careers", "Contact", "Privacy Policy", "Terms of Use", "Sitemap"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-bold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-white/50 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">© 2026 Investing IQ Financial Media Pvt. Ltd. All rights reserved.</p>
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
