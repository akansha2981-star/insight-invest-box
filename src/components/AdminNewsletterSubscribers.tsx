import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Download, RefreshCw, Users } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}

export function AdminNewsletterSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSubscribers(); }, []);

  async function fetchSubscribers() {
    setLoading(true);
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    setSubscribers((data as Subscriber[]) ?? []);
    setLoading(false);
  }

  function exportCSV() {
    const header = "Email,Subscribed Date,Active\n";
    const rows = subscribers.map(s =>
      `${s.email},${new Date(s.subscribed_at).toISOString()},${s.is_active}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Newsletter Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSubscribers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={subscribers.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No subscribers yet</p>
            <p className="text-sm mt-1">Subscribers will appear here when users sign up via the newsletter form.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Subscribed</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub, i) => (
                  <tr key={sub.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      {sub.email}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(sub.subscribed_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        sub.is_active ? "badge-gain" : "badge-neutral"
                      }`}>
                        {sub.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
