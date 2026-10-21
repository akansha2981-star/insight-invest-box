import { describe, expect, it } from "vitest";
import { articleWords, canonicalArticleUrl, inReportRange, publicationTrend, reportCsv, reportRange } from "./newsResearchReports";

describe("news research reporting rules", () => {
  it("uses IST rather than the server day for Today", () => {
    expect(reportRange("today", new Date("2026-10-20T19:00:00Z"))).toEqual({ start: "2026-10-21", end: "2026-10-21" });
  });
  it("includes exactly seven calendar days for Last 7 Days", () => {
    expect(reportRange("7days", new Date("2026-10-21T08:00:00Z"))).toEqual({ start: "2026-10-15", end: "2026-10-21" });
  });
  it("uses Yesterday in IST across month boundaries", () => {
    expect(reportRange("yesterday", new Date("2026-11-01T08:00:00Z"))).toEqual({ start: "2026-10-31", end: "2026-10-31" });
  });
  it("excludes unpublished dates instead of treating them as today", () => {
    expect(inReportRange(null, { start: "2026-10-21", end: "2026-10-21" })).toBe(false);
  });
  it("calculates daily and cumulative publications from actual records", () => {
    expect(publicationTrend(["2026-10-20T08:00:00Z", "2026-10-21T08:00:00Z", "2026-10-21T09:00:00Z"], { start: "2026-10-20", end: "2026-10-21" })).toEqual([
      { date: "2026-10-20", published: 1, cumulative: 1 }, { date: "2026-10-21", published: 2, cumulative: 3 },
    ]);
  });
  it("counts actual article words, not HTML tags", () => {
    expect(articleWords("<h2>Market update</h2><p>Policy rates remain unchanged.</p>")).toBe(6);
  });
  it("copies public canonical article addresses, not preview addresses", () => {
    expect(canonicalArticleUrl("rbi-policy-update")).toBe("https://www.investingiq.in/news/rbi-policy-update");
  });
  it("escapes reports and prevents spreadsheet formulas", () => {
    expect(reportCsv([["=HYPERLINK(1)", 'A "quote"', "a,b"]])).toBe('"\'=HYPERLINK(1)","A ""quote""","a,b"');
  });
});