import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IST_TIME_ZONE = "Asia/Kolkata";

function formatISTDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function formatISTTime(date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getRequestedDate(dateInput?: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateInput || "") ? String(dateInput) : formatISTDate();
}

function buildDateGuard(targetDate: string): string {
  const today = formatISTDate();
  return targetDate === today
    ? `Treat ${targetDate} as today in India and use the latest available information from this date only.`
    : `Write strictly from the perspective of ${targetDate} in India and do not mention any event, filing, price, or development after ${targetDate}.`;
}

function stripCodeFences(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/^```(?:html|json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildExcerpt(content: string, fallbackTitle: string, targetDate: string): string {
  const plain = stripHtmlTags(content);
  const base = plain || `${fallbackTitle} latest update for ${targetDate}.`;
  return base.length <= 180 ? base : `${base.slice(0, 177).trim()}...`;
}

function buildMetaTitle(title: string): string {
  return title.length <= 60 ? title : `${title.slice(0, 57).trim()}...`;
}

function buildMetaDescription(value: string): string {
  return value.length <= 160 ? value : `${value.slice(0, 157).trim()}...`;
}

async function callAINonStream(systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any, useStrongModel = false): Promise<any | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const model = useStrongModel ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";
      const body: any = {
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        stream: false,
        max_tokens: useStrongModel ? 8000 : 4000,
      };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) return await resp.json();
      await resp.text().catch(() => {});
    } catch (e) { console.error("Lovable AI error:", e instanceof Error ? e.message : e); }
  }
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const body: any = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) return await resp.json();
      await resp.text().catch(() => {});
    } catch (e) { console.error("OpenAI error:", e instanceof Error ? e.message : e); }
  }
  return null;
}

function extractToolResult(aiData: any): any {
  const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    try { return JSON.parse(toolCall.function.arguments); } catch { }
  }
  const content = aiData?.choices?.[0]?.message?.content;
  if (content) {
    try {
      const cleaned = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      return JSON.parse(cleaned);
    } catch { }
  }
  return null;
}

async function fetchMarketSnapshot(targetDate: string): Promise<string> {
  if (targetDate !== formatISTDate()) {
    return `Selected date: ${targetDate}. ${buildDateGuard(targetDate)}`;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !publishableKey) {
    return `Selected date: ${targetDate} (IST).`;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stock-ticker`, {
      headers: {
        Authorization: `Bearer ${publishableKey}`,
      },
    });

    if (!response.ok) {
      return `Selected date: ${targetDate} (IST).`;
    }

    const data = await response.json();
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];

    if (!quotes.length) {
      return `Selected date: ${targetDate} (IST).`;
    }

    const focusSymbols = new Set(["NIFTY", "SENSEX", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK", "INFY"]);
    const focusLines = quotes
      .filter((quote: any) => focusSymbols.has(quote.symbol))
      .slice(0, 7)
      .map((quote: any) => `${quote.displayName || quote.symbol}: ₹${Number(quote.price || 0).toFixed(2)} (${Number(quote.changePercent || 0).toFixed(2)}%)`);

    const moverLines = [...quotes]
      .filter((quote: any) => !["NIFTY", "SENSEX", "BANKNIFTY"].includes(quote.symbol))
      .sort((a: any, b: any) => Math.abs(Number(b.changePercent || 0)) - Math.abs(Number(a.changePercent || 0)))
      .slice(0, 5)
      .map((quote: any) => `${quote.displayName || quote.symbol}: ₹${Number(quote.price || 0).toFixed(2)} (${Number(quote.changePercent || 0).toFixed(2)}%)`);

    return `Latest IST market snapshot for ${targetDate} at ${formatISTTime()}: ${[...focusLines, ...moverLines].join(" | ")}`;
  } catch (error) {
    console.error("market snapshot error:", error);
    return `Selected date: ${targetDate} (IST).`;
  }
}

