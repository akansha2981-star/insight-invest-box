import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { TrendingUp, Eye, EyeOff, AlertCircle, ArrowLeft, User } from "lucide-react";

export default function UserLogin() {
  const rawNavigate = useNavigate();
  const nextPath = (() => { const n = new URLSearchParams(window.location.search).get("next"); return n && n.startsWith("/") && !n.startsWith("//") ? n : "/"; })();
  const navigate = (to: string) => rawNavigate(to === "/" ? nextPath : to);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const provider = session.user.app_metadata?.provider || "email";
        await supabase.from("auth_events").insert({
          user_id: session.user.id,
          event_type: "login",
          provider,
        });
        navigate("/");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) setError(result.error.message || "Google sign-in failed");
    } catch (err: any) {
      setError(err.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSuccess("Account created! Please check your email to verify your account, then sign in.");
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from("auth_events").insert({
            user_id: data.user.id,
            event_type: "login",
            provider: "email",
          });
          navigate("/");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Investing IQ
          </Link>
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="bg-destructive rounded-xl p-2.5 shadow-card-md">
              <TrendingUp className="h-6 w-6 text-destructive-foreground" />
            </div>
            <span className="font-black text-2xl text-foreground">Investing IQ</span>
          </div>
          <div className="text-sm text-muted-foreground font-medium">Your Investment Companion</div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-8 shadow-card-lg">
          <h1 className="text-xl font-bold text-foreground mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-7">
            {mode === "login"
              ? "Sign in to access your portfolio, watchlist, and personalized insights"
              : "Join Investing IQ for personalized market analysis and tools"}
          </p>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-border rounded-xl py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60 mb-5 shadow-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Email address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="--------"
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm p-3.5 rounded-xl border bg-red-50 border-red-200 text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 text-sm p-3.5 rounded-xl border bg-green-50 border-green-200 text-green-700">
                <User className="h-4 w-4 mt-0.5 shrink-0" /> {success}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-primary text-white rounded-xl py-3 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-card mt-2"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <button
              onClick={() => { setMode((m) => (m === "login" ? "signup" : "login")); setError(""); setSuccess(""); }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5 px-4">
          By signing in, you agree to our <Link to="/terms" className="underline hover:text-foreground">Terms of Use</Link> and <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
