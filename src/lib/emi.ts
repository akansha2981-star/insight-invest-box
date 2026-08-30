import type { PrepayFrequency } from "@/config/emiCalculator";

export const safeNum = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Indian-format currency, no decimals by default. */
export const inr = (v: number, decimals = 0) =>
  `₹${(Number.isFinite(v) ? Math.max(v, 0) : 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const inrCompact = (v: number) => {
  const n = Number.isFinite(v) ? v : 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${Math.round(n)}`;
};

export const monthsToLabel = (m: number) => {
  const months = Math.max(0, Math.round(m));
  const y = Math.floor(months / 12);
  const mm = months % 12;
  if (!y) return `${mm} month${mm === 1 ? "" : "s"}`;
  if (!mm) return `${y} year${y === 1 ? "" : "s"}`;
  return `${y} yr ${mm} mo`;
};

/** Standard reducing-balance EMI. Handles 0% correctly. */
export function calcEMI(principal: number, annualRate: number, months: number): number {
  const P = Math.max(safeNum(principal), 0);
  const n = Math.max(Math.round(safeNum(months)), 1);
  const r = Math.max(safeNum(annualRate), 0) / 12 / 100;
  if (P <= 0) return 0;
  if (r === 0) return P / n;
  const pow = Math.pow(1 + r, n);
  const emi = (P * r * pow) / (pow - 1);
  return Number.isFinite(emi) ? emi : 0;
}

export interface AmortRow {
  month: number;
  year: number;
  emi: number;
  principal: number;
  interest: number;
  prepayment: number;
  balance: number;
}

export interface ScheduleResult {
  emi: number;
  rows: AmortRow[];
  months: number;
  totalInterest: number;
  totalPrincipal: number;
  totalPrepayment: number;
  totalPayment: number;
}

export interface ScheduleInput {
  principal: number;
  annualRate: number;
  months: number;
  extraMonthly?: number;
  lumpsum?: number;
  lumpsumMonth?: number;
  prepayFrequency?: PrepayFrequency;
  prepayAmount?: number;
}

/** Full amortization with optional extra payments / prepayments. */
export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const P = Math.max(safeNum(input.principal), 0);
  const n = clamp(Math.round(safeNum(input.months)), 1, 600);
  const r = Math.max(safeNum(input.annualRate), 0) / 12 / 100;
  const emi = calcEMI(P, input.annualRate, n);
  const extra = Math.max(safeNum(input.extraMonthly), 0);
  const lump = Math.max(safeNum(input.lumpsum), 0);
  const lumpMonth = clamp(Math.round(safeNum(input.lumpsumMonth, 12)), 1, n);
  const freq = input.prepayFrequency ?? "none";
  const recur = Math.max(safeNum(input.prepayAmount), 0);

  const rows: AmortRow[] = [];
  let balance = P;
  let totalInterest = 0;
  let totalPrepayment = 0;

  for (let m = 1; m <= 600 && balance > 0.5; m++) {
    const interest = balance * r;
    let principalPart = Math.min(emi - interest, balance);
    if (principalPart < 0) principalPart = 0; // interest-only guard
    balance -= principalPart;

    let prepay = extra;
    if (freq === "monthly") prepay += recur;
    else if (freq === "quarterly" && m % 3 === 0) prepay += recur;
    else if (freq === "yearly" && m % 12 === 0) prepay += recur;
    if (lump > 0 && m === lumpMonth) prepay += lump;
    prepay = Math.min(prepay, balance);
    balance -= prepay;

    totalInterest += interest;
    totalPrepayment += prepay;
    rows.push({
      month: m,
      year: Math.ceil(m / 12),
      emi: principalPart + interest,
      principal: principalPart,
      interest,
      prepayment: prepay,
      balance: Math.max(balance, 0),
    });
    if (emi - interest <= 0 && prepay <= 0) break; // never-amortising guard
  }

  return {
    emi,
    rows,
    months: rows.length,
    totalInterest,
    totalPrincipal: P,
    totalPrepayment,
    totalPayment: P + totalInterest,
  };
}

export interface YearRow {
  year: number;
  opening: number;
  principal: number;
  interest: number;
  prepayment: number;
  closing: number;
}

export function yearlySummary(rows: AmortRow[], principal: number): YearRow[] {
  const out: YearRow[] = [];
  let opening = principal;
  const years = rows.length ? rows[rows.length - 1].year : 0;
  for (let y = 1; y <= years; y++) {
    const yr = rows.filter((r) => r.year === y);
    if (!yr.length) continue;
    const p = yr.reduce((s, r) => s + r.principal, 0);
    const i = yr.reduce((s, r) => s + r.interest, 0);
    const pre = yr.reduce((s, r) => s + r.prepayment, 0);
    const closing = yr[yr.length - 1].balance;
    out.push({ year: y, opening, principal: p, interest: i, prepayment: pre, closing });
    opening = closing;
  }
  return out;
}
