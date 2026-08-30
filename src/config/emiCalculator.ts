/**
 * Centralised configuration for the EMI Calculator.
 * Change defaults, ranges and presets here — nowhere else.
 */
export const EMI_CONFIG = {
  currency: "₹",
  locale: "en-IN",
  canonical: "https://www.investingiq.in/calculators/emi-calculator/",
  methodologyReviewed: "2026-08-30",

  amount: { min: 10000, max: 200000000, step: 10000, default: 1000000 },
  rate: { min: 0, max: 30, step: 0.05, default: 8.5 },
  tenureYears: { min: 1, max: 30, step: 1, default: 10 },
  tenureMonths: { min: 1, max: 360, step: 1, default: 120 },

  amountPresets: [
    { label: "₹1L", value: 100000 },
    { label: "₹5L", value: 500000 },
    { label: "₹10L", value: 1000000 },
    { label: "₹20L", value: 2000000 },
    { label: "₹50L", value: 5000000 },
    { label: "₹1Cr", value: 10000000 },
  ],
  tenurePresets: [1, 3, 5, 10, 15, 20, 30],

  features: {
    advancedOptions: true,
    prepayment: true,
    processingFee: true,
    amortization: true,
    scenarioComparison: true,
    whatIf: true,
    share: true,
    download: true,
    mobileStickyBar: true,
  },

  processingFeeGstRate: 18,
} as const;

export type PrepayFrequency = "none" | "monthly" | "quarterly" | "yearly";
