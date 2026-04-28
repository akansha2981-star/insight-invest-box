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
        extra: { ...runData.extra, source: "investingiq-ai-assistant" },
        session_name: "investingiq-chatbot",
      }),
    });
  } catch (e) {
    console.error("LangSmith trace error:", e instanceof Error ? e.message : e);
  }
}

function extractKeywords(query: string): string[] {
  const stopWords = new Set(["the","a","an","is","are","was","were","be","been","being","in","on","at","to","for","of","with","by","from","and","or","but","not","this","that","these","those","it","its","i","me","my","we","our","you","your","he","she","they","them","their","what","which","who","whom","how","where","when","why","do","does","did","will","would","shall","should","can","could","may","might","must","have","has","had","about","into","through","during","before","after","above","below","between","under","over","up","down","out","off","then","than","so","no","yes","any","all","each","every","both","few","more","most","other","some","such","only","own","same","very","just","also","much","many","still","even","here","there","now","well","too","already","really","please","tell","show","give","get","find","best","top","good","great","suggest","recommend","want","need","looking","search","help","know","think","like","new","old","big","small","high","low","buy","sell","rent","invest","crore","lakh","lakhs","crores","cr","price","under","below","above","near","around","within","budget","property","properties"]);
  return query.toLowerCase().replace(/[^\w\s₹]/g, " ").split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
}

type Intent = "property" | "stock" | "mutual_fund" | "crypto" | "news" | "general";

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  const propertyTerms = /\b(propert(y|ies)|real\s*estate|flat|flats|apartment|villa|house|home|plot|bhk|rent|rental|pg|paying\s*guest|builder|developer|locality|sqft|sq\.?\s*ft|carpet|possession|rera)\b/;
  const stockTerms = /\b(stock|stocks|share|shares|equit(y|ies)|nifty|sensex|bse|nse|ipo|dividend|pe\s*ratio|market\s*cap|trading|trader|gainer|loser)\b/;
  const mfTerms = /\b(mutual\s*fund|mf|sip|nav|elss|etf|index\s*fund|debt\s*fund|liquid\s*fund|hybrid\s*fund)\b/;
  const cryptoTerms = /\b(crypto|bitcoin|btc|ethereum|eth|altcoin|blockchain|nft|defi|coin|token)\b/;
  const newsTerms = /\b(news|article|latest\s+update|breaking|budget|policy|rbi|fed|inflation)\b/;
  if (propertyTerms.test(q)) return "property";
  if (stockTerms.test(q)) return "stock";
  if (mfTerms.test(q)) return "mutual_fund";
  if (cryptoTerms.test(q)) return "crypto";
  if (newsTerms.test(q)) return "news";
  return "general";
}

function parsePriceBudget(query: string): { min?: number; max?: number } {
  const q = query.toLowerCase();
  const result: { min?: number; max?: number } = {};
  // Match patterns like "under 1 crore", "below 50 lakh", "1.5 cr", "₹2 crore"
  const re = /(?:(under|below|less\s*than|upto|up\s*to|max|maximum|within)\s+)?(?:₹\s*)?(\d+(?:\.\d+)?)\s*(crore|crores|cr|lakh|lakhs|l)\b/gi;
  let m;
  while ((m = re.exec(q)) !== null) {
    const qualifier = m[1];
    const num = parseFloat(m[2]);
    const unit = m[3].toLowerCase();
    const value = unit.startsWith("c") ? num * 10000000 : num * 100000;
    if (qualifier) result.max = value;
    else if (!result.max) result.max = value;
  }
  return result;
}

async function searchProperties(sb: any, keywords: string[], budget?: { min?: number; max?: number }) {
  let query = sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,possession_status,area_sqft,price,amenities,cover_image_url,roi_projection,is_featured,is_price_drop,original_price").eq("status", "active");
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`title.ilike.%${kw}%,city.ilike.%${kw}%,locality.ilike.%${kw}%,property_type.ilike.%${kw}%,bhk.ilike.%${kw}%,developer_name.ilike.%${kw}%,listing_type.ilike.%${kw}%`);
  }
  if (filters.length > 0) query = query.or(filters.join(","));
  if (budget?.max) query = query.lte("price", budget.max);
  if (budget?.min) query = query.gte("price", budget.min);
  const { data, error } = await query.limit(15);
  if (error) console.error("Property search error:", error);
  return data || [];
}

