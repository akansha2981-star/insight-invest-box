import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCsv, exportPdf, type Section } from "@/lib/swing/exportReport";
import { toast } from "sonner";

export function ExportButtons({ title, build }: { title: string; build: () => { meta: string[]; sections: Section[] } }) {
  const [busy, setBusy] = useState(false);
  const run = async (kind: "csv" | "pdf") => {
    try { setBusy(true); const { meta, sections } = build(); if (kind === "csv") exportCsv(title, meta, sections); else await exportPdf(title, meta, sections); }
    catch (e) { toast.error("Export failed. Please try again."); console.error(e); } finally { setBusy(false); }
  };
  return <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => run("csv")}><FileSpreadsheet className="mr-1 h-4 w-4" />CSV</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => run("pdf")}><FileDown className="mr-1 h-4 w-4" />PDF</Button></div>;
}
