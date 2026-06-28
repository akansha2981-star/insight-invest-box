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
    await supabase.from("admin_activity_log").insert({
      admin_id: user.id,
      admin_email: user.email ?? null,
      action,
      category,
      details,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch (e) {
    // Silent — logging must never break the UI
    console.warn("logAdminActivity failed", e);
  }
}
