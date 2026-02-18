import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";

interface PageSection {
  id: string;
  title: string;
  content: string;
  section_type: string;
  sort_order: number;
}

export function PageSectionsBanner({ pageKey }: { pageKey: string }) {
  const [sections, setSections] = useState<PageSection[]>([]);

  useEffect(() => {
    supabase
      .from("page_sections")
      .select("id,title,content,section_type,sort_order")
      .eq("page_key", pageKey)
      .eq("is_visible", true)
      .order("sort_order")
      .then(({ data }) => setSections(data ?? []));
  }, [pageKey]);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`rounded-xl px-5 py-4 border flex gap-3 items-start ${
            section.section_type === "alert"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-primary/5 border-primary/20 text-foreground"
          }`}
        >
          <Info className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />
          <div>
            <div className="font-bold text-sm">{section.title}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{section.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
