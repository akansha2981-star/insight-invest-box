import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";

export function ETFCard({ etf }: { etf: any }) {
  const up = Number(etf.return_1y) >= 0;
  return (
    <Link to={`/etfs/${etf.slug}`} className="block bg-card border border-border rounded-xl p-4 hover:shadow-lg hover:border-primary/40 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{etf.symbol}</div>
          <h3 className="font-semibold text-sm text-foreground truncate">{etf.name}</h3>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">{etf.asset_class}</span>
        <span className="text-[10px] text-muted-foreground">{etf.sub_class}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-muted-foreground">LTP</div><div className="font-semibold">₹{Number(etf.ltp).toFixed(2)}</div></div>
        <div><div className="text-muted-foreground">1Y</div><div className={`font-semibold flex items-center gap-1 ${pctClass(etf.return_1y)}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{fmtPct(etf.return_1y)}
        </div></div>
        <div><div className="text-muted-foreground">AUM</div><div className="font-semibold">{fmtCr(etf.aum_cr)}</div></div>
      </div>
    </Link>
  );
}
