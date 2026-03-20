import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [content, setContent] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    supabase.from("page_sections").select("title,content").eq("page_key", "contact").eq("is_visible", true).order("sort_order")
      .then(({ data }) => { if (data) setContent(data); });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast({ title: "Message Sent", description: "We'll get back to you within 24 hours." });
    setName(""); setEmail(""); setMessage("");
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[900px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-foreground mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8">We'd love to hear from you</p>

        {content.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-card mb-4">
            <h2 className="font-bold text-foreground mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{s.content}</p>
          </div>
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form onSubmit={handleSubmit} className="lg:col-span-3 bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <button type="submit" className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Send className="h-4 w-4" /> Send Message
            </button>
          </form>

          <div className="lg:col-span-2 space-y-4">
            {[
              { icon: Mail, label: "Email", value: "support@investingiq.in" },
              { icon: Phone, label: "Phone", value: "+91 22 4000 1234" },
              { icon: MapPin, label: "Address", value: "Lower Parel, Mumbai 400013, India" },
            ].map(item => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-5 shadow-card flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{item.label}</div>
                  <div className="text-sm text-foreground font-medium mt-0.5">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
