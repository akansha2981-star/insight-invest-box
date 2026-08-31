import { describe, it, expect } from "vitest";
import { calcEMI, buildSchedule, yearlySummary, inr, inrCompact, monthsToLabel, clamp, safeNum } from "./emi";
import { EMI_CONFIG } from "@/config/emiCalculator";

const finite = (n: number) => Number.isFinite(n) && !Number.isNaN(n);

describe("calcEMI", () => {
  it("computes standard reducing-balance EMI", () => {
    expect(Math.round(calcEMI(1000000, 8.5, 120))).toBe(12399);
  });

  it("handles 0% interest as simple division", () => {
    expect(calcEMI(120000, 0, 12)).toBeCloseTo(10000, 6);
  });

  it("handles decimal interest rates", () => {
    const emi = calcEMI(2500000, 8.35, 240);
    expect(finite(emi)).toBe(true);
    expect(emi).toBeGreaterThan(0);
  });

  it("handles very large principal without overflow", () => {
    const emi = calcEMI(EMI_CONFIG.amount.max, 30, 360);
    expect(finite(emi)).toBe(true);
  });

  it("returns 0 for zero/invalid principal", () => {
    expect(calcEMI(0, 9, 120)).toBe(0);
    expect(calcEMI(NaN as unknown as number, 9, 120)).toBe(0);
  });

  it("never returns NaN/Infinity for edge inputs", () => {
    const cases: Array<[number, number, number]> = [
      [1, 0, 1],
      [1e9, 0.01, 1],
      [1e9, 30, 600],
      [-100, -5, -5],
    ];
    for (const [p, r, n] of cases) expect(finite(calcEMI(p, r, n))).toBe(true);
  });
});

describe("buildSchedule", () => {
  it("amortises to (near) zero balance", () => {
    const s = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120 });
    expect(s.months).toBe(120);
    expect(s.rows[s.rows.length - 1].balance).toBeLessThan(1);
    expect(s.totalInterest).toBeGreaterThan(0);
    expect(s.totalPayment).toBeCloseTo(s.totalPrincipal + s.totalInterest, 6);
  });

  it("works at 0% interest", () => {
    const s = buildSchedule({ principal: 120000, annualRate: 0, months: 12 });
    expect(s.totalInterest).toBeCloseTo(0, 6);
    expect(s.months).toBe(12);
  });

  it("monthly extra payment shortens tenure and cuts interest", () => {
    const base = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120 });
    const fast = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120, extraMonthly: 5000 });
    expect(fast.months).toBeLessThan(base.months);
    expect(fast.totalInterest).toBeLessThan(base.totalInterest);
  });

  it("applies lumpsum prepayment at the given month", () => {
    const s = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120, lumpsum: 200000, lumpsumMonth: 13 });
    expect(s.rows[12].prepayment).toBeGreaterThanOrEqual(200000 - 1);
    expect(s.totalPrepayment).toBeGreaterThan(0);
    expect(s.months).toBeLessThan(120);
  });

  it("applies quarterly and yearly recurring prepayments", () => {
    const q = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120, prepayFrequency: "quarterly", prepayAmount: 10000 });
    const y = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120, prepayFrequency: "yearly", prepayAmount: 10000 });
    expect(q.months).toBeLessThan(y.months);
    expect(q.rows[2].prepayment).toBeGreaterThan(0);
    expect(y.rows[11].prepayment).toBeGreaterThan(0);
    expect(y.rows[0].prepayment).toBe(0);
  });

  it("guards against never-amortising loans (capped rows, finite totals)", () => {
    const s = buildSchedule({ principal: 1e8, annualRate: 30, months: 1 });
    expect(s.rows.length).toBeLessThanOrEqual(600);
    expect(finite(s.totalInterest)).toBe(true);
    expect(finite(s.totalPayment)).toBe(true);
  });

  it("produces only finite row values", () => {
    const s = buildSchedule({ principal: 7500000, annualRate: 9.35, months: 300, extraMonthly: 1234.56, lumpsum: 99999, lumpsumMonth: 37, prepayFrequency: "quarterly", prepayAmount: 5000 });
    for (const r of s.rows) {
      expect(finite(r.emi) && finite(r.principal) && finite(r.interest) && finite(r.prepayment) && finite(r.balance)).toBe(true);
      expect(r.balance).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("yearlySummary", () => {
  it("aggregates months into years consistently", () => {
    const s = buildSchedule({ principal: 1000000, annualRate: 8.5, months: 120 });
    const ys = yearlySummary(s.rows, 1000000);
    expect(ys.length).toBe(10);
    const totalInterest = ys.reduce((a, y) => a + y.interest, 0);
    expect(totalInterest).toBeCloseTo(s.totalInterest, 4);
    expect(ys[ys.length - 1].closing).toBeLessThan(1);
  });
});

describe("processing fee maths", () => {
  const feeWithGst = (amount: number, pct: number) => {
    const base = (amount * pct) / 100;
    return base + (base * EMI_CONFIG.processingFeeGstRate) / 100;
  };

  it("adds 18% GST to the fee", () => {
    expect(feeWithGst(1000000, 1)).toBeCloseTo(11800, 6);
  });

  it("returns 0 for a 0% fee and stays finite for extremes", () => {
    expect(feeWithGst(1000000, 0)).toBe(0);
    expect(finite(feeWithGst(EMI_CONFIG.amount.max, 5))).toBe(true);
  });
});

describe("formatters & helpers", () => {
  it("formats INR safely", () => {
    expect(inr(0)).toBe("₹0");
    expect(inr(NaN)).toBe("₹0");
    expect(inr(-500)).toBe("₹0");
    expect(inr(1234567)).toContain("₹");
  });

  it("formats compact INR", () => {
    expect(inrCompact(15000000)).toBe("₹1.50 Cr");
    expect(inrCompact(250000)).toBe("₹2.50 L");
    expect(inrCompact(5500)).toBe("₹5.5 K");
    expect(inrCompact(NaN)).toBe("₹0");
  });

  it("labels month counts", () => {
    expect(monthsToLabel(1)).toBe("1 month");
    expect(monthsToLabel(24)).toBe("2 years");
    expect(monthsToLabel(14)).toBe("1 yr 2 mo");
  });

  it("clamps and coerces", () => {
    expect(clamp(15, 1, 10)).toBe(10);
    expect(safeNum("abc", 7)).toBe(7);
    expect(safeNum("12")).toBe(12);
  });
});
