import { ShieldAlert } from "lucide-react";

interface Props {
  variant?: "inline" | "card" | "footer" | "tiny";
  className?: string;
}

/**
 * SEBI / financial-advice compliance disclaimer.
 * Use across the site (footer, article ends, market analysis sections, side panels).
 */
export function ComplianceDisclaimer({ variant = "inline", className = "" }: Props) {
  const text = "Investing IQ is not a SEBI-registered investment advisor. Content is for educational and informational purposes only and does not constitute investment advice or a recommendation to buy/sell any security. Markets are subject to risk — please consult a registered advisor before investing.";

  if (variant === "tiny") {
    return (
      <p className={`text-[10px] leading-relaxed text-muted-foreground/70 ${className}`}>
        Not SEBI-registered. Educational content only — not investment advice.
      </p>
    );
  }

  if (variant === "footer") {
    return (
      <p className={`text-[10px] leading-relaxed text-white/40 ${className}`}>{text}</p>
    );
  }

  if (variant === "card") {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 ${className}`}>
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-amber-900">{text}</p>
      </div>
    );
  }

  // inline
  return (
    <div className={`border-l-2 border-amber-400 bg-amber-50/40 pl-3 py-2 ${className}`}>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-amber-700">Disclaimer:</span> {text}
      </p>
    </div>
  );
}
