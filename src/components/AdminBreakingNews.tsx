import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Radio, CheckCircle, AlertCircle } from "lucide-react";
import { useAdminAI } from "@/hooks/useAdminAI";
import { AIGeneratePanel } from "./AIGeneratePanel";

interface BreakingNewsItem {
  id: string;
  text: string;
  active: boolean;
}

const SITE_CONFIG_KEY = "breaking_news";

export function AdminBreakingNews() {
  const [items, setItems] = useState<BreakingNewsItem[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { generating, generateContent } = useAdminAI();

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from("site_config").select("value").eq("key", SITE_CONFIG_KEY).maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      setItems((data.value as unknown) as BreakingNewsItem[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  async function saveItems(updated: BreakingNewsItem[]) {
    setSaving(true);
    const { data: existing } = await supabase.from("site_config").select("id").eq("key", SITE_CONFIG_KEY).maybeSingle();
    if (existing) {
      await supabase.from("site_config").update({ value: updated as any }).eq("key", SITE_CONFIG_KEY);
    } else {
      await supabase.from("site_config").insert({ key: SITE_CONFIG_KEY, value: updated as any });
    }
    setItems(updated);
    setSaving(false);
    showToast("Breaking news saved!");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function addItem() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const next = [...items, { id: crypto.randomUUID(), text: trimmed, active: true }];
    setNewText("");
    saveItems(next);
  }

  function deleteItem(id: string) { saveItems(items.filter(i => i.id !== id)); }
  function toggleActive(id: string) { saveItems(items.map(i => i.id === id ? { ...i, active: !i.active } : i)); }
  function updateText(id: string, text: string) { setItems(items.map(i => i.id === id ? { ...i, text } : i)); }
  function saveText(id: string, text: string) { saveItems(items.map(i => i.id === id ? { ...i, text } : i)); }

  async function aiGenerate(topic: string, targetDate: string) {
    const result = await generateContent({ action: "generate-breaking-news", context: { count: 3, topic, target_date: targetDate } });
    if (result?.headlines) {
      const newItems = result.headlines.map((h: any) => ({
        id: crypto.randomUUID(), text: h.text, active: true,
      }));
      saveItems([...items, ...newItems]);
      showToast(`${newItems.length} AI headlines added!`);
    }
  }

  async function aiGenerateAndPost(topic: string, targetDate: string) {
    const result = await generateContent({ action: "generate-breaking-news", context: { count: 5, topic, target_date: targetDate } });
    if (result?.headlines) {
      const newItems = result.headlines.map((h: any) => ({
        id: crypto.randomUUID(), text: h.text, active: true,
      }));
      saveItems(newItems);
      showToast(`${newItems.length} AI headlines published!`);
    }
  }

  const activeCount = items.filter(i => i.active).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-gain text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-fade-in">
          <CheckCircle className="h-4 w-4" /> {toast}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <Radio className="h-4 w-4 text-red-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Breaking News</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground ml-11">Manage headlines shown on the homepage ticker.</p>
      </div>

      <AIGeneratePanel
        label="AI Auto-Generate Breaking News"
        topicPlaceholder="Topic (e.g. SENSEX rally, RBI policy, IT earnings)"
        generating={generating}
        onGenerate={aiGenerate}
        onGenerateAndPublish={aiGenerateAndPost}
        generateLabel="Generate 3 Headlines"
        publishLabel="Auto-Refresh All (AI)"
      />

      {/* Stats */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gain animate-pulse" />
          <span className="text-sm font-bold text-foreground">{activeCount} active</span>
        </div>
        <div className="bg-card border border-border rounded-xl px-3 py-2">
          <span className="text-sm text-muted-foreground">{items.length} total</span>
        </div>
        {saving && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Saving…
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 shadow-sm">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Add New Headline</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-black text-sm">●</span>
            <input
              type="text" value={newText} onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="e.g. SENSEX rises 423 pts" maxLength={120}
              className="w-full border border-border rounded-lg pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary bg-background"
            />
          </div>
          <button onClick={addItem} disabled={!newText.trim() || saving}
            className="flex items-center justify-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <AlertCircle className="h-8 w-8 text-muted-foreground opacity-30 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">No breaking news yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add headlines above or use AI to generate them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id}
              className={`bg-card border rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 shadow-sm transition-opacity ${item.active ? 'border-border' : 'border-border opacity-50'}`}
            >
              <span className="text-[11px] font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
              <span className="text-red-500 text-sm shrink-0">●</span>
              <input value={item.text} onChange={e => updateText(item.id, e.target.value)}
                onBlur={e => saveText(item.id, e.target.value)} maxLength={120}
                className="flex-1 text-sm text-foreground bg-transparent focus:outline-none focus:bg-muted rounded px-1 py-0.5 min-w-0"
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => toggleActive(item.id)}
                  className={`p-1.5 rounded-lg transition-colors ${item.active ? 'text-gain bg-[hsl(var(--gain-light))]' : 'text-muted-foreground hover:bg-muted'}`}>
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteItem(item.id)}
                  className="p-1.5 text-muted-foreground hover:text-loss hover:bg-red-50 rounded-lg transition-colors">
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
