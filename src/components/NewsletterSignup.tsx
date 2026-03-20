import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setStatus("loading");
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: trimmed });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already subscribed!", description: "This email is already on our list." });
      } else {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
      setStatus("idle");
      return;
    }
    setStatus("success");
    setEmail("");
    toast({ title: "Subscribed!", description: "You'll receive daily market updates." });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_70%)]" />
      <div className="relative px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-center gap-6">
        {/* Left */}
        <div className="flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold mb-3">
            <Mail className="h-3.5 w-3.5" />
            FREE DAILY DIGEST
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground leading-tight mb-2">
            Never Miss a Market Move
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Get curated stock picks, breaking market news, and expert analysis delivered to your inbox every morning before the bell.
          </p>
        </div>

        {/* Right — Form */}
        <div className="w-full sm:w-auto sm:min-w-[320px]">
          {status === "success" ? (
            <div className="flex items-center gap-3 bg-gain/10 border border-gain/20 rounded-xl px-5 py-4 text-gain">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">You're in!</p>
                <p className="text-xs opacity-80">Check your inbox for a welcome email.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="flex-1 h-11 rounded-xl border border-border bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Subscribe
              </button>
            </form>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 text-center sm:text-left">
            Join 24,000+ investors. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