async function searchStocks(sb: any, keywords: string[]) {
  let query = sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary,tags,investment_thesis").eq("status", "published");
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`symbol.ilike.%${kw}%,company_name.ilike.%${kw}%,sector.ilike.%${kw}%,summary.ilike.%${kw}%,rating.ilike.%${kw}%`);
  }
  if (filters.length > 0) query = query.or(filters.join(","));
  const { data, error } = await query.limit(10);
  if (error) console.error("Stock search error:", error);
  return data || [];
}

async function searchArticles(sb: any, keywords: string[]) {
  let query = sb.from("blog_posts").select("title,slug,category,excerpt").eq("status", "published");
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`title.ilike.%${kw}%,category.ilike.%${kw}%,excerpt.ilike.%${kw}%`);
  }
  if (filters.length > 0) query = query.or(filters.join(","));
  const { data, error } = await query.order("published_at", { ascending: false }).limit(5);
  if (error) console.error("Article search error:", error);
  return data || [];
}

async function searchTrends(sb: any, keywords: string[]) {
  let query = sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights,period");
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`city.ilike.%${kw}%,locality.ilike.%${kw}%`);
  }
  if (filters.length > 0) query = query.or(filters.join(","));
  const { data, error } = await query.limit(10);
  if (error) console.error("Trends search error:", error);
  return data || [];
}

function formatDbResponse(properties: any[], stocks: any[], articles: any[], trends: any[]): string | null {
  const parts: string[] = [];
  const total = properties.length + stocks.length + articles.length + trends.length;
  if (total === 0) return null;

  if (properties.length > 0) {
    parts.push("## Properties Found\n");
    const cards = properties.map(p => ({ type: "property", title: p.title, subtitle: `${p.city}${p.locality ? ', ' + p.locality : ''} | ${p.bhk || '-'} BHK | ${p.property_type}`, price: p.price_display || `₹${(p.price / 100000).toFixed(1)}L`, link: `/real-estate/${p.slug}` }));
    for (const p of properties) {
      parts.push(`- **${p.title}** — ${p.city}${p.locality ? ', ' + p.locality : ''}`);
      parts.push(`  ${p.bhk || '-'} BHK ${p.property_type} | ${p.price_display || '₹' + p.price}${p.area_sqft ? ' | ' + p.area_sqft + ' sqft' : ''}${p.developer_name ? ' | ' + p.developer_name : ''}\n`);
    }
    parts.push(`<!--CARDS:${JSON.stringify(cards)}-->`);
  }
  if (stocks.length > 0) {
    parts.push("\n## Stock Reviews\n");
    const cards = stocks.map(s => ({ type: "stock", title: s.symbol, subtitle: `${s.sector} | ${s.rating || 'N/A'}`, price: s.current_price ? `₹${s.current_price}` : 'N/A', link: `/stocks/review/${s.symbol}` }));
    for (const s of stocks) {
      parts.push(`- **${s.symbol}** (${s.company_name}) — Rating: ${s.rating || 'N/A'} | CMP: ₹${s.current_price || 'N/A'} | Target: ₹${s.target_price || 'N/A'}`);
      if (s.summary) parts.push(`  ${s.summary}\n`);
    }
    parts.push(`<!--CARDS:${JSON.stringify(cards)}-->`);
  }
  if (articles.length > 0) {
    parts.push("\n## Related Articles\n");
    const cards = articles.map(a => ({ type: "article", title: a.title, subtitle: a.category, link: `/news/${a.slug}` }));
    for (const a of articles) {
      parts.push(`- **${a.title}** (${a.category})`);
      if (a.excerpt) parts.push(`  ${a.excerpt}\n`);
    }
    parts.push(`<!--CARDS:${JSON.stringify(cards)}-->`);
  }
  if (trends.length > 0) {
    parts.push("\n## Price Trends\n");
    for (const t of trends) {
      parts.push(`- **${t.city}${t.locality ? ' / ' + t.locality : ''}** — Avg: ₹${t.avg_price_sqft}/sqft | Change: ${t.change_pct}%`);
      if (t.ai_insights) parts.push(`  ${t.ai_insights}\n`);
    }
  }
  return parts.join("\n");
}