// Fetches REAL live data for a specific symbol from our stock-ticker function.
// Returns ground-truth numbers + a formatted prompt block the AI is forced to use.
async function fetchLiveStockData(symbol: string): Promise<{ data: any | null; promptBlock: string }> {
  if (!symbol) return { data: null, promptBlock: "" };
  const sym = symbol.toUpperCase().trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !publishableKey) return { data: null, promptBlock: "" };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/stock-ticker`, {
      headers: { Authorization: `Bearer ${publishableKey}` },
    });
    if (!response.ok) return { data: null, promptBlock: "" };
    const data = await response.json();
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
    const match = quotes.find((q: any) => String(q.symbol).toUpperCase() === sym);
    if (!match) {
      return {
        data: null,
        promptBlock: `\n\n*** WARNING: No live data found for symbol "${sym}". DO NOT invent specific prices, P/E, or market cap. Use phrases like "around recent levels" and clearly mark estimated figures. ***`,
      };
    }

    const price = Number(match.price || 0);
    const changePct = Number(match.changePercent || 0);
    const change = Number(match.change || 0);
    const prevClose = Number(match.previousClose || (price - change) || 0);
    const high52 = Number(match.high52Week || match.yearHigh || 0);
    const low52 = Number(match.low52Week || match.yearLow || 0);
    const dayHigh = Number(match.high || 0);
    const dayLow = Number(match.low || 0);
    const volume = Number(match.volume || 0);
    const open = Number(match.open || 0);

    const promptBlock = `

*** GROUND-TRUTH LIVE DATA — YOU MUST USE THESE EXACT NUMBERS, DO NOT INVENT OR ESTIMATE ***
Symbol: ${match.symbol}
Company / Display Name: ${match.displayName || match.symbol}
Exchange: ${match.exchange || "NSE"}
Current Price (INR): ${price.toFixed(2)}
Day Change: ${change.toFixed(2)} (${changePct.toFixed(2)}%)
Previous Close: ${prevClose.toFixed(2)}
Day Open: ${open.toFixed(2)}
Day High: ${dayHigh.toFixed(2)} | Day Low: ${dayLow.toFixed(2)}
52-Week High: ${high52 > 0 ? high52.toFixed(2) : "N/A"}
52-Week Low: ${low52 > 0 ? low52.toFixed(2) : "N/A"}
Volume: ${volume.toLocaleString()}

RULES:
1. Set current_price = ${price.toFixed(2)} EXACTLY.
2. Set key_metrics["52w_high"] = "${high52 > 0 ? high52.toFixed(2) : "N/A"}" EXACTLY.
3. Set key_metrics["52w_low"] = "${low52 > 0 ? low52.toFixed(2) : "N/A"}" EXACTLY.
4. target_price must be within +/- 35% of current_price and reflect a realistic 12-month view.
5. For financials (revenue, P/E, market cap, EPS, ROE) use ONLY widely-known annual report figures. If unsure, use conservative ranges and clearly say "approx" — DO NOT fabricate precise numbers.
6. Do NOT mention any price, event, or filing dated after today's IST date.
*** END GROUND-TRUTH ***`;

    return {
      data: { ...match, price, changePct, prevClose, high52, low52, dayHigh, dayLow, volume, open },
      promptBlock,
    };
  } catch (e) {
    console.error("fetchLiveStockData error:", e);
    return { data: null, promptBlock: "" };
  }

  const targetDate = getRequestedDate(ctx?.target_date);
  const requestedTopic = stripCodeFences(String(ctx?.topic ?? "")).trim();
  const title = stripCodeFences(String((result?.title ?? requestedTopic) || `Market Update for ${targetDate}`)).trim() || `Market Update for ${targetDate}`;
  const rawContent = stripCodeFences(String(result?.content ?? "")).trim();
  const content = rawContent || `<h2>${title}</h2><p>${buildExcerpt("", title, targetDate)}</p>`;
  const excerpt = stripCodeFences(String(result?.excerpt ?? "")).trim() || buildExcerpt(content, title, targetDate);
  const rawTags = Array.isArray(result?.tags) ? result.tags.join(", ") : stripCodeFences(String(result?.tags ?? ""));
  const category = stripCodeFences(String(result?.category ?? ctx?.category ?? "Markets")).trim() || "Markets";

  return {
    ...result,
    title,
    slug: slugify(stripCodeFences(String(result?.slug ?? title)) || title),
    content,
    excerpt,
    category,
    tags: rawTags || `${category.toLowerCase()}, india, investing`,
    meta_title: buildMetaTitle(stripCodeFences(String(result?.meta_title ?? title)).trim() || title),
    meta_description: buildMetaDescription(stripCodeFences(String(result?.meta_description ?? excerpt)).trim() || excerpt),
    author_name: stripCodeFences(String(result?.author_name ?? "Editorial Team")).trim() || "Editorial Team",
    requested_date: targetDate,
  };
}

const ACTIONS: Record<string, { system: string | ((ctx: any) => string); prompt: (ctx: any) => string; tools: any[]; toolName: string }> = {
  "generate-breaking-news": {
    system: (ctx: any) => `You are a financial news editor for InvestingIQ, an Indian finance platform. Generate breaking news headlines about Indian markets, economy, stocks. Current, relevant, factual tone. No emojis.
