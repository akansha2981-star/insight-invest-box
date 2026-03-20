import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract keywords from user query
function extractKeywords(query: string): string[] {
  const stopWords = new Set(["the","a","an","is","are","was","were","be","been","being","in","on","at","to","for","of","with","by","from","and","or","but","not","this","that","these","those","it","its","i","me","my","we","our","you","your","he","she","they","them","their","what","which","who","whom","how","where","when","why","do","does","did","will","would","shall","should","can","could","may","might","must","have","has","had","about","into","through","during","before","after","above","below","between","under","over","up","down","out","off","then","than","so","no","yes","any","all","each","every","both","few","more","most","other","some","such","only","own","same","very","just","also","much","many","still","even","here","there","now","well","too","already","really","please","tell","show","give","get","find","best","top","good","great","suggest","recommend","want","need","looking","search","help","know","think","like","new","old","big","small","high","low","buy","sell","rent","invest"]);
  return query
    .toLowerCase()
    .replace(/[^\w\s₹]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));
}

// Search properties in DB
async function searchProperties(sb: any, keywords: string[]) {
  let query = sb.from("properties")
    .select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,possession_status,area_sqft,price,amenities,cover_image_url,roi_projection,is_featured,is_price_drop,original_price")
    .eq("status", "active");
  
  // Build ilike filters for keywords
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`title.ilike.%${kw}%,city.ilike.%${kw}%,locality.ilike.%${kw}%,property_type.ilike.%${kw}%,bhk.ilike.%${kw}%,developer_name.ilike.%${kw}%,listing_type.ilike.%${kw}%`);
  }
  
  if (filters.length > 0) {
    // Use OR filter for each keyword
    const orFilter = filters.join(",");
    query = query.or(orFilter);
  }
  
  const { data, error } = await query.limit(10);
  if (error) console.error("Property search error:", error);
  return data || [];
}

// Search stock reviews in DB
async function searchStocks(sb: any, keywords: string[]) {
  let query = sb.from("stock_reviews")
    .select("symbol,company_name,sector,rating,current_price,target_price,summary,tags,investment_thesis")
    .eq("status", "published");
  
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`symbol.ilike.%${kw}%,company_name.ilike.%${kw}%,sector.ilike.%${kw}%,summary.ilike.%${kw}%,rating.ilike.%${kw}%`);
  }
  
  if (filters.length > 0) {
    query = query.or(filters.join(","));
  }
  
  const { data, error } = await query.limit(10);
  if (error) console.error("Stock search error:", error);
  return data || [];
}

// Search blog posts in DB
async function searchArticles(sb: any, keywords: string[]) {
  let query = sb.from("blog_posts")
    .select("title,slug,category,excerpt")
    .eq("status", "published");
  
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`title.ilike.%${kw}%,category.ilike.%${kw}%,excerpt.ilike.%${kw}%`);
  }
  
  if (filters.length > 0) {
    query = query.or(filters.join(","));
  }
  
  const { data, error } = await query.order("published_at", { ascending: false }).limit(5);
  if (error) console.error("Article search error:", error);
  return data || [];
}

// Search price trends
async function searchTrends(sb: any, keywords: string[]) {
  let query = sb.from("re_price_trends")
    .select("city,locality,avg_price_sqft,change_pct,ai_insights,period");
  
  const filters: string[] = [];
  for (const kw of keywords) {
    filters.push(`city.ilike.%${kw}%,locality.ilike.%${kw}%`);
  }
  
  if (filters.length > 0) {
    query = query.or(filters.join(","));
  }
  
  const { data, error } = await query.limit(10);
  if (error) console.error("Trends search error:", error);
  return data || [];
}

