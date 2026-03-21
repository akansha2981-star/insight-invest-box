import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractKeywords(query: string): string[] {
  const stopWords = new Set(["the","a","an","is","are","was","were","be","been","being","in","on","at","to","for","of","with","by","from","and","or","but","not","this","that","these","those","it","its","i","me","my","we","our","you","your","he","she","they","them","their","what","which","who","whom","how","where","when","why","do","does","did","will","would","shall","should","can","could","may","might","must","have","has","had","about","into","through","during","before","after","above","below","between","under","over","up","down","out","off","then","than","so","no","yes","any","all","each","every","both","few","more","most","other","some","such","only","own","same","very","just","also","much","many","still","even","here","there","now","well","too","already","really","please","tell","show","give","get","find","best","top","good","great","suggest","recommend","want","need","looking","search","help","know","think","like","new","old","big","small","high","low","buy","sell","rent","invest"]);
  return query.toLowerCase().replace(/[^\w\s₹]/g, " ").split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
}

async function searchProperties(sb: any, keywords: string[]) {
  let query = sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,possession_status,area_sqft,price,amenities,cover_image_url,roi_projection,is_featured,is_price_drop,original_price").eq("status", "active");
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`title.ilike.%${kw}%,city.ilike.%${kw}%,locality.ilike.%${kw}%,property_type.ilike.%${kw}%,bhk.ilike.%${kw}%,developer_name.ilike.%${kw}%,listing_type.ilike.%${kw}%`);
  }
  if (filters.length > 0) query = query.or(filters.join(","));
  const { data, error } = await query.limit(10);
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
  // Try OpenAI first
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
        console.log("OpenAI succeeded");
        return resp;
      }
      console.error("OpenAI failed:", resp.status);
      await resp.text().catch(() => {});
    } catch (e) {
      console.error("OpenAI error:", e instanceof Error ? e.message : e);
    }
  }

  // Fallback to Lovable AI
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
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const keywords = extractKeywords(query);
    console.log("Query:", query, "| Keywords:", keywords);

    const [properties, stocks, articles, trends] = await Promise.all([
      searchProperties(sb, keywords),
      searchStocks(sb, keywords),
      searchArticles(sb, keywords),
      searchTrends(sb, keywords),
    ]);

    const dbResultCount = properties.length + stocks.length + articles.length + trends.length;
    console.log(`DB results: ${dbResultCount}`);

    // If good DB results, return directly
    if (dbResultCount >= 2) {
      const formatted = formatDbResponse(properties, stocks, articles, trends);
      if (formatted) {
        console.log("Returning DB-only response");
        return new Response(textToSSE(formatted), {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // Build context for AI
    const [allPropsRes, allStocksRes, allPostsRes, allTrendsRes] = await Promise.all([
      sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,area_sqft,price").eq("status", "active").limit(50),
      sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary").eq("status", "published").limit(30),
      sb.from("blog_posts").select("title,slug,category,excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(15),
      sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights").limit(20),
    ]);

    const propsCtx = (allPropsRes.data || []).map(p => `${p.title} | ${p.city}${p.locality ? ', ' + p.locality : ''} | ${p.price_display || '₹' + p.price} | ${p.bhk || '-'} BHK | ${p.property_type} | slug:${p.slug}`).join("\n");
    const stocksCtx = (allStocksRes.data || []).map(s => `${s.symbol} ${s.company_name} | ${s.sector} | Rating:${s.rating || 'N/A'} | CMP:₹${s.current_price || 'N/A'} | Target:₹${s.target_price || 'N/A'}`).join("\n");
    const articlesCtx = (allPostsRes.data || []).map(a => `${a.title} | ${a.category} | slug:${a.slug}`).join("\n");
    const trendsCtx = (allTrendsRes.data || []).map(t => `${t.city}${t.locality ? '/' + t.locality : ''} | ₹${t.avg_price_sqft}/sqft | ${t.change_pct}%`).join("\n");

    const dbSearchSummary = dbResultCount > 0
      ? `\nDB SEARCH for "${query}" (${dbResultCount} matches):\n` +
        (properties.length ? `Properties: ${properties.map(p => p.title).join(', ')}\n` : '') +
        (stocks.length ? `Stocks: ${stocks.map(s => s.symbol).join(', ')}\n` : '') +
        (articles.length ? `Articles: ${articles.map(a => a.title).join(', ')}\n` : '') +
        (trends.length ? `Trends: ${trends.map(t => t.city).join(', ')}\n` : '')
      : `\nNo matching results in our database for "${query}".`;

    const systemPrompt = `You are InvestingIQ's AI assistant — an expert financial and real estate advisor for the Indian market.
Current time: ${new Date().toISOString()}

RULES:
1. Check database results below first. Present matches with CARD FORMAT.
2. If NO relevant data in database, use your knowledge about Indian markets/stocks/real estate/mutual funds.
3. Answer in SAME LANGUAGE as user.
4. Concise, helpful, actionable. Use bullet points and headers.
5. NEVER use emojis. Clean professional formatting.
6. No disclaimers — UI adds them.

${dbSearchSummary}

DATABASE:
PROPERTIES (${(allPropsRes.data || []).length}):
${propsCtx || "None."}

STOCKS (${(allStocksRes.data || []).length}):
${stocksCtx || "None."}

ARTICLES (${(allPostsRes.data || []).length}):
${articlesCtx || "None."}

PRICE TRENDS:
${trendsCtx || "None."}

CARD FORMAT:
<!--CARDS:[{"type":"property","title":"Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"}]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"}]-->
<!--CARDS:[{"type":"article","title":"Title","subtitle":"Category","link":"/news/SLUG"}]-->

If topic NOT in database, answer from knowledge — do NOT refuse.`;

    const response = await callAI(systemPrompt, query);

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
