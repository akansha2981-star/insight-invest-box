import { supabase } from "@/integrations/supabase/client";

export type ActivityCategory =
  | "auth"
  | "navigation"
  | "content"
  | "ai"
  | "settings"
  | "delete"
  | "publish"
  | "other";

interface LogActivityParams {
  action: string;
  category?: ActivityCategory;
  details?: Record<string, unknown>;
}

export async function logAdminActivity({ action, category = "other", details = {} }: LogActivityParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_activity_log").insert([{
      admin_id: user.id,
      admin_email: user.email ?? undefined,
      action,
      category,
      details: details as never,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
    }]);
  } catch (e) {
    // Silent — logging must never break the UI
    console.warn("logAdminActivity failed", e);
  }
}
