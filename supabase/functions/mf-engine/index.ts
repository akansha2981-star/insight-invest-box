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

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function discoverFunds(opts: { count?: number; category?: string; theme?: string }) {
  const count = Math.min(Math.max(opts.count ?? 10, 1), 30);
  const { data: existing } = await admin.from('mf_funds').select('scheme_name');
  const existingNames = (existing ?? []).map((e: any) => e.scheme_name.toLowerCase());

  const prompt = `Suggest ${count} popular Indian mutual funds NOT in this list: ${existingNames.slice(0, 60).join('; ') || 'none'}.
${opts.category ? `Focus on category: ${opts.category}.` : 'Mix across Equity, Debt, Hybrid, ELSS, Index categories.'}
${opts.theme ? `Theme/strategy: ${opts.theme}.` : ''}
Return ONLY real, currently-active SEBI-registered schemes (Direct Growth plans preferred).
Return JSON: {"candidates":[{"scheme_code":"AMFI 6-digit code if known else null","scheme_name":"full name","fund_house":"AMC name","category":"Equity|Debt|Hybrid|ELSS|Index|Other","sub_category":"Large Cap/Mid Cap/etc","risk_level":"Low|Moderate|High|Very High","rationale":"1-sentence reason"}]}`;

  const result = await aiJson(prompt);
  return { candidates: result.candidates ?? [] };
}

async function importFunds(candidates: any[]) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('No candidates provided');

  const navMap = new Map<string, { nav: number; date: string }>();
  try {
    const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
    if (res.ok) {
      const text = await res.text();
      for (const line of text.split('\n')) {
        const parts = line.split(';');
        if (parts.length >= 6 && /^\d+$/.test(parts[0])) {
          const nav = parseFloat(parts[4]);
          const dt = parts[5]?.trim();
          if (!isNaN(nav) && dt) {
            const [d, mo, y] = dt.split('-');
            navMap.set(parts[0].trim(), { nav, date: `${y}-${mo}-${d}` });
          }
        }
      }
    }
  } catch { /* ignore */ }

  const imported: any[] = [];
  const failed: any[] = [];

  for (const c of candidates) {
    try {
      const slug = slugify(c.scheme_name);
      const nav = c.scheme_code ? navMap.get(String(c.scheme_code)) : null;
      const row: any = {
        scheme_code: c.scheme_code ? String(c.scheme_code) : null,
        scheme_name: c.scheme_name,
        slug,
        fund_house: c.fund_house || 'Unknown',
        fund_house_slug: slugify(c.fund_house || 'unknown'),
        category: c.category || 'Equity',
        sub_category: c.sub_category || null,
        risk_level: c.risk_level || 'Moderate',
        is_elss: (c.category || '').toLowerCase().includes('elss'),
        nav: nav?.nav ?? 0,
        nav_date: nav?.date ?? null,
      };
      const { data, error } = await admin.from('mf_funds').upsert(row, { onConflict: 'slug' }).select().single();
      if (error) throw error;
      try { await aiAnalyze(data.id); } catch { /* non-fatal */ }
      imported.push({ id: data.id, scheme_name: data.scheme_name });
    } catch (e: any) {
      failed.push({ scheme_name: c.scheme_name, error: String(e?.message || e) });
    }
  }
  return { imported: imported.length, failed: failed.length, details: { imported, failed } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, fundId, count, category, theme, candidates } = await req.json();
    let result: any = {};
    if (action === 'refresh-nav') result = await refreshNav();
    else if (action === 'ai-analyze') result = await aiAnalyze(fundId);
    else if (action === 'generate-news') result = await generateNews();
    else if (action === 'discover-funds') result = await discoverFunds({ count, category, theme });
    else if (action === 'import-funds') result = await importFunds(candidates);
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