function textToSSE(text: string): ReadableStream {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index >= words.length) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      const chunk = words.slice(index, index + 5).join("");
      index += 5;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk }, index: 0 }] })}\n\n`));
    }
  });
}

async function callAI(systemPrompt: string, userPrompt: string, stream = true): Promise<Response | null> {
  // Primary: Lovable AI (Gemini)
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview"];
    for (const model of models) {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 25000);
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            stream,
          }),
          signal: ac.signal,
        });
        clearTimeout(timer);
        if (resp.ok) {
          console.log(`Lovable AI (${model}) succeeded`);
          return resp;
        }
        const status = resp.status;
        await resp.text().catch(() => {});
        if (status === 429 || status === 402) return resp;
        console.error(`Lovable ${model} failed: ${status}`);
      } catch (e) {
        console.error(`Lovable ${model} error:`, e instanceof Error ? e.message : e);
      }
    }
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
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          stream,
        }),
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (resp.ok) {
        console.log("OpenAI fallback succeeded");
        return resp;
      }
      await resp.text().catch(() => {});
    } catch (e) {
      console.error("OpenAI error:", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = new Date().toISOString();

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const keywords = extractKeywords(query);
    const intent = detectIntent(query);
    const budget = parsePriceBudget(query);
    console.log("Query:", query, "| Intent:", intent, "| Keywords:", keywords, "| Budget:", budget);

    // Scope searches by detected intent — never mix unrelated domains
    const wantProp = intent === "property" || intent === "general";
    const wantStock = intent === "stock" || intent === "general";
    const wantArticles = intent === "news" || intent === "general" || intent === "mutual_fund" || intent === "crypto";
    const wantTrends = intent === "property" || intent === "general";

    const [properties, stocks, articles, trends] = await Promise.all([
      wantProp ? searchProperties(sb, keywords, budget) : Promise.resolve([]),
      wantStock ? searchStocks(sb, keywords) : Promise.resolve([]),
      wantArticles ? searchArticles(sb, keywords) : Promise.resolve([]),
      wantTrends ? searchTrends(sb, keywords) : Promise.resolve([]),
    ]);

    const dbResultCount = properties.length + stocks.length + articles.length + trends.length;
    console.log(`DB results: ${dbResultCount} (intent=${intent})`);

    // If good DB results, return directly
    if (dbResultCount >= 2) {
      const formatted = formatDbResponse(properties, stocks, articles, trends);
      if (formatted) {
        console.log("Returning DB-only response");
        // Trace DB-only response
        traceToLangSmith({
          name: "ai-assistant-db-only",
          run_type: "chain",
          inputs: { query, keywords, dbResultCount },
          outputs: { source: "database", resultCount: dbResultCount },
          start_time: startTime,
          extra: { provider: "database" },
        });
        return new Response(textToSSE(formatted), {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // Build context for AI — only fetch domains relevant to intent
    const ctxQueries = await Promise.all([
      wantProp ? sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,area_sqft,price").eq("status", "active").limit(50) : Promise.resolve({ data: [] }),
      wantStock ? sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary").eq("status", "published").limit(30) : Promise.resolve({ data: [] }),
      wantArticles ? sb.from("blog_posts").select("title,slug,category,excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(15) : Promise.resolve({ data: [] }),
      wantTrends ? sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights").limit(20) : Promise.resolve({ data: [] }),
    ]);
    const [allPropsRes, allStocksRes, allPostsRes, allTrendsRes] = ctxQueries;

    const propsCtx = (allPropsRes.data || []).map((p: any) => `${p.title} | ${p.city}${p.locality ? ', ' + p.locality : ''} | ${p.price_display || '₹' + p.price} | ${p.bhk || '-'} BHK | ${p.property_type} | slug:${p.slug}`).join("\n");
    const stocksCtx = (allStocksRes.data || []).map((s: any) => `${s.symbol} ${s.company_name} | ${s.sector} | Rating:${s.rating || 'N/A'} | CMP:₹${s.current_price || 'N/A'} | Target:₹${s.target_price || 'N/A'}`).join("\n");
    const articlesCtx = (allPostsRes.data || []).map((a: any) => `${a.title} | ${a.category} | slug:${a.slug}`).join("\n");
    const trendsCtx = (allTrendsRes.data || []).map((t: any) => `${t.city}${t.locality ? '/' + t.locality : ''} | ₹${t.avg_price_sqft}/sqft | ${t.change_pct}%`).join("\n");

    const intentInstruction = {
      property: "USER IS ASKING ABOUT REAL ESTATE / PROPERTY. Only respond about properties, real estate, rentals, builders, localities. DO NOT mention stocks, mutual funds, or crypto unless explicitly asked.",
      stock: "USER IS ASKING ABOUT STOCKS / EQUITIES. Only respond about stocks, equities, indices, sectors. DO NOT mention real estate or unrelated domains.",
      mutual_fund: "USER IS ASKING ABOUT MUTUAL FUNDS / SIP / ETF. Only respond about mutual funds, SIP, NAV, fund categories. Do not pivot to stocks or real estate.",
      crypto: "USER IS ASKING ABOUT CRYPTOCURRENCY. Only respond about crypto/blockchain. Do not mention stocks or property.",
      news: "USER WANTS NEWS / ARTICLES. Surface relevant articles only.",
      general: "Answer the user's question directly using only the most relevant domain."
    }[intent];

    const dbSearchSummary = dbResultCount > 0
      ? `\nDB SEARCH for "${query}" (${dbResultCount} matches):\n` +
        (properties.length ? `Properties: ${properties.map((p: any) => p.title).join(', ')}\n` : '') +
        (stocks.length ? `Stocks: ${stocks.map((s: any) => s.symbol).join(', ')}\n` : '') +
        (articles.length ? `Articles: ${articles.map((a: any) => a.title).join(', ')}\n` : '') +
        (trends.length ? `Trends: ${trends.map((t: any) => t.city).join(', ')}\n` : '')
      : `\nNo matching results in our database for "${query}".`;

    const systemPrompt = `You are InvestingIQ's AI assistant — an expert financial and real estate advisor for the Indian market.
