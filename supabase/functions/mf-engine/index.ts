import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function aiJson(prompt: string) {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a SEBI-aware Indian mutual fund analyst. Respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

async function refreshNav() {
  // AMFI public daily NAV feed
  const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
  if (!res.ok) throw new Error('AMFI fetch failed');
  const text = await res.text();
  const map = new Map<string, { nav: number; date: string }>();
  for (const line of text.split('\n')) {
    const parts = line.split(';');
    if (parts.length >= 6 && /^\d+$/.test(parts[0])) {
      const code = parts[0].trim();
      const nav = parseFloat(parts[4]);
      const dt = parts[5]?.trim();
      if (!isNaN(nav) && dt) {
        const [d, mo, y] = dt.split('-');
        const iso = `${y}-${mo}-${d}`;
        map.set(code, { nav, date: iso });
      }
    }
  }
  const { data: funds } = await admin.from('mf_funds').select('id, scheme_code');
  let updated = 0;
  for (const f of funds ?? []) {
    const hit = map.get(f.scheme_code);
    if (hit) {
      await admin.from('mf_funds').update({ nav: hit.nav, nav_date: hit.date }).eq('id', f.id);
      await admin.from('mf_nav_history').upsert({ fund_id: f.id, date: hit.date, nav: hit.nav });
      updated++;
    }
  }
  return { updated, total: funds?.length ?? 0 };
}

async function aiAnalyze(fundId: string) {
  const { data: f } = await admin.from('mf_funds').select('*').eq('id', fundId).single();
  if (!f) throw new Error('Fund not found');
  const result = await aiJson(
    `Analyze this Indian mutual fund and return JSON {summary: string (2-3 sentences), pros: string[5], risks: string[4], verdict: "Conservative"|"Moderate"|"Aggressive"}.
Fund: ${f.scheme_name}
Category: ${f.category} / ${f.sub_category}
AUM: ₹${f.aum_cr} Cr | Expense: ${f.expense_ratio}%
Returns: 1Y ${f.return_1y}%, 3Y ${f.return_3y}%, 5Y ${f.return_5y}%
Risk: Alpha ${f.alpha}, Beta ${f.beta}, Sharpe ${f.sharpe}
Manager: ${f.fund_manager}`
  );
  await admin.from('mf_funds').update({
    ai_summary: result.summary,
    ai_pros: result.pros,
    ai_risks: result.risks,
    ai_verdict: result.verdict,
  }).eq('id', fundId);
  return result;
}

async function generateNews() {
  const result = await aiJson(
    `Generate 3 mutual fund news articles for Indian market (date: ${new Date().toISOString().slice(0,10)}). Return JSON {articles: [{title, slug, summary, content (300 words), category}]}. Categories: Industry, Performance, Regulatory, NFO, Manager.`
  );
  const inserted: any[] = [];
  for (const a of result.articles ?? []) {
    const slug = a.slug || a.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60);
    const { data } = await admin.from('mf_news').upsert({
      title: a.title, slug, summary: a.summary, content: a.content, category: a.category, source: 'AI Generated'
    }, { onConflict: 'slug' }).select().single();
    if (data) inserted.push(data);
  }
  return { count: inserted.length, articles: inserted };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, fundId } = await req.json();
    let result: any = {};
    if (action === 'refresh-nav') result = await refreshNav();
    else if (action === 'ai-analyze') result = await aiAnalyze(fundId);
    else if (action === 'generate-news') result = await generateNews();
    else throw new Error('Unknown action');
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
