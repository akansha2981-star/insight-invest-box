import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight, Megaphone, X } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  bg_color: string;
  banner_type: string;
  sort_order: number;
  image_url: string | null;
}

const BG_MAP: Record<string, string> = {
  blue:    "from-primary/90 to-primary",
  emerald: "from-emerald-600 to-emerald-700",
  amber:   "from-amber-500 to-amber-600",
  red:     "from-red-500 to-red-600",
  purple:  "from-purple-600 to-purple-700",
  slate:   "from-slate-700 to-slate-800",
};

export function HomeBannerSlider() {
  const [heroBanners, setHeroBanners] = useState<Banner[]>([]);
  const [announcements, setAnnouncements] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("home_banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: { data: Banner[] | null }) => {
        const d = data ?? [];
        setHeroBanners(d.filter(b => b.banner_type === "hero"));
        setAnnouncements(d.filter(b => b.banner_type === "announcement"));
      });
  }, []);

  const go = useCallback((idx: number) => {
    setCurrent((idx + heroBanners.length) % heroBanners.length);
  }, [heroBanners.length]);

  // Auto-scroll
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % heroBanners.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [heroBanners.length]);

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (heroBanners.length === 0 && announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Announcements — minimal pill style */}
      {visibleAnnouncements.map(ann => (
        <div key={ann.id} className="relative bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="flex-1 text-[13px] font-medium text-foreground leading-snug">{ann.title}</p>
          {ann.cta_url && ann.cta_label && (
            <Link to={ann.cta_url} className="shrink-0 text-[11px] font-semibold text-primary hover:underline">
              {ann.cta_label}
            </Link>
          )}
          <button onClick={() => setDismissed(s => new Set([...s, ann.id]))}
            className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Hero Banner — clean slide with CSS transition */}
      {heroBanners.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden group" style={{ minHeight: '220px' }}>
          {/* Slides */}
          <div className="relative w-full h-full" style={{ minHeight: '220px' }}>
            {heroBanners.map((b, i) => {
              const hasImage = !!b.image_url;
              return (
                <div
                  key={b.id}
                  className="absolute inset-0 transition-opacity duration-700 ease-in-out"
                  style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
                >
                  {/* Background */}
                  {hasImage ? (
                    <>
                      <img src={b.image_url!} alt={b.title}
                        className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${BG_MAP[b.bg_color] ?? BG_MAP.blue}`} />
                  )}

                  {/* Content */}
                  <div className="relative h-full flex items-center px-8 sm:px-12 py-10">
                    <div className="max-w-xl">
                      <h2 className="font-bold text-xl sm:text-2xl lg:text-3xl text-white leading-tight mb-2 tracking-tight">
                        {b.title}
                      </h2>
                      {b.subtitle && (
                        <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-md">{b.subtitle}</p>
                      )}
                      {b.cta_url && b.cta_label && (
                        <Link to={b.cta_url}
                          className="inline-flex items-center gap-2 bg-white text-foreground text-[13px] font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors shadow-sm">
                          {b.cta_label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom bar: dots + arrows */}
          {heroBanners.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-10">
              <button onClick={() => go(current - 1)}
                className="bg-white/20 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-white/30 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                {heroBanners.map((_, i) => (
                  <button key={i} onClick={() => go(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === current ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                    }`} />
                ))}
              </div>
              <button onClick={() => go(current + 1)}
                className="bg-white/20 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-white/30 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
