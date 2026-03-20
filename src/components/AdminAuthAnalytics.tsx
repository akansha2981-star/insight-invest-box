import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, LogIn, Calendar, Chrome, Mail } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AuthEvent {
  id: string;
  user_id: string;
  event_type: string;
  provider: string;
  created_at: string;
}

interface DailyStats {
  date: string;
  google: number;
  email: number;
  total: number;
}

export function AdminAuthAnalytics() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchEvents();
  }, [days]);

  async function fetchEvents() {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await supabase
      .from("auth_events")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    setEvents((data as AuthEvent[]) ?? []);
    setLoading(false);
  }

  const dailyStats: DailyStats[] = [];
  const dateMap = new Map<string, { google: number; email: number }>();

  events.forEach((e) => {
    const d = new Date(e.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    if (!dateMap.has(d)) dateMap.set(d, { google: 0, email: 0 });
    const entry = dateMap.get(d)!;
    if (e.provider === "google") entry.google++;
    else entry.email++;
  });

  dateMap.forEach((val, key) => {
    dailyStats.push({ date: key, ...val, total: val.google + val.email });
  });
  dailyStats.reverse();

  const totalGoogle = events.filter((e) => e.provider === "google").length;
  const totalEmail = events.filter((e) => e.provider !== "google").length;
  const totalLogins = events.filter((e) => e.event_type === "login").length;
  const totalSignups = events.filter((e) => e.event_type === "signup").length;
  const uniqueUsers = new Set(events.map((e) => e.user_id)).size;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Login Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track user signups and logins — Google vs Email
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                days === d
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          Loading analytics...
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Events", value: events.length, icon: Calendar, color: "text-primary", bg: "bg-primary/8" },
              { label: "Unique Users", value: uniqueUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Logins", value: totalLogins, icon: LogIn, color: "text-foreground", bg: "bg-muted" },
              { label: "Google Users", value: totalGoogle, icon: Chrome, color: "text-green-600", bg: "bg-green-50" },
              { label: "Email Users", value: totalEmail, icon: Mail, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-border rounded-xl p-4 shadow-card">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className={`number-font text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Signups stat */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-card mb-6 inline-flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className="number-font text-lg font-bold text-purple-600">{totalSignups}</div>
              <div className="text-[11px] text-muted-foreground font-medium">New Signups</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-border rounded-xl p-6 shadow-card mb-8">
            <h2 className="font-bold text-foreground mb-4">Daily Login Breakdown</h2>
            {dailyStats.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No login events recorded in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyStats}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="google" name="Google" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="email" name="Email" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent events */}
          <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-bold text-foreground">Recent Auth Events</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {["User ID", "Type", "Provider", "Date & Time"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 20).map((ev) => (
                    <tr key={ev.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{ev.user_id.slice(0, 8)}...</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          ev.event_type === 'signup' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${
                          ev.provider === 'google' ? 'text-green-700' : 'text-foreground'
                        }`}>
                          {ev.provider === 'google' ? <Chrome className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          {ev.provider}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">No events recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
