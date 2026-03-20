import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Target, TrendingUp, Award, Globe } from "lucide-react";

export default function AboutPage() {
  const [content, setContent] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    supabase.from("page_sections").select("title,content").eq("page_key", "about").eq("is_visible", true).order("sort_order")
      .then(({ data }) => { if (data) setContent(data); });
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[900px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-foreground mb-2">About Investing IQ</h1>
        <p className="text-muted-foreground mb-8">India's trusted financial intelligence platform</p>

        {content.length > 0 ? content.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-card mb-4">
            <h2 className="font-bold text-lg text-foreground mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
          </div>
        )) : (
          <>
            <div className="bg-card border border-border rounded-xl p-6 shadow-card mb-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Investing IQ is India's premier financial intelligence platform, empowering investors with real-time market data,
                expert analysis, and comprehensive coverage of stocks, mutual funds, crypto, real estate, and more.
                Founded with the mission to democratize financial knowledge, we serve over 50,000 active investors daily.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { icon: Shield, title: "SEBI Compliant", desc: "All data sourced from official exchanges" },
                { icon: Users, title: "50,000+ Users", desc: "Trusted by active investors nationwide" },
                { icon: Target, title: "Expert Analysis", desc: "In-depth research from certified analysts" },
                { icon: TrendingUp, title: "Real-Time Data", desc: "Live feeds from NSE, BSE, MCX" },
                { icon: Award, title: "Award Winning", desc: "Recognized for accuracy and depth" },
                { icon: Globe, title: "Global Coverage", desc: "Track international markets effortlessly" },
              ].map(item => (
                <div key={item.title} className="bg-card border border-border rounded-xl p-5 shadow-card text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
