import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OPENAI_USAGE_PAUSED } from "../_shared/openaiUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAINonStream(systemPrompt: string, userPrompt: string): Promise<any | null> {
  const OPENAI_KEY = OPENAI_USAGE_PAUSED ? undefined : Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_KEY) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
      });
      if (resp.ok) return await resp.json();
      await resp.text().catch(() => {});
    } catch (e) { console.error("OpenAI error:", e instanceof Error ? e.message : e); }
  }
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], stream: false }),
      });
      if (resp.ok) return await resp.json();
      await resp.text().catch(() => {});
    } catch (e) { console.error("Lovable AI error:", e instanceof Error ? e.message : e); }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, content, category } = await req.json();
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);

    const systemPrompt = `You are an expert financial journalist and SEO specialist for Indian stock markets. Return ONLY valid JSON with no markdown, no code blocks.`;
    const userPrompt = `Article Title: "${title}"\nCategory: ${category}\nContent: ${plainText}\n\nGenerate JSON:\n{"excerpt": "compelling 1-2 sentence summary (80-150 chars)", "meta_description": "SEO meta description (120-155 chars)"}`;

    const data = await callAINonStream(systemPrompt, userPrompt);
    if (!data) {
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = data.choices?.[0]?.message?.content ?? "";
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let parsed: { excerpt: string; meta_description: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned invalid JSON. Try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ excerpt: parsed.excerpt, meta_description: parsed.meta_description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-writing-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
