import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── LangSmith Tracing ──
async function traceToLangSmith(runData: {
  name: string;
  run_type: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  start_time: string;
  end_time?: string;
  extra?: Record<string, unknown>;
}) {
  const LANGSMITH_KEY = Deno.env.get("LANGSMITH_API_KEY");
  if (!LANGSMITH_KEY) return;
  try {
    const runId = crypto.randomUUID();
    await fetch("https://api.smith.langchain.com/runs", {
      method: "POST",
      headers: {
        "x-api-key": LANGSMITH_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: runId,
        name: runData.name,
        run_type: runData.run_type,
        inputs: runData.inputs,
        outputs: runData.outputs || {},
        error: runData.error || null,
        start_time: runData.start_time,
        end_time: runData.end_time || new Date().toISOString(),
        extra: { ...runData.extra, source: "investingiq-smart-search" },
        session_name: "investingiq-chatbot",
      }),
    });
  } catch (e) {
    console.error("LangSmith trace error:", e instanceof Error ? e.message : e);
  }
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<Response | null> {
  // Primary: Lovable AI (Gemini)
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true }),
      });
      if (resp.ok) return resp;
      await resp.text().catch(() => {});
    } catch (e) { console.error("Lovable AI error:", e instanceof Error ? e.message : e); }
  }

  // Fallback: OpenAI
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 30000);
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: true }),
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (resp.ok) return resp;
      await resp.text().catch(() => {});
    } catch (e) { console.error("OpenAI error:", e instanceof Error ? e.message : e); }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = new Date().toISOString();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Search query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [propsRes, stocksRes, postsRes, trendsRes] = await Promise.all([
      sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,area_sqft,price,amenities,roi_projection,is_featured").eq("status", "active").limit(50),
      sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary,tags").eq("status", "published").limit(40),
      sb.from("blog_posts").select("title,slug,category,excerpt,tags").eq("status", "published").order("published_at", { ascending: false }).limit(20),
      sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights").limit(20),
    ]);

    const dbContext = `
PROPERTIES (${(propsRes.data || []).length}):
${(propsRes.data || []).map(p => `${p.title} | ${p.city}${p.locality ? '/' + p.locality : ''} | ${p.price_display || '₹' + p.price} | ${p.bhk || '-'} BHK | ${p.property_type} | slug:${p.slug}`).join("\n")}

STOCKS (${(stocksRes.data || []).length}):
${(stocksRes.data || []).map(s => `${s.symbol} ${s.company_name} | ${s.sector} | Rating:${s.rating} | CMP:₹${s.current_price} | Target:₹${s.target_price}`).join("\n")}

ARTICLES (${(postsRes.data || []).length}):
${(postsRes.data || []).map(a => `${a.title} | ${a.category} | slug:${a.slug}`).join("\n")}

PRICE TRENDS:
${(trendsRes.data || []).map(t => `${t.city}${t.locality ? '/' + t.locality : ''} | ₹${t.avg_price_sqft}/sqft | ${t.change_pct}%`).join("\n")}`;

    const systemPrompt = `You are InvestingIQ's smart search engine. Understand user INTENT and return relevant results.
Current date: ${new Date().toISOString().split('T')[0]}

RULES:
1. Search semantically across properties, stocks, articles
2. Return results as CARD FORMAT
3. Add brief AI summary after cards
4. NEVER use emojis. Professional formatting only.
5. If nothing matches, use your knowledge and suggest what to explore.

CARD FORMAT:
<!--CARDS:[{"type":"property","title":"Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"}]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"}]-->
<!--CARDS:[{"type":"article","title":"Title","subtitle":"Category","link":"/news/SLUG"}]-->

DATABASE:
${dbContext}`;

    const response = await callAI(systemPrompt, query);

    // Trace to LangSmith
    traceToLangSmith({
      name: "smart-search",
      run_type: "llm",
      inputs: { query, dbCounts: { properties: (propsRes.data || []).length, stocks: (stocksRes.data || []).length, articles: (postsRes.data || []).length } },
      outputs: { responded: !!response },
      start_time: startTime,
      extra: { provider: "lovable-ai-gemini" },
    });

    if (!response) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-smart-search error:", e);
    traceToLangSmith({
      name: "smart-search-error",
      run_type: "chain",
      inputs: { error: e instanceof Error ? e.message : "Unknown" },
      error: e instanceof Error ? e.message : "Unknown error",
      start_time: startTime,
    });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
