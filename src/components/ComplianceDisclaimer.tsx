import { ShieldAlert } from "lucide-react";

interface Props {
  variant?: "inline" | "card" | "footer" | "tiny";
  className?: string;
}

/**
 * Compliance disclaimer mounted across the platform.
 * Exact wording maintained for legal/compliance consistency.
 */
export function ComplianceDisclaimer({ variant = "inline", className = "" }: Props) {
  const text = "Investing IQ is not a SEBI-registered investment advisor. All information provided on this platform is for educational and informational purposes only. Users should not make investment decisions solely based on the information presented on this website.";

  if (variant === "tiny") {
    return (
      <p className={`text-[10px] leading-relaxed text-muted-foreground/70 ${className}`}>
        Not SEBI-registered. Educational content only — not investment advice.
      </p>
    );
  }

  if (variant === "footer") {
    return <p className={`text-[10px] leading-relaxed text-white/40 ${className}`}>{text}</p>;
  }

  if (variant === "card") {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 ${className}`}>
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-amber-900">{text}</p>
      </div>
    );
  }

  return (
    <div className={`border-l-2 border-amber-400 bg-amber-50/40 pl-3 py-2 ${className}`}>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-amber-700">Disclaimer:</span> {text}
      </p>
    </div>
  );
}