// Format DB results into a readable response with card markup
function formatDbResponse(properties: any[], stocks: any[], articles: any[], trends: any[], queryText: string): string | null {
  const parts: string[] = [];
  const totalResults = properties.length + stocks.length + articles.length + trends.length;
  
  if (totalResults === 0) return null;

  if (properties.length > 0) {
    parts.push("## 🏠 Properties Found\n");
    const cards = properties.map(p => ({
      type: "property",
      title: p.title,
      subtitle: `${p.city}${p.locality ? ', ' + p.locality : ''} | ${p.bhk || '-'} BHK | ${p.property_type}`,
      price: p.price_display || `₹${(p.price / 100000).toFixed(1)}L`,
      link: `/real-estate/${p.slug}`
    }));
    
    for (const p of properties) {
      parts.push(`- **${p.title}** — ${p.city}${p.locality ? ', ' + p.locality : ''}`);
      parts.push(`  ${p.bhk || '-'} BHK ${p.property_type} | ${p.price_display || '₹' + p.price}`);
      if (p.developer_name) parts.push(`  Developer: ${p.developer_name}`);
      if (p.possession_status) parts.push(`  Status: ${p.possession_status}`);
      if (p.area_sqft) parts.push(`  Area: ${p.area_sqft} sqft`);
      if (p.roi_projection) parts.push(`  ROI: ${p.roi_projection}`);
      parts.push("");
    }
    parts.push(`<!--CARDS:${JSON.stringify(cards)}-->`);
  }

  if (stocks.length > 0) {
    parts.push("\n## 📈 Stock Reviews\n");
    const cards = stocks.map(s => ({
      type: "stock",
      title: s.symbol,
      subtitle: `${s.sector} | ${s.rating || 'N/A'}`,
      price: s.current_price ? `₹${s.current_price}` : 'N/A',
      link: `/stocks/review/${s.symbol}`
    }));
    
    for (const s of stocks) {
      parts.push(`- **${s.symbol}** (${s.company_name}) — ${s.sector}`);
      parts.push(`  Rating: ${s.rating || 'N/A'} | CMP: ₹${s.current_price || 'N/A'} | Target: ₹${s.target_price || 'N/A'}`);
      if (s.summary) parts.push(`  ${s.summary}`);
      parts.push("");
    }
    parts.push(`<!--CARDS:${JSON.stringify(cards)}-->`);
  }

  if (articles.length > 0) {
    parts.push("\n## 📰 Related Articles\n");
    const cards = articles.map(a => ({
      type: "article",
      title: a.title,
      subtitle: a.category,
      link: `/news/${a.slug}`
    }));
    
    for (const a of articles) {
      parts.push(`- **${a.title}** (${a.category})`);
      if (a.excerpt) parts.push(`  ${a.excerpt}`);
      parts.push("");
    }
    parts.push(`<!--CARDS:${JSON.stringify(cards)}-->`);
  }

  if (trends.length > 0) {
    parts.push("\n## 📊 Price Trends\n");
    for (const t of trends) {
      parts.push(`- **${t.city}${t.locality ? '/' + t.locality : ''}** — Avg: ₹${t.avg_price_sqft}/sqft | Change: ${t.change_pct}%`);
      if (t.ai_insights) parts.push(`  ${t.ai_insights}`);
      parts.push("");
    }
  }

  parts.push("\n---\n*Data sourced from official exchanges (NSE/BSE) and trusted platforms. This is informational only — not a recommendation. Consult a certified financial advisor.*");

  return parts.join("\n");
}

