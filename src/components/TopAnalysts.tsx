import { Award, Star, TrendingUp, ArrowUp } from "lucide-react";

const ANALYSTS = [
  {
    name: "Rajesh Palviya",
    firm: "Axis Securities",
    avatar: "RP",
    accuracy: "78%",
    calls: 142,
    recentPick: { stock: "RELIANCE", reco: "BUY", gain: "+4.2%" },
    color: "bg-primary/10 text-primary",
  },
  {
    name: "Ravi Singhal",
    firm: "GCL Securities",
    avatar: "RS",
    accuracy: "74%",
    calls: 98,
    recentPick: { stock: "TATAMOTORS", reco: "BUY", gain: "+6.8%" },
    color: "bg-amber-100 text-amber-700",
  },
  {
    name: "Nooresh Merani",
    firm: "Asian Market Securities",
    avatar: "NM",
    accuracy: "72%",
    calls: 216,
    recentPick: { stock: "HDFCBANK", reco: "BUY", gain: "+3.1%" },
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Ambareesh Baliga",
    firm: "Independent",
    avatar: "AB",
    accuracy: "71%",
    calls: 87,
    recentPick: { stock: "SUNPHARMA", reco: "BUY", gain: "+5.4%" },
    color: "bg-violet-100 text-violet-700",
  },
];

export function TopAnalysts() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-violet-50 to-card">
        <Award className="h-4 w-4 text-violet-500" />
        <span className="font-black text-[13px] text-foreground">Today's Top Analysts</span>
      </div>
      <div className="divide-y divide-border/60">
        {ANALYSTS.map((a, i) => (
          <div key={a.name} className="px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black ${a.color}`}>
                {a.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[12px] text-foreground group-hover:text-primary transition-colors truncate">{a.name}</span>
                  {i === 0 && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{a.firm}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-0.5 text-[11px] font-bold text-gain">
                  <TrendingUp className="h-3 w-3" />
                  {a.accuracy}
                </div>
                <div className="text-[9px] text-muted-foreground">{a.calls} calls</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-2.5 py-1.5">
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded badge-gain">BUY</span>
              <span className="text-[11px] font-bold text-foreground">{a.recentPick.stock}</span>
              <span className="ml-auto flex items-center gap-0.5 text-[11px] font-bold text-gain number-font">
                <ArrowUp className="h-2.5 w-2.5" />{a.recentPick.gain}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-2.5 bg-muted/20 text-center">
        <span className="text-[10px] text-muted-foreground">Based on last 30 days accuracy · Updated daily</span>
      </div>
    </div>
  );
}
