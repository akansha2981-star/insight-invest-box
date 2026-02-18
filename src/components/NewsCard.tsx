import { Clock, Tag, ArrowRight, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
  views_count: number | null;
}

interface NewsCardProps {
  post: BlogPost;
  featured?: boolean;
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Markets: "text-primary bg-primary/10 border-primary/20",
  Economy: "text-gold bg-gold/10 border-gold/20",
  Stocks: "text-gain bg-gain/10 border-gain/20",
  Commodities: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  default: "text-muted-foreground bg-surface-3 border-surface",
};

export function NewsCard({ post, featured = false }: NewsCardProps) {
  const catColor = CATEGORY_COLORS[post.category ?? ''] ?? CATEGORY_COLORS.default;

  if (featured) {
    return (
      <Link to={`/news/${post.slug}`} className="group block">
        <div className="bg-card border border-surface rounded-lg overflow-hidden card-hover">
          <div className="relative">
            {post.cover_image_url ? (
              <img src={post.cover_image_url} alt={post.title} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center">
                <div className="text-6xl opacity-20">📈</div>
              </div>
            )}
            <span className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded border ${catColor}`}>
              {post.category}
            </span>
          </div>
          <div className="p-4">
            <h3 className="font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground/70">{post.author_name}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.published_at ? timeAgo(post.published_at) : 'Just now'}
                </span>
              </div>
              {post.views_count != null && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {post.views_count.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/news/${post.slug}`} className="group flex gap-3 py-3 border-b border-surface/50 last:border-0 hover:bg-surface-2/30 px-2 rounded transition-colors">
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt={post.title} className="w-16 h-16 object-cover rounded shrink-0" />
      ) : (
        <div className="w-16 h-16 bg-surface-2 rounded shrink-0 flex items-center justify-center text-2xl">
          {post.category === 'Markets' ? '📊' : post.category === 'Economy' ? '🏛️' : post.category === 'Commodities' ? '🥇' : '📰'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catColor}`}>
            {post.category}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{post.author_name}</span>
          <span>·</span>
          <span>{post.published_at ? timeAgo(post.published_at) : 'Just now'}</span>
        </div>
      </div>
    </Link>
  );
}

export function NewsCardSmall({ post }: { post: BlogPost }) {
  const catColor = CATEGORY_COLORS[post.category ?? ''] ?? CATEGORY_COLORS.default;
  return (
    <Link to={`/news/${post.slug}`} className="group block py-2.5 border-b border-surface/50 last:border-0 hover:bg-surface-2/30 px-2 rounded transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catColor}`}>
          {post.category}
        </span>
        <span className="text-xs text-muted-foreground">{post.published_at ? timeAgo(post.published_at) : 'Just now'}</span>
      </div>
      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
        {post.title}
      </p>
    </Link>
  );
}
