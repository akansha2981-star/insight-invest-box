import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, X, Eye, Clock, Send } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
}

interface BlogEditorProps {
  post: BlogPost | null;
  onSave: () => void;
  onCancel: () => void;
}

const CATEGORIES = ["Markets", "Economy", "Stocks", "Commodities", "IPO", "Budget", "Companies", "Global"];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function BlogEditor({ post, onSave, onCancel }: BlogEditorProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [category, setCategory] = useState(post?.category ?? "Markets");
  const [authorName, setAuthorName] = useState(post?.author_name ?? "Editorial Team");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!post) setSlug(generateSlug(val));
  }

  async function handleSave(publishNow = false) {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError("");

    const finalStatus = publishNow ? 'published' : status;
    const data = {
      title: title.trim(),
      slug: slug || generateSlug(title),
      content: content.trim(),
      excerpt: excerpt.trim() || null,
      category,
      author_name: authorName,
      cover_image_url: coverImageUrl.trim() || null,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      status: finalStatus,
      published_at: finalStatus === 'published' ? (post?.published_at ?? new Date().toISOString()) : null,
    };

    let err;
    if (post) {
      ({ error: err } = await supabase.from("blog_posts").update(data).eq("id", post.id));
    } else {
      ({ error: err } = await supabase.from("blog_posts").insert(data));
    }

    if (err) {
      setError(err.message);
    } else {
      onSave();
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="border-b border-surface px-8 py-4 flex items-center justify-between shrink-0 bg-header">
        <div>
          <h1 className="text-lg font-bold text-foreground">{post ? 'Edit Article' : 'New Article'}</h1>
          <p className="text-xs text-muted-foreground">{post ? `Editing: ${post.slug}` : 'Create a new article'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-surface-3 text-foreground hover:bg-surface-2 transition-colors disabled:opacity-60"
          >
            <Clock className="h-4 w-4" /> Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {post?.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {error && (
          <div className="mb-4 p-3 bg-loss/10 border border-loss/20 text-loss text-sm rounded-lg">
            {error}
          </div>
        )}

        {!preview ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-6xl">
            {/* Main content */}
            <div className="xl:col-span-2 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Enter article title..."
                  className="w-full bg-card border border-surface rounded-lg px-4 py-3 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">URL Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="w-full bg-card border border-surface rounded-lg px-4 py-2.5 text-sm font-mono text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Excerpt (Summary)</label>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="Brief summary shown in article cards..."
                  rows={2}
                  className="w-full bg-card border border-surface rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Content *</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your article content here. Separate paragraphs with blank lines."
                  rows={20}
                  className="w-full bg-card border border-surface rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all resize-y font-mono leading-relaxed"
                />
                <div className="text-xs text-muted-foreground mt-1">{content.length} characters · {content.split(/\s+/).filter(Boolean).length} words</div>
              </div>
            </div>

            {/* Settings sidebar */}
            <div className="space-y-5">
              <div className="bg-card border border-surface rounded-lg p-5 space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Article Settings</h3>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full bg-surface-2 border border-surface rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-surface-2 border border-surface rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Author</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="w-full bg-surface-2 border border-surface rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="bg-card border border-surface rounded-lg p-5 space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Media & Tags</h3>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cover Image URL</label>
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={e => setCoverImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-surface-2 border border-surface rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  {coverImageUrl && (
                    <img src={coverImageUrl} alt="Cover preview" className="mt-2 w-full h-32 object-cover rounded" onError={() => setCoverImageUrl('')} />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="Sensex, Nifty, Budget"
                    className="w-full bg-surface-2 border border-surface rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Preview */
          <div className="max-w-3xl bg-card border border-surface rounded-lg p-8">
            <h1 className="text-2xl font-bold text-foreground mb-3">{title || "Untitled"}</h1>
            {excerpt && <p className="text-muted-foreground border-l-4 border-primary pl-4 mb-6">{excerpt}</p>}
            {coverImageUrl && <img src={coverImageUrl} alt="" className="w-full h-64 object-cover rounded-lg mb-6" />}
            <div className="space-y-4">
              {content.split('\n').map((p, i) => (
                p.trim() ? <p key={i} className="text-foreground/90 leading-relaxed">{p}</p> : <br key={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
