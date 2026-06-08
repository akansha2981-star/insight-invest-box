import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function aiJson(prompt: string, system = 'You are an Indian real estate research analyst. Respond ONLY with valid JSON.') {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

async function discoverProperties(opts: {
  count?: number; category?: string; listingType?: string;
  city?: string; state?: string; builder?: string;
}) {
  const count = Math.min(Math.max(opts.count ?? 8, 1), 25);
  const { data: existing } = await admin.from('properties').select('title, city').limit(200);
  const existingNames = (existing ?? []).map((e: any) => `${e.title} (${e.city})`).slice(0, 80);

  const geo = opts.city
    ? `City: ${opts.city}.`
    : opts.state
      ? `State: ${opts.state} (any city within).`
      : 'Search across all of India.';

  const prompt = `Research and suggest ${count} REAL, currently-marketed Indian real estate projects/listings.
Category: ${opts.category || 'Any (mix of Apartment, Plot, Builder Floor, PG, Villa)'}.
Listing intent: ${opts.listingType || 'buy'} (buy | rent | pg).
${geo}
${opts.builder ? `Preferred builder/developer: ${opts.builder}.` : 'Any reputed builder.'}
Avoid duplicates of: ${existingNames.join('; ') || 'none'}.

Return JSON: {"candidates":[{
"title":"project name",
"property_type":"apartment|villa|builder_floor|plot|pg|studio|duplex|row_house|penthouse|independent",
"listing_type":"buy|rent|pg",
"city":"city name",
"locality":"locality / sector",
"developer_name":"builder",
"price_min": number_in_rupees,
"price_max": number_in_rupees,
"bhk":"e.g. 2,3,4 BHK or Plot",
"area_min": number_sqft,
"area_max": number_sqft,
"rera_status":"approved|applied|upcoming|not_required",
"rationale":"1-line why this is notable"
}]}`;

  const result = await aiJson(prompt);
  return { candidates: result.candidates ?? [] };
}

async function seoEnhance(candidate: any) {
  const prompt = `Generate a complete, SEO-optimized Indian real estate listing for:
${JSON.stringify(candidate)}

Apply 70-point SEO best practices: keyword-rich title (<60 chars), meta description (<160 chars), structured overview, amenities, highlights, neighborhood, RERA, ROI, investment thesis.

Return JSON:
{
  "title":"final listing title",
  "slug":"url-slug",
  "meta_title":"SEO title <60ch",
  "meta_description":"SEO desc <160ch",
  "overview":"3-4 paragraph rich overview (plain text, no html)",
  "description":"long-form HTML description with <h2>, <p>, <ul> sections — must include: About, Location Advantages, Amenities, Floor Plans, Investment Outlook, RERA & Legal, FAQ",
  "amenities":["..."],
  "highlights":["..."],
  "nearest_school":"name",
  "nearest_hospital":"name",
  "nearest_mall":"name",
  "sector":"sector/zone",
  "roi_projection":"e.g. 8-12% over 5 yrs with reasoning",
  "investment_plan":"short paragraph",
  "price_display":"₹X.X Cr onwards",
  "green_area_pct": number,
  "total_floors": number,
  "total_towers": number,
  "possession_status":"ready_to_move|under_construction|new_launch"
}`;
  return await aiJson(prompt);
}

async function publishCandidate(payload: any) {
  const slug = payload.slug || slugify(`${payload.title}-${payload.city}`);
  const row: any = {
    title: payload.title,
    slug,
    property_type: payload.property_type || 'apartment',
    listing_type: payload.listing_type || 'buy',
    city: payload.city,
    locality: payload.locality || null,
    developer_name: payload.developer_name || null,
    price: payload.price_min || 0,
    price_min: payload.price_min || 0,
    price_max: payload.price_max || 0,
    price_display: payload.price_display || null,
    bhk: payload.bhk || null,
    area_min: payload.area_min || 0,
    area_max: payload.area_max || 0,
    rera_status: payload.rera_status || 'upcoming',
    meta_title: payload.meta_title || null,
    meta_description: payload.meta_description || null,
    overview: payload.overview || null,
    description: payload.description || null,
    amenities: payload.amenities || [],
    highlights: payload.highlights || [],
    nearest_school: payload.nearest_school || null,
    nearest_hospital: payload.nearest_hospital || null,
    nearest_mall: payload.nearest_mall || null,
    sector: payload.sector || null,
    roi_projection: payload.roi_projection || null,
    investment_plan: payload.investment_plan || null,
    green_area_pct: payload.green_area_pct || 0,
    total_floors: payload.total_floors || null,
    total_towers: payload.total_towers || 0,
    possession_status: payload.possession_status || 'under_construction',
    status: 'active',
  };
  const { data, error } = await admin.from('properties').upsert(row, { onConflict: 'slug' }).select().single();
  if (error) throw error;
  return { id: data.id, slug: data.slug, title: data.title };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body;
    let result: any = {};
    if (action === 'discover') {
      result = await discoverProperties(body);
    } else if (action === 'seo-enhance') {
      result = await seoEnhance(body.candidate);
    } else if (action === 'publish') {
      result = await publishCandidate(body.payload);
    } else {
      throw new Error('Unknown action');
    }
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
