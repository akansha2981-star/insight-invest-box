import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { CURRENCIES, CURRENCY_MAP, TRENDING_PAIRS, formatMoney } from "@/data/currencies";
import { ArrowRightLeft, TrendingUp, TrendingDown, Calendar, BarChart3, Globe, Sparkles, Activity, ChevronDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from "recharts";

interface ForexRate { code: string; rate_usd: number; updated_at: string; source: string; }
interface HistoryRow { date: string; code: string; rate_usd: number; }

const RANGES = [
  { id: "1W", days: 7, label: "1 Week" },
  { id: "1M", days: 30, label: "1 Month" },
  { id: "3M", days: 90, label: "3 Months" },
  { id: "1Y", days: 365, label: "1 Year" },
  { id: "5Y", days: 1825, label: "5 Years" },
  { id: "ALL", days: 3650, label: "All Time" },
];

function parsePair(slug?: string): { from: string; to: string } | null {
  if (!slug) return null;
  const m = slug.toLowerCase().match(/^([a-z]{3})-to-([a-z]{3})$/);
  if (!m) return null;
  const from = m[1].toUpperCase();
  const to = m[2].toUpperCase();
  if (!CURRENCY_MAP[from] || !CURRENCY_MAP[to]) return null;
  return { from, to };
}

export default function CurrencyConverterPage() {
  const { pair } = useParams<{ pair?: string }>();
  const navigate = useNavigate();
  const parsed = parsePair(pair);
  const initialFrom = parsed?.from ?? "USD";
  const initialTo = parsed?.to ?? "INR";

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState<string>("1");
  const [rates, setRates] = useState<Record<string, ForexRate>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [range, setRange] = useState("1Y");
  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (parsed) { setFrom(parsed.from); setTo(parsed.to); }
  }, [pair]);

  // Sync URL with selection
  useEffect(() => {
    const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
    if (pair !== slug) navigate(`/currency-converter/${slug}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Fetch latest rates
  useEffect(() => {
    (async () => {
      setLoadingRates(true);
      const { data } = await supabase.functions.invoke("forex-rates", { body: { action: "rates" } });
      const map: Record<string, ForexRate> = {};
      (data?.rates ?? []).forEach((r: ForexRate) => { map[r.code] = r; });
      setRates(map);
      setLoadingRates(false);
    })();
  }, []);

  // Fetch history for pair + range
  useEffect(() => {
    const days = RANGES.find(r => r.id === range)?.days ?? 365;
    (async () => {
      setLoadingHistory(true);
      const { data } = await supabase.functions.invoke("forex-rates", { body: { action: "history", from, to, days } });
      setHistory(data?.history ?? []);
      setLoadingHistory(false);
    })();
  }, [from, to, range]);

  // Compute current exchange rate
  const fromRate = rates[from]?.rate_usd;
  const toRate = rates[to]?.rate_usd;
  const rate = fromRate && toRate ? toRate / fromRate : null;
  const amountNum = Number(amount) || 0;
  const converted = rate ? amountNum * rate : 0;

  // Build pair chart data
  const pairChart = useMemo(() => {
    const byDate: Record<string, { date: string; f?: number; t?: number }> = {};
    history.forEach(h => {
      const d = byDate[h.date] ?? { date: h.date };
      if (h.code === from) d.f = h.rate_usd;
      if (h.code === to) d.t = h.rate_usd;
      byDate[h.date] = d;
    });
    return Object.values(byDate)
      .filter(d => d.f && d.t)
      .map(d => ({ date: d.date, rate: (d.t! / d.f!), label: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) }));
  }, [history, from, to]);

  const stats = useMemo(() => {
    if (pairChart.length === 0) return null;
    const values = pairChart.map(p => p.rate);
    const first = values[0], last = values[values.length - 1];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const changePct = ((last - first) / first) * 100;
    const volatility = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length) / avg * 100;
    return { first, last, high, low, avg, changePct, volatility };
  }, [pairChart]);

  // SEO bits
  const fromMeta = CURRENCY_MAP[from], toMeta = CURRENCY_MAP[to];
  const pageTitle = `${fromMeta?.name} to ${toMeta?.name} | ${from} to ${to} Converter Live`;
  const metaDesc = `Convert ${from} to ${to} with live exchange rates. ${formatMoney(1, from)} = ${rate ? formatMoney(rate, to) : "—"}. Historical charts, trends, and forex intelligence.`;
  const canonical = `https://www.investingiq.in/currency-converter/${from.toLowerCase()}-to-${to.toLowerCase()}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "InvestingIQ Currency Converter",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: canonical,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `What is the current ${from} to ${to} exchange rate?`,
        acceptedAnswer: { "@type": "Answer", text: `${formatMoney(1, from)} equals ${rate ? formatMoney(rate, to) : "—"} based on the latest exchange rates.` } },
      { "@type": "Question", name: `How is the ${from}/${to} rate calculated?`,
        acceptedAnswer: { "@type": "Answer", text: "Rates are sourced from the European Central Bank and global forex providers, updated daily and refreshed on demand." } },
      { "@type": "Question", name: "Is this currency converter free?",
        acceptedAnswer: { "@type": "Answer", text: "Yes — no login or registration required. Use it as many times as you wish." } },
    ],
  };

  function swap() { setFrom(to); setTo(from); }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="keywords" content={`${from} to ${to}, currency converter, live exchange rates, ${fromMeta?.name} to ${toMeta?.name}, forex calculator, exchange rate today, real-time currency conversion, foreign exchange`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <Header />

      {/* Hero converter */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-[1240px] mx-auto px-4 py-10 lg:py-14">
          <div className="flex items-center gap-2 text-xs text-white/60 mb-4">
            <Globe className="h-3.5 w-3.5" /> Live forex rates · Updated {rates[from]?.updated_at ? new Date(rates[from].updated_at).toLocaleString("en-IN") : "—"}
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            {fromMeta?.name} to {toMeta?.name}
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-2xl">
            Instant {from} to {to} conversion using the latest live exchange rates. Free, no login required.
          </p>

          <div className="mt-8 bg-white/8 backdrop-blur border border-white/10 rounded-2xl p-5 md:p-7 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr] gap-4 items-end">
              <CurrencyField label="From" value={from} amount={amount} onAmount={setAmount} onChange={setFrom} />
              <button onClick={swap} className="hidden md:flex h-12 w-12 mb-1 items-center justify-center bg-primary/90 hover:bg-primary rounded-xl transition-colors shrink-0 self-center mx-auto" aria-label="Swap currencies">
                <ArrowRightLeft className="h-5 w-5" />
              </button>
              <CurrencyField label="To" value={to} amount={rate ? formatMoney(converted, to).replace(/[^\d.,]/g, "") : "—"} readOnly onChange={setTo} />
              <div className="bg-white text-slate-900 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Result</div>
                <div className="number-font text-2xl md:text-3xl font-black mt-1 leading-tight">
                  {loadingRates ? "…" : rate ? formatMoney(converted, to) : "—"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  1 {from} = {rate ? rate.toFixed(4) : "—"} {to}
                </div>
              </div>
            </div>

            <button onClick={swap} className="md:hidden mt-3 w-full flex items-center justify-center gap-2 bg-primary/90 hover:bg-primary rounded-xl py-2 text-sm font-semibold">
              <ArrowRightLeft className="h-4 w-4" /> Swap
            </button>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      {stats && (
        <section className="border-b border-border bg-white">
          <div className="max-w-[1240px] mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label={`Change (${range})`} value={`${stats.changePct.toFixed(2)}%`} up={stats.changePct >= 0} icon={stats.changePct >= 0 ? TrendingUp : TrendingDown} />
            <StatCard label={`High (${range})`} value={stats.high.toFixed(4)} />
            <StatCard label={`Low (${range})`} value={stats.low.toFixed(4)} />
            <StatCard label={`Average`} value={stats.avg.toFixed(4)} />
            <StatCard label="Volatility" value={`${stats.volatility.toFixed(2)}%`} icon={Activity} />
          </div>
        </section>
      )}

      <main className="max-w-[1240px] mx-auto px-4 py-8 space-y-10">

        {/* Chart */}
        <section className="bg-white border border-border rounded-2xl shadow-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground text-base">{from}/{to} Exchange Rate History</h2>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {RANGES.map(r => (
                <button key={r.id} onClick={() => setRange(r.id)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${range === r.id ? "bg-white text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                  {r.id}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            {loadingHistory ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>
            ) : pairChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={pairChart}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={30} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={v => v.toFixed(3)} />
                  <Tooltip formatter={(v: any) => [Number(v).toFixed(4), `1 ${from}`]} labelFormatter={(l) => l} />
                  <Area type="monotone" dataKey="rate" stroke="hsl(217,91%,60%)" strokeWidth={2} fill="url(#rateGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Individual currency strength */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CurrencyStrengthCard code={from} history={history} />
          <CurrencyStrengthCard code={to} history={history} />
        </section>

        {/* Quick conversion table */}
        <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold text-foreground text-base">Quick {from} to {to} Conversion Table</h2>
            <p className="text-xs text-muted-foreground mt-1">Common amounts at the current rate.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-5 py-2.5">{from}</th><th className="text-left px-5 py-2.5">{to}</th><th className="text-left px-5 py-2.5">{to}</th><th className="text-left px-5 py-2.5">{from}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[1, 5, 10, 50, 100, 500, 1000, 5000, 10000].map(n => (
                  <tr key={n} className="hover:bg-muted/20">
                    <td className="px-5 py-2.5 number-font">{n.toLocaleString()} {from}</td>
                    <td className="px-5 py-2.5 number-font font-semibold">{rate ? (n * rate).toFixed(2) : "—"} {to}</td>
                    <td className="px-5 py-2.5 number-font">{n.toLocaleString()} {to}</td>
                    <td className="px-5 py-2.5 number-font font-semibold">{rate ? (n / rate).toFixed(2) : "—"} {from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Trending pairs */}
        <section>
          <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Trending Currency Pairs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {TRENDING_PAIRS.map(([f, t]) => {
              const fr = rates[f]?.rate_usd, tr = rates[t]?.rate_usd;
              const r = fr && tr ? (tr / fr) : null;
              return (
                <Link key={`${f}-${t}`} to={`/currency-converter/${f.toLowerCase()}-to-${t.toLowerCase()}`}
                  className="bg-white border border-border rounded-xl p-4 hover:border-primary hover:shadow-card-md transition-all">
                  <div className="text-xs font-bold text-muted-foreground">{f} → {t}</div>
                  <div className="number-font text-base font-bold text-foreground mt-1">1 = {r ? r.toFixed(4) : "—"}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{CURRENCY_MAP[f]?.name} / {CURRENCY_MAP[t]?.name}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Educational / FAQ */}
        <section className="bg-white border border-border rounded-2xl shadow-card p-5 md:p-6">
          <h2 className="font-bold text-foreground text-lg mb-3">About {fromMeta?.name} to {toMeta?.name} ({from}/{to})</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
            <p>
              The {from}/{to} exchange rate represents how many {toMeta?.name} ({to}) one {fromMeta?.name} ({from}) can buy on the global foreign exchange market.
              Rates fluctuate continuously based on economic indicators, central-bank policy, inflation, trade balance, and capital flows between the two regions.
            </p>
            <p>
              Our currency converter is free to use, requires no login, and pulls the latest exchange rates from the European Central Bank and supplementary global forex providers.
              Use the interactive chart above to study how the {from}/{to} rate has moved across 1 week, 1 month, 1 year, 5 years, and all time, and use the conversion table to quickly look up popular amounts.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-foreground text-base">Frequently Asked Questions</h3>
            {[
              [`What is ${formatMoney(1, from)} in ${to}?`, rate ? `${formatMoney(1, from)} = ${formatMoney(rate, to)} at the current live exchange rate.` : "Loading…"],
              [`How often are ${from}/${to} rates updated?`, "Rates refresh automatically every day at midnight (IST) and are re-fetched whenever you load the page."],
              [`Where do these exchange rates come from?`, "Frankfurter (European Central Bank reference rates) with supplementary data from global forex providers for currencies the ECB does not publish."],
              [`Is this converter free?`, "Yes — fully free, no login, no registration, unlimited conversions."],
              [`Does InvestingIQ provide forex trading advice?`, "No. InvestingIQ is not a SEBI-registered investment advisor. All content is for educational purposes only."],
            ].map(([q, a]) => (
              <details key={q} className="bg-muted/30 rounded-lg px-4 py-3 group">
                <summary className="cursor-pointer font-semibold text-sm text-foreground flex items-center justify-between">
                  {q} <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-sm text-muted-foreground mt-2">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <ComplianceDisclaimer variant="card" />
      </main>

      <Footer />
    </div>
  );
}

function CurrencyField({ label, value, amount, onAmount, onChange, readOnly = false }: {
  label: string; value: string; amount?: string; onAmount?: (v: string) => void; onChange: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1.5 block">{label}</label>
      <div className="flex bg-white/10 border border-white/15 rounded-xl overflow-hidden">
        <input
          type={readOnly ? "text" : "number"}
          inputMode="decimal"
          value={amount ?? ""}
          readOnly={readOnly}
          onChange={(e) => onAmount?.(e.target.value)}
          className="flex-1 bg-transparent px-3 py-3 text-base font-bold number-font text-white outline-none w-0"
        />
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="bg-white/10 border-l border-white/15 px-3 py-3 text-sm font-bold text-white outline-none cursor-pointer">
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code} className="text-slate-900">{c.code} — {c.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StatCard({ label, value, up, icon: Icon }: { label: string; value: string; up?: boolean; icon?: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
      <div className={`number-font text-lg md:text-xl font-bold mt-1 flex items-center gap-1.5 ${up === true ? "text-gain" : up === false ? "text-loss" : "text-foreground"}`}>
        {Icon && <Icon className="h-4 w-4" />} {value}
      </div>
    </div>
  );
}

function CurrencyStrengthCard({ code, history }: { code: string; history: HistoryRow[] }) {
  const meta = CURRENCY_MAP[code];
  const series = history.filter(h => h.code === code).map(h => ({ date: h.date, rate: 1 / h.rate_usd, label: new Date(h.date).toLocaleDateString("en-IN", { month: "short", day: "2-digit" }) }));
  const first = series[0]?.rate, last = series[series.length - 1]?.rate;
  const changePct = first && last ? ((last - first) / first) * 100 : null;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-foreground">{meta?.name}</div>
          <div className="text-xs text-muted-foreground">{code} strength vs USD</div>
        </div>
        {changePct !== null && (
          <div className={`text-sm font-bold flex items-center gap-1 ${changePct >= 0 ? "text-gain" : "text-loss"}`}>
            {changePct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {changePct.toFixed(2)}%
          </div>
        )}
      </div>
      <div style={{ width: "100%", height: 140 }}>
        {series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No data</div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={series}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} minTickGap={30} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip formatter={(v: any) => [Number(v).toFixed(4), `1 USD = ? ${code}`]} />
              <Line type="monotone" dataKey="rate" stroke={changePct && changePct >= 0 ? "hsl(142,71%,45%)" : "hsl(4,90%,50%)"} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
