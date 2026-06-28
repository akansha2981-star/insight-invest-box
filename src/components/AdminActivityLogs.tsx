import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, LogIn, RefreshCw, Search, Shield, Clock, Filter, Download } from "lucide-react";

interface ActivityRow {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  category: string | null;
  details: Record<string, unknown> | null;
  path: string | null;
  user_agent: string | null;
  created_at: string;
}

interface LoginRow {
  id: string;
  user_id: string;
  event_type: string;
  provider: string;
  created_at: string;
  email?: string;
}

type Tab = "activity" | "logins";

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-50 text-blue-700 border-blue-200",
  navigation: "bg-slate-50 text-slate-700 border-slate-200",
  content: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ai: "bg-violet-50 text-violet-700 border-violet-200",
  settings: "bg-amber-50 text-amber-700 border-amber-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  publish: "bg-green-50 text-green-700 border-green-200",
  other: "bg-muted text-muted-foreground border-border",
};

export function AdminActivityLogs() {
  const [tab, setTab] = useState<Tab>("activity");
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [logins, setLogins] = useState<LoginRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function fetchAll() {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [activityRes, eventsRes, rolesRes, usersRes] = await Promise.all([
      supabase
        .from("admin_activity_log")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("auth_events")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.functions.invoke("admin-list-users").catch(() => ({ data: null } as any)),
    ]);

    const ids = new Set<string>((rolesRes.data ?? []).map((r: any) => r.user_id));
    setAdminIds(ids);

    const map: Record<string, string> = {};
    const users = (usersRes as any)?.data?.users;
    if (Array.isArray(users)) {
      users.forEach((u: any) => { map[u.id] = u.email || ""; });
    }
    setEmailMap(map);

    setActivity((activityRes.data as ActivityRow[]) ?? []);
    const adminLogins = ((eventsRes.data as LoginRow[]) ?? [])
      .filter((e) => ids.has(e.user_id))
      .map((e) => ({ ...e, email: map[e.user_id] || "" }));
    setLogins(adminLogins);

    setLoading(false);
  }

  const categories = useMemo(() => {
    const s = new Set<string>();
    activity.forEach((a) => a.category && s.add(a.category));
    return Array.from(s);
  }, [activity]);

  const filteredActivity = useMemo(() => {
    return activity.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.action.toLowerCase().includes(q) ||
          (a.admin_email ?? "").toLowerCase().includes(q) ||
          (a.path ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activity, search, categoryFilter]);

  const filteredLogins = useMemo(() => {
    if (!search) return logins;
    const q = search.toLowerCase();
    return logins.filter((l) => (l.email ?? "").toLowerCase().includes(q) || l.provider.toLowerCase().includes(q));
  }, [logins, search]);

  function exportCsv() {
    const rows = tab === "activity"
      ? [
          ["Time", "Admin", "Action", "Category", "Path", "Details"],
          ...filteredActivity.map((a) => [
            new Date(a.created_at).toLocaleString("en-IN"),
            a.admin_email ?? a.admin_id,
            a.action,
            a.category ?? "",
            a.path ?? "",
            JSON.stringify(a.details ?? {}),
          ]),
        ]
      : [
          ["Time", "Admin", "Event", "Provider"],
          ...filteredLogins.map((l) => [
            new Date(l.created_at).toLocaleString("en-IN"),
            l.email ?? l.user_id,
            l.event_type,
            l.provider,
          ]),
        ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const uniqueAdmins = new Set(activity.map((a) => a.admin_id)).size;
  const totalLogins = logins.filter((l) => l.event_type === "login").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Admin Activity Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track admin logins and every action performed inside the admin panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                days === d ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}D
            </button>
          ))}
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Actions", value: activity.length, icon: Activity, color: "text-primary", bg: "bg-primary/8" },
          { label: "Admin Logins", value: totalLogins, icon: LogIn, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active Admins", value: uniqueAdmins, icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Window", value: `${days}D`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-4 shadow-card">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`number-font text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setTab("activity")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === "activity" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5 inline mr-1.5" /> Activity ({activity.length})
          </button>
          <button
            onClick={() => setTab("logins")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === "logins" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5 inline mr-1.5" /> Login History ({logins.length})
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin, action, path..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {tab === "activity" && categories.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-border rounded-lg px-2 py-2 focus:outline-none"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Loading logs...
          </div>
        ) : tab === "activity" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {["Time", "Admin", "Action", "Category", "Path", "Details"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredActivity.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("en-IN", {
                        day: "numeric", month: "short",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-foreground">
                      {row.admin_email ?? <span className="font-mono text-muted-foreground">{row.admin_id.slice(0, 8)}...</span>}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-foreground">{row.action}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[row.category ?? "other"] ?? CATEGORY_COLORS.other}`}>
                        {row.category ?? "other"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{row.path ?? "—"}</td>
                    <td className="px-5 py-3 text-[11px] text-muted-foreground max-w-[260px] truncate">
                      {row.details && Object.keys(row.details).length > 0 ? JSON.stringify(row.details) : "—"}
                    </td>
                  </tr>
                ))}
                {filteredActivity.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No activity recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {["Time", "Admin", "Event", "Provider"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLogins.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-foreground">
                      {row.email || <span className="font-mono text-muted-foreground">{row.user_id.slice(0, 8)}...</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        row.event_type === "login" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}>
                        {row.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-foreground capitalize">{row.provider}</td>
                  </tr>
                ))}
                {filteredLogins.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">No admin logins recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        Activity is logged automatically when admins sign in or change sections of the dashboard.
      </p>
    </div>
  );
}
