import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Eye, EyeOff, Clock, Send, Tag, User, Hash, FileText, Search, ListOrdered, UploadCloud, Trash2, Sparkles, Loader2, AlertCircle, Brain, PenTool, ListChecks, Lightbulb, Zap } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { useAdminAI } from "@/hooks/useAdminAI";

interface BlogPost {
  id: string; title: string; slug: string; status: string;
  category: string | null; published_at: string | null;
  author_name: string | null; content: string;
  excerpt: string | null; cover_image_url: string | null; tags: string[] | null;
  meta_title?: string | null; meta_description?: string | null; sequence_number?: number | null;
}

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: () => void;
  onCancel: () => void;
}

const CATEGORIES = ["Markets", "Economy", "Stocks", "Commodities", "IPO", "Budget", "Companies", "Global", "Crypto"];

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function getTodayInIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function toPublishISOString(dateString: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(`${dateString}T12:00:00+05:30`).toISOString()
    : new Date().toISOString();
}

function stripCodeFences(value: string) {
  return value.replace(/^```(?:html|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function SideLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
      <Icon className="h-3.5 w-3.5" /> {children}
    </label>
  );
}

function SideInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
    />
  );
}

function SideTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none"
    />
  );
}

export function BlogEditor({ post, onSave, onCancel }: BlogEditorProps) {
  const [title,           setTitle]           = useState(post?.title ?? "");
  const [slug,            setSlug]            = useState(post?.slug ?? "");
  const [content,         setContent]         = useState(post?.content ?? "");
  const [excerpt,         setExcerpt]         = useState(post?.excerpt ?? "");
  const [category,        setCategory]        = useState(post?.category ?? "Markets");
  const [authorName,      setAuthorName]      = useState(post?.author_name ?? "Editorial Team");
  const [coverImageUrl,   setCoverImageUrl]   = useState(post?.cover_image_url ?? "");
  const [tags,            setTags]            = useState(post?.tags?.join(", ") ?? "");
  const [status,          setStatus]          = useState(post?.status ?? "draft");
  const [metaTitle,       setMetaTitle]       = useState(post?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");
  const [sequenceNumber,  setSequenceNumber]  = useState<number>(post?.sequence_number ?? 0);
  const [saving,          setSaving]          = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [aiLoading,       setAiLoading]       = useState(false);
  const [aiToast,         setAiToast]         = useState("");
  const [error,           setError]           = useState("");
  const [preview,         setPreview]         = useState(false);
  const [aiWriterOpen,    setAiWriterOpen]    = useState(false);
  const [aiWriterStream,  setAiWriterStream]  = useState("");
  const [aiWriterLoading, setAiWriterLoading] = useState(false);
  const [aiWriterAction,  setAiWriterAction]  = useState<string | null>(null);
  const [aiTopic,         setAiTopic]         = useState("");
  const [aiTargetDate,    setAiTargetDate]    = useState(getTodayInIST());
  const coverInputRef = useRef<HTMLInputElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const { generating, generateContent } = useAdminAI();

  // AI Auto-Generate Full Article
  async function aiAutoGenerate(publishNow = false) {
    const result = await generateContent({ 
      action: "generate-full-article", 
      context: { topic: aiTopic || title || "", category, target_date: aiTargetDate } 
    });
    if (result) {
      const generatedTitle = result.title || aiTopic || title || "";
      const normalizedContent = stripCodeFences(result.content || "");
      setTitle(generatedTitle);
      setSlug(result.slug || generateSlug(generatedTitle));
      setContent(normalizedContent);
      setExcerpt(result.excerpt || "");
      setCategory(result.category || category);
      setTags(Array.isArray(result.tags) ? result.tags.join(", ") : (result.tags || ""));
      setMetaTitle(result.meta_title || "");
      setMetaDescription(result.meta_description || "");
      setAuthorName(result.author_name || "Editorial Team");
      setAiToast("AI generated full article!");
      setTimeout(() => setAiToast(""), 4000);

      if (publishNow) {
        // Save and publish directly
        const payload = {
          title: generatedTitle.trim(),
          slug: result.slug || generateSlug(generatedTitle),
          content: normalizedContent.trim(),
          excerpt: (result.excerpt || "").trim() || null,
          category: result.category || category,
          author_name: result.author_name || "Editorial Team",
          cover_image_url: null,
          tags: (result.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
          status: "published",
          published_at: toPublishISOString(aiTargetDate),
          meta_title: (result.meta_title || "").trim() || null,
          meta_description: (result.meta_description || "").trim() || null,
          sequence_number: 0,
        };
        await supabase.from("blog_posts").insert(payload);
        setAiToast("Article published live!");
        setTimeout(() => { setAiToast(""); onSave(); }, 1500);
      }
    }
  }

  const handleAiWriter = useCallback(async (action: string) => {
    setAiWriterOpen(true);
    setAiWriterAction(action);
    setAiWriterLoading(true);
    setAiWriterStream("");

    const controller = new AbortController();
    aiAbortRef.current = controller;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-blog-writer`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action,
          topic: aiTopic || title,
          category,
          keywords: tags,
          existingContent: content,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { fullText += c; setAiWriterStream(fullText); }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setAiWriterStream(`Error: ${e.message}`);
      }
    } finally {
      setAiWriterLoading(false);
      aiAbortRef.current = null;
    }
  }, [title, category, tags, content, aiTopic]);

  const applyAiContent = () => {
    const cleaned = stripCodeFences(aiWriterStream);
    setContent(cleaned);
    setAiWriterOpen(false);
    setAiToast("AI content applied to editor");
    setTimeout(() => setAiToast(""), 4000);
  };

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!post) setSlug(generateSlug(val));
    if (!metaTitle) setMetaTitle(val);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `covers/${Date.now()}.${ext}`;
    const { data, error: uploadErr } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
    setUploading(false);
    if (uploadErr) { setError("Image upload failed: " + uploadErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(data.path);
    setCoverImageUrl(publicUrl);
    e.target.value = "";
  }

  async function handleAiAssist() {
    if (!content.trim() || !title.trim()) {
      setAiToast("Please write a title and some content first.");
      setTimeout(() => setAiToast(""), 4000);
      return;
    }
    setAiLoading(true);
    setAiToast("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-writing-assistant", {
        body: { title, content, category },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      if (data?.excerpt) setExcerpt(data.excerpt);
      if (data?.meta_description) setMetaDescription(data.meta_description);
      setAiToast("AI generated excerpt & meta description successfully");
    } catch (e) {
      setAiToast("AI error: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiToast(""), 5000);
    }
  }

  async function handleSave(publishNow = false) {
    if (!title.trim() || !content.trim()) { setError("Title and content are required."); return; }
    setSaving(true);
    setError("");
    const finalStatus = publishNow ? 'published' : status;
    const payload = {
      title: title.trim(), slug: slug || generateSlug(title),
      content: content.trim(), excerpt: excerpt.trim() || null,
      category, author_name: authorName,
      cover_image_url: coverImageUrl.trim() || null,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      status: finalStatus,
      published_at: finalStatus === 'published' ? (post?.published_at ?? new Date().toISOString()) : null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      sequence_number: sequenceNumber,
    };
    const { error: err } = post
      ? await supabase.from("blog_posts").update(payload).eq("id", post.id)
      : await supabase.from("blog_posts").insert(payload);
    if (err) { setError(err.message); setSaving(false); }
    else onSave();
  }

  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const metaTitleLen = (metaTitle || title).length;
  const metaDescLen = metaDescription.length;

  return (
    <div className="flex flex-col h-screen">
      {/* ─── Toolbar ─── */}
      <div className="bg-white border-b border-border px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm overflow-x-auto gap-2">
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-foreground">{post ? 'Edit Article' : 'New Article'}</div>
            <div className="text-[10px] text-muted-foreground">{wordCount} words · ~{readTime} min read</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {aiToast && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all hidden sm:inline-flex ${aiToast.startsWith('AI generated') || aiToast.startsWith('Article published') ? 'bg-accent text-accent-foreground border border-border' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {aiToast}
            </span>
          )}
          <button
            onClick={handleAiAssist} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-semibold disabled:opacity-50"
            title="AI: Auto-generate excerpt & meta description"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="hidden sm:inline">{aiLoading ? 'Generating…' : 'AI Assist'}</span>
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              preview ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{preview ? 'Edit' : 'Preview'}</span>
          </button>
          <button
            onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm border border-border bg-white text-foreground hover:bg-muted transition-colors disabled:opacity-50 font-medium"
          >
            <Clock className="h-4 w-4 text-primary" /> <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button
            onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold shadow-card disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{saving ? 'Saving…' : post?.status === 'published' ? 'Update' : 'Publish'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl">
            <AlertCircle className="h-3.5 w-3.5 inline mr-1" /> {error}
          </div>
        )}

        {!preview ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] h-full">
            {/* ─── Writing area ─── */}
            <div className="p-4 sm:p-8 overflow-auto space-y-5 max-w-4xl">
              {/* AI Auto-Generate Section */}
              {!post && (
                <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-bold text-violet-900">AI Auto-Generate Article</span>
                  </div>
                  <p className="text-xs text-violet-600 mb-3">Enter a title/topic and date, and AI fills the full article, SEO fields, and can publish it live in one click.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_160px_160px] gap-2">
                    <input
                      value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                      placeholder="Title or topic"
                      className="flex-1 px-3 py-2.5 border border-violet-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
                    />
                    <input
                      type="date"
                      value={aiTargetDate}
                      onChange={e => setAiTargetDate(e.target.value)}
                      className="px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white focus:outline-none focus:border-violet-500"
                    />
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white focus:outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <button onClick={() => aiAutoGenerate(false)} disabled={generating}
                      className="flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex-1">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate & Edit
                    </button>
                    <button onClick={() => aiAutoGenerate(true)} disabled={generating}
                      className="flex items-center justify-center gap-2 bg-violet-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-900 disabled:opacity-50 transition-colors flex-1">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Generate & Publish Live
                    </button>
                  </div>
                </div>
              )}

              {/* Category & status pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                  <span className={`w-2 h-2 rounded-full ${status === 'published' ? 'bg-gain' : 'bg-muted-foreground'}`} />
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="bg-transparent text-sm font-medium text-muted-foreground focus:outline-none cursor-pointer">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <textarea
                value={title} onChange={e => handleTitleChange(e.target.value)}
                placeholder="Article headline…" rows={2}
                className="w-full text-2xl sm:text-3xl font-black text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none border-0 bg-transparent leading-tight"
              />

              {/* Excerpt */}
              <div className="border-l-4 border-primary/30 pl-4">
                <textarea
                  value={excerpt} onChange={e => setExcerpt(e.target.value)}
                  placeholder="Write a brief summary that appears in article cards and search results…"
                  rows={2}
                  className="w-full text-base text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none border-0 bg-transparent italic leading-relaxed"
                />
              </div>

              <div className="border-t border-border" />

              {/* Rich Text Editor */}
              <RichTextEditor
                content={content} onChange={setContent}
                placeholder="Start writing your article here…"
              />
            </div>

            {/* ─── Right settings panel ─── */}
            <div className="border-l border-border bg-muted/20 overflow-auto">
              <div className="p-5 space-y-5">

                {/* ── URL Slug ── */}
                <div>
                  <SideLabel icon={FileText}>URL Slug</SideLabel>
                  <input
                    type="text" value={slug} onChange={e => setSlug(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">investingiq.com/news/{slug || '…'}</p>
                </div>

                {/* ── Sequence Number ── */}
                <div>
                  <SideLabel icon={ListOrdered}>Sequence / Display Order</SideLabel>
                  <SideInput
                    type="number" min={0} value={sequenceNumber}
                    onChange={e => setSequenceNumber(Number(e.target.value))}
                    placeholder="0"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Lower numbers appear first in listings.</p>
                </div>

                {/* ── Author ── */}
                <div>
                  <SideLabel icon={User}>Author</SideLabel>
                  <SideInput value={authorName} onChange={e => setAuthorName(e.target.value)} />
                </div>

                {/* ── Cover Image ── */}
                <div>
                  <SideLabel icon={UploadCloud}>Cover Image</SideLabel>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Recommended: 1200 × 630 px · Max 2 MB · JPG/PNG/WebP</p>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-60 bg-white"
                  >
                    <UploadCloud className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Upload image from device'}
                  </button>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground">or paste URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <SideInput
                    type="url" value={coverImageUrl}
                    onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/…"
                  />

                  {coverImageUrl && (
                    <div className="mt-2 relative rounded-lg overflow-hidden border border-border group">
                      <img src={coverImageUrl} alt="Cover preview" className="w-full h-28 object-cover" onError={() => setCoverImageUrl('')} />
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Tags ── */}
                <div>
                  <SideLabel icon={Tag}>Tags</SideLabel>
                  <SideInput value={tags} onChange={e => setTags(e.target.value)} placeholder="Sensex, Nifty, RBI, Budget" />
                  {tags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-[10px] bg-accent text-accent-foreground border border-border px-2 py-0.5 rounded-full font-semibold">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── SEO / Meta Tags ── */}
                <div className="border-t border-border pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">SEO / Meta Tags</span>
                  </div>

                  <div>
                    <SideLabel icon={FileText}>Meta Title</SideLabel>
                    <SideInput
                      value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
                      placeholder={title || "SEO page title…"}
                      maxLength={60}
                    />
                    <div className={`text-[10px] mt-1 text-right font-mono ${metaTitleLen > 60 ? 'text-destructive' : metaTitleLen > 50 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {metaTitleLen}/60 chars
                    </div>
                  </div>

                  <div>
                    <SideLabel icon={Search}>Meta Description</SideLabel>
                    <SideTextarea
                      value={metaDescription} onChange={e => setMetaDescription(e.target.value)}
                      placeholder="Brief description for search engines and social sharing…"
                      rows={3} maxLength={160}
                    />
                    <div className={`text-[10px] mt-1 text-right font-mono ${metaDescLen > 160 ? 'text-destructive' : metaDescLen > 140 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {metaDescLen}/160 chars
                    </div>
                    {(metaTitle || title) && (
                      <div className="mt-3 p-3 bg-white border border-border rounded-lg">
                        <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">Google Preview</p>
                        <p className="text-[13px] text-primary font-medium leading-tight truncate">{metaTitle || title}</p>
                        <p className="text-[11px] text-gain">investingiq.com › news › {slug || '…'}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{metaDescription || excerpt || 'No description set.'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── AI Blog Writer ── */}
                <div className="border-t border-border pt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">AI Blog Writer</span>
                  </div>
                  <SideInput
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="Topic (or uses article title)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAiWriter("generate-draft")} disabled={aiWriterLoading}
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-40">
                      <PenTool className="h-3 w-3" /> Draft Article
                    </button>
                    <button onClick={() => handleAiWriter("generate-outline")} disabled={aiWriterLoading}
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-40">
                      <ListChecks className="h-3 w-3" /> Outline
                    </button>
                    <button onClick={() => handleAiWriter("improve-content")} disabled={aiWriterLoading || !content.trim()}
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40">
                      <Sparkles className="h-3 w-3" /> Improve
                    </button>
                    <button onClick={() => handleAiWriter("suggest-topics")} disabled={aiWriterLoading}
                      className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40">
                      <Lightbulb className="h-3 w-3" /> Ideas
                    </button>
                  </div>

                  {aiWriterOpen && (
                    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">
                          {aiWriterLoading ? "Generating..." : "AI Output"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {!aiWriterLoading && aiWriterStream && aiWriterAction !== "suggest-topics" && (
                            <button onClick={applyAiContent}
                              className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600 transition-colors">
                              Apply to Editor
                            </button>
                          )}
                          <button onClick={() => { aiAbortRef.current?.abort(); setAiWriterOpen(false); }}
                            className="text-white/30 hover:text-white/60 p-1">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="px-3 py-3 max-h-60 overflow-y-auto text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
                        {aiWriterLoading && !aiWriterStream && (
                          <div className="flex items-center gap-2 text-white/40">
                            <Loader2 className="h-3 w-3 animate-spin" /> Writing...
                          </div>
                        )}
                        {aiWriterStream}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Article Stats ── */}
                <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Article Stats</div>
                  {[
                    { label: "Words", value: wordCount.toLocaleString() },
                    { label: "Characters", value: plainText.length.toLocaleString() },
                    { label: "Read Time", value: `~${readTime} min` },
                    { label: "Paragraphs", value: content.split('</p>').filter(p => p.trim()).length },
                  ].map(stat => (
                    <div key={stat.label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className="number-font text-xs font-bold text-foreground">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ─── Preview ─── */
          <div className="max-w-3xl mx-auto p-4 sm:p-8">
            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
              {coverImageUrl && <img src={coverImageUrl} alt="" className="w-full h-48 sm:h-72 object-cover" />}
              <div className="p-4 sm:p-8">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs font-bold bg-accent text-accent-foreground border border-border px-2.5 py-1 rounded">{category}</span>
                  {tags.split(',').filter(t => t.trim()).slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded">{tag.trim()}</span>
                  ))}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight mb-4">{title || 'Untitled Article'}</h1>
                {excerpt && <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6 border-l-4 border-primary/40 pl-4 italic">{excerpt}</p>}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8 pb-6 border-b border-border flex-wrap">
                  <span className="font-semibold text-foreground">{authorName}</span>
                  <span>·</span>
                  <span>~{readTime} min read</span>
                  <span>·</span>
                  <span>{wordCount} words</span>
                </div>
                <div className="prose prose-sm sm:prose-base max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>

            {(metaTitle || metaDescription) && (
              <div className="mt-6 p-5 bg-white border border-border rounded-2xl">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" /> SEO Meta Tags
                </p>
                <div className="space-y-1.5 text-sm">
                  <div><span className="font-semibold text-muted-foreground">Title: </span><span className="text-foreground">{metaTitle || title}</span></div>
                  <div><span className="font-semibold text-muted-foreground">Description: </span><span className="text-foreground">{metaDescription || excerpt || '—'}</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
