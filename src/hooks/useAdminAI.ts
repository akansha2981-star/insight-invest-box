import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AIGenerateOptions {
  action: string;
  context?: Record<string, unknown>;
}

export function useAdminAI() {
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function generateContent(options: AIGenerateOptions): Promise<any | null> {
    setGenerating(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-admin-generate", {
        body: options,
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI generation failed";
      setAiError(msg);
      return null;
    } finally {
      setGenerating(false);
    }
  }

  return { generating, aiError, generateContent, setAiError };
}
