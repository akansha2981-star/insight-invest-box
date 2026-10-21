export type ReportPeriod = "today" | "yesterday" | "7days" | "30days" | "custom";

export function istDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function reportRange(period: ReportPeriod, now = new Date(), custom?: { start: string; end: string }) {
  const today = istDate(now);
  const end = period === "yesterday" ? shiftDate(today, -1) : today;
  const start = period === "7days" ? shiftDate(today, -6) : period === "30days" ? shiftDate(today, -29) : end;
  if (period === "custom" && custom?.start && custom.end) return { start: custom.start, end: custom.end };
  return { start, end };
}

export function inReportRange(value: string | null | undefined, range: { start: string; end: string }) {
  if (!value || Number.isNaN(new Date(value).getTime())) return false;
  const date = istDate(value);
  return date >= range.start && date <= range.end;
}

export function articleWords(html: string | null | undefined): number {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/&\w+;|&#\d+;/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export function canonicalArticleUrl(slug: string, base = "https://www.investingiq.in") {
  return `${base.replace(/\/$/, "")}/news/${encodeURIComponent(slug)}`;
}

export function reportCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map(row => row.map(value => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function publicationTrend(dates: string[], range: { start: string; end: string }) {
  const counts = new Map<string, number>();
  dates.forEach(value => { if (inReportRange(value, range)) { const date = istDate(value); counts.set(date, (counts.get(date) ?? 0) + 1); } });
  const result: { date: string; published: number; cumulative: number }[] = [];
  let cumulative = 0;
  for (let date = range.start, i = 0; date <= range.end && i < 3660; date = shiftDate(date, 1), i++) {
    const published = counts.get(date) ?? 0;
    cumulative += published;
    result.push({ date, published, cumulative });
  }
  return result;
}