import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Plus, Edit, Trash2, Eye, FileText, LogOut, CheckCircle, Clock, AlertCircle, BarChart2 } from "lucide-react";
import { BlogEditor } from "@/components/BlogEditor";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  published_at: string | null;
  author_name: string | null;
  views_count: number | null;
  created_at: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
}

type AdminView = 'dashboard' | 'posts' | 'create' | 'edit';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AdminView>('dashboard');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/admin/login'); return; }
    setUser(session.user);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (!roles || roles.length === 0) {
      setAuthorized(false);
    } else {
      setAuthorized(true);
      fetchPosts();
    }
    setLoading(false);
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
  }

  async function deletePost(id: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    fetchPosts();
  }

  async function togglePublish(post: BlogPost) {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await supabase
      .from("blog_posts")
      .update({ status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : null })
      .eq("id", post.id);
    fetchPosts();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/admin/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-loss mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6 text-sm">You don't have admin privileges.</p>
          <Link to="/" className="text-primary hover:text-primary/80 font-medium">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const published = posts.filter(p => p.status === 'published');
  const drafts = posts.filter(p => p.status === 'draft');
  const totalViews = posts.reduce((sum, p) => sum + (p.views_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 bg-header border-r border-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-surface">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded p-1">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">MarketPulse</div>
              <div className="text-[10px] text-muted-foreground">Admin Portal</div>
            </div>
          </div>
        </div>

        <nav className="p-2 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
            { id: 'posts', label: 'All Posts', icon: FileText },
            { id: 'create', label: 'New Post', icon: Plus },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id as AdminView); setEditingPost(null); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-colors mb-0.5 ${
                view === item.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-surface">
          <div className="text-xs text-muted-foreground mb-2 px-2 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-loss hover:bg-loss/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
          <Link
            to="/"
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors mt-0.5"
          >
            <Eye className="h-4 w-4" /> View Site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {view === 'dashboard' && (
          <div className="p-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground text-sm mb-8">Manage your MarketPulse content</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Posts", value: posts.length, icon: FileText, color: "text-primary" },
                { label: "Published", value: published.length, icon: CheckCircle, color: "text-gain" },
                { label: "Drafts", value: drafts.length, icon: Clock, color: "text-gold" },
                { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "text-foreground" },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-surface rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className={`number-font text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent posts */}
            <div className="bg-card border border-surface rounded-lg overflow-hidden">
              <div className="border-b border-surface px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Recent Posts</h2>
                <button onClick={() => setView('create')} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-4 w-4" /> New Post
                </button>
              </div>
              <PostsTable
                posts={posts.slice(0, 8)}
                onEdit={(p) => { setEditingPost(p); setView('edit'); }}
                onDelete={deletePost}
                onTogglePublish={togglePublish}
              />
            </div>
          </div>
        )}

        {view === 'posts' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">All Posts</h1>
                <p className="text-sm text-muted-foreground mt-1">{posts.length} total articles</p>
              </div>
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> New Post
              </button>
            </div>
            <div className="bg-card border border-surface rounded-lg overflow-hidden">
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
            onCancel={() => { setView('posts'); setEditingPost(null); }}
          />
        )}
      </main>
    </div>
  );
}

function PostsTable({ posts, onEdit, onDelete, onTogglePublish }: {
  posts: BlogPost[];
  onEdit: (p: BlogPost) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (p: BlogPost) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No posts yet. Create your first article!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface">
            {["Title", "Category", "Status", "Views", "Date", "Actions"].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="border-b border-surface/50 last:border-0 hover:bg-surface-2/30 transition-colors">
              <td className="px-6 py-3">
                <div className="font-medium text-foreground line-clamp-1 max-w-xs">{post.title}</div>
                <div className="text-xs text-muted-foreground">{post.slug}</div>
              </td>
              <td className="px-6 py-3">
                <span className="text-xs bg-surface-3 text-muted-foreground px-2 py-1 rounded">{post.category}</span>
              </td>
              <td className="px-6 py-3">
                <button
                  onClick={() => onTogglePublish(post)}
                  className={`text-xs font-semibold px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                    post.status === 'published'
                      ? 'gain-badge'
                      : 'loss-badge'
                  }`}
                >
                  {post.status === 'published' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {post.status}
                </button>
              </td>
              <td className="px-6 py-3 number-font text-muted-foreground">
                {(post.views_count ?? 0).toLocaleString()}
              </td>
              <td className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(post)}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    to={`/news/${post.slug}`}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-3 rounded transition-colors"
                    target="_blank"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => onDelete(post.id)}
                    className="p-1.5 text-muted-foreground hover:text-loss hover:bg-loss/10 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
