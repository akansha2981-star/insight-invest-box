import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, X, Eye, EyeOff, Clock, Send, Tag, Image, User, AlignLeft, Hash, FileText } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";

interface BlogPost {
  id: string; title: string; slug: string; status: string;
  category: string | null; published_at: string | null;
  author_name: string | null; content: string;
  excerpt: string | null; cover_image_url: string | null; tags: string[] | null;
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

export function BlogEditor({ post, onSave, onCancel }: BlogEditorProps) {
  const [title,         setTitle]         = useState(post?.title ?? "");
  const [slug,          setSlug]          = useState(post?.slug ?? "");
  const [content,       setContent]       = useState(post?.content ?? "");
  const [excerpt,       setExcerpt]       = useState(post?.excerpt ?? "");
  const [category,      setCategory]      = useState(post?.category ?? "Markets");
  const [authorName,    setAuthorName]    = useState(post?.author_name ?? "Editorial Team");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [tags,          setTags]          = useState(post?.tags?.join(", ") ?? "");
  const [status,        setStatus]        = useState(post?.status ?? "draft");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [preview,       setPreview]       = useState(false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!post) setSlug(generateSlug(val));
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

  return (
    <div className="flex flex-col h-screen">
      {/* ─── Toolbar ─── */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <div className="text-sm font-bold text-foreground">{post ? 'Edit Article' : 'New Article'}</div>
            <div className="text-[10px] text-muted-foreground">{wordCount} words · ~{readTime} min read</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              preview ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-border bg-white text-foreground hover:bg-muted transition-colors disabled:opacity-50 font-medium"
          >
            <Clock className="h-4 w-4 text-primary" /> Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm bg-primary text-white hover:bg-primary/90 transition-colors font-bold shadow-card disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Saving…' : post?.status === 'published' ? 'Update Article' : 'Publish Now'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl">
            ⚠ {error}
          </div>
        )}

        {!preview ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] h-full">
            {/* ─── Writing area ─── */}
            <div className="p-8 overflow-auto space-y-5 max-w-4xl">
              {/* Category & status pills */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                  <span className={`w-2 h-2 rounded-full ${status === 'published' ? 'bg-gain' : 'bg-amber-400'}`} />
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="bg-transparent text-sm font-medium text-muted-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <textarea
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Article headline…"
                rows={2}
                className="w-full text-3xl font-black text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none border-0 bg-transparent leading-tight"
              />

              {/* Excerpt */}
              <div className="border-l-4 border-primary/30 pl-4">
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Write a brief summary that appears in article cards and search results…"
                  rows={2}
                  className="w-full text-base text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none border-0 bg-transparent italic leading-relaxed"
                />
              </div>

              <div className="border-t border-border" />

              {/* Rich Text Editor */}
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing your article here… Use the toolbar above for bold, italic, headings, lists, and images."
              />
            </div>

            {/* ─── Right settings panel ─── */}
            <div className="border-l border-border bg-muted/20 overflow-auto">
              <div className="p-5 space-y-5">
                {/* Slug */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    <FileText className="h-3.5 w-3.5" /> URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">marketpulse.com/news/{slug || '…'}</p>
                </div>

                {/* Author */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    <User className="h-3.5 w-3.5" /> Author
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Cover Image */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    <Image className="h-3.5 w-3.5" /> Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/…"
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  {coverImageUrl && (
                    <div className="mt-2 relative rounded-lg overflow-hidden border border-border">
                      <img
                        src={coverImageUrl}
                        alt="Cover preview"
                        className="w-full h-28 object-cover"
                        onError={() => setCoverImageUrl('')}
                      />
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    <Tag className="h-3.5 w-3.5" /> Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="Sensex, Nifty, RBI, Budget"
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  {tags && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                        <span key={tag} className="text-[10px] bg-accent text-accent-foreground border border-border px-2 py-0.5 rounded-full font-semibold">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Article Stats</div>
                  {[
                    { label: "Words", value: wordCount.toLocaleString() },
                    { label: "Characters", value: content.length.toLocaleString() },
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
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
              {coverImageUrl && <img src={coverImageUrl} alt="" className="w-full h-72 object-cover" />}
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold bg-accent text-accent-foreground border border-border px-2.5 py-1 rounded">{category}</span>
                  {tags.split(',').filter(t => t.trim()).slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded">{tag.trim()}</span>
                  ))}
                </div>
                <h1 className="text-3xl font-black text-foreground leading-tight mb-4">{title || 'Untitled Article'}</h1>
                {excerpt && <p className="text-lg text-muted-foreground leading-relaxed mb-6 border-l-4 border-primary/40 pl-4 italic">{excerpt}</p>}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
                  <span className="font-semibold text-foreground">{authorName}</span>
                  <span>·</span>
                  <span>~{readTime} min read</span>
                  <span>·</span>
                  <span>{wordCount} words</span>
                </div>
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