${buildDateGuard(getRequestedDate(ctx.target_date))}`,
    prompt: (ctx) => {
      const d = getRequestedDate(ctx.target_date);
      const topic = ctx.topic ? `Topic focus: "${ctx.topic}". ` : "";
      return `Generate ${ctx.count || 3} breaking news headlines for Indian financial markets. ${topic}Each should be concise (under 100 chars), current-sounding, professional. Date context: ${d}. ${buildDateGuard(d)}
${ctx.market_snapshot || ""}`;
    },
    tools: [{
      type: "function",
      function: {
        name: "generate_headlines",
        description: "Generate breaking news headlines",
        parameters: {
          type: "object",
          properties: {
            headlines: { type: "array", items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } }
          },
          required: ["headlines"]
        }
      }
    }],
    toolName: "generate_headlines",
  },
  "generate-banner": {
    system: (ctx: any) => `You are a marketing copywriter for InvestingIQ, an Indian finance/real estate platform. Create compelling banner content. No emojis. Professional.
${buildDateGuard(getRequestedDate(ctx.target_date))}`,
    prompt: (ctx) => {
      const d = getRequestedDate(ctx.target_date);
      const topic = ctx.topic ? `Topic focus: "${ctx.topic}". ` : "";
      return `Generate a homepage banner for type: ${ctx.type || "hero"}. ${topic}Include title (compelling, 6-10 words), subtitle (supporting text, 15-25 words), cta_label (2-3 words), cta_url (internal link like /markets or /real-estate). Topic: Indian markets/investing/real estate. Date: ${d}. ${buildDateGuard(d)}
${ctx.market_snapshot || ""}`;
    },
    tools: [{
      type: "function",
      function: {
        name: "generate_banner",
        description: "Generate banner content",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            cta_label: { type: "string" },
            cta_url: { type: "string" },
          },
          required: ["title", "subtitle", "cta_label", "cta_url"]
        }
      }
    }],
    toolName: "generate_banner",
  },
  "generate-stock-review": {
    system: (ctx: any) => {
      const d = getRequestedDate(ctx.target_date);
      return `You are a senior equity research analyst for Indian markets (NSE/BSE). Generate comprehensive stock analysis with REALISTIC financial data. Use actual market-like numbers. No emojis. ${buildDateGuard(d)}`;
    },
    prompt: (ctx) => {
      const d = getRequestedDate(ctx.target_date);
      const topic = ctx.symbol ? `for ${ctx.symbol}` : (ctx.topic ? `for ${ctx.topic}` : "for a trending Indian large-cap stock");
      return `Generate a COMPLETE stock review ${topic}. Include ALL fields with realistic data:
- symbol, company_name, sector, exchange
- current_price (realistic market price in INR), target_price
- rating (STRONG BUY/BUY/HOLD/SELL/STRONG SELL)
- summary (2-3 sentences), investment_thesis (detailed paragraph), risks
- analyst_name
- tags (comma separated)
- financials: revenue (in Cr), net_profit (in Cr), eps, pe_ratio, debt_equity, roe (%), market_cap (in Cr), book_value
- key_metrics: 52w_high, 52w_low, dividend_yield (%), promoter_holding (%), fii_holding (%), beta
ALL numbers must be realistic for the stock as of ${d}. ${buildDateGuard(d)}
${ctx.market_snapshot || ""}`;
    },
    tools: [{
      type: "function",
      function: {
        name: "generate_stock_review",
        description: "Generate complete stock review with financials",
        parameters: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            company_name: { type: "string" },
            sector: { type: "string" },
            exchange: { type: "string" },
            current_price: { type: "number" },
            target_price: { type: "number" },
            rating: { type: "string" },
            summary: { type: "string" },
            investment_thesis: { type: "string" },
            risks: { type: "string" },
            tags: { type: "string" },
            analyst_name: { type: "string" },
            financials: {
              type: "object",
              properties: {
                revenue: { type: "string" }, net_profit: { type: "string" },
                eps: { type: "string" }, pe_ratio: { type: "string" },
                debt_equity: { type: "string" }, roe: { type: "string" },
                market_cap: { type: "string" }, book_value: { type: "string" },
              }
            },
            key_metrics: {
              type: "object",
              properties: {
                "52w_high": { type: "string" }, "52w_low": { type: "string" },
                dividend_yield: { type: "string" }, promoter_holding: { type: "string" },
                fii_holding: { type: "string" }, beta: { type: "string" },
              }
            },
          },
          required: ["symbol", "company_name", "sector", "rating", "summary", "financials", "key_metrics"]
        }
      }
    }],
    toolName: "generate_stock_review",
  },
  "generate-article-ideas": {
    system: "You are an editorial strategist for InvestingIQ. Suggest trending article topics about Indian markets, economy, stocks, real estate, mutual funds, crypto. No emojis.",
    prompt: (ctx) => `Suggest 5 trending article topics for category: ${ctx.category || "Markets"}. Each with a headline and brief description. Date: ${new Date().toISOString().split('T')[0]}`,
    tools: [{
      type: "function",
      function: {
        name: "suggest_topics",
        description: "Suggest article topics",
        parameters: {
          type: "object",
          properties: {
            topics: { type: "array", items: { type: "object", properties: { headline: { type: "string" }, description: { type: "string" }, category: { type: "string" } }, required: ["headline", "description"] } }
          },
          required: ["topics"]
        }
      }
    }],
    toolName: "suggest_topics",
  },
  "generate-full-article": {
    system: (ctx) => `You are a senior financial journalist and SEO expert for InvestingIQ, India's premier investing platform. You write comprehensive, in-depth, publish-ready articles.

