import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SECTIONS = [
  { title: "Information We Collect", content: "We collect information you provide directly, such as your name, email, and preferences when you create an account. We also collect usage data including pages visited, features used, and device information to improve our services." },
  { title: "How We Use Your Information", content: "Your information is used to provide and improve our financial data services, personalize your experience, send relevant market updates (with your consent), and ensure platform security. We do not sell your personal data to third parties." },
  { title: "Data Security", content: "We implement industry-standard encryption (SSL/TLS) and security measures to protect your data. All financial data is sourced from official exchanges (NSE, BSE, MCX) and is provided for informational purposes only." },
  { title: "Cookies & Tracking", content: "We use essential cookies for authentication and session management. Analytics cookies help us understand usage patterns. You can manage cookie preferences in your browser settings." },
  { title: "Your Rights", content: "You have the right to access, correct, or delete your personal data. You may opt out of marketing communications at any time. Contact us at privacy@investingiq.in for data-related requests." },
  { title: "Changes to This Policy", content: "We may update this policy periodically. Significant changes will be communicated via email or platform notification. Last updated: March 2026." },
];

export default function PrivacyPage() {
  const [content, setContent] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    supabase.from("page_sections").select("title,content").eq("page_key", "privacy").eq("is_visible", true).order("sort_order")
      .then(({ data }) => { if (data && data.length > 0) setContent(data); });
  }, []);

  const sections = content.length > 0 ? content : DEFAULT_SECTIONS;

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[900px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 2026</p>
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
