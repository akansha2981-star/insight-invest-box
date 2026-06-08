import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Plus, Edit, Trash2, Eye, FileText, LogOut, CheckCircle, Clock, AlertCircle, BarChart2, PenSquare, Newspaper, Layout, Radio, LineChart, Image, Mail, Home, Users, Menu, X, RefreshCw, Sparkles, ListTree, Zap, Globe } from "lucide-react";
import { BlogEditor } from "@/components/BlogEditor";
import { AdminPageSections } from "@/components/AdminPageSections";
import { AdminBreakingNews } from "@/components/AdminBreakingNews";
import { AdminStockReviews } from "@/components/AdminStockReviews";
import { AdminHomeBanners } from "@/components/AdminHomeBanners";
import { AdminNewsletterSubscribers } from "@/components/AdminNewsletterSubscribers";
import { AdminRealEstate } from "@/components/AdminRealEstate";
import { AdminAuthAnalytics } from "@/components/AdminAuthAnalytics";
import { AdminRegisteredUsers } from "@/components/AdminRegisteredUsers";
import { AdminAIContentStudio } from "@/components/AdminAIContentStudio";
import { AdminSitemapManager } from "@/components/AdminSitemapManager";
import { AdminSmartRefresh } from "@/components/AdminSmartRefresh";
import { AdminForexMonitor } from "@/components/AdminForexMonitor";
import { AdminAIOptimizer } from "@/components/AdminAIOptimizer";
import { AdminNewsEngine } from "@/components/AdminNewsEngine";
import AdminMutualFunds from "@/components/AdminMutualFunds";

interface BlogPost {
  id: string; title: string; slug: string; status: string;
  category: string | null; published_at: string | null;
  author_name: string | null; views_count: number | null;
  created_at: string; content: string; excerpt: string | null;
  cover_image_url: string | null; tags: string[] | null;
}

type AdminView = 'dashboard' | 'posts' | 'create' | 'edit' | 'page-sections' | 'breaking-news' | 'stock-reviews' | 'home-banners' | 'newsletter' | 'real-estate' | 'pages' | 'auth-analytics' | 'registered-users' | 'ai-studio' | 'sitemap' | 'smart-refresh' | 'forex' | 'ai-optimizer' | 'news-engine';

