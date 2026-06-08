import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";

export default function MFNewsPage() {
  const [news, setNews] = useState<any[]>([]);
  useEffect(() => { supabase.from("mf_news").select("*").order("published_at", { ascending: false }).then(({ data }) => setNews(data ?? [])); }, []);
  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet><title>Mutual Fund News Center | InvestingIQ</title>
        <meta name="description" content="Latest Indian mutual fund news: NFO launches, AUM changes, fund manager updates, SEBI announcements." />
        <link rel="canonical" href="https://www.investingiq.in/mutual-funds/news" />
      </Helmet>
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 py-6">
        <Link to="/mutual-funds" className="text-xs text-primary hover:underline">← Mutual Funds Hub</Link>
        <h1 className="text-2xl sm:text-3xl font-black mt-2 mb-6">Mutual Fund News Center</h1>
        <div className="space-y-4">
          {news.map(n => (
            <article key={n.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition">
              <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">{n.category} · {new Date(n.published_at).toLocaleDateString('en-IN')}</div>
              <h2 className="font-bold text-lg mb-2">{n.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{n.summary}</p>
              {n.content && <p className="text-sm mt-3 leading-relaxed">{n.content}</p>}
            </article>
          ))}
        </div>
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
