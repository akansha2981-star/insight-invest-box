import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Megaphone, Image, Upload, Loader2 } from "lucide-react";
import { useAdminAI } from "@/hooks/useAdminAI";
import { AIGeneratePanel } from "./AIGeneratePanel";

interface Banner {
  id: string; title: string; subtitle: string | null; cta_label: string | null;
  cta_url: string | null; bg_color: string; banner_type: string;
  sort_order: number; is_active: boolean; image_url: string | null;
}

const BLANK: Omit<Banner, "id"> = {
  title: "", subtitle: "", cta_label: "", cta_url: "",
  bg_color: "blue", banner_type: "hero", sort_order: 0, is_active: true, image_url: null,
};

const BG_OPTIONS = ["blue", "emerald", "amber", "red", "purple", "slate"];
const TYPE_OPTIONS = [
  { value: "hero", label: "Hero Slide" },
  { value: "announcement", label: "Announcement" },
];
const BG_PREVIEW: Record<string, string> = {
  blue: "bg-blue-600", emerald: "bg-emerald-600", amber: "bg-amber-500",
  red: "bg-red-600", purple: "bg-purple-600", slate: "bg-slate-700",
};

export function AdminHomeBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Banner, "id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"hero" | "announcement">("hero");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { generating, generateContent } = useAdminAI();

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    setLoading(true);
    const { data } = await (supabase as any).from("home_banners").select("*").order("sort_order");
    setBanners(data ?? []);
    setLoading(false);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
    if (error) { alert("Upload failed: " + error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      subtitle: form.subtitle || null, cta_label: form.cta_label || null,
      cta_url: form.cta_url || null, image_url: form.image_url || null,
    };
    if (editing) {
      await (supabase as any).from("home_banners").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("home_banners").insert(payload);
    }
    setSaving(false); setEditing(null); setCreating(false); setForm(BLANK);
    fetchBanners();
  }

  async function toggle(b: Banner) {
    await (supabase as any).from("home_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    fetchBanners();
  }

  async function remove(id: string) {
    if (!confirm("Delete this banner?")) return;
    await (supabase as any).from("home_banners").delete().eq("id", id);
    fetchBanners();
  }

  function startEdit(b: Banner) {
    setEditing(b); setCreating(false);
    setForm({ title: b.title, subtitle: b.subtitle, cta_label: b.cta_label, cta_url: b.cta_url, bg_color: b.bg_color, banner_type: b.banner_type, sort_order: b.sort_order, is_active: b.is_active, image_url: b.image_url });
  }

  async function aiGenerateBanner(topic: string, targetDate: string) {
    const result = await generateContent({ action: "generate-banner", context: { type: activeTab, topic, target_date: targetDate } });
    if (result) {
      setForm(f => ({
        ...f, title: result.title || f.title, subtitle: result.subtitle || f.subtitle,
        cta_label: result.cta_label || f.cta_label, cta_url: result.cta_url || f.cta_url,
        banner_type: activeTab,
      }));
      setCreating(true); setEditing(null);
    }
  }

  async function aiGenerateAndPost(topic: string, targetDate: string) {
    const result = await generateContent({ action: "generate-banner", context: { type: activeTab, topic, target_date: targetDate } });
    if (result) {
      const payload = {
        title: result.title, subtitle: result.subtitle || null,
        cta_label: result.cta_label || null, cta_url: result.cta_url || null,
        bg_color: BG_OPTIONS[Math.floor(Math.random() * BG_OPTIONS.length)],
        banner_type: activeTab, sort_order: banners.length, is_active: true, image_url: null,
      };
      await (supabase as any).from("home_banners").insert(payload);
      fetchBanners();
    }
  }

  const filtered = banners.filter(b => b.banner_type === activeTab);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Homepage Banners</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage hero slides and announcements</p>
        </div>
        <button onClick={() => { setCreating(true); setEditing(null); setForm({ ...BLANK, banner_type: activeTab }); }}
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-card w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      <AIGeneratePanel
        label="AI Auto-Generate Banner"
        topicPlaceholder="Banner topic (e.g. Budget 2026, IPO season, Market rally)"
        generating={generating}
        onGenerate={aiGenerateBanner}
        onGenerateAndPublish={aiGenerateAndPost}
        generateLabel="Generate & Edit"
        publishLabel="Generate & Publish"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-muted p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {TYPE_OPTIONS.map(t => (
          <button key={t.value} onClick={() => setActiveTab(t.value as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex-1 sm:flex-initial justify-center ${activeTab === t.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.value === "hero" ? <Image className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {(creating || editing) && (
        <div className="bg-white border border-border rounded-xl shadow-card p-4 sm:p-6 mb-6">
          <h2 className="font-bold text-foreground mb-4">{editing ? "Edit Banner" : "New Banner"}</h2>
          <div className="grid grid-cols-1 gap-4 mb-4">
            {form.banner_type === "hero" && (
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Banner Image</label>
                <p className="text-[10px] text-muted-foreground mb-1.5">Recommended: 1440 × 400 px · Max 2 MB · JPG/PNG/WebP</p>
                <div className="flex items-start gap-3 flex-wrap">
                  {form.image_url ? (
                    <div className="relative w-40 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => setForm(f => ({ ...f, image_url: null }))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="flex items-center gap-2 border-2 border-dashed border-border rounded-lg px-5 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Uploading…" : "Upload Image"}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); }} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Banner headline..."
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Subtitle</label>
              <input value={form.subtitle ?? ""} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Supporting text..."
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">CTA Label</label>
                <input value={form.cta_label ?? ""} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} placeholder="View Markets"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">CTA URL</label>
                <input value={form.cta_url ?? ""} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} placeholder="/markets"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {BG_OPTIONS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, bg_color: c }))}
                      className={`w-7 h-7 rounded-full ${BG_PREVIEW[c]} transition-all ${form.bg_color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={save} disabled={saving || !form.title}
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex-1 sm:flex-initial">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save Banner"}
            </button>
            <button onClick={() => { setEditing(null); setCreating(false); setForm(BLANK); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-white border border-border rounded-xl text-muted-foreground">
          <p className="font-medium">No {activeTab === "hero" ? "hero slides" : "announcements"} yet</p>
          <p className="text-sm mt-1">Click "Add Banner" or use AI to create one</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(b => (
            <div key={b.id} className={`bg-white border border-border rounded-xl p-3 sm:p-4 shadow-card flex items-start gap-3 ${!b.is_active ? "opacity-50" : ""}`}>
              {b.image_url ? (
                <div className="shrink-0 w-12 h-8 sm:w-16 sm:h-10 rounded-lg overflow-hidden border border-border">
                  <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${BG_PREVIEW[b.bg_color]} flex items-center justify-center`}>
                  {b.banner_type === "hero" ? <Image className="h-3.5 w-3.5 text-white" /> : <Megaphone className="h-3.5 w-3.5 text-white" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground text-sm truncate">{b.title}</div>
                {b.subtitle && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.subtitle}</div>}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                  <span>#{b.sort_order}</span>
                  {b.cta_label && <span>{b.cta_label}</span>}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => toggle(b)} className={`p-1.5 rounded-lg transition-colors ${b.is_active ? "text-gain" : "text-muted-foreground hover:bg-muted"}`}>
                  {b.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => startEdit(b)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(b.id)} className="p-1.5 text-muted-foreground hover:text-loss hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
