import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ComplianceDisclaimer } from "@/components/ComplianceDisclaimer";
import { CURRENCIES, CURRENCY_MAP, TRENDING_PAIRS, formatMoney } from "@/data/currencies";
import {
  ArrowRightLeft, TrendingUp, TrendingDown, BarChart3, Globe, Sparkles, Activity,
  ChevronDown, Plane, Send, Percent, Scale, Trophy, Newspaper
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from "recharts";

interface ForexRate { code: string; rate_usd: number; updated_at: string; source: string; }
interface HistoryRow { date: string; code: string; rate_usd: number; }

const RANGES = [
  { id: "1W", days: 7, label: "1 Week" },
  { id: "1M", days: 30, label: "1 Month" },
  { id: "3M", days: 90, label: "3 Months" },
  { id: "6M", days: 180, label: "6 Months" },
  { id: "1Y", days: 365, label: "1 Year" },
  { id: "5Y", days: 1825, label: "5 Years" },
  { id: "ALL", days: 3650, label: "All Time" },
];

const MOST_TRADED = [
  ["EUR", "USD"], ["USD", "JPY"], ["GBP", "USD"], ["USD", "CHF"],
  ["AUD", "USD"], ["USD", "CAD"], ["NZD", "USD"], ["USD", "INR"],
] as Array<[string, string]>;

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
  const [allHistory, setAllHistory] = useState<HistoryRow[]>([]);
  const [range, setRange] = useState("1Y");
  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Mini-tool inputs
  const [travelDays, setTravelDays] = useState(7);
  const [travelDaily, setTravelDaily] = useState(150);
  const [transferAmt, setTransferAmt] = useState(1000);
  const [inflationYears, setInflationYears] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);

  useEffect(() => {
    if (parsed) { setFrom(parsed.from); setTo(parsed.to); }
  }, [pair]);

  useEffect(() => {
    const slug = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
    if (pair !== slug) navigate(`/currency-converter/${slug}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Latest rates
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

  // History for chart
  useEffect(() => {
    const days = RANGES.find(r => r.id === range)?.days ?? 365;
    (async () => {
      setLoadingHistory(true);
      const { data } = await supabase.functions.invoke("forex-rates", { body: { action: "history", from, to, days } });
      setHistory(data?.history ?? []);
      setLoadingHistory(false);
    })();
  }, [from, to, range]);

  // 30-day history for all major currencies — powers gainers/losers + strength ranking
  useEffect(() => {
    (async () => {
      const { data } = await supabase.functions.invoke("forex-rates", { body: { action: "history", days: 30 } });
      setAllHistory(data?.history ?? []);
    })();
  }, []);

  const fromRate = rates[from]?.rate_usd;
  const toRate = rates[to]?.rate_usd;
  const rate = fromRate && toRate ? toRate / fromRate : null;
  const inverseRate = rate ? 1 / rate : null;
  const amountNum = Number(amount) || 0;
  const converted = rate ? amountNum * rate : 0;

  // Pair chart series
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
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ date: d.date, rate: (d.t! / d.f!), label: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) }));
  }, [history, from, to]);

  const stats = useMemo(() => {
    if (pairChart.length === 0) return null;
    const values = pairChart.map(p => p.rate);
    const first = values[0], last = values[values.length - 1];
    const high = Math.max(...values), low = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const changePct = ((last - first) / first) * 100;
    const volatility = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length) / avg * 100;
    // Multi-period changes
    const nDays = (n: number) => {
      const idx = Math.max(0, values.length - 1 - n);
      const ref = values[idx];
      return ((last - ref) / ref) * 100;
    };
    return {
      first, last, high, low, avg, changePct, volatility,
      d1: pairChart.length > 1 ? nDays(1) : 0,
      d7: pairChart.length > 7 ? nDays(7) : changePct,
      d30: pairChart.length > 30 ? nDays(30) : changePct,
      d365: pairChart.length > 250 ? nDays(250) : changePct,
    };
  }, [pairChart]);

  // Gainers/Losers over ~30 days using allHistory
  const gainersLosers = useMemo(() => {
    if (!allHistory.length) return { gainers: [], losers: [] };
    const grouped: Record<string, HistoryRow[]> = {};
    allHistory.forEach(h => { (grouped[h.code] ??= []).push(h); });
    const moves: Array<{ code: string; pct: number; latest: number }> = [];
    Object.entries(grouped).forEach(([code, rows]) => {
      const sorted = rows.sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length < 2) return;
      // Strength = 1/rate_usd (USD per unit currency). Higher = stronger.
      const first = 1 / sorted[0].rate_usd;
      const last = 1 / sorted[sorted.length - 1].rate_usd;
      moves.push({ code, pct: ((last - first) / first) * 100, latest: last });
    });
    moves.sort((a, b) => b.pct - a.pct);
    return { gainers: moves.slice(0, 5), losers: moves.slice(-5).reverse() };
  }, [allHistory]);

  // Strength ranking: % change of currency vs USD over 30 days
  const strengthRanking = useMemo(() => {
    if (!allHistory.length) return [];
    const grouped: Record<string, HistoryRow[]> = {};
    allHistory.forEach(h => { (grouped[h.code] ??= []).push(h); });
    return Object.entries(grouped).map(([code, rows]) => {
      const sorted = rows.sort((a, b) => a.date.localeCompare(b.date));
      const first = 1 / sorted[0].rate_usd;
      const last = 1 / sorted[sorted.length - 1].rate_usd;
      return { code, pct: ((last - first) / first) * 100, perUsd: sorted[sorted.length - 1].rate_usd };
    }).sort((a, b) => b.pct - a.pct);
  }, [allHistory]);

  // AI-style insight (deterministic, derived from stats)
  const insight = useMemo(() => {
    if (!stats || !rate) return null;
    const dir = stats.d30 >= 0 ? "strengthened" : "weakened";
    const mag = Math.abs(stats.d30);
    const tone = mag < 0.5 ? "remained largely stable" : mag < 2 ? "showed a mild trend" : mag < 5 ? "moved decisively" : "experienced sharp volatility";
    const volTag = stats.volatility < 1 ? "low" : stats.volatility < 3 ? "moderate" : "elevated";
    return `Over the last 30 days the ${CURRENCY_MAP[from]?.name} (${from}) has ${dir} by ${stats.d30.toFixed(2)}% against the ${CURRENCY_MAP[to]?.name} (${to}). The pair has ${tone} with ${volTag} volatility (${stats.volatility.toFixed(2)}%). The exchange rate is currently 1 ${from} = ${rate.toFixed(4)} ${to}, with a ${range} range of ${stats.low.toFixed(4)} – ${stats.high.toFixed(4)}.`;
  }, [stats, rate, from, to, range]);

  // SEO bits
  const fromMeta = CURRENCY_MAP[from], toMeta = CURRENCY_MAP[to];
  const pageTitle = `${fromMeta?.name} to ${toMeta?.name} | ${from} to ${to} Converter Live`;
  const metaDesc = `Convert ${from} to ${to} live. 1 ${from} = ${rate ? rate.toFixed(4) : "—"} ${to}. Historical charts, AI insights, popular conversions and forex intelligence — free, no login.`;
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
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.investingiq.in/" },
      { "@type": "ListItem", position: 2, name: "Currency Converter", item: "https://www.investingiq.in/currency-converter" },
      { "@type": "ListItem", position: 3, name: `${from} to ${to}`, item: canonical },
    ],
  };
  const faqs: Array<[string, string]> = [
    [`How much is 1 ${from} in ${to}?`, rate ? `1 ${from} = ${formatMoney(rate, to)} at the current live exchange rate.` : "Loading the latest rate."],
    [`How much is 100 ${from} in ${to}?`, rate ? `100 ${from} = ${formatMoney(100 * rate, to)} right now.` : "—"],
    [`What is 1 ${to} in ${from}?`, inverseRate ? `1 ${to} = ${formatMoney(inverseRate, from)}.` : "—"],
    [`What affects the ${from}/${to} exchange rate?`, `Inflation differentials, central-bank policy from RBI / Fed / ECB, trade balance, foreign capital flows, commodity prices (especially crude oil for ${from === "INR" || to === "INR" ? "INR" : "the importing economy"}) and global risk sentiment.`],
    [`Is the ${from} to ${to} rate updated live?`, "Yes. Rates are pulled from the European Central Bank and supplementary global forex providers, cached briefly, and refreshed automatically every day at midnight IST."],
    [`Is this currency converter free?`, "Fully free. No login, no signup, unlimited conversions."],
    [`Can I use the ${from}/${to} rate for sending money abroad?`, "Mid-market rates are shown for reference. Banks and remittance services typically add a markup of 0.5%–3% plus fees."],
    [`Does InvestingIQ provide forex trading advice?`, "No. InvestingIQ is not a SEBI-registered investment advisor. Content is educational only."],
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  function swap() { setFrom(to); setTo(from); }

  // Mini-tool outputs
  const travelTotal = travelDays * travelDaily;
  const travelInTo = rate ? travelTotal * rate : 0;
  const transferFee = transferAmt * 0.015; // 1.5% typical
  const transferReceived = rate ? (transferAmt - transferFee) * rate : 0;
  const inflationFuture = amountNum / Math.pow(1 + inflationRate / 100, inflationYears);
  const purchasingPowerLoss = amountNum - inflationFuture;

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDesc} />
        <meta name="keywords" content={`${from} to ${to}, ${from} ${to} converter, live ${from} to ${to} rate, ${fromMeta?.name} to ${toMeta?.name}, currency converter, forex calculator, exchange rate today, real-time currency conversion`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <Header />

      {/* HERO CONVERTER — prominent amount → result */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-[1240px] mx-auto px-4 py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="text-xs text-white/50 mb-3">
            <Link to="/" className="hover:text-white">Home</Link>
            <span className="mx-1.5">/</span>
            <Link to="/currency-converter" className="hover:text-white">Currency Converter</Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/80">{from} to {to}</span>
          </nav>

          <div className="flex items-center gap-2 text-xs text-white/60 mb-3">
            <Globe className="h-3.5 w-3.5" /> Live forex · Updated {rates[from]?.updated_at ? new Date(rates[from].updated_at).toLocaleString("en-IN") : "—"}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-2">
            {fromMeta?.name} to {toMeta?.name} Converter
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-2xl mb-8">
            Type any amount below and instantly see the converted value at live exchange rates. Swap with one click.
          </p>

          <div className="bg-white text-slate-900 rounded-2xl p-5 md:p-7 shadow-2xl max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-stretch">
              <AmountField label="You send" amount={amount} currency={from} onAmount={setAmount} onCurrency={setFrom} />
              <button onClick={swap} className="md:self-center mx-auto my-1 md:my-0 h-12 w-12 flex items-center justify-center bg-primary text-white hover:bg-primary/90 rounded-xl shadow-md transition-all hover:rotate-180 duration-300" aria-label="Swap currencies">
                <ArrowRightLeft className="h-5 w-5" />
              </button>
              <AmountField label="You get" amount={rate ? converted.toFixed(2) : ""} currency={to} onCurrency={setTo} readOnly />
            </div>

            <div className="mt-5 pt-5 border-t border-border flex flex-col md:flex-row md:items-end md:justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Conversion result</div>
                <div className="number-font text-2xl md:text-4xl font-black text-foreground leading-tight mt-1">
                  {loadingRates ? "Loading…" : rate ? `${formatMoney(amountNum, from)} = ${formatMoney(converted, to)}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  1 {from} = {rate ? rate.toFixed(4) : "—"} {to} · 1 {to} = {inverseRate ? inverseRate.toFixed(4) : "—"} {from}
                </div>
              </div>
              {stats && (
                <div className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg ${stats.d1 >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"}`}>
                  {stats.d1 >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {stats.d1 >= 0 ? "+" : ""}{stats.d1.toFixed(2)}% (24h)
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-PERIOD STATS STRIP */}
      {stats && (
        <section className="border-b border-border bg-white">
          <div className="max-w-[1240px] mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="24h Change" value={`${stats.d1.toFixed(2)}%`} up={stats.d1 >= 0} />
            <StatCard label="1W Change" value={`${stats.d7.toFixed(2)}%`} up={stats.d7 >= 0} />
            <StatCard label="1M Change" value={`${stats.d30.toFixed(2)}%`} up={stats.d30 >= 0} />
            <StatCard label="1Y Change" value={`${stats.d365.toFixed(2)}%`} up={stats.d365 >= 0} />
            <StatCard label={`${range} High`} value={stats.high.toFixed(4)} />
            <StatCard label={`${range} Low`} value={stats.low.toFixed(4)} />
            <StatCard label="Volatility" value={`${stats.volatility.toFixed(2)}%`} icon={Activity} />
          </div>
        </section>
      )}

      <main className="max-w-[1240px] mx-auto px-4 py-8 space-y-10">

        {/* AI INSIGHT */}
        {insight && (
          <section className="bg-gradient-to-br from-primary/[0.04] via-violet-500/[0.04] to-transparent border border-primary/15 rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground text-sm uppercase tracking-wider">AI Market Insight</h2>
            </div>
            <p className="text-foreground text-[15px] leading-relaxed">{insight}</p>
            <p className="text-[11px] text-muted-foreground mt-3">Educational summary derived from live market data. Not investment advice.</p>
          </section>
        )}

        {/* CHART */}
        <section className="bg-white border border-border rounded-2xl shadow-card p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="font-bold text-foreground text-base">{from}/{to} Exchange Rate History</h2>
            </div>
            <div className="flex flex-wrap gap-1 bg-muted rounded-lg p-1">
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

        {/* POPULAR CONVERSION TABLE */}
        <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-bold text-foreground text-base">Popular {from} to {to} Conversion Table</h2>
            <p className="text-xs text-muted-foreground mt-1">Common amounts at the current rate — both directions.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2.5">{from}</th>
                  <th className="text-left px-5 py-2.5">→ {to}</th>
                  <th className="text-left px-5 py-2.5">{to}</th>
                  <th className="text-left px-5 py-2.5">→ {from}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000].map(n => (
                  <tr key={n} className="hover:bg-muted/20">
                    <td className="px-5 py-2.5 number-font">{n.toLocaleString()} {from}</td>
                    <td className="px-5 py-2.5 number-font font-semibold">{rate ? (n * rate).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"} {to}</td>
                    <td className="px-5 py-2.5 number-font">{n.toLocaleString()} {to}</td>
                    <td className="px-5 py-2.5 number-font font-semibold">{inverseRate ? (n * inverseRate).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"} {from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* MINI TOOLS */}
        <section>
          <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Currency Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Travel Budget */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Plane className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-foreground">Travel Budget Calculator</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="text-xs"><span className="block text-muted-foreground mb-1">Days</span>
                  <input type="number" value={travelDays} onChange={e => setTravelDays(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-border rounded-lg text-sm number-font" />
                </label>
                <label className="text-xs"><span className="block text-muted-foreground mb-1">Daily spend ({from})</span>
                  <input type="number" value={travelDaily} onChange={e => setTravelDaily(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-border rounded-lg text-sm number-font" />
                </label>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-sm">
                <div className="text-muted-foreground text-xs">Total trip cost</div>
                <div className="number-font font-bold text-lg">{formatMoney(travelTotal, from)} ≈ {rate ? formatMoney(travelInTo, to) : "—"}</div>
              </div>
            </div>

            {/* Transfer Estimator */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Send className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-foreground">International Money Transfer Estimator</h3>
              </div>
              <label className="text-xs block mb-3"><span className="block text-muted-foreground mb-1">Amount to send ({from})</span>
                <input type="number" value={transferAmt} onChange={e => setTransferAmt(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-border rounded-lg text-sm number-font" />
              </label>
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Provider fee (~1.5%)</span><span className="number-font">{formatMoney(transferFee, from)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mid-market rate</span><span className="number-font">{rate ? rate.toFixed(4) : "—"}</span></div>
                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border"><span>Recipient gets</span><span className="number-font">{rate ? formatMoney(transferReceived, to) : "—"}</span></div>
              </div>
            </div>

            {/* Inflation Impact */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-foreground">Inflation Impact ({from})</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="text-xs"><span className="block text-muted-foreground mb-1">Years</span>
                  <input type="number" value={inflationYears} onChange={e => setInflationYears(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-border rounded-lg text-sm number-font" />
                </label>
                <label className="text-xs"><span className="block text-muted-foreground mb-1">Inflation %</span>
                  <input type="number" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-border rounded-lg text-sm number-font" />
                </label>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Today's value</span><span className="number-font">{formatMoney(amountNum, from)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Future buying power</span><span className="number-font">{formatMoney(inflationFuture, from)}</span></div>
                <div className="flex justify-between font-bold text-loss pt-1 border-t border-border"><span>Purchasing power lost</span><span className="number-font">−{formatMoney(purchasingPowerLoss, from)}</span></div>
              </div>
            </div>

            {/* Purchasing Power vs */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-foreground">Purchasing Power Comparison</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                What {formatMoney(amountNum, from)} can buy in {toMeta?.name} terms at the current rate.
              </p>
              <ul className="text-sm space-y-1.5">
                {[{ k: "Coffee (~₹250)", base: 3 }, { k: "Meal out (~₹800)", base: 10 }, { k: "Smartphone (~₹70k)", base: 850 }, { k: "Monthly rent (~₹35k)", base: 425 }].map(item => {
                  const usdEquiv = item.base;
                  const inFrom = fromRate ? usdEquiv / fromRate : 0;
                  const units = inFrom > 0 ? Math.floor(amountNum / inFrom) : 0;
                  return (
                    <li key={item.k} className="flex justify-between border-b border-border last:border-0 py-1.5">
                      <span className="text-muted-foreground">{item.k}</span>
                      <span className="number-font font-semibold">≈ {units.toLocaleString()} units</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* CURRENCY STRENGTH RANKING + GAINERS/LOSERS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-foreground">Currency Strength (30d)</h3>
            </div>
            <ol className="space-y-1.5 text-sm">
              {strengthRanking.slice(0, 10).map((s, i) => (
                <li key={s.code} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                  <span className="flex items-center gap-2"><span className="text-muted-foreground w-5">{i + 1}.</span><span className="font-bold">{s.code}</span></span>
                  <span className={`number-font font-semibold ${s.pct >= 0 ? "text-gain" : "text-loss"}`}>{s.pct >= 0 ? "+" : ""}{s.pct.toFixed(2)}%</span>
                </li>
              ))}
              {strengthRanking.length === 0 && <li className="text-muted-foreground text-xs">Loading…</li>}
            </ol>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-gain" />
              <h3 className="font-bold text-foreground">Top Forex Gainers</h3>
            </div>
            <ul className="space-y-1.5 text-sm">
              {gainersLosers.gainers.map(g => (
                <li key={g.code} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                  <Link to={`/currency-converter/${g.code.toLowerCase()}-to-usd`} className="font-bold hover:text-primary">{g.code}</Link>
                  <span className="number-font font-semibold text-gain">+{g.pct.toFixed(2)}%</span>
                </li>
              ))}
              {gainersLosers.gainers.length === 0 && <li className="text-muted-foreground text-xs">Loading…</li>}
            </ul>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-loss" />
              <h3 className="font-bold text-foreground">Top Forex Losers</h3>
            </div>
            <ul className="space-y-1.5 text-sm">
              {gainersLosers.losers.map(g => (
                <li key={g.code} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                  <Link to={`/currency-converter/${g.code.toLowerCase()}-to-usd`} className="font-bold hover:text-primary">{g.code}</Link>
                  <span className="number-font font-semibold text-loss">{g.pct.toFixed(2)}%</span>
                </li>
              ))}
              {gainersLosers.losers.length === 0 && <li className="text-muted-foreground text-xs">Loading…</li>}
            </ul>
          </div>
        </section>

        {/* INDIVIDUAL CURRENCY STRENGTH CHARTS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CurrencyStrengthCard code={from} history={history} />
          <CurrencyStrengthCard code={to} history={history} />
        </section>

        {/* MOST TRADED PAIRS + TRENDING */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Most Traded Global Pairs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MOST_TRADED.map(([f, t]) => {
                const fr = rates[f]?.rate_usd, tr = rates[t]?.rate_usd;
                const r = fr && tr ? (tr / fr) : null;
                return (
                  <Link key={`${f}-${t}`} to={`/currency-converter/${f.toLowerCase()}-to-${t.toLowerCase()}`} className="bg-white border border-border rounded-xl p-3 hover:border-primary transition-colors">
                    <div className="text-xs font-bold text-muted-foreground">{f} / {t}</div>
                    <div className="number-font text-sm font-bold text-foreground mt-1">{r ? r.toFixed(4) : "—"}</div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Trending Conversions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TRENDING_PAIRS.map(([f, t]) => {
                const fr = rates[f]?.rate_usd, tr = rates[t]?.rate_usd;
                const r = fr && tr ? (tr / fr) : null;
                return (
                  <Link key={`${f}-${t}`} to={`/currency-converter/${f.toLowerCase()}-to-${t.toLowerCase()}`} className="bg-white border border-border rounded-xl p-3 hover:border-primary hover:shadow-card-md transition-all">
                    <div className="text-xs font-bold text-muted-foreground">{f} → {t}</div>
                    <div className="number-font text-sm font-bold text-foreground mt-1">1 = {r ? r.toFixed(4) : "—"}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* EDUCATIONAL + FAQ */}
        <section className="bg-white border border-border rounded-2xl shadow-card p-5 md:p-6">
          <h2 className="font-bold text-foreground text-lg mb-3">About {fromMeta?.name} to {toMeta?.name} ({from}/{to})</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
            <p>
              The {from}/{to} exchange rate represents how many {toMeta?.name} ({to}) one {fromMeta?.name} ({from}) buys on the global foreign exchange market.
              Rates fluctuate continuously based on inflation differentials, central-bank policy, trade balance, and capital flows between the two economies.
            </p>
            <p>
              Our currency converter is free, requires no login, and sources live rates from the European Central Bank with supplementary global forex providers.
              Study the {from}/{to} rate across 1 week to all-time using the interactive chart, run the popular-amounts table, and use the budget, transfer, inflation and purchasing-power tools to plan real-world decisions.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-foreground text-base">Frequently Asked Questions</h3>
            {faqs.map(([q, a]) => (
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

function AmountField({ label, amount, currency, onAmount, onCurrency, readOnly = false }: {
  label: string; amount: string; currency: string;
  onAmount?: (v: string) => void; onCurrency: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 block">{label}</label>
      <div className="flex border-2 border-border focus-within:border-primary rounded-xl overflow-hidden bg-muted/20">
        <input
          type={readOnly ? "text" : "number"}
          inputMode="decimal"
          value={amount}
          readOnly={readOnly}
          onChange={(e) => onAmount?.(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent px-3 py-3 text-lg md:text-2xl font-black number-font text-foreground outline-none w-0"
        />
        <select value={currency} onChange={(e) => onCurrency(e.target.value)}
          className="bg-white border-l border-border px-3 py-3 text-sm font-bold text-foreground outline-none cursor-pointer min-w-[110px]">
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
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
      <div className={`number-font text-base md:text-lg font-bold mt-1 flex items-center gap-1.5 ${up === true ? "text-gain" : up === false ? "text-loss" : "text-foreground"}`}>
        {Icon && <Icon className="h-4 w-4" />} {value}
      </div>
    </div>
  );
}

function CurrencyStrengthCard({ code, history }: { code: string; history: HistoryRow[] }) {
  const meta = CURRENCY_MAP[code];
  const series = history.filter(h => h.code === code).sort((a, b) => a.date.localeCompare(b.date)).map(h => ({ date: h.date, rate: 1 / h.rate_usd, label: new Date(h.date).toLocaleDateString("en-IN", { month: "short", day: "2-digit" }) }));
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
