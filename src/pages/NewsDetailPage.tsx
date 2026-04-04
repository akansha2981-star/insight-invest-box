import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { StockTicker } from "@/components/StockTicker";
import { Footer } from "@/components/Footer";
import { Clock, User, Eye, Tag, ArrowLeft, Share2, Newspaper } from "lucide-react";
import { AIInsightTeaser } from "@/components/AIInsightTeaser";
import { AIArticleSummary } from "@/components/AIArticleSummary";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
  views_count: number | null;
}

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchPost(slug);
  }, [slug]);

  async function fetchPost(slug: string) {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (data) {
      setPost(data);
      // Increment view count
      await supabase
        .from("blog_posts")
        .update({ views_count: (data.views_count ?? 0) + 1 })
        .eq("id", data.id);

      // Fetch related
      const { data: rel } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, content, cover_image_url, tags, category, published_at, author_name, views_count")
        .eq("status", "published")
        .eq("category", data.category)
        .neq("id", data.id)
        .limit(4);
      setRelated(rel ?? []);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <StockTicker />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="h-8 bg-card rounded w-3/4 animate-pulse mb-4" />
          <div className="h-4 bg-card rounded w-1/2 animate-pulse mb-8" />
          <div className="h-64 bg-card rounded animate-pulse mb-6" />
          {[1,2,3,4].map(i => <div key={i} className="h-4 bg-card rounded animate-pulse mb-3" />)}
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <StockTicker />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">This article may have been removed or is not published yet.</p>
          <Link to="/news" className="text-primary hover:text-primary/80 font-medium">← Back to News</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StockTicker />

      <main className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Article */}
          <article className="lg:col-span-3">
            <Link to="/news" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to News
            </Link>

            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                {post.category}
              </span>
              {post.tags?.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 rounded bg-surface-2 text-muted-foreground border border-surface">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-4">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-lg text-muted-foreground leading-relaxed mb-6 border-l-4 border-primary pl-4">
                {post.excerpt}
              </p>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-6 border-b border-surface">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-foreground">{post.author_name}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </span>
                {post.views_count != null && (
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" /> {(post.views_count + 1).toLocaleString()} views
                  </span>
                )}
              </div>
              <button
                onClick={() => navigator.share?.({ title: post.title, url: window.location.href })}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>

            {post.cover_image_url && (
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full rounded-lg mb-8 max-h-96 object-cover"
              />
            )}

            <div
              className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-blockquote:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: post.content || "<p>Article content unavailable.</p>" }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-surface">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {post.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-surface-2 text-muted-foreground border border-surface hover:border-primary/30 cursor-pointer transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* AI Article Summary */}
            <AIArticleSummary title={post.title} content={post.content} category={post.category} />
            {/* AI News Intelligence */}
            <AIInsightTeaser variant="news" context="AI-powered article analysis" />
            {related.length > 0 && (
              <div className="bg-card border border-surface rounded-lg overflow-hidden">
                <div className="border-b border-surface px-4 py-3">
                  <h3 className="font-semibold text-sm text-foreground">Related Articles</h3>
                </div>
                <div className="divide-y divide-surface">
                  {related.map(rel => (
                    <Link key={rel.id} to={`/news/${rel.slug}`} className="block p-4 hover:bg-surface-2/50 transition-colors group">
                      <span className="text-xs font-semibold text-primary">{rel.category}</span>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mt-1 line-clamp-3 leading-snug">
                        {rel.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Market quick view */}
            <div className="bg-card border border-surface rounded-lg p-4">
              <h3 className="font-semibold text-sm text-foreground mb-3">Live Markets</h3>
              {[
                { name: "SENSEX", val: "73,827", chg: "+1.11%", up: true },
                { name: "NIFTY", val: "22,378", chg: "+1.08%", up: true },
                { name: "GOLD", val: "₹72,450", chg: "+0.53%", up: true },
                { name: "USD/INR", val: "83.12", chg: "-0.17%", up: false },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-surface/50 last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground">{m.name}</span>
                  <div className="text-right">
                    <div className="number-font text-sm font-bold text-foreground">{m.val}</div>
                    <div className={`text-xs font-medium ${m.up ? 'text-gain' : 'text-loss'}`}>{m.chg}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
