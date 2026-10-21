// Generates public/sitemap.xml at predev/prebuild time.
// Pulls dynamic slugs (news, mutual funds, ETFs, stock reviews) from Supabase.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.investingiq.in";
const SUPABASE_URL = "https://euxpopovbfjkzhxiclrl.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHBvcG92YmZqa3poeGljbHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzOTYzNzgsImV4cCI6MjA4Njk3MjM3OH0.DnXqXR4fsxW2XOGcsPvlVOWABrTaLVlzVhdfagtux6Y";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}


const staticEntries: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/news", changefreq: "hourly", priority: "0.9" },
  { path: "/news-hub", changefreq: "hourly", priority: "0.9" },
  { path: "/markets", changefreq: "hourly", priority: "0.9" },
  { path: "/stocks", changefreq: "hourly", priority: "0.9" },
  { path: "/stocks/reviews", changefreq: "daily", priority: "0.8" },
  { path: "/economy", changefreq: "daily", priority: "0.8" },
  { path: "/mutual-funds", changefreq: "daily", priority: "0.9" },
  { path: "/mutual-funds/screener", changefreq: "daily", priority: "0.8" },
  { path: "/mutual-funds/compare", changefreq: "weekly", priority: "0.7" },
  { path: "/mutual-funds/overlap", changefreq: "weekly", priority: "0.7" },
  { path: "/mutual-funds/news", changefreq: "hourly", priority: "0.8" },
  { path: "/etfs", changefreq: "daily", priority: "0.9" },
  { path: "/etfs/screener", changefreq: "daily", priority: "0.8" },
  { path: "/etfs/compare", changefreq: "weekly", priority: "0.7" },
  { path: "/crypto", changefreq: "hourly", priority: "0.7" },
  { path: "/real-estate", changefreq: "daily", priority: "0.9" },
  { path: "/portfolio", changefreq: "weekly", priority: "0.6" },
  { path: "/currency-converter", changefreq: "daily", priority: "0.7" },
  // Tools
  { path: "/tools", changefreq: "weekly", priority: "0.8" },
  { path: "/tools/sip", changefreq: "monthly", priority: "0.7" },
  { path: "/calculators/emi-calculator", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/fd", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/tax", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/screener", changefreq: "weekly", priority: "0.7" },
  { path: "/tools/portfolio", changefreq: "monthly", priority: "0.6" },
  { path: "/tools/step-up-sip", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/goal-sip", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/retirement-sip", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/child-education-sip", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/marriage-sip", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/inflation-sip", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/fire-calculator", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/lumpsum-calculator", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/swp-calculator", changefreq: "monthly", priority: "0.7" },
  { path: "/tools/portfolio-analyzer", changefreq: "monthly", priority: "0.6" },
  // SEO landing pages
  { path: "/best-mutual-funds-2026", changefreq: "weekly", priority: "0.8" },
  { path: "/best-sip-funds", changefreq: "weekly", priority: "0.8" },
  { path: "/best-elss-funds", changefreq: "weekly", priority: "0.8" },
  { path: "/best-small-cap-funds", changefreq: "weekly", priority: "0.8" },
  { path: "/best-index-funds", changefreq: "weekly", priority: "0.8" },
  { path: "/best-etfs-india", changefreq: "weekly", priority: "0.8" },
  { path: "/gold-etf-vs-physical-gold", changefreq: "monthly", priority: "0.7" },
  { path: "/etf-vs-mutual-fund", changefreq: "monthly", priority: "0.7" },
  { path: "/sip-vs-lumpsum", changefreq: "monthly", priority: "0.7" },
  // Company
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/careers", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

async function rest<T = any>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) {
      console.warn(`sitemap: ${path} -> ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn(`sitemap: ${path} failed`, e);
    return [];
  }
}

async function collectDynamic(): Promise<Entry[]> {
  const [posts, funds, etfs, reviews] = await Promise.all([
    rest<{ slug: string; updated_at?: string; published_at?: string }>(
      "blog_posts?select=slug,updated_at,published_at&status=eq.published&limit=2000"
    ),
    rest<{ slug: string; updated_at?: string }>("mf_funds?select=slug,updated_at&limit=2000"),
    rest<{ slug: string; updated_at?: string }>("mf_etfs?select=slug,updated_at&limit=2000"),
    rest<{ symbol: string; updated_at?: string }>(
      "stock_reviews?select=symbol,updated_at&limit=2000"
    ),
  ]);

  const entries: Entry[] = [];
  for (const p of posts) {
    if (!p.slug) continue;
    entries.push({
      path: `/news/${p.slug}`,
      lastmod: p.updated_at || p.published_at || today,
      changefreq: "weekly",
      priority: "0.8",
    });
  }
  for (const f of funds) {
    if (!f.slug) continue;
    entries.push({
      path: `/mutual-funds/${f.slug}`,
      lastmod: f.updated_at || today,
      changefreq: "daily",
      priority: "0.7",
    });
  }
  for (const e of etfs) {
    if (!e.slug) continue;
    entries.push({
      path: `/etfs/${e.slug}`,
      lastmod: e.updated_at || today,
      changefreq: "daily",
      priority: "0.7",
    });
  }
  for (const r of reviews) {
    if (!r.symbol) continue;
    entries.push({
      path: `/stocks/review/${encodeURIComponent(r.symbol)}`,
      lastmod: r.updated_at || today,
      changefreq: "weekly",
      priority: "0.7",
    });
  }
  return entries;
}

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(entries: Entry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

async function main() {
  const dynamic = await collectDynamic();
  // Static entries have no page-specific change signal — omit lastmod rather than fabricate it.
  const all = [...staticEntries, ...dynamic];
  // Dedupe by path, last write wins
  const seen = new Map<string, Entry>();
  for (const e of all) seen.set(e.path, e);
  const final = [...seen.values()];
  const xml = render(final);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${final.length} URLs: ${staticEntries.length} static + ${dynamic.length} dynamic)`);
}

main().catch((e) => {
  console.error("sitemap generation failed", e);
  process.exit(0); // don't block build
});
