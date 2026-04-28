import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Edit, Trash2, Building2, TrendingUp, Paintbrush, Shield,
  Save, X, Upload, RefreshCw, Sparkles, Eye, BarChart3, Loader2, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAI } from "@/hooks/useAdminAI";
import { AIPropertyWizard, type PropertyDraft } from "@/components/AIPropertyWizard";

type Tab = "properties" | "services" | "trends" | "interior";

interface Property {
  id: string; title: string; slug: string; property_type: string;
  listing_type: string; city: string; locality: string | null;
  price: number; price_display: string | null; bhk: string | null;
  area_sqft: number | null; amenities: string[] | null;
  description: string | null; developer_name: string | null;
  cover_image_url: string | null; is_featured: boolean | null;
  is_price_drop: boolean | null; original_price: number | null;
  status: string | null; rating: number | null; reviews_count: number | null;
  sector: string | null; nearest_hospital: string | null;
  nearest_school: string | null; nearest_mall: string | null;
  rera_status: string | null; price_min: number | null; price_max: number | null;
  bhk_min: string | null; bhk_max: string | null;
  area_min: number | null; area_max: number | null;
  price_history_detail: any[] | null; total_towers: number | null;
  cover_images: string[] | null; videos: string[] | null;
}

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
  { value: "pg", label: "PG / Paying Guest" },
  { value: "studio", label: "Studio Apartment" },
  { value: "duplex", label: "Duplex" },
  { value: "row_house", label: "Row House" },
];

export function AdminRealEstate() {
  const [tab, setTab] = useState<Tab>("properties");
  const { toast } = useToast();

  const tabs = [
    { id: "properties" as Tab, label: "Properties", icon: Building2 },
    { id: "services" as Tab, label: "Services", icon: Shield },
    { id: "trends" as Tab, label: "Price Trends", icon: TrendingUp },
    { id: "interior" as Tab, label: "Interior Design", icon: Paintbrush },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Real Estate Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage properties, services, trends & interior designs</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-3 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id ? "bg-emerald-600 text-white shadow-md" : "text-muted-foreground hover:bg-muted"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "properties" && <PropertiesAdmin />}
      {tab === "services" && <ServicesAdmin />}
      {tab === "trends" && <TrendsAdmin />}
      {tab === "interior" && <InteriorAdmin />}
    </div>
  );
}

