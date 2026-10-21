// Shared sitemap collection used by sitemap-manager and news-automation.
// lastmod is authoritative per page (content change time) or null for pages with
// no page-specific change signal — generation time is never used as a fallback.

export const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: number }> = [
  { path: "/",                   changefreq: "daily",   priority: 1.0 },
  { path: "/news",               changefreq: "hourly",  priority: 0.9 },
  { path: "/markets",            changefreq: "hourly",  priority: 0.9 },
  { path: "/stocks",             changefreq: "hourly",  priority: 0.9 },
  { path: "/stocks/reviews",     changefreq: "daily",   priority: 0.8 },
  { path: "/economy",            changefreq: "daily",   priority: 0.8 },
  { path: "/mf",                 changefreq: "daily",   priority: 0.8 },
  { path: "/crypto",             changefreq: "hourly",  priority: 0.7 },
  { path: "/real-estate",        changefreq: "daily",   priority: 0.9 },
  { path: "/tools/sip",          changefreq: "monthly", priority: 0.7 },
  { path: "/tools/emi",          changefreq: "monthly", priority: 0.7 },
  { path: "/tools/fd",           changefreq: "monthly", priority: 0.7 },
  { path: "/tools/tax",          changefreq: "monthly", priority: 0.7 },
  { path: "/tools/screener",     changefreq: "weekly",  priority: 0.7 },
  { path: "/tools/portfolio",    changefreq: "monthly", priority: 0.6 },
  { path: "/about",              changefreq: "monthly", priority: 0.5 },
  { path: "/careers",            changefreq: "monthly", priority: 0.5 },
  { path: "/contact",            changefreq: "monthly", priority: 0.5 },
  { path: "/privacy",            changefreq: "yearly",  priority: 0.3 },
  { path: "/terms",              changefreq: "yearly",  priority: 0.3 },
];

export const EXCLUDE_PREFIXES = ["/admin", "/login", "/portfolio", "/sitemap", "/index.html"];

export function isAllowed(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  return !EXCLUDE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

export type SitemapRow = {
  url: string;
  path: string;
  source: string;
  lastmod: string | null;
  changefreq: string;
  priority: number;
};

export async function collectAllUrls(sb: any, baseUrl: string): Promise<SitemapRow[]> {
  const rows: SitemapRow[] = [];
  const seen = new Set<string>();
  const add = (path: string, source: string, lastmod: Date | string | null, changefreq = "weekly", priority = 0.7) => {
    if (!isAllowed(path)) return;
    if (seen.has(path)) return;
    seen.add(path);
    rows.push({
      url: `${baseUrl}${path}`,
      path,
      source,
      lastmod: lastmod ? new Date(lastmod).toISOString() : null,
      changefreq,
      priority,
    });
  };

  // Static routes: no page-specific change signal — omit lastmod rather than fabricate
  for (const r of STATIC_ROUTES) add(r.path, "static", null, r.changefreq, r.priority);

  // Blog posts — authoritative change time
  const { data: blogs } = await sb
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);
  for (const b of (blogs || [])) {
    if (b.slug) add(`/news/${b.slug}`, "blog", b.updated_at || b.published_at, "weekly", 0.8);
  }

  // Stock reviews — authoritative change time
  const { data: reviews } = await sb
    .from("stock_reviews")
    .select("symbol, updated_at")
    .limit(5000);
  for (const r of (reviews || [])) {
    if (r.symbol) add(`/stocks/review/${r.symbol}`, "stock_review", r.updated_at, "weekly", 0.7);
  }

  // Real estate properties — authoritative change time
  const { data: props } = await sb
    .from("properties")
    .select("slug, updated_at, city, listing_type, status")
    .eq("status", "active")
    .limit(5000);
  const cityBuckets = new Set<string>();
  for (const p of (props || [])) {
    if (p.slug) add(`/real-estate/${p.slug}`, "property", p.updated_at, "weekly", 0.7);
    if (p.city && p.listing_type) {
      const city = String(p.city).toLowerCase().trim().replace(/\s+/g, "-");
      const bucket = String(p.listing_type).toLowerCase().trim();
      cityBuckets.add(`${city}|${bucket}`);
    }
  }
  for (const cb of cityBuckets) {
    const [city, bucket] = cb.split("|");
    add(`/real-estate/${city}/${bucket}`, "re_city", null, "daily", 0.6);
  }

  return rows;
}

export function buildXml(rows: Array<{ url: string; lastmod: string | null; changefreq: string; priority: number }>): string {
  const items = rows
    .map((u) => {
      const parts = [`    <loc>${escapeXml(u.url)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>`);
      parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      parts.push(`    <priority>${Number(u.priority).toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

export function validateRows(rows: SitemapRow[], baseUrl: string): { ok: boolean; issues: string[]; withLastmod: number; withoutLastmod: number } {
  const issues: string[] = [];
  const seen = new Set<string>();
  let withLastmod = 0, withoutLastmod = 0;
  for (const r of rows) {
    if (!r.url.startsWith(baseUrl + "/")) issues.push(`non-canonical base: ${r.url}`);
    if (seen.has(r.url)) issues.push(`duplicate: ${r.url}`);
    seen.add(r.url);
    if (!isAllowed(r.path)) issues.push(`ineligible path: ${r.path}`);
    if (r.lastmod) {
      withLastmod++;
      const t = Date.parse(r.lastmod);
      if (Number.isNaN(t) || t > Date.now() + 3600_000) issues.push(`invalid lastmod: ${r.url}`);
    } else withoutLastmod++;
  }
  return { ok: issues.length === 0, issues: issues.slice(0, 50), withLastmod, withoutLastmod };
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
