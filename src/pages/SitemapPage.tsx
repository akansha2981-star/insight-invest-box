import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const SECTIONS = [
  { title: "Markets", links: [
    { label: "Market Overview", to: "/markets" },
    { label: "Stocks", to: "/stocks" },
    { label: "Stock Screener", to: "/tools/screener" },
    { label: "Stock Reviews", to: "/stocks/reviews" },
  ]},
  { title: "News & Analysis", links: [
    { label: "All News", to: "/news" },
    { label: "Economy", to: "/economy" },
    { label: "Mutual Funds", to: "/mf" },
    { label: "Crypto", to: "/crypto" },
  ]},
  { title: "Real Estate", links: [
    { label: "Properties", to: "/real-estate" },
  ]},
  { title: "Tools", links: [
    { label: "SIP Calculator", to: "/tools/sip" },
    { label: "EMI Calculator", to: "/calculators/emi-calculator" },
    { label: "FD Calculator", to: "/tools/fd" },
    { label: "Tax Calculator", to: "/tools/tax" },
    { label: "Stock Screener", to: "/tools/screener" },
    { label: "Portfolio Tester", to: "/tools/portfolio" },
  ]},
  { title: "Company", links: [
    { label: "About Us", to: "/about" },
    { label: "Careers", to: "/careers" },
    { label: "Contact Us", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Use", to: "/terms" },
  ]},
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[900px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-foreground mb-2">Sitemap</h1>
        <p className="text-muted-foreground mb-8">Complete overview of all pages on Investing IQ</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECTIONS.map(section => (
            <div key={section.title} className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h2 className="font-bold text-foreground mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.to}>
                    <Link to={link.to} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                      <ChevronRight className="h-3 w-3" /> {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
