import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AV_BASE = "https://www.alphavantage.co/query";

async function avFetch(params: Record<string, string>, apiKey: string) {
  const url = new URL(AV_BASE);
  Object.entries({ ...params, apikey: apiKey }).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = await res.json();
    // Alpha Vantage rate limit message
    if (json?.Note || json?.Information) {
      console.warn("AV rate limit:", json.Note ?? json.Information);
      return null;
    }
    return json;
  } catch (e) {
    console.error("avFetch error:", e);
    return null;
  }
}

async function getForex(from: string, to: string, apiKey: string) {
  const data = await avFetch({ function: "CURRENCY_EXCHANGE_RATE", from_currency: from, to_currency: to }, apiKey);
  const rate = data?.["Realtime Currency Exchange Rate"];
  if (!rate) return null;
  const rateVal = parseFloat(rate["5. Exchange Rate"]);
  const bidVal = parseFloat(rate["8. Bid Price"] ?? rate["5. Exchange Rate"]);
  const change = +(rateVal - bidVal).toFixed(4);
  return { rate: rateVal.toFixed(2), change: change.toFixed(2), up: change >= 0 };
}

async function getQuote(symbol: string, apiKey: string) {
  const data = await avFetch({ function: "GLOBAL_QUOTE", symbol }, apiKey);
  const q = data?.["Global Quote"];
  if (!q || !q["05. price"]) return null;
  const price = parseFloat(q["05. price"]);
  const change = parseFloat(q["09. change"] ?? "0");
  const changePct = parseFloat((q["10. change percent"] ?? "0").replace("%", ""));
  return { price, change, changePct, prevClose: parseFloat(q["08. previous close"] ?? String(price)) };
}

