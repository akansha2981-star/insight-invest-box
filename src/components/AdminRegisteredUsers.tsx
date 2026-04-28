import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Chrome, Mail, Download, Search, Calendar, Activity, Phone } from "lucide-react";

interface AuthEvent {
  id: string;
  user_id: string;
  event_type: string;
  provider: string;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  avatar_url: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
}

interface UniqueUser extends AuthUser {
  total_logins: number;
  first_seen_event: string | null;
  last_seen_event: string | null;
  has_signup: boolean;
}

export function AdminRegisteredUsers() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "google" | "email">("all");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);

    // 1. Fetch all auth events (paginate beyond 1000)
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

    // 2. Fetch full user list (name, email, phone) via admin edge function
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (!error && data?.users) setAuthUsers(data.users as AuthUser[]);
    } catch (e) {
      console.error("admin-list-users failed:", e);
    }

    setLoading(false);
  }

  // Build unique users from auth.users (source of truth) + enrich with events
  const uniqueUsers: UniqueUser[] = useMemo(() => {
    // Event aggregation per user
    const evMap = new Map<string, { first: string; last: string; logins: number; signup: boolean }>();
    [...events].reverse().forEach((e) => {
      const existing = evMap.get(e.user_id);
      if (!existing) {
        evMap.set(e.user_id, {
          first: e.created_at,
          last: e.created_at,
          logins: e.event_type === "login" ? 1 : 0,
          signup: e.event_type === "signup",
        });
      } else {
        existing.last = e.created_at;
        if (e.event_type === "login") existing.logins++;
        if (e.event_type === "signup") existing.signup = true;
      }
    });

    // If we have auth.users, use them as canonical list
    if (authUsers.length > 0) {
      return authUsers.map((u) => {
        const ev = evMap.get(u.id);
        return {
          ...u,
          total_logins: ev?.logins ?? 0,
          first_seen_event: ev?.first ?? null,
          last_seen_event: ev?.last ?? u.last_sign_in_at,
          has_signup: ev?.signup ?? true,
        } as UniqueUser;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Fallback: derive from events only
    return Array.from(evMap.entries()).map(([id, ev]) => ({
      id,
      email: "",
      phone: "",
      full_name: "",
      avatar_url: "",
      provider: events.find(e => e.user_id === id)?.provider || "email",
      created_at: ev.first,
      last_sign_in_at: ev.last,
      email_confirmed: false,
      total_logins: ev.logins,
      first_seen_event: ev.first,
      last_seen_event: ev.last,
      has_signup: ev.signup,
    } as UniqueUser)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [events, authUsers]);

  // Stats
  const totalUnique = uniqueUsers.length;
  const googleUsers = uniqueUsers.filter(u => u.provider === "google").length;
  const emailUsers = totalUnique - googleUsers;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start7d = new Date(startOfToday); start7d.setDate(start7d.getDate() - 6);
  const start30d = new Date(startOfToday); start30d.setDate(start30d.getDate() - 29);
  const newToday = uniqueUsers.filter(u => new Date(u.created_at) >= startOfToday).length;
  const new7d = uniqueUsers.filter(u => new Date(u.created_at) >= start7d).length;
  const new30d = uniqueUsers.filter(u => new Date(u.created_at) >= start30d).length;

  // Filter
  const filtered = uniqueUsers.filter(u => {
    if (providerFilter !== "all") {
      if (providerFilter === "google" && u.provider !== "google") return false;
      if (providerFilter === "email" && u.provider === "google") return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const hay = `${u.email} ${u.full_name} ${u.phone} ${u.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function exportCSV() {
    const header = "Name,Email,Phone,Provider,Signup Date,Last Active,Total Logins\n";
    const rows = filtered.map(u =>
      [
        `"${(u.full_name || "").replace(/"/g, '""')}"`,
        u.email,
        u.phone,
        u.provider,
        u.created_at,
        u.last_sign_in_at || "",
        u.total_logins,
      ].join(",")
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

  function initials(name: string, email: string) {
    const src = name || email || "?";
    return src.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registered Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each person counted once — name, email, phone & login history
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
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
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
                    {["User", "Email", "Phone", "Provider", "Signup Date", "Last Active", "Logins"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No users found</td></tr>
                  ) : filtered.slice(0, 300).map(u => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                              {initials(u.full_name, u.email)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                              {u.full_name || <span className="text-muted-foreground italic">Unnamed</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-foreground">{u.email || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-5 py-3 text-xs text-foreground">
                        {u.phone ? (
                          <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{u.phone}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.provider === "google" ? "text-green-700" : "text-foreground"}`}>
                          {u.provider === "google" ? <Chrome className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          {u.provider || "email"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
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
              {filtered.length > 300 && (
                <div className="text-center py-3 text-xs text-muted-foreground border-t border-border">
                  Showing first 300 of {filtered.length} — export CSV for the full list
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
