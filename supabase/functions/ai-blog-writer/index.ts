import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(systemPrompt: string, userPrompt: string, stream = true): Promise<Response | null> {
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream, max_tokens: 8000 }),
      });
      if (resp.ok) return resp;
      await resp.text().catch(() => {});
    } catch (e) { console.error("Lovable AI error:", e instanceof Error ? e.message : e); }
  }
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 60000);
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream, max_tokens: 8000 }),
        signal: ac.signal,
      });
      clearTimeout(timer);
      if (resp.ok) return resp;
      console.error("OpenAI failed:", resp.status);
      await resp.text().catch(() => {});
    } catch (e) { console.error("OpenAI error:", e instanceof Error ? e.message : e); }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, topic, category, keywords, existingContent } = await req.json();

    const actionPrompts: Record<string, { system: string; user: string }> = {
      "generate-draft": {
        system: `You are an expert financial journalist writing for InvestingIQ, India's premier financial news platform.
Write comprehensive, well-researched, in-depth articles about Indian markets, economy, stocks, and finance.
RULES:
- Write MINIMUM 1200-2000 words. Never write short articles.
- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>, <table>.
- Include at least 5-7 major sections with <h2> headings
- Each paragraph should be 4-6 sentences, detailed and informative
- Include specific data: stock prices in ₹, percentages, index levels, market caps
- Quote at least 2 named analysts/experts with firm names
- Include a "Key Takeaways" bullet list section
- Include a "What Should Investors Do?" advisory section
- Professional, authoritative tone. No emojis. No fluff.
- Current date: ${new Date().toISOString().split('T')[0]}.`,
        user: `Write a COMPREHENSIVE, DETAILED article (minimum 1200 words) about: "${topic}"
Category: ${category || "Markets"}
${keywords ? `Key topics: ${keywords}` : ""}

Structure: Hook intro → Context/Background → Deep Analysis (3-4 sections) → Data Points → Expert Opinions → Key Takeaways → What Should Investors Do → Conclusion

Return the COMPLETE article body in HTML format. Do NOT truncate or abbreviate.`,
      },
      "improve-content": {
        system: `You are a senior editor at a financial news desk. Improve the given article significantly:
- Expand thin sections to be more detailed (minimum 4-6 sentences per paragraph)
- Add specific data points, numbers, percentages
- Improve SEO with keyword-rich headings
- Add expert quotes if missing
- Ensure minimum 1200 words total
- Add "Key Takeaways" section if missing
- Strengthen opening hook and conclusion
Return improved HTML.`,
        user: `Improve and EXPAND this article to be more comprehensive (minimum 1200 words):\n${existingContent}\n\nCategory: ${category || "Markets"}`,
      },
      "generate-outline": {
        system: `You are a financial content strategist. Generate a detailed article outline with headline options (3), section headers (7+), key data points to research, suggested expert sources, SEO keywords (primary + secondary), and internal linking suggestions. Return in HTML.`,
        user: `Create a detailed outline for: "${topic}"\nCategory: ${category || "Markets"}\n${keywords ? `Keywords: ${keywords}` : ""}`,
      },
      "suggest-topics": {
        system: `You are an editorial strategist for an Indian financial news platform. Suggest trending, timely article topics. For each: Compelling Headline, Brief description (2-3 sentences), Category, Why it's timely (market context), Target keywords. Return as clean HTML.`,
        user: `Suggest 5-7 article topics for ${category || "Markets"}.\n${keywords ? `Focus: ${keywords}` : "Focus on current Indian market trends."}\nDate: ${new Date().toISOString().split('T')[0]}`,
      },
    };

    const prompts = actionPrompts[action] || actionPrompts["generate-draft"];
    const response = await callAI(prompts.system, prompts.user);

    if (!response) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI error: " + response.status);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-blog-writer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
