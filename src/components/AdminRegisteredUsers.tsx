import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Chrome, Mail, Download, Search, Calendar, Activity } from "lucide-react";

interface AuthEvent {
  id: string;
  user_id: string;
  event_type: string;
  provider: string;
  created_at: string;
}

interface UniqueUser {
  user_id: string;
  provider: string;
  first_seen: string;
  last_seen: string;
  total_logins: number;
  has_signup: boolean;
}

export function AdminRegisteredUsers() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "google" | "email">("all");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    // Pull all auth events (paginate beyond 1000 cap)
    const all: AuthEvent[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("auth_events")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...(data as AuthEvent[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setEvents(all);
    setLoading(false);
  }

  // Build unique users
  const uniqueUsers: UniqueUser[] = useMemo(() => {
    const map = new Map<string, UniqueUser>();
    // Iterate ascending so first_seen is correct
    [...events].reverse().forEach((e) => {
      const existing = map.get(e.user_id);
      if (!existing) {
        map.set(e.user_id, {
          user_id: e.user_id,
          provider: e.provider || "email",
          first_seen: e.created_at,
          last_seen: e.created_at,
          total_logins: e.event_type === "login" ? 1 : 0,
          has_signup: e.event_type === "signup",
        });
      } else {
        existing.last_seen = e.created_at;
        if (e.event_type === "login") existing.total_logins++;
        if (e.event_type === "signup") existing.has_signup = true;
        // Prefer non-empty provider
        if (!existing.provider && e.provider) existing.provider = e.provider;
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime()
    );
  }, [events]);

  // Stats
  const totalUnique = uniqueUsers.length;
  const googleUsers = uniqueUsers.filter(u => u.provider === "google").length;
  const emailUsers = totalUnique - googleUsers;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start7d = new Date(startOfToday); start7d.setDate(start7d.getDate() - 6);
  const start30d = new Date(startOfToday); start30d.setDate(start30d.getDate() - 29);
  const newToday = uniqueUsers.filter(u => new Date(u.first_seen) >= startOfToday).length;
  const new7d = uniqueUsers.filter(u => new Date(u.first_seen) >= start7d).length;
  const new30d = uniqueUsers.filter(u => new Date(u.first_seen) >= start30d).length;

  // Filter
  const filtered = uniqueUsers.filter(u => {
    if (providerFilter !== "all" && u.provider !== providerFilter && !(providerFilter === "email" && u.provider !== "google")) return false;
    if (search && !u.user_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function exportCSV() {
    const header = "User ID,Provider,First Signup,Last Active,Total Logins\n";
    const rows = filtered.map(u =>
      [u.user_id, u.provider, u.first_seen, u.last_seen, u.total_logins].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registered-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    { label: "Unique Users", value: totalUnique, icon: Users, color: "text-primary", bg: "bg-primary/8" },
    { label: "New Today", value: newToday, icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Last 7 Days", value: new7d, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Last 30 Days", value: new30d, icon: Activity, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Google", value: googleUsers, icon: Chrome, color: "text-green-700", bg: "bg-green-50" },
    { label: "Email", value: emailUsers, icon: Mail, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registered Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each person counted once — total unique signups on the website
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Loading users...
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white border border-border rounded-xl p-4 shadow-card">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className={`number-font text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search user ID..."
                className="w-full bg-white border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["all", "google", "email"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProviderFilter(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                    providerFilter === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              Showing {filtered.length} of {totalUnique}
            </span>
          </div>

          {/* Users table */}
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["User ID", "Provider", "First Signup", "Last Active", "Logins"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No users found</td></tr>
                  ) : filtered.slice(0, 200).map(u => (
                    <tr key={u.user_id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{u.user_id.slice(0, 12)}...</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.provider === "google" ? "text-green-700" : "text-foreground"}`}>
                          {u.provider === "google" ? <Chrome className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          {u.provider || "email"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-foreground">
                        {new Date(u.first_seen).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(u.last_seen).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                          {u.total_logins}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 200 && (
                <div className="text-center py-3 text-xs text-muted-foreground border-t border-border">
                  Showing first 200 of {filtered.length} — export CSV for the full list
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