// Convert a text string to SSE format (simulates streaming for DB responses)
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
      // Send chunks of ~5 words at a time for smooth streaming feel
      const chunk = words.slice(index, index + 5).join("");
      index += 5;
      const data = JSON.stringify({
        choices: [{ delta: { content: chunk }, index: 0 }]
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    }
  });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // STEP 1: Extract keywords and search database first
    const keywords = extractKeywords(query);
    console.log("Query:", query, "| Keywords:", keywords);

    const [properties, stocks, articles, trends] = await Promise.all([
      searchProperties(sb, keywords),
      searchStocks(sb, keywords),
      searchArticles(sb, keywords),
      searchTrends(sb, keywords),
    ]);

    const dbResultCount = properties.length + stocks.length + articles.length + trends.length;
    console.log(`DB results: ${dbResultCount} (${properties.length} props, ${stocks.length} stocks, ${articles.length} articles, ${trends.length} trends)`);

    // STEP 2: If we have good DB results, format and return directly (no AI needed)
    if (dbResultCount >= 2) {
      const formattedResponse = formatDbResponse(properties, stocks, articles, trends, query);
      if (formattedResponse) {
        console.log("Returning DB-only response");
        return new Response(textToSSE(formattedResponse), {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // STEP 3: If DB has some but not enough results, or no results — try AI with DB context
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // No AI key — return DB results if any, or a helpful message
      if (dbResultCount > 0) {
        const formattedResponse = formatDbResponse(properties, stocks, articles, trends, query);
        if (formattedResponse) {
          return new Response(textToSSE(formattedResponse), {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
      }
      return new Response(textToSSE("I couldn't find specific results for your query in our database. Please try rephrasing or browsing our sections directly."), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Build context from ALL db data for AI
    const [allPropsRes, allStocksRes, allPostsRes, allTrendsRes] = await Promise.all([
      sb.from("properties").select("title,slug,city,locality,price_display,bhk,property_type,listing_type,developer_name,possession_status,area_sqft,price,amenities").eq("status", "active").limit(50),
      sb.from("stock_reviews").select("symbol,company_name,sector,rating,current_price,target_price,summary").eq("status", "published").limit(30),
      sb.from("blog_posts").select("title,slug,category,excerpt").eq("status", "published").order("published_at", { ascending: false }).limit(15),
      sb.from("re_price_trends").select("city,locality,avg_price_sqft,change_pct,ai_insights").limit(20),
    ]);

    const propsCtx = (allPropsRes.data || []).map(p =>
      `${p.title} | ${p.city}${p.locality ? ', ' + p.locality : ''} | ${p.price_display || '₹' + p.price} | ${p.bhk || '-'} BHK | ${p.property_type} | ${p.listing_type} | slug:${p.slug}`
    ).join("\n");
    const stocksCtx = (allStocksRes.data || []).map(s =>
      `${s.symbol} ${s.company_name} | ${s.sector} | Rating:${s.rating || 'N/A'} | CMP:₹${s.current_price || 'N/A'} | Target:₹${s.target_price || 'N/A'}`
    ).join("\n");
    const articlesCtx = (allPostsRes.data || []).map(a =>
      `${a.title} | ${a.category} | slug:${a.slug}`
    ).join("\n");
    const trendsCtx = (allTrendsRes.data || []).map(t =>
      `${t.city}${t.locality ? '/' + t.locality : ''} | ₹${t.avg_price_sqft}/sqft | ${t.change_pct}%`
    ).join("\n");

    // Also pass the DB search results for this query
    const dbSearchSummary = dbResultCount > 0
      ? `\nDB SEARCH RESULTS for "${query}" (${dbResultCount} matches):\n` +
        (properties.length ? `Properties: ${properties.map(p => p.title).join(', ')}\n` : '') +
        (stocks.length ? `Stocks: ${stocks.map(s => s.symbol).join(', ')}\n` : '') +
        (articles.length ? `Articles: ${articles.map(a => a.title).join(', ')}\n` : '') +
        (trends.length ? `Trends: ${trends.map(t => t.city).join(', ')}\n` : '')
      : `\nNo matching results found in our database for "${query}".`;

    const systemPrompt = `You are InvestingIQ's AI assistant — an expert financial and real estate advisor for the Indian market.

CRITICAL RULES:
1. FIRST check the database results below. If relevant data exists, present it with CARD FORMAT.
2. If NO relevant data exists in our database, use your own knowledge to answer helpfully about Indian markets, stocks, real estate, mutual funds, etc.
3. Answer in the SAME LANGUAGE the user writes in.
4. Be concise, helpful, and actionable. Use bullet points and headers.
5. For investment info, ALWAYS end with: "Data sourced from official exchanges (NSE/BSE) and trusted platforms. This is informational only — not a recommendation. Consult a certified financial advisor."

${dbSearchSummary}

FULL DATABASE:
PROPERTIES (${(allPropsRes.data || []).length}):
${propsCtx || "No properties yet."}

STOCKS (${(allStocksRes.data || []).length}):
${stocksCtx || "No stock reviews yet."}

ARTICLES (${(allPostsRes.data || []).length}):
${articlesCtx || "No articles yet."}

PRICE TRENDS:
${trendsCtx || "No trend data yet."}

CARD FORMAT — When recommending items from our database:
<!--CARDS:[{"type":"property","title":"Name","subtitle":"City, BHK","price":"₹XX","link":"/real-estate/SLUG"}]-->
<!--CARDS:[{"type":"stock","title":"SYMBOL","subtitle":"Sector | Rating","price":"₹CMP","link":"/stocks/review/SYMBOL"}]-->
<!--CARDS:[{"type":"article","title":"Title","subtitle":"Category","link":"/news/SLUG"}]-->

If asking about something NOT in our database, answer using your general financial knowledge — do NOT refuse to answer. Be helpful!`;

    // Try AI models with failover
    const models = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "openai/gpt-5-mini"];
    let response: Response | null = null;

    for (const model of models) {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 25000);

        const attempt = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
            stream: true,
          }),
          signal: ac.signal,
        });

        clearTimeout(timer);

        if (attempt.ok) {
          response = attempt;
          console.log(`AI model ${model} succeeded`);
          break;
        }

        const status = attempt.status;
        await attempt.text().catch(() => {});

        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.error(`Model ${model} failed: ${status}`);
      } catch (err) {
        console.error(`Model ${model} error:`, err instanceof Error ? err.message : err);
      }
    }

    // STEP 4: If AI also fails, fall back to DB results or a helpful message
    if (!response) {
      console.log("All AI models failed, falling back to DB results");
      if (dbResultCount > 0) {
        const formattedResponse = formatDbResponse(properties, stocks, articles, trends, query);
        if (formattedResponse) {
          return new Response(textToSSE("⚠️ *AI is temporarily unavailable, showing results from our database:*\n\n" + formattedResponse), {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
      }
      
      // No DB results and no AI — return helpful fallback
      return new Response(textToSSE(
        "I'm currently unable to process your request as the AI service is temporarily unavailable.\n\n" +
        "In the meantime, you can:\n" +
        "- 🏠 Browse properties at [Real Estate](/real-estate)\n" +
        "- 📈 Check stock reviews at [Stocks](/stocks/reviews)\n" +
        "- 📰 Read latest news at [News](/news)\n" +
        "- 🧮 Use our [SIP Calculator](/tools/sip) or [EMI Calculator](/tools/emi)\n\n" +
        "Please try again in a few minutes!"
      ), {
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
