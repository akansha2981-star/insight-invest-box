export const fmtCr = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L Cr`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k Cr`;
  return `₹${n.toFixed(0)} Cr`;
};
export const fmtPct = (v: number | string | null | undefined, sign = false) => {
  const n = Number(v ?? 0);
  return `${sign && n > 0 ? '+' : ''}${n.toFixed(2)}%`;
};
export const fmtINR = (v: number | string | null | undefined) =>
  `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const pctClass = (v: number | string | null | undefined) =>
  Number(v ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600';
