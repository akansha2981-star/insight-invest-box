import { useState } from "react";
import { Sparkles, Loader2, X, ChevronRight, ChevronLeft, CheckCircle2, Zap } from "lucide-react";
import { useAdminAI } from "@/hooks/useAdminAI";
import { useToast } from "@/hooks/use-toast";

const CITIES = ["Mumbai", "Bengaluru", "Gurugram", "Pune", "Noida", "Hyderabad", "Thane", "Chennai", "Navi Mumbai", "Delhi", "Greater Noida", "Ahmedabad", "Kolkata", "Jaipur", "Lucknow", "Chandigarh"];
const STATES = ["Maharashtra", "Karnataka", "Haryana", "Uttar Pradesh", "Tamil Nadu", "Telangana", "Gujarat", "Rajasthan", "West Bengal", "Punjab", "Delhi", "Madhya Pradesh"];
const POPULAR_BUILDERS = ["DLF", "M3M", "Lodha", "Godrej Properties", "Prestige", "Sobha", "Brigade", "Oberoi Realty", "Hiranandani", "Tata Housing", "Mahindra Lifespaces", "Adani Realty", "Piramal Realty", "Raheja", "Signature Global", "Birla Estates", "Shapoorji Pallonji", "Rustomjee", "Kalpataru", "Embassy Group"];
const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "builder_floor", label: "Builder Floor" },
  { value: "penthouse", label: "Penthouse" },
  { value: "independent", label: "Independent House" },
  { value: "plot", label: "Plot / Land" },
  { value: "studio", label: "Studio" },
  { value: "duplex", label: "Duplex" },
  { value: "row_house", label: "Row House" },
];
const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "5+ BHK", "Studio"];
const STAGES = [
  { value: "ready", label: "Ready to Move" },
  { value: "under_construction", label: "Under Construction" },
  { value: "new_launch", label: "New Launch" },
  { value: "pre_launch", label: "Pre-Launch" },
];
const POSITIONING = [
  { value: "luxury", label: "Luxury / Premium" },
  { value: "mid", label: "Mid-Segment" },
  { value: "affordable", label: "Affordable" },
];

export interface BhkConfig {
  bhk: string;
  area_sqft?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  carpet_area_sqft?: number | null;
  price?: number | null;
  price_display?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  num_bathrooms?: number | null;
  balconies?: number | null;
  configuration_notes?: string | null;
  floor_plan_url?: string | null;
}

export interface PropertyDraft {
  title: string;
  slug: string;
  developer_name: string | null;
  developer_website: string | null;
  city: string;
  locality: string | null;
  sector: string | null;
  property_type: string;
  listing_type: string;
  bhk: string | null;
  bhk_min: string | null;
  bhk_max: string | null;
  area_sqft: number | null;
  area_min: number | null;
  area_max: number | null;
  price: number;
  price_display: string | null;
  price_min: number | null;
  price_max: number | null;
  original_price: number | null;
  description: string | null;
  overview: string | null;
  amenities: string[];
  highlights: string[];
  possession_status: string;
  rera_id: string | null;
  total_floors: number | null;
  total_towers: number | null;
  green_area_pct: number | null;
  density: string | null;
  nearest_hospital: string | null;
  nearest_school: string | null;
  nearest_mall: string | null;
  roi_projection: string | null;
  investment_plan: string | null;
  rating: number;
  is_featured: boolean;
  is_price_drop: boolean;
  status: string;
  bhk_configurations: BhkConfig[];
  meta_title: string | null;
  meta_description: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPublish: (draft: PropertyDraft) => Promise<void>;
}

type Step = 0 | 1 | 2 | 3 | 4;

