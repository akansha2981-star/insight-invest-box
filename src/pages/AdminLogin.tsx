import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [error,       setError]       = useState("");
  const [mode,        setMode]        = useState<'login' | 'signup'>('login');
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [noAdmins,    setNoAdmins]    = useState(false);

  useEffect(() => {
    // Check if user is already logged in and if there are no admins
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        // Check if they already have a role
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        if (roles && roles.length > 0) {
          navigate("/admin");
          return;
        }
        // Check if any admin exists at all
        const { data: admins } = await supabase.from("user_roles").select("id").eq("role", "admin").limit(1);
        if (!admins || admins.length === 0) setNoAdmins(true);
      }
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // After signup, sign them in to check
        const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInData.user) {
          setIsLoggedIn(true);
          const { data: admins } = await supabase.from("user_roles").select("id").eq("role", "admin").limit(1);
          if (!admins || admins.length === 0) {
            setNoAdmins(true);
            setError("Account created! No admin exists yet — click 'Claim Admin Access' below to become the first admin.");
          } else {
            setError("Account created! Ask your admin to grant you access, then sign in.");
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          setIsLoggedIn(true);
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
          if (!roles || roles.length === 0) {
            // Check if any admin exists
            const { data: admins } = await supabase.from("user_roles").select("id").eq("role", "admin").limit(1);
            if (!admins || admins.length === 0) {
              setNoAdmins(true);
              setError("No admins exist yet — click 'Claim Admin Access' below.");
            } else {
              await supabase.auth.signOut();
              setIsLoggedIn(false);
              throw new Error("No admin access. Contact the administrator.");
            }
          } else {
            navigate("/admin");
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimAdmin() {
    setClaimLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be signed in first.");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-first-admin`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to claim admin");
      navigate("/admin");
    } catch (err: any) {
      setError(err.message ?? "An error occurred");
    } finally {
      setClaimLoading(false);
    }
  }

  const isSuccess = error.includes('Account created') || error.includes('No admins exist') || error.includes('click');

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to MarketPulse
          </Link>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="bg-destructive rounded-xl p-2.5 shadow-card-md">
              <TrendingUp className="h-6 w-6 text-destructive-foreground" />
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

          {/* Claim Admin button — only shown when user is logged in and no admins exist */}
          {isLoggedIn && noAdmins && (
            <div className="mt-4 p-4 bg-accent border border-border rounded-xl">
              <p className="text-xs text-foreground mb-3 font-medium">
                🎉 You're the first user! No admin exists yet. Claim admin access to manage the platform.
              </p>
              <button
                onClick={handleClaimAdmin}
                disabled={claimLoading}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                {claimLoading ? 'Claiming…' : 'Claim Admin Access'}
              </button>
            </div>
          )}

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
          Admin access is role-restricted. The first user to sign up can claim admin access automatically.
        </p>
      </div>
    </div>
  );
}