Current time: ${new Date().toISOString()}
Detected user intent: ${intent.toUpperCase()}
${budget.max ? `User budget: up to ₹${(budget.max / 10000000).toFixed(2)} Cr` : ''}

CRITICAL INTENT RULE: ${intentInstruction}

RULES:
1. STICK STRICTLY to the detected intent domain. Never mix domains (e.g. don't show stocks when asked about property).
2. Check database results below first. Present matches with CARD FORMAT.
3. If NO relevant data in database, use your knowledge about Indian markets/stocks/real estate/mutual funds — but only within the user's intent.
4. Answer in SAME LANGUAGE as user.
5. Concise, helpful, actionable. Use bullet points and headers.
6. NEVER use emojis. Clean professional formatting.
7. No disclaimers — UI adds them.

${dbSearchSummary}

DATABASE (only ${intent}-relevant data shown):
${wantProp ? `PROPERTIES (${(allPropsRes.data || []).length}):\n${propsCtx || "None."}\n` : ''}
${wantStock ? `STOCKS (${(allStocksRes.data || []).length}):\n${stocksCtx || "None."}\n` : ''}
${wantArticles ? `ARTICLES (${(allPostsRes.data || []).length}):\n${articlesCtx || "None."}\n` : ''}
${wantTrends ? `PRICE TRENDS:\n${trendsCtx || "None."}\n` : ''}

CARD FORMAT (use ONLY the type matching the intent):
<!--CARDS:[{"type":"property","title":"Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"}]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"}]-->
<!--CARDS:[{"type":"article","title":"Title","subtitle":"Category","link":"/news/SLUG"}]-->

If topic NOT in database, answer from your knowledge within the intent domain — do NOT refuse, do NOT pivot to other domains.`;

    const response = await callAI(systemPrompt, query);

    // Trace the AI call
    traceToLangSmith({
      name: "ai-assistant-chat",
      run_type: "llm",
      inputs: { query, keywords, dbResultCount, systemPromptLength: systemPrompt.length },
      outputs: { responded: !!response, source: response ? "ai-model" : "fallback" },
      start_time: startTime,
      extra: { provider: "lovable-ai-gemini", fallback: "openai" },
    });

    if (!response) {
      if (dbResultCount > 0) {
        const formatted = formatDbResponse(properties, stocks, articles, trends);
        if (formatted) {
          return new Response(textToSSE("*AI temporarily unavailable, showing database results:*\n\n" + formatted), {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
      }
      return new Response(textToSSE("AI service is temporarily unavailable. Please try again shortly."), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    traceToLangSmith({
      name: "ai-assistant-error",
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