MANDATORY RULES:
1. Article MUST be 1200-2000 words minimum. Never write less than 1200 words.
2. Content MUST be rich HTML with:
   - At least 5-7 <h2> section headings
   - Multiple <h3> sub-headings under relevant sections
   - Detailed <p> paragraphs (4-6 sentences each, not short one-liners)
   - <ul>/<ol> lists with data points
   - <blockquote> for expert quotes (attribute to realistic analysts/experts)
   - <strong> for key terms and numbers
   - <table> where relevant (comparison data, financial metrics)
3. Include SPECIFIC data: percentages, ₹ amounts, dates, company names, index levels
4. SEO requirements:
   - Primary keyword in title, first paragraph, at least 3 headings, and conclusion
   - meta_title: Under 60 chars, includes primary keyword, compelling
   - meta_description: Under 160 chars, includes keyword, has call-to-action
   - Natural keyword density throughout (2-3%)
   - Internal linking suggestions in content (use /markets, /stocks, /economy paths)
5. Structure: Hook intro → Context → Deep analysis → Data/Charts discussion → Expert opinions → What it means for investors → Conclusion with actionable takeaway
6. Include a "Key Takeaways" section with 4-6 bullet points
7. Include a "What Should Investors Do?" section
8. Tone: Authoritative, data-driven, helpful. No emojis. No fluff.
9. Tags: 5-8 relevant tags covering topic, sector, and related keywords
10. Date context: ${getRequestedDate(ctx?.target_date)} (Asia/Kolkata)
11. Never wrap the content field in markdown code fences or triple backticks.

CRITICAL: You MUST generate ALL fields without exception - title, slug, content, excerpt, category, tags, meta_title, meta_description, author_name. NEVER leave any field empty or null. The excerpt MUST be 2 compelling sentences (30-50 words). The meta_description MUST be under 160 chars with a CTA. The meta_title MUST be under 60 chars.`,
    prompt: (ctx) => {
      const topic = ctx.topic || "trending investment opportunity in Indian markets today";
      const cat = ctx.category || "Markets";
      const selectedDate = getRequestedDate(ctx.target_date);
      return `Write a COMPREHENSIVE, DETAILED, publish-ready article.

TOPIC: "${topic}"
CATEGORY: ${cat}
DATE TO COVER: ${selectedDate} (Asia/Kolkata)

DATE RULES:
- ${buildDateGuard(selectedDate)}
- Use ${selectedDate} as the only "current" reference point in the article.
- Never mention any later date.

MARKET SNAPSHOT / FACT BASE:
${ctx.market_snapshot || `No live market snapshot was available. ${buildDateGuard(selectedDate)}`}