export function AIPropertyWizard({ open, onClose, onPublish }: Props) {
  const { toast } = useToast();
  const { generating, generateContent } = useAdminAI();
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<PropertyDraft | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [form, setForm] = useState({
    property_name: "",
    developer_name: "",
    developer_website: "",
    state: "Haryana",
    city: "Gurugram",
    locality: "",
    property_type: "apartment",
    listing_type: "buy",
    bhk_list: [] as string[],
    stage: "under_construction",
    positioning: "mid",
    budget_hint: "",
    extra_notes: "",
  });

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setDraft(null);
    setForm({
      property_name: "", developer_name: "", developer_website: "",
      state: "Haryana", city: "Gurugram",
      locality: "", property_type: "apartment", listing_type: "buy",
      bhk_list: [], stage: "under_construction", positioning: "mid",
      budget_hint: "", extra_notes: "",
    });
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleBhk = (val: string) => {
    setForm(f => ({
      ...f,
      bhk_list: f.bhk_list.includes(val) ? f.bhk_list.filter(x => x !== val) : [...f.bhk_list, val]
    }));
  };

  const canProceed = (s: Step) => {
    if (s === 0) return form.property_name.trim().length > 1 && form.developer_name.trim().length > 1;
    if (s === 1) return !!form.state && !!form.city;
    if (s === 2) return form.bhk_list.length > 0 || form.property_type === "plot";
    if (s === 3) return true;
    return true;
  };

  const handleGenerate = async () => {
    const bhkStr = form.bhk_list.join(", ");
    const result = await generateContent({
      action: "generate-property",
      context: {
        property_name: form.property_name.trim(),
        developer_name: form.developer_name.trim(),
        developer_website: form.developer_website.trim() || undefined,
        property_type: form.property_type,
        listing_type: form.listing_type,
        city: form.city,
        state: form.state,
        locality: form.locality.trim() || undefined,
        bhk: bhkStr || undefined,
        bhk_options: form.bhk_list,
        possession_stage: form.stage,
        positioning: form.positioning,
        budget_hint: form.budget_hint.trim() || undefined,
        extra_notes: form.extra_notes.trim() || undefined,
      }
    });
    if (!result) return;

    const finalTitle = form.property_name.trim() || result.title;
    const finalBuilder = form.developer_name.trim() || result.developer_name;
    const slug = (result.slug || finalTitle?.toLowerCase().replace(/[^a-z0-9]+/g, "-")) as string;

    const computedBhk = bhkStr || result.bhk || null;
    const sortedBhk = [...form.bhk_list].sort((a, b) => parseInt(a) - parseInt(b));

    setDraft({
      title: finalTitle,
      slug,
      developer_name: finalBuilder,
      developer_website: form.developer_website.trim() || null,
      city: result.city || form.city,
      locality: result.locality || form.locality || null,
      sector: result.sector || null,
      property_type: result.property_type || form.property_type,
      listing_type: result.listing_type || form.listing_type,
      bhk: computedBhk,
      bhk_min: result.bhk_min || sortedBhk[0] || null,
      bhk_max: result.bhk_max || sortedBhk[sortedBhk.length - 1] || null,
      area_sqft: result.area_sqft || null,
      area_min: result.area_min || null,
      area_max: result.area_max || null,
      price: result.price || 0,
      price_display: result.price_display || null,
      price_min: result.price_min || null,
      price_max: result.price_max || null,
      original_price: result.original_price || null,
      description: result.description || null,
      overview: result.overview || null,
      amenities: result.amenities || [],
      highlights: result.highlights || [],
      possession_status: result.possession_status || form.stage,
      rera_id: result.rera_id || null,
      total_floors: result.total_floors || null,
      total_towers: result.total_towers || null,
      green_area_pct: result.green_area_pct || null,
      density: result.density || null,
      nearest_hospital: result.nearest_hospital || null,
      nearest_school: result.nearest_school || null,
      nearest_mall: result.nearest_mall || null,
      roi_projection: result.roi_projection || null,
      investment_plan: result.investment_plan || null,
      rating: result.rating || 4.2,
      is_featured: !!result.is_featured,
      is_price_drop: !!result.is_price_drop,
      status: "active",
      bhk_configurations: Array.isArray(result.bhk_configurations) ? result.bhk_configurations : [],
      meta_title: result.meta_title || null,
      meta_description: result.meta_description || null,
    });
    setStep(4);
  };

  const handlePublish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      await onPublish(draft);
      toast({ title: "Published!", description: `${draft.title} is now live.` });
      handleClose();
    } catch (e: any) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const updateDraft = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => {
    setDraft(d => d ? { ...d, [key]: value } : d);
  };

  const stepTitles = ["Project Identity", "Location", "Configuration", "Positioning & Notes", "Review & Publish"];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-border bg-gradient-to-r from-emerald-50 to-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="font-bold text-foreground">AI Property Wizard</div>
              <div className="text-xs text-muted-foreground">Step {step + 1} of 5 — {stepTitles[step]}</div>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/60 transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-emerald-500" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Property Name *">
                <input value={form.property_name} onChange={e => setForm({ ...form, property_name: e.target.value })}
                  placeholder="e.g. DLF Privana South"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </Field>
              <Field label="Builder / Developer *">
                <input value={form.developer_name} onChange={e => setForm({ ...form, developer_name: e.target.value })}
                  placeholder="e.g. DLF, M3M, Lodha…" list="wizard-builders"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                <datalist id="wizard-builders">
                  {POPULAR_BUILDERS.map(b => <option key={b} value={b} />)}
                </datalist>
              </Field>
              <Field label="Official Developer URL (recommended)">
                <input
                  type="url"
                  value={form.developer_website}
                  onChange={e => setForm({ ...form, developer_website: e.target.value })}
                  placeholder="https://www.dlf.in/projects/privana-south"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Paste the official builder/project page. AI will use ONLY this source — no aggregator (99acres, MagicBricks, etc.).
                </p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Property Type">
                  <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white">
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Listing Type">
                  <select value={form.listing_type} onChange={e => setForm({ ...form, listing_type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white">
                    <option value="buy">Buy</option>
                    <option value="rent">Rent</option>
                    <option value="pg">PG</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="State *">
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white">
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="City *">
                  <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white">
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Locality / Sector (optional)">
                <input value={form.locality} onChange={e => setForm({ ...form, locality: e.target.value })}
                  placeholder="e.g. Sector 77, Sohna Road, Whitefield"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  BHK Configuration {form.property_type !== "plot" && "*"} <span className="text-foreground/60 normal-case font-normal">(select multiple)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BHK_OPTIONS.map(b => {
                    const active = form.bhk_list.includes(b);
                    return (
                      <button key={b} type="button" onClick={() => toggleBhk(b)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                          active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-foreground border-border hover:border-emerald-400"
                        }`}>
                        {active && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />}
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Possession Stage *</div>
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm({ ...form, stage: s.value })}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        form.stage === s.value ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-foreground border-border hover:border-emerald-400"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Market Positioning</div>
                <div className="grid grid-cols-3 gap-2">
                  {POSITIONING.map(p => (
                    <button key={p.value} type="button" onClick={() => setForm({ ...form, positioning: p.value })}
                      className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        form.positioning === p.value ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-foreground border-border hover:border-emerald-400"
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Budget Hint (optional)">
                <input value={form.budget_hint} onChange={e => setForm({ ...form, budget_hint: e.target.value })}
                  placeholder="e.g. ₹2-3 Cr or ₹40k/month"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </Field>
              <Field label="Additional Notes for AI (optional)">
                <textarea value={form.extra_notes} onChange={e => setForm({ ...form, extra_notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. Focus on green amenities, near metro, gated community…"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none" />
              </Field>
            </div>
          )}

          {step === 4 && draft && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-900">Review and edit the AI-generated content. Click <strong>Publish</strong> when ready.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Title">
                  <input value={draft.title} onChange={e => updateDraft("title", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Builder">
                  <input value={draft.developer_name || ""} onChange={e => updateDraft("developer_name", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="City">
                  <input value={draft.city} onChange={e => updateDraft("city", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Locality">
                  <input value={draft.locality || ""} onChange={e => updateDraft("locality", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Sector">
                  <input value={draft.sector || ""} onChange={e => updateDraft("sector", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="BHK">
                  <input value={draft.bhk || ""} onChange={e => updateDraft("bhk", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Price (₹)">
                  <input type="number" value={draft.price} onChange={e => updateDraft("price", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Price Display">
                  <input value={draft.price_display || ""} onChange={e => updateDraft("price_display", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Area (sqft)">
                  <input type="number" value={draft.area_sqft || 0} onChange={e => updateDraft("area_sqft", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Possession">
                  <input value={draft.possession_status} onChange={e => updateDraft("possession_status", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="RERA ID">
                  <input value={draft.rera_id || ""} onChange={e => updateDraft("rera_id", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
              </div>
              <Field label="Description (card text)">
                <textarea value={draft.description || ""} onChange={e => updateDraft("description", e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" />
              </Field>
              <Field label="Overview (long form)">
                <textarea value={draft.overview || ""} onChange={e => updateDraft("overview", e.target.value)}
                  rows={5} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" />
              </Field>
              <Field label="Amenities (comma separated)">
                <textarea value={draft.amenities.join(", ")} onChange={e => updateDraft("amenities", e.target.value.split(",").map(x => x.trim()).filter(Boolean))}
                  rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" />
              </Field>
              <Field label="Highlights (comma separated)">
                <textarea value={draft.highlights.join(", ")} onChange={e => updateDraft("highlights", e.target.value.split(",").map(x => x.trim()).filter(Boolean))}
                  rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Nearest Hospital">
                  <input value={draft.nearest_hospital || ""} onChange={e => updateDraft("nearest_hospital", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Nearest School">
                  <input value={draft.nearest_school || ""} onChange={e => updateDraft("nearest_school", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
                <Field label="Nearest Mall">
                  <input value={draft.nearest_mall || ""} onChange={e => updateDraft("nearest_mall", e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </Field>
              </div>
              <Field label="ROI Projection">
                <textarea value={draft.roi_projection || ""} onChange={e => updateDraft("roi_projection", e.target.value)}
                  rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none" />
              </Field>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.is_featured} onChange={e => updateDraft("is_featured", e.target.checked)} />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={draft.is_price_drop} onChange={e => updateDraft("is_price_drop", e.target.checked)} />
                  Price Drop
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between gap-3 bg-muted/30 rounded-b-2xl">
          {step > 0 && step < 4 && (
            <button onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {step === 4 && (
            <button onClick={() => { setDraft(null); setStep(3); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Regenerate
            </button>
          )}
          <div className="flex-1" />
          {step < 3 && (
            <button disabled={!canProceed(step)} onClick={() => setStep((step + 1) as Step)}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 3 && (
            <button disabled={generating} onClick={handleGenerate}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate Listing"}
            </button>
          )}
          {step === 4 && (
            <button disabled={publishing || !draft} onClick={handlePublish}
              className="flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {publishing ? "Publishing..." : "Publish Live"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}
