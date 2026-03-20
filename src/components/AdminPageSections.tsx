import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X } from "lucide-react";

interface PageSection {
  id: string;
  page_key: string;
  title: string;
  content: string;
  section_type: string;
  sort_order: number;
  is_visible: boolean;
}

const PAGE_OPTIONS = [
  { key: "markets", label: "Markets" },
  { key: "stocks", label: "Stocks" },
  { key: "economy", label: "Economy" },
  { key: "mf", label: "MF & ETFs" },
  { key: "crypto", label: "Crypto" },
  { key: "portfolio", label: "Portfolio" },
  { key: "about", label: "About Us" },
  { key: "careers", label: "Careers" },
  { key: "contact", label: "Contact Us" },
  { key: "privacy", label: "Privacy Policy" },
  { key: "terms", label: "Terms of Use" },
];

const BLANK: Omit<PageSection, "id"> = {
  page_key: "markets",
  title: "",
  content: "",
  section_type: "banner",
  sort_order: 0,
  is_visible: true,
};

export function AdminPageSections() {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PageSection | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<PageSection, "id">>(BLANK);
  const [selectedPage, setSelectedPage] = useState("markets");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSections(); }, []);

  async function fetchSections() {
    setLoading(true);
    const { data } = await supabase
      .from("page_sections")
      .select("*")
      .order("page_key")
      .order("sort_order");
    setSections(data ?? []);
    setLoading(false);
  }

  async function saveSection() {
    setSaving(true);
    if (editing) {
      await supabase.from("page_sections").update(form).eq("id", editing.id);
    } else {
      await supabase.from("page_sections").insert(form);
    }
    setSaving(false);
    setEditing(null);
    setCreating(false);
    setForm(BLANK);
    fetchSections();
  }

  async function deleteSection(id: string) {
    if (!confirm("Delete this section?")) return;
    await supabase.from("page_sections").delete().eq("id", id);
    fetchSections();
  }

  async function toggleVisibility(section: PageSection) {
    await supabase.from("page_sections").update({ is_visible: !section.is_visible }).eq("id", section.id);
    fetchSections();
  }

  function startEdit(section: PageSection) {
    setEditing(section);
    setCreating(false);
    setForm({
      page_key: section.page_key,
      title: section.title,
      content: section.content,
      section_type: section.section_type,
      sort_order: section.sort_order,
      is_visible: section.is_visible,
    });
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ ...BLANK, page_key: selectedPage });
  }

  function cancelForm() {
    setEditing(null);
    setCreating(false);
    setForm(BLANK);
  }

  const filteredSections = sections.filter(s => s.page_key === selectedPage);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Page Content Sections</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage editable banners and text blocks shown on each section page</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-card"
        >
          <Plus className="h-4 w-4" /> Add Section
        </button>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-xl w-fit">
        {PAGE_OPTIONS.map((p) => (
          <button
            key={p.key}
            onClick={() => setSelectedPage(p.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              selectedPage === p.key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {(creating || editing) && (
        <div className="bg-white border border-border rounded-xl shadow-card p-6 mb-6">
          <h2 className="font-bold text-foreground mb-4">{editing ? "Edit Section" : "New Section"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Page</label>
              <select
                value={form.page_key}
                onChange={e => setForm(f => ({ ...f, page_key: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                {PAGE_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Type</label>
              <select
                value={form.section_type}
                onChange={e => setForm(f => ({ ...f, section_type: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="banner">Banner (Blue)</option>
                <option value="alert">Alert (Amber)</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Section title..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Section content text..."
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveSection}
              disabled={saving || !form.title}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Section"}
            </button>
            <button onClick={cancelForm} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sections list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-xl text-muted-foreground">
          <p className="font-medium">No sections for this page yet</p>
          <p className="text-sm mt-1">Click "Add Section" to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSections.map((section) => (
            <div
              key={section.id}
              className={`bg-white border border-border rounded-xl p-5 shadow-card flex items-start gap-4 ${!section.is_visible ? "opacity-50" : ""}`}
            >
              <div className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded border ${
                section.section_type === "alert" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-primary/8 text-primary border-primary/20"
              }`}>
                {section.section_type.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground">{section.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{section.content}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Order: {section.sort_order}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleVisibility(section)}
                  className={`p-1.5 rounded-lg transition-colors ${section.is_visible ? "text-gain hover:bg-[hsl(var(--gain-light))]" : "text-muted-foreground hover:bg-muted"}`}
                  title={section.is_visible ? "Hide" : "Show"}
                >
                  {section.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => startEdit(section)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteSection(section.id)} className="p-1.5 text-muted-foreground hover:text-loss hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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
