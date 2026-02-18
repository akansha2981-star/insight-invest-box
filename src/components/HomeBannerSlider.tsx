import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pause, Play, ArrowRight, Megaphone, X } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  bg_color: string;
  banner_type: string;
  sort_order: number;
}

const BG_MAP: Record<string, string> = {
  blue:    "from-blue-700 via-blue-600 to-indigo-700",
  emerald: "from-emerald-700 via-emerald-600 to-teal-700",
  amber:   "from-amber-600 via-orange-600 to-amber-700",
  red:     "from-red-700 via-red-600 to-rose-700",
  purple:  "from-purple-700 via-purple-600 to-indigo-700",
  slate:   "from-slate-800 via-slate-700 to-slate-800",
};

const ACCENT_MAP: Record<string, string> = {
  blue:    "bg-white text-blue-700",
  emerald: "bg-white text-emerald-700",
  amber:   "bg-white text-amber-700",
  red:     "bg-white text-red-700",
  purple:  "bg-white text-purple-700",
  slate:   "bg-white text-slate-700",
};

export function HomeBannerSlider() {
  const [heroBanners, setHeroBanners] = useState<Banner[]>([]);
  const [announcements, setAnnouncements] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    if (!playing || heroBanners.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % heroBanners.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, heroBanners.length]);

  const visibleAnnouncements = announcements.filter(a => !dismissedAnnouncements.has(a.id));

  if (heroBanners.length === 0 && announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* ── Announcement Bar ── */}
      {visibleAnnouncements.map(ann => (
        <div
          key={ann.id}
          className={`relative rounded-xl px-5 py-3 flex items-center gap-3 border text-white bg-gradient-to-r ${BG_MAP[ann.bg_color] ?? BG_MAP.blue}`}
        >
          <Megaphone className="h-4 w-4 shrink-0 opacity-80" />
          <p className="flex-1 text-[13px] font-semibold leading-snug">{ann.title}</p>
          {ann.cta_url && ann.cta_label && (
            <Link
              to={ann.cta_url}
              className={`shrink-0 text-[11px] font-black px-3 py-1.5 rounded-lg transition-all ${ACCENT_MAP[ann.bg_color] ?? ACCENT_MAP.blue} hover:opacity-90`}
            >
              {ann.cta_label}
            </Link>
          )}
          <button
            onClick={() => setDismissedAnnouncements(s => new Set([...s, ann.id]))}
            className="shrink-0 opacity-60 hover:opacity-100 p-1 rounded transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* ── Hero Banner Slider ── */}
      {heroBanners.length > 0 && (() => {
        const b = heroBanners[current];
        return (
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${BG_MAP[b.bg_color] ?? BG_MAP.blue} shadow-lg group`}>
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
            />

            <div className="relative px-6 py-7 sm:px-10 sm:py-10 text-white">
              {/* Dot indicators top-right */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                {heroBanners.map((_, i) => (
                  <button key={i} onClick={() => go(i)}
                    className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/35 hover:bg-white/60'}`}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="max-w-2xl">
                <h2 className="font-black text-xl sm:text-2xl leading-snug mb-2">{b.title}</h2>
                {b.subtitle && (
                  <p className="text-white/75 text-[13px] sm:text-sm leading-relaxed mb-5">{b.subtitle}</p>
                )}
                {b.cta_url && b.cta_label && (
                  <Link to={b.cta_url}
                    className={`inline-flex items-center gap-1.5 text-[13px] font-black px-5 py-2.5 rounded-xl transition-all hover:opacity-90 hover:scale-105 ${ACCENT_MAP[b.bg_color] ?? ACCENT_MAP.blue}`}
                  >
                    {b.cta_label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Nav arrows */}
            {heroBanners.length > 1 && (
              <>
                <button onClick={() => go(current - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => go(current + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setPlaying(p => !p)}
                  className="absolute bottom-3 right-4 bg-black/30 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/50 transition-all">
                  {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
