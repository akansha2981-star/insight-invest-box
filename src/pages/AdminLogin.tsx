import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [mode,        setMode]        = useState<'login' | 'signup'>('login');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Account created! Ask your admin to grant you access, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
          if (!roles || roles.length === 0) { await supabase.auth.signOut(); throw new Error("No admin access. Contact the administrator."); }
          navigate("/admin");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const isSuccess = error.includes('Account created');

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to MarketPulse
          </Link>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="bg-red-600 rounded-xl p-2.5 shadow-card-md">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-2xl text-foreground">MarketPulse</span>
          </div>
          <div className="text-sm text-muted-foreground font-medium">Admin Portal</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-8 shadow-card-lg">
          <h1 className="text-xl font-bold text-foreground mb-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create admin account'}
          </h1>
          <p className="text-sm text-muted-foreground mb-7">
            {mode === 'login' ? 'Access the MarketPulse content management system' : 'New accounts require admin role assignment'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="admin@marketpulse.com"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`flex items-start gap-2 text-sm p-3.5 rounded-xl border ${isSuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-primary text-white rounded-xl py-3 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-card mt-2"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In to Admin' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(""); }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5 px-4">
          Admin access is role-restricted. After signing up, ask your administrator to grant you access via the database.
        </p>
      </div>
    </div>
  );
}
