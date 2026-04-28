import { supabase } from "@/integrations/supabase/client";

export interface LiveMarketQuote {
  symbol: string;
  displayName: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  exchange?: string;
}

export interface LiveMarketResponse {
  quotes: LiveMarketQuote[];
  source: string;
  live: boolean;
  cached?: boolean;
  stale?: boolean;
  reason?: string;
}

const CLIENT_CACHE_TTL_MS = 25_000;

let cachedResponse: { data: LiveMarketResponse; cachedAt: number } | null = null;
let inflightRequest: Promise<LiveMarketResponse> | null = null;

function normalizeResponse(data: any): LiveMarketResponse {
  const isBrokerData = data?.source === "angelone" && data?.fallback !== true;
  const quotes = Array.isArray(data?.quotes) && isBrokerData
    ? data.quotes.filter((q: any) =>
        q && typeof q.symbol === "string" && Number.isFinite(Number(q.price)) && Number(q.price) > 0
      ).map((q: any) => ({
        ...q,
        price: Number(q.price),
        change: Number(q.change) || 0,
        changePercent: Number(q.changePercent) || 0,
        high: Number(q.high) || undefined,
        low: Number(q.low) || undefined,
        open: Number(q.open) || undefined,
      }))
    : [];

  return {
    quotes,
    source: isBrokerData ? "angelone" : "none",
    live: isBrokerData && data?.live === true && data?.stale !== true,
    cached: data?.cached === true,
    stale: data?.stale === true,
    reason: data?.reason,
  };
}

export async function fetchLiveMarketQuotes(force = false): Promise<LiveMarketResponse> {
  if (!force && cachedResponse && Date.now() - cachedResponse.cachedAt < CLIENT_CACHE_TTL_MS) {
    return cachedResponse.data;
  }

  if (!force && inflightRequest) return inflightRequest;

  inflightRequest = supabase.functions.invoke("stock-ticker")
    .then(({ data, error }) => {
      if (error) throw error;
      const normalized = normalizeResponse(data);
      if (normalized.source === "angelone" && normalized.quotes.length > 0) {
        cachedResponse = { data: normalized, cachedAt: Date.now() };
      }
      return normalized;
    })
    .catch(() => cachedResponse?.data ?? { quotes: [], source: "none", live: false, reason: "request_failed" })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}