const NAV_ITEMS = [
  { id: 'dashboard',        label: 'Dashboard',          icon: BarChart2 },
  { id: 'news-engine',      label: 'News Engine',        icon: Newspaper },
  { id: 'ai-optimizer',     label: 'AI Optimizer',       icon: Sparkles },
  { id: 'smart-refresh',    label: 'Smart Refresh',      icon: Zap },
  { id: 'forex',            label: 'Forex Monitor',      icon: Globe },
  { id: 'ai-studio',        label: 'AI Content Studio',  icon: Sparkles },
  { id: 'sitemap',          label: 'Sitemap Manager',    icon: ListTree },
  { id: 'posts',            label: 'All Articles',       icon: Newspaper },
  { id: 'create',           label: 'Write Article',      icon: PenSquare },
  { id: 'stock-reviews',    label: 'Stock Reviews',      icon: LineChart },
  { id: 'home-banners',     label: 'Homepage Banners',   icon: Image },
  { id: 'pages',            label: 'Pages Content',      icon: FileText },
  { id: 'page-sections',    label: 'Section Blocks',     icon: Layout },
  { id: 'breaking-news',    label: 'Breaking News',      icon: Radio },
  { id: 'real-estate',      label: 'Real Estate',        icon: Home },
  { id: 'newsletter',       label: 'Subscribers',        icon: Mail },
  { id: 'registered-users', label: 'Registered Users',   icon: Users },
  { id: 'auth-analytics',   label: 'Login Analytics',    icon: Users },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AdminView>('dashboard');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let checking = false;

    async function verifyRole(userId: string): Promise<boolean> {
      for (let i = 0; i < 5; i++) {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (!freshSession) {
          if (i < 4) { await new Promise(r => setTimeout(r, 600)); continue; }
          return false;
        }
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (roles && roles.length > 0) return true;
        if (i < 4) await new Promise(r => setTimeout(r, 600));
      }
      return false;
    }

    async function checkAuth(session: any) {
      if (checking || cancelled) return;
      checking = true;
      try {
        if (!session) { navigate('/admin/login'); return; }
        setUser(session.user);
        const ok = await verifyRole(session.user.id);
        if (cancelled) return;
        if (ok) { setAuthorized(true); fetchPosts(); }
        else { setAuthorized(false); }
      } finally {
        checking = false;
        if (!cancelled) setLoading(false);
      }
    }

    // IMPORTANT: No await inside onAuthStateChange — fire and forget
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { navigate('/admin/login'); return; }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAuth(session);
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(session);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  async function fetchPosts() {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts(data ?? []);
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    fetchPosts();
  }

  async function togglePublish(post: BlogPost) {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await supabase.from("blog_posts").update({
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : null
    }).eq("id", post.id);
    fetchPosts();
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    </div>
  );

  if (authorized === false) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-loss" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-sm mb-6">You don't have admin privileges. Contact your administrator.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setLoading(true); setAuthorized(null); supabase.auth.getSession().then(({ data: { session } }) => {
              if (!session) { navigate('/admin/login'); return; }
              setUser(session.user);
              (async () => {
                for (let i = 0; i < 5; i++) {
                  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
                  if (roles && roles.length > 0) { setAuthorized(true); fetchPosts(); setLoading(false); return; }
                  if (i < 4) await new Promise(r => setTimeout(r, 600));
                }
                setAuthorized(false); setLoading(false);
              })();
            }); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <Link to="/" className="text-primary hover:text-primary/80 font-semibold text-sm">← Back to Investing IQ</Link>
        </div>
      </div>
    </div>
  );

  const published = posts.filter(p => p.status === 'published');
  const drafts = posts.filter(p => p.status === 'draft');
  const totalViews = posts.reduce((s, p) => s + (p.views_count ?? 0), 0);

  function handleNavClick(id: string) {
    setView(id as AdminView);
    setEditingPost(null);
    setSidebarOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-red-600 rounded-lg p-1.5">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-black text-[15px] leading-none">Investing IQ</div>
            <div className="text-[9px] text-white/40 tracking-wider uppercase mt-0.5">Admin Portal</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-white/60 hover:text-white rounded-lg">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="px-3 py-4 flex-1 overflow-y-auto">
        <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest px-2 mb-2">Content</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
              view === item.id
                ? 'bg-primary text-white font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/8'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}

        <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest px-2 mb-2 mt-5">Site</div>
        <Link
          to="/"
          target="_blank"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/8 transition-colors mb-1"
        >
          <Eye className="h-4 w-4" /> View Live Site
        </Link>
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.email?.split('@')[0]}</div>
            <div className="text-[10px] text-white/40">Administrator</div>
          </div>
        </div>
        <button
          onClick={() => { supabase.auth.signOut(); navigate('/admin/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-900 text-white flex items-center gap-3 px-4 py-3 lg:hidden shadow-lg">
        <button onClick={() => setSidebarOpen(true)} className="p-1">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-red-600 rounded-lg p-1">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">Investing IQ Admin</span>
        </div>
      </div>
      {/* ─── Main content ─── */}
      <main className="flex-1 overflow-auto bg-background pt-14 lg:pt-0">
        {view === 'dashboard' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage Investing IQ content</p>

            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Articles", value: posts.length, icon: FileText, color: "text-primary", bg: "bg-primary/8" },
                { label: "Published", value: published.length, icon: CheckCircle, color: "text-gain", bg: "bg-[hsl(var(--gain-light))]" },
                { label: "Drafts", value: drafts.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-foreground", bg: "bg-muted" },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-border rounded-xl p-5 shadow-card">
                  <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className={`number-font text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setView('create')}
                className="bg-primary text-white rounded-xl p-5 text-left hover:bg-primary/90 transition-colors shadow-card group"
              >
                <PenSquare className="h-6 w-6 mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-base">Write New Article</div>
                <div className="text-white/70 text-xs mt-1">Create and publish content</div>
              </button>
              <button
                onClick={() => setView('posts')}
                className="bg-white border border-border rounded-xl p-5 text-left hover:shadow-card-md transition-all group"
              >
                <Newspaper className="h-6 w-6 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="font-bold text-base text-foreground">Manage Articles</div>
                <div className="text-muted-foreground text-xs mt-1">Edit, publish, or delete</div>
              </button>
              <Link
                to="/news"
                target="_blank"
                className="bg-white border border-border rounded-xl p-5 text-left hover:shadow-card-md transition-all group block"
              >
                <Eye className="h-6 w-6 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="font-bold text-base text-foreground">Preview News Page</div>
                <div className="text-muted-foreground text-xs mt-1">See how readers see it</div>
              </Link>
            </div>

            {/* Recent articles */}
            <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-foreground">Recent Articles</h2>
                <button onClick={() => setView('create')} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-4 w-4" /> New Article
                </button>
              </div>
              <PostsTable
                posts={posts.slice(0, 6)}
                onEdit={(p) => { setEditingPost(p); setView('edit'); }}
                onDelete={deletePost}
                onTogglePublish={togglePublish}
              />
            </div>
          </div>
        )}

        {view === 'posts' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">All Articles</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{posts.length} total · {published.length} published · {drafts.length} drafts</p>
              </div>
              <button
                onClick={() => setView('create')}
                className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-card w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Write Article
              </button>
            </div>
            <div className="bg-white border border-border rounded-xl shadow-card overflow-hidden">
              <PostsTable
                posts={posts}
                onEdit={(p) => { setEditingPost(p); setView('edit'); }}
                onDelete={deletePost}
                onTogglePublish={togglePublish}
              />
            </div>
          </div>
        )}

        {(view === 'create' || view === 'edit') && (
          <BlogEditor
            post={editingPost}
            onSave={() => { fetchPosts(); setView('posts'); setEditingPost(null); }}
            onCancel={() => { setView(editingPost ? 'posts' : 'dashboard'); setEditingPost(null); }}
          />
        )}

        {view === 'page-sections' && <AdminPageSections />}
        {view === 'pages' && <AdminPageSections />}
        {view === 'breaking-news' && <AdminBreakingNews />}
        {view === 'stock-reviews' && <AdminStockReviews />}
        {view === 'home-banners' && <AdminHomeBanners />}
        {view === 'newsletter' && <AdminNewsletterSubscribers />}
        {view === 'real-estate' && <AdminRealEstate />}
        {view === 'auth-analytics' && <AdminAuthAnalytics />}
        {view === 'ai-studio' && <AdminAIContentStudio />}
        {view === 'sitemap' && <AdminSitemapManager />}
        {view === 'smart-refresh' && <AdminSmartRefresh />}
        {view === 'forex' && <AdminForexMonitor />}
        {view === 'ai-optimizer' && <AdminAIOptimizer />}
        {view === 'news-engine' && <AdminNewsEngine />}
        {view === 'registered-users' && <AdminRegisteredUsers />}

      </main>
    </div>
  );
}

/* ─── Posts table ─── */
function PostsTable({ posts, onEdit, onDelete, onTogglePublish }: {
  posts: BlogPost[];
  onEdit: (p: BlogPost) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (p: BlogPost) => void;
}) {
  if (posts.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="font-medium">No articles yet</p>
      <p className="text-sm mt-1">Write your first article to get started</p>
    </div>
  );

  return (
    <>
      {/* Mobile card layout */}
      <div className="lg:hidden divide-y divide-border">
        {posts.map((post) => (
          <div key={post.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm line-clamp-2">{post.title}</div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">/news/{post.slug}</div>
              </div>
              <button
                onClick={() => onTogglePublish(post)}
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  post.status === 'published' ? 'badge-gain' : 'badge-neutral'
                }`}
              >
                {post.status === 'published' ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                {post.status}
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {post.category && <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">{post.category}</span>}
              {post.author_name && <span>{post.author_name}</span>}
              <span className="number-font">{(post.views_count ?? 0).toLocaleString()} views</span>
              <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button onClick={() => onEdit(post)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                <Edit className="h-4 w-4" />
              </button>
              <Link to={`/news/${post.slug}`} target="_blank" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Preview">
                <Eye className="h-4 w-4" />
              </Link>
              <button onClick={() => onDelete(post.id)} className="p-2 text-muted-foreground hover:text-loss hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {["Article", "Category", "Author", "Status", "Views", "Date", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors group">
                <td className="px-5 py-3.5 max-w-xs">
                  <div className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{post.title}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">/news/{post.slug}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">{post.category}</span>
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{post.author_name}</td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => onTogglePublish(post)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      post.status === 'published' ? 'badge-gain' : 'badge-neutral'
                    }`}
                  >
                    {post.status === 'published' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {post.status}
                  </button>
                </td>
                <td className="px-5 py-3.5 number-font text-sm text-muted-foreground">
                  {(post.views_count ?? 0).toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(post)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <Link to={`/news/${post.slug}`} target="_blank" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Preview">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => onDelete(post.id)} className="p-1.5 text-muted-foreground hover:text-loss hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
