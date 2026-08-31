import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LoanType = "home" | "car" | "personal" | "education" | "business";

export interface BankRate {
  id: string;
  bank_name: string;
  loan_type: string;
  min_rate: number;
  max_rate: number;
  processing_fee: string | null;
  source: string;
  effective_date: string;
}

export const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: "home", label: "Home Loan" },
  { value: "car", label: "Car Loan" },
  { value: "personal", label: "Personal Loan" },
  { value: "education", label: "Education Loan" },
  { value: "business", label: "Business Loan" },
];

/** Offline snapshot so the feed never renders empty if the network fails. */
const FALLBACK: BankRate[] = [
  { id: "f1", bank_name: "State Bank of India", loan_type: "home", min_rate: 8.25, max_rate: 9.65, processing_fee: "0.35% (min ₹2,000)", source: "SBI published card rates", effective_date: "2026-08-01" },
  { id: "f2", bank_name: "HDFC Bank", loan_type: "home", min_rate: 8.45, max_rate: 9.85, processing_fee: "Up to 0.50%", source: "HDFC published card rates", effective_date: "2026-08-01" },
  { id: "f3", bank_name: "ICICI Bank", loan_type: "home", min_rate: 8.5, max_rate: 9.9, processing_fee: "Up to 0.50%", source: "ICICI published card rates", effective_date: "2026-08-01" },
];

export function useBankRates(loanType: LoanType) {
  const [rates, setRates] = useState<BankRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("bank_rates")
      .select("id,bank_name,loan_type,min_rate,max_rate,processing_fee,source,effective_date")
      .eq("loan_type", loanType)
      .eq("is_active", true)
      .order("min_rate", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setRates(FALLBACK.filter((r) => r.loan_type === loanType));
          setStale(true);
        } else {
          setRates(data as BankRate[]);
          setStale(false);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [loanType]);

  const best = rates.length ? rates.reduce((a, b) => (b.min_rate < a.min_rate ? b : a)) : null;
  const avg = rates.length ? rates.reduce((s, r) => s + r.min_rate, 0) / rates.length : 0;

  return { rates, loading, stale, best, avg };
}