REQUIREMENTS:
- Minimum 1200 words of rich, detailed content
- At least 5 major sections with h2 headings
- Include specific numbers: stock prices, index levels, percentage changes, market caps
- Quote at least 2 named experts/analysts with their firm names
- Include a comparison table if relevant
- Add "Key Takeaways" bullet list
- Add "What Should Investors Do?" advisory section  
- Write a compelling excerpt (2 sentences that hook the reader)
- Generate SEO-optimized meta_title (under 60 chars with primary keyword)
- Generate meta_description (under 160 chars with CTA)
- Generate 5-8 relevant tags
- slug should be URL-friendly, keyword-rich
- author_name should be a realistic Indian journalist name
- content must be valid article HTML only; never wrap it inside markdown fences
- fill every output field even if the topic is broad

The content field must contain FULL HTML article body. Do NOT truncate or abbreviate. Write the COMPLETE article.`;
    },
    tools: [{
      type: "function",
      function: {
        name: "generate_article",
        description: "Generate a complete, detailed, SEO-friendly article with minimum 1200 words",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Compelling headline with primary keyword" },
            slug: { type: "string", description: "URL-friendly slug with keywords" },
            content: { type: "string", description: "FULL HTML content, minimum 1200 words, with h2, h3, p, ul, blockquote, table, strong tags" },
            excerpt: { type: "string", description: "2 compelling sentences for article cards" },
            category: { type: "string" },
            tags: { type: "string", description: "5-8 comma-separated relevant tags" },
            meta_title: { type: "string", description: "Under 60 chars, includes primary keyword" },
            meta_description: { type: "string", description: "Under 160 chars, includes keyword and CTA" },
            author_name: { type: "string" },
          },
          required: ["title", "slug", "content", "excerpt", "category", "tags", "meta_title", "meta_description"]
        }
      }
    }],
    toolName: "generate_article",
  },
  "generate-property": {
    system: (ctx: any) => {
      const d = getRequestedDate(ctx?.target_date);
      return `You are a senior real estate content specialist for InvestingIQ, an Indian property platform.
You write detailed, realistic, publish-ready property listings using current market intelligence as of ${d} (Asia/Kolkata).
Rules:
- No emojis. Professional, factual, persuasive tone.
- Use REALISTIC prices for the given Indian city/locality (current market rates as of ${d}).
- Use the Property Name and Builder Name EXACTLY as provided by the user — do NOT invent a different project name.
- Pricing, RERA-style IDs, possession dates and amenities must align with the city, builder reputation and property type.
- ${buildDateGuard(d)}`;
    },
    prompt: (ctx) => {
      const d = getRequestedDate(ctx.target_date);
      const name = ctx.property_name ? `Project Name (use exactly): "${ctx.property_name}"` : "Project Name: (invent a realistic, builder-aligned name)";
      const builder = ctx.developer_name ? `Builder / Developer (use exactly): "${ctx.developer_name}"` : "Builder: (pick a realistic Indian developer)";
      const state = ctx.state ? `State: ${ctx.state}` : "";
      const locality = ctx.locality ? `Preferred locality / sector: ${ctx.locality}` : "";
      const bhkPref = ctx.bhk ? `Configuration preference: ${ctx.bhk}` : "";
      const budget = ctx.budget_hint ? `Budget hint: ${ctx.budget_hint}` : "";
      const extra = ctx.extra_notes ? `Additional notes from admin: ${ctx.extra_notes}` : "";

      return `Generate a COMPLETE, DETAILED property listing using the following user inputs:

${name}
${builder}
${state}
City: ${ctx.city || "Mumbai"}
${locality}
Property Type: ${ctx.property_type || "apartment"}
Listing Type: ${ctx.listing_type || "buy"}
${bhkPref}
${budget}
${extra}

Today's date: ${d} (use the latest realistic market data as of this date).
${buildDateGuard(d)}
${ctx.market_snapshot || ""}

