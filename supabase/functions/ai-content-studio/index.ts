import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<any | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (resp.ok) return await resp.json();
      const t = await resp.text().catch(() => "");
      console.error("Lovable AI failed:", resp.status, t);
      if (resp.status === 429 || resp.status === 402) return { __error: resp.status };
    } catch (e) { console.error("Lovable AI err", e); }
  }
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (resp.ok) return await resp.json();
    } catch (e) { console.error("OpenAI err", e); }
  }
  return null;
}

function extractText(data: any): string {
  return data?.choices?.[0]?.message?.content ?? "";
}

function stripCodeFence(s: string) {
  return s.replace(/^```(?:json|html)?\n?/i, "").replace(/\n?```$/i, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { action, topic, category, keywords, wordLimit, keywordDensity, primaryKeyword } = await req.json();
    const today = new Date().toISOString().split("T")[0];

    if (action === "discover-topics") {
      const system = `You are an Indian financial markets SEO research analyst.
Your job is to surface 10 high-search-volume, trending topics that Indian users are actively searching RIGHT NOW.

STRICT RULES:
- ONLY topics related to: Indian Stock Market, Mutual Funds, Real Estate (India), Personal Finance, Tax, IPO, Cryptocurrency, Investment Strategy, Economy (India)
- Focus EXCLUSIVELY on Indian market context (NSE, BSE, SEBI, RBI, Indian companies, Indian cities, Rupee, Indian regulations)
- Topics must be timely, newsworthy, or evergreen high-intent searches
- Provide realistic ESTIMATED monthly search volumes for India (based on your knowledge of Indian search behaviour; these are estimates, not live data)
- Date context: ${today}

Return ONLY valid JSON. No markdown, no commentary. Schema:
{
  "topics": [
    {
      "title": "Catchy SEO-friendly article title",
      "primary_keyword": "main search keyword",
      "search_volume": 12000,
      "difficulty": "Low" | "Medium" | "High",
      "intent": "Informational" | "Transactional" | "Navigational",
      "category": "Stocks" | "Mutual Funds" | "Real Estate" | "Personal Finance" | "Tax" | "IPO" | "Crypto" | "Economy",
      "rationale": "1 sentence why this is trending in India right now"
    }
  ]
}`;
      const user = `Generate 10 trending Indian-finance topics for ${today}. Mix of evergreen + currently trending. Vary categories.`;
      const data = await callAI(system, user, 3000);
      if (!data) return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const raw = stripCodeFence(extractText(data));
      try {
        const parsed = JSON.parse(raw);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "write-article") {
      if (!topic) return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const wl = Math.max(400, Math.min(5000, Number(wordLimit) || 1500));
      const kd = Math.max(0.3, Math.min(5, Number(keywordDensity) || 1.5));
      const kw = primaryKeyword || topic;
      const targetOccurrences = Math.round((wl * kd) / 100);

      const system = `You are India's top financial SEO content writer. You write deeply researched, SEO-optimised, E-E-A-T compliant long-form blog articles for an Indian audience.

NON-NEGOTIABLE RULES:
- Word count: TARGET ${wl} words (acceptable range ${Math.round(wl*0.9)}-${Math.round(wl*1.1)})
- Primary keyword: "${kw}" — must appear approximately ${targetOccurrences} times naturally (keyword density ~${kd}%). Spread it across H1, first 100 words, H2s, body, conclusion. NEVER stuff.
- Use LSI / semantic variants of the keyword throughout
- 100% India-focused: use ₹, NSE/BSE, SEBI, RBI, Indian examples, Indian companies, Indian tax laws, Indian cities
- Today's date: ${today}

STRUCTURE (return as clean HTML, no markdown, no <html>/<body> wrapper):
1. <h1> with primary keyword
2. Hook intro paragraph (under H1) — include primary keyword in first 100 words
3. <h2> Table of Contents (bulleted)
4. 6-9 <h2> sections, each with 2-4 <p> of 4-6 sentences. Use <h3> for sub-points.
5. At least one <table> with relevant data (returns, prices, comparisons, tax slabs etc.)
6. At least one <blockquote> with an expert quote (cite analyst + firm)
7. <h2>Key Takeaways</h2> with <ul><li> bullets (5-7 points)
8. <h2>Frequently Asked Questions</h2> — 5 questions as <h3>Q…</h3> + <p>A…</p>
9. <h2>Conclusion</h2>
10. End with disclaimer: <p><em>Disclaimer: This article is for educational purposes only. InvestingIQ is not a SEBI-registered investment advisor. Consult a qualified advisor before investing.</em></p>

OUTPUT FORMAT — return ONLY this JSON (no code fence):
{
  "title": "SEO title 50-60 chars containing primary keyword",
  "slug": "url-friendly-slug",
  "meta_title": "55-60 chars",
  "meta_description": "150-160 chars compelling, includes primary keyword",
  "excerpt": "120-160 char hook summary",
  "category": "Markets" | "Mutual Funds" | "Real Estate" | "Personal Finance" | "Tax" | "IPO" | "Crypto" | "Economy",
  "tags": ["6-10 relevant tags"],
  "html_content": "FULL HTML article body as described above",
  "word_count": 1500,
  "keyword_occurrences": 22
}`;
      const user = `Write the article.
Topic: ${topic}
Primary keyword: ${kw}
Category hint: ${category || "auto-detect"}
Secondary keywords: ${keywords || "auto-select relevant LSI"}
Target word count: ${wl}
Target keyword density: ${kd}% (~${targetOccurrences} occurrences)`;

      const data = await callAI(system, user, 16000);
      if (!data) return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (data.__error === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const raw = stripCodeFence(extractText(data));
      try {
        const parsed = JSON.parse(raw);
        // compute actual stats
        const plain = String(parsed.html_content || "").replace(/<[^>]+>/g, " ");
        const words = plain.trim().split(/\s+/).filter(Boolean);
        const wc = words.length;
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        const occ = (plain.match(re) || []).length;
        parsed.word_count = wc;
        parsed.keyword_occurrences = occ;
        parsed.actual_density = wc ? +((occ / wc) * 100).toFixed(2) : 0;
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw: raw.slice(0, 2000) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-content-studio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
