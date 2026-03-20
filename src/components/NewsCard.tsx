import { Clock, Eye, Tag } from "lucide-react";
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

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const CATEGORY_STYLES: Record<string, string> = {
  Markets: "bg-blue-50 text-blue-700 border-blue-200",
  Economy: "bg-amber-50 text-amber-700 border-amber-200",
  Stocks: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Commodities: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Companies: "bg-purple-50 text-purple-700 border-purple-200",
  Budget: "bg-orange-50 text-orange-700 border-orange-200",
  default: "bg-gray-50 text-gray-600 border-gray-200",
};

function CategoryBadge({ category }: { category: string | null }) {
  const style = CATEGORY_STYLES[category ?? ''] ?? CATEGORY_STYLES.default;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${style}`}>
      {category ?? 'News'}
    </span>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  Markets: 'BarChart3', Economy: 'Landmark', Stocks: 'TrendingUp', Commodities: 'CircleDollarSign', Companies: 'Building2', default: 'Newspaper'
};

/* ─── Hero (large featured card) ─── */
export function NewsCardHero({ post }: { post: BlogPost }) {
  return (
    <Link to={`/news/${post.slug}`} className="group block relative overflow-hidden rounded-2xl shadow-card-md border border-border card-hover">
      <div className="relative h-72 md:h-96 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">
            {EMOJI_MAP[post.category ?? ''] ?? EMOJI_MAP.default}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mb-2"><CategoryBadge category={post.category} /></div>
          <h2 className="font-bold text-xl md:text-2xl leading-tight mb-2 group-hover:text-yellow-300 transition-colors line-clamp-3">
            {post.title}
          </h2>
          {post.excerpt && <p className="text-white/80 text-sm line-clamp-2 mb-3">{post.excerpt}</p>}
          <div className="flex items-center gap-3 text-white/60 text-xs">
            <span className="font-medium text-white/80">{post.author_name}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.published_at ? timeAgo(post.published_at) : 'Just now'}</span>
            {post.views_count != null && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count.toLocaleString()}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Standard card ─── */
export function NewsCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  if (featured) {
    return (
      <Link to={`/news/${post.slug}`} className="group block bg-white border border-border rounded-xl shadow-card card-hover overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          {post.cover_image_url ? (
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
              {EMOJI_MAP[post.category ?? ''] ?? EMOJI_MAP.default}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-3 left-3"><CategoryBadge category={post.category} /></div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-[15px] text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{post.author_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.published_at ? timeAgo(post.published_at) : 'Just now'}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/news/${post.slug}`} className="group flex gap-3 py-3.5 border-b border-border/60 last:border-0 hover:bg-muted/30 px-3 rounded-lg -mx-3 transition-colors">
      <div className="w-[72px] h-[72px] rounded-lg overflow-hidden shrink-0 bg-muted">
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {EMOJI_MAP[post.category ?? ''] ?? EMOJI_MAP.default}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1"><CategoryBadge category={post.category} /></div>
        <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h4>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
          <span>{post.author_name}</span>
          <span>·</span>
          <span>{post.published_at ? timeAgo(post.published_at) : 'Just now'}</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Small headline card ─── */
export function NewsCardSmall({ post }: { post: BlogPost }) {
  return (
    <Link to={`/news/${post.slug}`} className="group block py-3 border-b border-border/60 last:border-0 hover:bg-muted/30 px-2 -mx-2 rounded transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <CategoryBadge category={post.category} />
        <span className="text-[11px] text-muted-foreground">{post.published_at ? timeAgo(post.published_at) : 'Just now'}</span>
      </div>
      <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
        {post.title}
      </p>
    </Link>
  );
}
