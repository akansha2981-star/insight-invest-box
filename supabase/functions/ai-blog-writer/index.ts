import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const actionPrompts: Record<string, { system: string; user: string }> = {
      "generate-draft": {
        system: `You are an expert financial journalist writing for InvestingIQ, a premier Indian financial news platform.
Write engaging, well-researched articles about Indian markets, economy, stocks, and finance.
Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>.
Include relevant data points, expert quotes (attributed), and actionable insights.
Aim for 800-1200 words. Professional tone, no emojis.`,
        user: `Write a full article about: "${topic}"
Category: ${category || "Markets"}
${keywords ? `Key topics to cover: ${keywords}` : ""}
Return the article body in HTML format ready for the editor.`,
      },
      "improve-content": {
        system: `You are a senior editor at a financial news desk. Improve the given article for:
1. Clarity and readability
2. SEO optimization
3. Adding relevant data/statistics
4. Better structure with headers
5. Stronger opening and conclusion
Return improved HTML content.`,
        user: `Improve this article:\n${existingContent}\n\nCategory: ${category || "Markets"}`,
      },
      "generate-outline": {
        system: `You are a financial content strategist. Generate a detailed article outline with:
- Compelling headline options (3)
- Section headers with brief descriptions
- Key data points to include
- Suggested expert sources
- SEO keywords
Return in clean HTML format.`,
        user: `Create an outline for an article about: "${topic}"\nCategory: ${category || "Markets"}\n${keywords ? `Keywords: ${keywords}` : ""}`,
      },
      "suggest-topics": {
        system: `You are an editorial strategist for an Indian financial news platform. Suggest trending, timely article topics based on current market conditions. For each topic provide:
- Headline
- Brief description (2 sentences)
- Category
- Why it's timely
Return as clean HTML with structured formatting.`,
        user: `Suggest 5-7 article topics for the ${category || "Markets"} category.\n${keywords ? `Focus areas: ${keywords}` : "Focus on current Indian market trends."}`,
      },
    };

    const prompts = actionPrompts[action] || actionPrompts["generate-draft"];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: prompts.system },
          { role: "user", content: prompts.user },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error: " + response.status);
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
