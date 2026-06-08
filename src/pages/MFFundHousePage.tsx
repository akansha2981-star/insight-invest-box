import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { FundCard } from "@/components/mf/FundCard";
import { fmtCr } from "@/lib/mfFormat";
import { Building2 } from "lucide-react";

export default function MFFundHousePage() {
  const { slug } = useParams();
  const [house, setHouse] = useState<any>(null);
  const [funds, setFunds] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: h } = await supabase.from("mf_fund_houses").select("*").eq("slug", slug).maybeSingle();
      setHouse(h);
      const { data: f } = await supabase.from("mf_funds").select("*").eq("fund_house_slug", slug);
      setFunds(f ?? []);
    })();
  }, [slug]);

  if (!house) return <div className="min-h-screen bg-[hsl(var(--section-bg))]"><Header /><div className="p-8 text-center text-muted-foreground">Loading...</div><Footer /></div>;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Helmet>
        <title>{house.name} — All Funds, AUM, Performance | InvestingIQ</title>
        <meta name="description" content={`${house.name}: ${house.description} Browse all ${house.fund_count} funds with AUM of ${fmtCr(house.total_aum_cr)}.`} />
        <link rel="canonical" href={`https://www.investingiq.in/mutual-funds/fund-house/${house.slug}`} />
      </Helmet>
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 py-6">
        <Link to="/mutual-funds" className="text-xs text-primary hover:underline">← Mutual Funds Hub</Link>
        <div className="bg-card border border-border rounded-2xl p-6 mt-2 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-8 w-8 text-primary" /></div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-black">{house.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{house.description}</p>
              <div className="grid grid-cols-3 gap-3 mt-4 max-w-md">
                <div><div className="text-xs text-muted-foreground">Total AUM</div><div className="font-bold">{fmtCr(house.total_aum_cr)}</div></div>
                <div><div className="text-xs text-muted-foreground">Schemes</div><div className="font-bold">{house.fund_count}</div></div>
                <div><div className="text-xs text-muted-foreground">Founded</div><div className="font-bold">{house.founded_year || "—"}</div></div>
              </div>
            </div>
          </div>
        </div>
        <h2 className="font-bold text-lg mb-3">All Funds from {house.name}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {funds.map(f => <FundCard key={f.id} fund={f} />)}
        </div>
        <ComplianceDisclaimer />
      </main>
      <Footer />
    </div>
  );
}