/* ════ Properties Admin ════ */
function PropertiesAdmin() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [editing, setEditing] = useState<Partial<Property> | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchProperties(); }, []);

  async function fetchProperties() {
    const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    setProperties((data ?? []) as any);
    setLoading(false);
  }

  async function publishWizardDraft(draft: PropertyDraft) {
    const { error } = await supabase.from("properties").insert(draft as any);
    if (error) throw error;
    fetchProperties();
  }

  async function saveProperty() {
    if (!editing?.title || !editing?.city) {
      toast({ title: "Error", description: "Title and city are required", variant: "destructive" });
      return;
    }
    const slug = editing.slug || editing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload = { ...editing, slug } as any;
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    if (editing.id) {
      await supabase.from("properties").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("properties").insert(payload);
    }
    toast({ title: "Saved!", description: "Property saved successfully" });
    setEditing(null);
    fetchProperties();
  }

  async function deleteProperty(id: string) {
    if (!confirm("Delete this property?")) return;
    await supabase.from("properties").delete().eq("id", id);
    fetchProperties();
  }

  async function uploadImage(file: File, propertyId?: string) {
    const ext = file.name.split('.').pop();
    const path = `properties/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("real-estate").upload(path, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return null; }
    const { data: { publicUrl } } = supabase.storage.from("real-estate").getPublicUrl(path);
    return publicUrl;
  }

  if (editing) {
    return (
      <PropertyForm
        property={editing}
        onChange={setEditing}
        onSave={saveProperty}
        onCancel={() => setEditing(null)}
        onUpload={uploadImage}
      />
    );
  }

  return (
    <div>
      {/* AI Smart Property Generator */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-200 rounded-2xl p-5 mb-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <span className="text-base font-bold text-emerald-900">AI Smart Property Generator</span>
          </div>
          <button onClick={() => setAiOpen(o => !o)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">
            {aiOpen ? "Hide" : "Open"}
          </button>
        </div>
        <p className="text-xs text-emerald-700/80 mb-4">
          Provide project name, builder & location — AI generates a complete, dated, market-priced listing with overview, amenities, RERA, ROI, nearby landmarks and more.
        </p>

        {aiOpen && (
          <>
            {/* Row 1: Project Name + Builder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Property Name *</label>
                <input value={ai.property_name} onChange={e => setAi({ ...ai, property_name: e.target.value })}
                  placeholder="e.g. DLF Privana South"
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Builder / Developer *</label>
                <input value={ai.developer_name} onChange={e => setAi({ ...ai, developer_name: e.target.value })}
                  placeholder="e.g. DLF, M3M, Lodha…"
                  list="builder-suggestions"
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                <datalist id="builder-suggestions">
                  {POPULAR_BUILDERS.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>

            {/* Row 2: Type + Listing */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Property Type</label>
                <select value={ai.property_type} onChange={e => setAi({ ...ai, property_type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white">
                  {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Listing Type</label>
                <select value={ai.listing_type} onChange={e => setAi({ ...ai, listing_type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white">
                  <option value="buy">Buy</option>
                  <option value="rent">Rent</option>
                  <option value="pg">PG / Paying Guest</option>
                </select>
              </div>
            </div>

            {/* Row 3: City + State + Locality */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">City</label>
                <select value={ai.city} onChange={e => setAi({ ...ai, city: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white">
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">State</label>
                <select value={ai.state} onChange={e => setAi({ ...ai, state: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white">
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Locality / Sector</label>
                <input value={ai.locality} onChange={e => setAi({ ...ai, locality: e.target.value })}
                  placeholder="e.g. Sector 77, Sohna Road"
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white" />
              </div>
            </div>

            {/* Row 4: Optional details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Configuration (optional)</label>
                <input value={ai.bhk} onChange={e => setAi({ ...ai, bhk: e.target.value })}
                  placeholder="e.g. 3 BHK or 2-4 BHK"
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Budget Hint (optional)</label>
                <input value={ai.budget_hint} onChange={e => setAi({ ...ai, budget_hint: e.target.value })}
                  placeholder="e.g. ₹2-3 Cr or ₹40k/month"
                  className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Additional Notes for AI (optional)</label>
              <textarea value={ai.extra_notes} onChange={e => setAi({ ...ai, extra_notes: e.target.value })}
                rows={2}
                placeholder="e.g. Luxury positioning, focus on green amenities, near metro station…"
                className="w-full mt-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white resize-none" />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => aiGenerateProperty(false)} disabled={generating}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-1">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate & Edit
              </button>
              <button onClick={() => aiGenerateProperty(true)} disabled={generating}
                className="flex items-center justify-center gap-2 bg-emerald-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-900 disabled:opacity-50 transition-colors flex-1">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Generate & Publish Live
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{properties.length} properties</p>
        <button onClick={() => setEditing({ listing_type: "buy", property_type: "apartment", city: "Mumbai", status: "active" })}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Property
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>No properties yet. Add your first listing!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  {["Property", "City", "Type", "Price", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.bhk} · {p.area_sqft?.toLocaleString()} sqft</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.city}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{p.listing_type}</span>
                    </td>
                    <td className="px-4 py-3 number-font font-bold">{p.price_display || `₹${p.price.toLocaleString()}`}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(p)} className="p-1.5 hover:bg-primary/10 rounded-lg" title="Edit"><Edit className="h-3.5 w-3.5 text-primary" /></button>
                        <button onClick={() => deleteProperty(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {properties.map(p => (
              <div key={p.id} className="bg-white border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.city} · {p.bhk} · {p.area_sqft?.toLocaleString()} sqft</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ml-2 shrink-0 ${p.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="number-font font-bold text-foreground">{p.price_display || `₹${p.price.toLocaleString()}`}</span>
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{p.listing_type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors">
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => deleteProperty(p.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyForm({ property, onChange, onSave, onCancel, onUpload }: {
  property: Partial<Property>;
  onChange: (p: Partial<Property>) => void;
  onSave: () => void;
  onCancel: () => void;
  onUpload: (f: File) => Promise<string | null>;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUpload(file);
    if (url) onChange({ ...property, cover_image_url: url });
    setUploading(false);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">{property.id ? "Edit Property" : "Add Property"}</h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-xl">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Title *</label>
            <input value={property.title || ""} onChange={e => onChange({ ...property, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Developer</label>
            <input value={property.developer_name || ""} onChange={e => onChange({ ...property, developer_name: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">City *</label>
            <select value={property.city || ""} onChange={e => onChange({ ...property, city: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Locality</label>
            <input value={property.locality || ""} onChange={e => onChange({ ...property, locality: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Type</label>
            <select value={property.listing_type || "buy"} onChange={e => onChange({ ...property, listing_type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
              <option value="pg">PG / Paying Guest</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Price (₹)</label>
            <input type="number" value={property.price || 0} onChange={e => onChange({ ...property, price: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Display Price</label>
            <input value={property.price_display || ""} onChange={e => onChange({ ...property, price_display: e.target.value })}
              placeholder="e.g. ₹1.5 Cr" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">BHK</label>
            <select value={property.bhk || ""} onChange={e => onChange({ ...property, bhk: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="">Select</option>
              <option value="1 BHK">1 BHK</option>
              <option value="2 BHK">2 BHK</option>
              <option value="3 BHK">3 BHK</option>
              <option value="4+ BHK">4+ BHK</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Area (sqft)</label>
            <input type="number" value={property.area_sqft || ""} onChange={e => onChange({ ...property, area_sqft: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Property Type</label>
            <select value={property.property_type || "apartment"} onChange={e => onChange({ ...property, property_type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="penthouse">Penthouse</option>
              <option value="builder_floor">Builder Floor</option>
              <option value="independent">Independent House</option>
              <option value="studio">Studio</option>
              <option value="pg">PG Room</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Status</label>
            <select value={property.status || "active"} onChange={e => onChange({ ...property, status: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="sold">Sold</option>
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={property.is_featured || false} onChange={e => onChange({ ...property, is_featured: e.target.checked })}
                className="rounded" />
              <span className="text-sm">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={property.is_price_drop || false} onChange={e => onChange({ ...property, is_price_drop: e.target.checked })}
                className="rounded" />
              <span className="text-sm">Price Drop</span>
            </label>
          </div>
        </div>

        {property.is_price_drop && (
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Original Price (₹)</label>
            <input type="number" value={property.original_price || ""} onChange={e => onChange({ ...property, original_price: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Description</label>
          <textarea value={property.description || ""} onChange={e => onChange({ ...property, description: e.target.value })}
            rows={3} className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Detailed Overview</label>
          <textarea value={(property as any).overview || ""} onChange={e => onChange({ ...property, overview: e.target.value } as any)}
            rows={4} placeholder="Detailed property overview for the detail page" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Investment Plan</label>
            <textarea value={(property as any).investment_plan || ""} onChange={e => onChange({ ...property, investment_plan: e.target.value } as any)}
              rows={3} placeholder="Payment plan, EMI options, etc." className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">ROI Projection</label>
            <textarea value={(property as any).roi_projection || ""} onChange={e => onChange({ ...property, roi_projection: e.target.value } as any)}
              rows={3} placeholder="Expected returns, appreciation data" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Floors</label>
            <input type="number" value={(property as any).total_floors || ""} onChange={e => onChange({ ...property, total_floors: Number(e.target.value) } as any)}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Green Area %</label>
            <input type="number" step="0.1" value={(property as any).green_area_pct || ""} onChange={e => onChange({ ...property, green_area_pct: Number(e.target.value) } as any)}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Density</label>
            <input value={(property as any).density || ""} onChange={e => onChange({ ...property, density: e.target.value } as any)}
              placeholder="e.g. Low, Medium" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">RERA ID</label>
            <input value={(property as any).rera_id || ""} onChange={e => onChange({ ...property, rera_id: e.target.value } as any)}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Possession Status</label>
            <select value={(property as any).possession_status || "under_construction"} onChange={e => onChange({ ...property, possession_status: e.target.value } as any)}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="ready">Ready to Move</option>
              <option value="under_construction">Under Construction</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sector</label>
            <input value={(property as any).sector || ""} onChange={e => onChange({ ...property, sector: e.target.value } as any)}
              placeholder="e.g. Sector 150, Zone A" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>

        {/* RERA Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">RERA Status</label>
            <select value={(property as any).rera_status || "upcoming"} onChange={e => onChange({ ...property, rera_status: e.target.value } as any)}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="rera_applied">RERA Applied</option>
              <option value="upcoming">Upcoming</option>
              <option value="under_construction">Under Construction</option>
              <option value="pre_launch">Pre Launch</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Towers</label>
            <input type="number" value={(property as any).total_towers || ""} onChange={e => onChange({ ...property, total_towers: Number(e.target.value) } as any)}
              className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
        </div>

        {/* Nearest Landmarks */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-3">📍 Nearest Landmarks</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Hospital</label>
              <input value={(property as any).nearest_hospital || ""} onChange={e => onChange({ ...property, nearest_hospital: e.target.value } as any)}
                placeholder="e.g. Max Hospital – 1.2 km" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">School</label>
              <input value={(property as any).nearest_school || ""} onChange={e => onChange({ ...property, nearest_school: e.target.value } as any)}
                placeholder="e.g. DPS – 0.8 km" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mall</label>
              <input value={(property as any).nearest_mall || ""} onChange={e => onChange({ ...property, nearest_mall: e.target.value } as any)}
                placeholder="e.g. DLF Mall – 2 km" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Price / BHK / Area Ranges */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3">📊 Configuration Ranges</h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Price Min (₹)</label>
              <input type="number" value={(property as any).price_min || ""} onChange={e => onChange({ ...property, price_min: Number(e.target.value) } as any)}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Price Starting (₹)</label>
              <input type="number" value={property.price || 0} onChange={e => onChange({ ...property, price: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Price Max (₹)</label>
              <input type="number" value={(property as any).price_max || ""} onChange={e => onChange({ ...property, price_max: Number(e.target.value) } as any)}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">BHK Min</label>
              <select value={(property as any).bhk_min || ""} onChange={e => onChange({ ...property, bhk_min: e.target.value } as any)}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Select</option>
                {["1 BHK","2 BHK","3 BHK","4 BHK","5 BHK"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">BHK Starting</label>
              <select value={property.bhk || ""} onChange={e => onChange({ ...property, bhk: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Select</option>
                {["1 BHK","2 BHK","3 BHK","4 BHK","5 BHK"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">BHK Max</label>
              <select value={(property as any).bhk_max || ""} onChange={e => onChange({ ...property, bhk_max: e.target.value } as any)}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Select</option>
                {["1 BHK","2 BHK","3 BHK","4 BHK","5 BHK"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Area Min (sqft)</label>
              <input type="number" value={(property as any).area_min || ""} onChange={e => onChange({ ...property, area_min: Number(e.target.value) } as any)}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Area Starting (sqft)</label>
              <input type="number" value={property.area_sqft || ""} onChange={e => onChange({ ...property, area_sqft: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Area Max (sqft)</label>
              <input type="number" value={(property as any).area_max || ""} onChange={e => onChange({ ...property, area_max: Number(e.target.value) } as any)}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Price History Detail */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">📈 Price History (Pre-launch → Current)</h3>
          <p className="text-xs text-muted-foreground mb-3">Add price milestones from pre-launch to current date</p>
          <PriceHistoryEditor
            entries={(property as any).price_history_detail || []}
            onChange={entries => onChange({ ...property, price_history_detail: entries } as any)}
          />
        </div>

        {/* Multiple Cover Images */}
        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-1">🖼️ Cover Images (Multiple)</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Recommended: 800 × 600 px per image · Max 2 MB each · JPG/PNG/WebP</p>
          <MultiImageUploader
            images={(property as any).cover_images || []}
            onChange={imgs => onChange({ ...property, cover_images: imgs } as any)}
            onUpload={onUpload}
          />
        </div>

        {/* Multiple Videos */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4">
          <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wide mb-3">🎥 Videos (Multiple)</h3>
          <MultiUrlEditor
            urls={(property as any).videos || []}
            onChange={urls => onChange({ ...property, videos: urls } as any)}
            placeholder="YouTube or video link"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Highlights (comma separated)</label>
          <input value={((property as any).highlights || []).join(", ")} onChange={e => onChange({ ...property, highlights: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) } as any)}
            placeholder="Near metro, Vastu compliant, Gated community" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amenities (comma separated)</label>
          <input value={(property.amenities || []).join(", ")} onChange={e => onChange({ ...property, amenities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
            placeholder="Swimming Pool, Gym, Parking, Clubhouse" className="w-full mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Legacy Cover Image</label>
          <p className="text-[10px] text-muted-foreground">Recommended: 800 × 600 px · Max 2 MB · JPG/PNG/WebP</p>
          <div className="mt-1 flex items-center gap-4">
            {property.cover_image_url && (
              <img src={property.cover_image_url} alt="" className="w-24 h-16 object-cover rounded-lg border" />
            )}
            <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm cursor-pointer hover:bg-muted">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload"}
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Rating</label>
          <input type="number" step="0.1" min="0" max="5" value={property.rating || 0}
            onChange={e => onChange({ ...property, rating: Number(e.target.value) })}
            className="w-32 mt-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
        </div>
      </div>
    </div>
  );
}

/* ════ Reusable Sub-Components ════ */
function PriceHistoryEditor({ entries, onChange }: { entries: any[]; onChange: (e: any[]) => void }) {
  function addEntry() {
    onChange([...entries, { date: "", label: "", price: 0, note: "" }]);
  }
  function updateEntry(i: number, field: string, val: any) {
    const copy = [...entries];
    copy[i] = { ...copy[i], [field]: val };
    onChange(copy);
  }
  function removeEntry(i: number) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-[10px] text-muted-foreground">Date</label>
            <input type="date" value={e.date || ""} onChange={ev => updateEntry(i, "date", ev.target.value)}
              className="w-full px-2 py-1.5 border border-border rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Label</label>
            <input value={e.label || ""} onChange={ev => updateEntry(i, "label", ev.target.value)}
              placeholder="Pre-launch / Launch / Current" className="w-full px-2 py-1.5 border border-border rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Price (₹)</label>
            <input type="number" value={e.price || ""} onChange={ev => updateEntry(i, "price", Number(ev.target.value))}
              className="w-full px-2 py-1.5 border border-border rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Note</label>
            <input value={e.note || ""} onChange={ev => updateEntry(i, "note", ev.target.value)}
              placeholder="Optional detail" className="w-full px-2 py-1.5 border border-border rounded-lg text-xs" />
          </div>
          <button onClick={() => removeEntry(i)} className="p-1.5 hover:bg-red-50 rounded-lg mb-0.5">
            <X className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      ))}
      <button onClick={addEntry} className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold hover:underline mt-1">
        <Plus className="h-3 w-3" /> Add Price Milestone
      </button>
    </div>
  );
}

function MultiImageUploader({ images, onChange, onUpload }: { images: string[]; onChange: (imgs: string[]) => void; onUpload: (f: File) => Promise<string | null> }) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const newImages = [...images];
    for (const file of files) {
      const url = await onUpload(file);
      if (url) newImages.push(url);
    }
    onChange(newImages);
    setUploading(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {images.map((img, i) => (
          <div key={i} className="relative group">
            <img src={img} alt="" className="w-24 h-16 object-cover rounded-lg border" />
            <button onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm cursor-pointer hover:bg-muted w-fit">
        <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Images"}
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      </label>
    </div>
  );
}

function MultiUrlEditor({ urls, onChange, placeholder }: { urls: string[]; onChange: (u: string[]) => void; placeholder: string }) {
  function add() { onChange([...urls, ""]); }
  function update(i: number, val: string) {
    const copy = [...urls]; copy[i] = val; onChange(copy);
  }
  function remove(i: number) { onChange(urls.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-2">
      {urls.map((u, i) => (
        <div key={i} className="flex gap-2">
          <input value={u} onChange={e => update(i, e.target.value)}
            placeholder={placeholder} className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none" />
          <button onClick={() => remove(i)} className="p-2 hover:bg-red-50 rounded-lg"><X className="h-3.5 w-3.5 text-red-500" /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold hover:underline mt-1">
        <Plus className="h-3 w-3" /> Add Video URL
      </button>
    </div>
  );
}

/* ════ Services Admin ════ */
function ServicesAdmin() {
  const [services, setServices] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    const { data } = await supabase.from("re_services").select("*").order("sort_order");
    setServices(data ?? []);
  }

  async function save() {
    if (!editing?.title) return;
    const payload = { title: editing.title, description: editing.description, icon_name: editing.icon_name, sort_order: editing.sort_order || 0, is_active: editing.is_active ?? true };
    if (editing.id) {
      await supabase.from("re_services").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("re_services").insert(payload);
    }
    toast({ title: "Saved!" });
    setEditing(null);
    fetch();
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("re_services").delete().eq("id", id);
    fetch();
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">{services.length} services</p>
        <button onClick={() => setEditing({ icon_name: "Home", is_active: true })}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Add Service
        </button>
      </div>

      {editing && (
        <div className="bg-white border border-border rounded-xl p-5 mb-4 max-w-xl">
          <div className="space-y-3">
            <input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })}
              placeholder="Service title" className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description" rows={2} className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <input value={editing.icon_name || ""} onChange={e => setEditing({ ...editing, icon_name: e.target.value })}
              placeholder="Icon name (Home, Shield, etc.)" className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <div className="flex gap-2">
              <button onClick={save} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Save className="h-4 w-4 inline mr-1" />Save</button>
              <button onClick={() => setEditing(null)} className="text-muted-foreground px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-white border border-border rounded-xl px-4 py-3">
            <div>
              <div className="font-semibold text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-muted rounded-lg"><Edit className="h-3.5 w-3.5" /></button>
              <button onClick={() => del(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ Price Trends Admin (with AI) ════ */
function TrendsAdmin() {
  const [trends, setTrends] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchTrends(); }, []);

  async function fetchTrends() {
    const { data } = await supabase.from("re_price_trends").select("*").order("city");
    setTrends(data ?? []);
  }

  async function save() {
    if (!editing?.city) return;
    const payload = {
      city: editing.city, locality: editing.locality, avg_price_sqft: editing.avg_price_sqft || 0,
      change_pct: editing.change_pct || 0, ai_insights: editing.ai_insights, period: editing.period || "monthly"
    };
    if (editing.id) {
      await supabase.from("re_price_trends").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("re_price_trends").insert(payload);
    }
    toast({ title: "Saved!" });
    setEditing(null);
    fetchTrends();
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("re_price_trends").delete().eq("id", id);
    fetchTrends();
  }

  async function refreshWithAI() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("re-price-trends-ai", {
        body: { cities: CITIES.slice(0, 8) }
      });
      if (error) throw error;
      toast({ title: "AI Refresh Complete", description: `Updated trends for ${data?.updated || 0} cities` });
      fetchTrends();
    } catch (e: any) {
      toast({ title: "AI Refresh Failed", description: e.message, variant: "destructive" });
    }
    setRefreshing(false);
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">{trends.length} city trends</p>
        <div className="flex gap-2">
          <button onClick={refreshWithAI} disabled={refreshing}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {refreshing ? "Refreshing..." : "AI Refresh"}
          </button>
          <button onClick={() => setEditing({ period: "monthly" })}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Add Trend
          </button>
        </div>
      </div>

      {editing && (
        <div className="bg-white border border-border rounded-xl p-5 mb-4 max-w-xl">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={editing.city || ""} onChange={e => setEditing({ ...editing, city: e.target.value })}
                className="px-3 py-2 border border-border rounded-xl text-sm">
                <option value="">Select City</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={editing.locality || ""} onChange={e => setEditing({ ...editing, locality: e.target.value })}
                placeholder="Locality" className="px-3 py-2 border border-border rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={editing.avg_price_sqft || ""} onChange={e => setEditing({ ...editing, avg_price_sqft: Number(e.target.value) })}
                placeholder="Avg price/sqft" className="px-3 py-2 border border-border rounded-xl text-sm" />
              <input type="number" step="0.1" value={editing.change_pct || ""} onChange={e => setEditing({ ...editing, change_pct: Number(e.target.value) })}
                placeholder="Change %" className="px-3 py-2 border border-border rounded-xl text-sm" />
            </div>
            <textarea value={editing.ai_insights || ""} onChange={e => setEditing({ ...editing, ai_insights: e.target.value })}
              placeholder="AI Insights" rows={2} className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <div className="flex gap-2">
              <button onClick={save} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Save className="h-4 w-4 inline mr-1" />Save</button>
              <button onClick={() => setEditing(null)} className="text-muted-foreground px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {trends.map(t => (
          <div key={t.id} className="bg-white border border-border rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-foreground">{t.city}</div>
                <div className="text-xs text-muted-foreground">{t.locality}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(t)} className="p-1 hover:bg-muted rounded"><Edit className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(t.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
              </div>
            </div>
            <div className="number-font text-xl font-bold">₹{(t.avg_price_sqft || 0).toLocaleString()}/sqft</div>
            <div className={`text-sm font-bold ${(t.change_pct || 0) >= 0 ? "text-gain" : "text-loss"}`}>
              {(t.change_pct || 0) >= 0 ? "+" : ""}{t.change_pct}%
            </div>
            {t.ai_insights && <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1"><Sparkles className="h-3 w-3 shrink-0 text-amber-500 mt-0.5" />{t.ai_insights}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ Interior Design Admin ════ */
function InteriorAdmin() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchDesigns(); }, []);

  async function fetchDesigns() {
    const { data } = await supabase.from("re_interior_designs").select("*").order("sort_order");
    setDesigns(data ?? []);
  }

  async function save() {
    if (!editing?.title) return;
    const payload = { title: editing.title, description: editing.description, category: editing.category || "Living Room", is_active: true, sort_order: editing.sort_order || 0, cover_image_url: editing.cover_image_url };
    if (editing.id) {
      await supabase.from("re_interior_designs").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("re_interior_designs").insert(payload);
    }
    toast({ title: "Saved!" });
    setEditing(null);
    fetchDesigns();
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("re_interior_designs").delete().eq("id", id);
    fetchDesigns();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `interior/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("real-estate").upload(path, file);
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("real-estate").getPublicUrl(path);
    setEditing({ ...editing, cover_image_url: publicUrl });
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">{designs.length} designs</p>
        <button onClick={() => setEditing({ category: "Living Room" })}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Add Design
        </button>
      </div>

      {editing && (
        <div className="bg-white border border-border rounded-xl p-5 mb-4 max-w-xl">
          <div className="space-y-3">
            <input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })}
              placeholder="Title" className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description" rows={2} className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <select value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm">
              {["Living Room", "Kitchen", "Bedroom", "Bathroom", "Balcony", "Office"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              {editing.cover_image_url && <img src={editing.cover_image_url} alt="" className="w-20 h-14 object-cover rounded-lg border" />}
              <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4" /> Upload Image
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"><Save className="h-4 w-4 inline mr-1" />Save</button>
              <button onClick={() => setEditing(null)} className="text-muted-foreground px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {designs.map(d => (
          <div key={d.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
              {d.cover_image_url ? <img src={d.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Paintbrush className="h-8 w-8 text-emerald-300" />}
            </div>
            <div className="p-3 flex justify-between items-start">
              <div>
                <div className="font-semibold text-sm">{d.title}</div>
                <div className="text-xs text-muted-foreground">{d.category}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(d)} className="p-1 hover:bg-muted rounded"><Edit className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(d.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