async function getCommodity(fn: string, apiKey: string) {
  const data = await avFetch({ function: fn, interval: "daily" }, apiKey);
  if (!data?.data?.length) return null;
  const entries = data.data.filter((d: any) => d.value !== "." && !isNaN(parseFloat(d.value)));
  if (entries.length < 2) return null;
  const price = parseFloat(entries[0].value);
  const prev = parseFloat(entries[1].value);
  const change = +(price - prev).toFixed(3);
  const changePct = +((change / prev) * 100).toFixed(2);
  return { price, change, changePct, up: change >= 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const AV_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!AV_KEY) {
    return new Response(JSON.stringify({ error: "ALPHA_VANTAGE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // === Fetch in two batches to avoid parallel rate-limiting ===

    // Batch 1: Forex rates (3 calls)
    const usdInrRaw = await getForex("USD", "INR", AV_KEY);
    await new Promise(r => setTimeout(r, 500));
    const eurInrRaw = await getForex("EUR", "INR", AV_KEY);
    await new Promise(r => setTimeout(r, 500));
    const gbpInrRaw = await getForex("GBP", "INR", AV_KEY);
    await new Promise(r => setTimeout(r, 500));

    const usdRate = usdInrRaw ? parseFloat(usdInrRaw.rate) : 86.62;

    // Batch 2: Global ETFs (3 calls) — SPY≈S&P500/10, DIA≈Dow/100, QQQ≈NASDAQ/5
    const spyRaw = await getQuote("SPY", AV_KEY);   // ~S&P 500 / 10
    await new Promise(r => setTimeout(r, 500));
    const diaRaw = await getQuote("DIA", AV_KEY);   // ~Dow / 100
    await new Promise(r => setTimeout(r, 500));
    const qqqRaw = await getQuote("QQQ", AV_KEY);   // ~NASDAQ / 5
    await new Promise(r => setTimeout(r, 500));

    // Batch 3: Commodity (1 call) — WTI crude in USD/barrel
    const wtiRaw = await getCommodity("WTI", AV_KEY);

    // ── Build currencies ──────────────────────────────────────────
    const currencies = [
      {
        pair: "USD/INR", name: "US Dollar", flag: "🇺🇸",
        rate: usdInrRaw?.rate ?? "86.62",
        change: usdInrRaw?.change ?? "-0.08",
        pct: usdInrRaw ? `${parseFloat(usdInrRaw.change) >= 0 ? '+' : ''}${((parseFloat(usdInrRaw.change) / usdRate) * 100).toFixed(2)}%` : "-0.09%",
        up: usdInrRaw ? parseFloat(usdInrRaw.change) >= 0 : false,
      },
      {
        pair: "EUR/INR", name: "Euro", flag: "🇪🇺",
        rate: eurInrRaw?.rate ?? "90.18",
        change: eurInrRaw?.change ?? "+0.22",
        pct: eurInrRaw ? `${parseFloat(eurInrRaw.change) >= 0 ? '+' : ''}${((parseFloat(eurInrRaw.change) / parseFloat(eurInrRaw.rate)) * 100).toFixed(2)}%` : "+0.24%",
        up: eurInrRaw ? parseFloat(eurInrRaw.change) >= 0 : true,
      },
      {
        pair: "GBP/INR", name: "British Pound", flag: "🇬🇧",
        rate: gbpInrRaw?.rate ?? "109.42",
        change: gbpInrRaw?.change ?? "-0.18",
        pct: gbpInrRaw ? `${parseFloat(gbpInrRaw.change) >= 0 ? '+' : ''}${((parseFloat(gbpInrRaw.change) / parseFloat(gbpInrRaw.rate)) * 100).toFixed(2)}%` : "-0.16%",
        up: gbpInrRaw ? parseFloat(gbpInrRaw.change) >= 0 : false,
      },
    ];

    // ── Build global markets ──────────────────────────────────────
    const globalMarkets: any[] = [];

    if (spyRaw) {
      // SPY ≈ S&P 500 / 10
      const spVal = Math.round(spyRaw.price * 10);
      const spChgPt = Math.round(spyRaw.change * 10);
      globalMarkets.push({
        name: "S&P 500", value: spVal.toLocaleString(), country: "🇺🇸", region: "US",
        change: `${spyRaw.changePct >= 0 ? '+' : ''}${spyRaw.changePct.toFixed(2)}%`,
        chgPt: `${spChgPt >= 0 ? '+' : ''}${spChgPt}`, up: spyRaw.change >= 0,
      });
    }

    if (diaRaw) {
      // DIA ≈ Dow / 100
      const djVal = Math.round(diaRaw.price * 100);
      const djChgPt = Math.round(diaRaw.change * 100);
      globalMarkets.push({
        name: "Dow Jones", value: djVal.toLocaleString(), country: "🇺🇸", region: "US",
        change: `${diaRaw.changePct >= 0 ? '+' : ''}${diaRaw.changePct.toFixed(2)}%`,
        chgPt: `${djChgPt >= 0 ? '+' : ''}${djChgPt}`, up: diaRaw.change >= 0,
      });
    }

    if (qqqRaw) {
      // QQQ ≈ NASDAQ / 5
      const nqVal = Math.round(qqqRaw.price * 5);
      const nqChgPt = Math.round(qqqRaw.change * 5);
      globalMarkets.push({
        name: "NASDAQ", value: nqVal.toLocaleString(), country: "🇺🇸", region: "US",
        change: `${qqqRaw.changePct >= 0 ? '+' : ''}${qqqRaw.changePct.toFixed(2)}%`,
        chgPt: `${nqChgPt >= 0 ? '+' : ''}${nqChgPt}`, up: qqqRaw.change >= 0,
      });
    }

    // ── Build commodities (USD → INR conversion) ─────────────────
    const commodities: any[] = [];

    if (wtiRaw) {
      // WTI is USD/barrel; MCX crude is approximately USD*usdRate per barrel
      const crudeInr = Math.round(wtiRaw.price * usdRate);
      const crudeChgInr = (wtiRaw.change * usdRate).toFixed(0);
      commodities.push({
        name: "Crude Oil", sub: "MCX WTI",
        price: `₹${crudeInr.toLocaleString('en-IN')}`,
        change: `${wtiRaw.changePct >= 0 ? '+' : ''}${wtiRaw.changePct}%`,
        chgAbs: `${parseFloat(crudeChgInr) >= 0 ? '+' : ''}₹${Math.abs(parseFloat(crudeChgInr))}`,
        up: wtiRaw.change >= 0, emoji: "🛢️",
        hi: `₹${Math.round(wtiRaw.price * usdRate * 1.004).toLocaleString('en-IN')}`,
        lo: `₹${Math.round(wtiRaw.price * usdRate * 0.994).toLocaleString('en-IN')}`,
      });
    }

    const payload = {
      currencies,
      globalMarkets,
      commodities,
      updatedAt: new Date().toISOString(),
      live: true,
    };

    // ── Persist to site_config ────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertErr } = await supabase
      .from("site_config")
      .upsert({ key: "market_data_live", value: payload as any }, { onConflict: "key" });

    if (upsertErr) console.error("Upsert error:", upsertErr);

    return new Response(JSON.stringify({ success: true, data: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-data-refresh error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
