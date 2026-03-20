import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SECTIONS = [
  { title: "Acceptance of Terms", content: "By accessing Investing IQ, you agree to these Terms of Use. If you do not agree, please discontinue use of our platform immediately." },
  { title: "Financial Information Disclaimer", content: "All market data, stock prices, mutual fund NAVs, and financial information on Investing IQ are sourced from official exchanges (NSE, BSE, MCX) and trusted data providers. This information is for educational and informational purposes only and does NOT constitute investment advice, solicitation, or recommendation. Investing IQ and its affiliates take no responsibility for investment decisions made based on data shown on this platform. Always consult a SEBI-registered financial advisor before making investment decisions." },
  { title: "Real Estate Disclaimer", content: "Property listings, prices, and real estate data are provided by developers and third-party sources. Investing IQ does not guarantee the accuracy of property information. Users should independently verify all details including RERA registration, pricing, and possession dates before making any property-related decisions." },
  { title: "User Accounts", content: "You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and notify us of any unauthorized access." },
  { title: "Intellectual Property", content: "All content, design, and data on Investing IQ are protected by copyright and intellectual property laws. You may not reproduce, distribute, or modify our content without prior written consent." },
  { title: "Limitation of Liability", content: "Investing IQ shall not be liable for any direct, indirect, or consequential damages arising from the use of our platform. Market data may be delayed by up to 15 minutes." },
  { title: "Governing Law", content: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra." },
];

export default function TermsPage() {
  const [content, setContent] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    supabase.from("page_sections").select("title,content").eq("page_key", "terms").eq("is_visible", true).order("sort_order")
      .then(({ data }) => { if (data && data.length > 0) setContent(data); });
  }, []);

  const sections = content.length > 0 ? content : DEFAULT_SECTIONS;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[900px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-foreground mb-2">Terms of Use</h1>
        <p className="text-muted-foreground mb-8">Effective date: March 2026</p>
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h2 className="font-bold text-foreground mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
