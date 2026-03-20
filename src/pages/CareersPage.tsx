import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";

const OPENINGS = [
  { title: "Senior Financial Analyst", dept: "Research", location: "Mumbai", type: "Full-time" },
  { title: "Full Stack Developer", dept: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Content Writer — Markets", dept: "Editorial", location: "Mumbai", type: "Full-time" },
  { title: "Data Scientist", dept: "Data & AI", location: "Bengaluru", type: "Full-time" },
  { title: "UI/UX Designer", dept: "Product", location: "Remote", type: "Contract" },
];

export default function CareersPage() {
  const [content, setContent] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    supabase.from("page_sections").select("title,content").eq("page_key", "careers").eq("is_visible", true).order("sort_order")
      .then(({ data }) => { if (data) setContent(data); });
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--section-bg))]">
      <Header />
      <main className="max-w-[900px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-foreground mb-2">Careers at Investing IQ</h1>
        <p className="text-muted-foreground mb-8">Join our mission to democratize financial intelligence</p>

        {content.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-card mb-4">
            <h2 className="font-bold text-foreground mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{s.content}</p>
          </div>
        ))}

        <h2 className="font-bold text-lg text-foreground mb-4 mt-8">Open Positions</h2>
        <div className="space-y-3">
          {OPENINGS.map(job => (
            <div key={job.title} className="bg-card border border-border rounded-xl p-5 shadow-card flex items-center justify-between hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
              <div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{job.title}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.dept}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.type}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
