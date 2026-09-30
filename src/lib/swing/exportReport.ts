// CSV and PDF exports for backtest, robustness and comparison reports (client-side, no upload).
import type { SimTrade } from "./strategies20";

export type Cell = string | number | null | undefined;
export interface Section { title: string; head: string[]; rows: Cell[][]; note?: string }

const esc = (v: Cell) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const stamp = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16).replace("T", " ") + " IST";
const fileName = (base: string, ext: string) => `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.${ext}`;

function download(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportCsv(title: string, meta: string[], sections: Section[]) {
  const lines = [esc(title), ...meta.map(esc), esc("Generated " + stamp()), ""];
  sections.forEach((s) => { lines.push(esc(s.title), s.head.map(esc).join(",")); s.rows.forEach((r) => lines.push(r.map(esc).join(","))); if (s.note) lines.push(esc(s.note)); lines.push(""); });
  lines.push(esc("Paper trading research only. Not investment advice. Data unofficial, sourced from NSE/BSE. Past results do not guarantee future returns."));
  download(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), fileName(title, "csv"));
}

export async function exportPdf(title: string, meta: string[], sections: Section[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  // jsPDF core fonts lack the rupee sign; use "Rs"
  const clean = (v: Cell) => (v == null ? "" : String(v).replace(/₹/g, "Rs "));
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("InvestingIQ Money Desk", 36, 40);
  doc.setFontSize(12); doc.text(clean(title), 36, 60);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90);
  let y = 76; [...meta, "Generated " + stamp()].forEach((m) => { doc.splitTextToSize(clean(m), W - 72).forEach((l: string) => { doc.text(l, 36, y); y += 11; }); });
  doc.setTextColor(0);
  sections.forEach((s) => {
    y += 10; if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text(clean(s.title), 36, y);
    autoTable(doc, { startY: y + 6, head: [s.head.map(clean)], body: s.rows.map((r) => r.map(clean)), styles: { fontSize: s.head.length > 12 ? 6.5 : 7.5, cellPadding: 3 }, headStyles: { fillColor: [30, 64, 120] }, margin: { left: 36, right: 36 }, theme: "striped" });
    y = (doc as any).lastAutoTable.finalY + 6;
    if (s.note) { doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.splitTextToSize(clean(s.note), W - 72).forEach((l: string) => { y += 10; doc.text(l, 36, y); }); }
    y += 8;
  });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(120); doc.text(`Paper trading research only. Not investment advice. Data unofficial, sourced from NSE/BSE.   Page ${i} of ${n}`, 36, doc.internal.pageSize.getHeight() - 18); }
  doc.save(fileName(title, "pdf"));
}

const r2 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "" : Math.round(n * 100) / 100);
export const TRADE_HEAD = ["Strategy", "Symbol", "Entry date", "Entry", "Qty", "Stop loss", "TP1", "TP2", "Risk", "Position value", "Exit date", "Exit", "Exit reason", "Gross P&L", "Charges", "Slippage", "Net P&L", "R", "Hold days", "Status"];
export const tradeRows = (t: SimTrade[]): Cell[][] => t.map((x) => [x.strategy, x.symbol, x.entryDate, r2(x.entryPrice), x.quantity, r2(x.stopLoss), r2(x.tp1), r2(x.tp2), r2(x.riskAmount), r2(x.positionValue), x.exitDate ?? "", r2(x.exitPrice), x.exitReason ?? "", r2(x.grossPnl), r2(x.charges), r2(x.slippage), r2(x.netPnl), r2(x.rMultiple), x.holdDays, x.open ? "Open" : "Closed"]);
export { r2 };