Fill EVERY field with rich, realistic data:
- title: use the Project Name exactly if provided, otherwise create a builder-aligned realistic project name
- slug: URL-friendly version of title
- developer_name: use the builder name exactly if provided
- city, locality (real, well-known locality name within the city), sector (if applicable, e.g. "Sector 65, Gurugram")
- property_type, listing_type
- bhk (e.g. "3 BHK", or range like "2-4 BHK"), bhk_min, bhk_max
- area_sqft (typical unit size), area_min, area_max
- price (numeric INR for a typical unit), price_display (e.g. "₹1.85 Cr onwards"), price_min, price_max, original_price (only if is_price_drop=true)
- description: 2-3 punchy sentences for cards
- overview: detailed 150-250 word description covering location, builder pedigree, design philosophy, target buyer
- amenities: array of 10-14 realistic amenities (Swimming Pool, Clubhouse, Gym, Concierge, EV Charging, Kids Play Area, Co-working Lounge, Yoga Deck, etc.)
- highlights: 5-7 unique selling points
- possession_status: "ready" or "under_construction"
- rera_id: realistic state-specific format (e.g. for Haryana "RC/REP/HARERA/GGM/...", Maharashtra "P51700XXXXXXX", UP "UPRERAPRJ...")
- total_floors, total_towers, green_area_pct (10-60), density (Low/Medium/High)
- nearest_hospital, nearest_school, nearest_mall (use REAL nearby establishments for the chosen locality)
- roi_projection: 2-3 sentences with realistic % appreciation expectations
- investment_plan: short construction-linked or possession-linked payment plan summary
- rating (4.0-4.8), is_featured (true if premium project), is_price_drop (only if explicitly suggested)
Numbers and amenities must match the chosen builder's typical positioning (luxury vs mid-segment vs affordable).`;
    },
    tools: [{
      type: "function",
      function: {
        name: "generate_property",
        description: "Generate complete property listing",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" }, slug: { type: "string" },
            developer_name: { type: "string" }, city: { type: "string" },
            locality: { type: "string" }, sector: { type: "string" },
            property_type: { type: "string" }, listing_type: { type: "string" },
            bhk: { type: "string" }, bhk_min: { type: "string" }, bhk_max: { type: "string" },
            area_sqft: { type: "number" }, area_min: { type: "number" }, area_max: { type: "number" },
            price: { type: "number" }, price_display: { type: "string" },
            price_min: { type: "number" }, price_max: { type: "number" },
            original_price: { type: "number" },
            description: { type: "string" }, overview: { type: "string" },
            amenities: { type: "array", items: { type: "string" } },
            highlights: { type: "array", items: { type: "string" } },
            possession_status: { type: "string" }, rera_id: { type: "string" },
            total_floors: { type: "number" }, total_towers: { type: "number" },
            green_area_pct: { type: "number" }, density: { type: "string" },
            nearest_hospital: { type: "string" }, nearest_school: { type: "string" },
            nearest_mall: { type: "string" },
            roi_projection: { type: "string" }, investment_plan: { type: "string" },
            rating: { type: "number" },
            is_featured: { type: "boolean" }, is_price_drop: { type: "boolean" },
          },
          required: ["title", "slug", "city", "price", "description", "overview", "amenities"]
        }
      }
    }],
    toolName: "generate_property",
  },
  "generate-page-section": {
    system: (ctx: any) => `You are a content writer for InvestingIQ. Generate professional page section content for financial platform pages. No emojis. Concise, informative. ${buildDateGuard(getRequestedDate(ctx.target_date))}`,
    prompt: (ctx) => {
      const d = getRequestedDate(ctx.target_date);
      const topic = ctx.topic ? `Topic focus: "${ctx.topic}". ` : "";
      return `Generate content for a ${ctx.section_type || "banner"} section on the "${ctx.page_key || "markets"}" page. ${topic}Include title (compelling, 5-10 words) and content (2-4 sentences, informative). Date: ${d}. ${buildDateGuard(d)}
${ctx.market_snapshot || ""}`;
    },
    tools: [{
      type: "function",
      function: {
        name: "generate_section",
        description: "Generate page section content",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
          },
          required: ["title", "content"]
        }
      }
    }],
    toolName: "generate_section",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, context } = await req.json();
    const config = ACTIONS[action];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestContext = context || {};
    const targetDate = getRequestedDate(requestContext.target_date);
    const marketSnapshot = await fetchMarketSnapshot(targetDate);
    const enrichedContext = {
      ...requestContext,
      target_date: targetDate,
      market_snapshot: marketSnapshot,
    };

    // Use stronger model for article and stock review generation
    const useStrongModel = action === "generate-full-article" || action === "generate-stock-review" || action === "generate-property";
    const systemPrompt = typeof config.system === "function" ? config.system(enrichedContext) : config.system;
    const aiData = await callAINonStream(
      systemPrompt,
      config.prompt(enrichedContext),
      config.tools,
      { type: "function", function: { name: config.toolName } },
      useStrongModel
    );

    if (!aiData) {
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = extractToolResult(aiData);
    const normalizedResult = action === "generate-full-article" && result
      ? normalizeArticleResult(result, enrichedContext)
      : result;

    if (!normalizedResult) {
      return new Response(JSON.stringify({ error: "AI returned invalid data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(normalizedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-admin-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
