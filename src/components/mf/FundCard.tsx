import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown } from "lucide-react";
import { fmtCr, fmtPct, pctClass } from "@/lib/mfFormat";

export function FundCard({ fund }: { fund: any }) {
  const up = Number(fund.return_1y) >= 0;
  return (
    <Link
      to={`/mutual-funds/${fund.slug}`}
      className="block bg-card border border-border rounded-xl p-4 hover:shadow-lg hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground truncate">{fund.fund_house}</div>
          <h3 className="font-semibold text-sm text-foreground truncate">{fund.scheme_name}</h3>
        </div>
        {fund.rating > 0 && (
          <div className="flex items-center gap-0.5 text-amber-500 text-xs shrink-0">
            <Star className="h-3 w-3 fill-current" />
            <span>{Number(fund.rating).toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
          {fund.sub_category || fund.category}
        </span>
        <span className="text-[10px] text-muted-foreground">{fund.risk_level}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">NAV</div>
          <div className="font-semibold">₹{Number(fund.nav).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">1Y</div>
          <div className={`font-semibold flex items-center gap-1 ${pctClass(fund.return_1y)}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {fmtPct(fund.return_1y)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">AUM</div>
          <div className="font-semibold">{fmtCr(fund.aum_cr)}</div>
        </div>
      </div>
    </Link>
  );
}
