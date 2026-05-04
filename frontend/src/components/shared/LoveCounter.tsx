import { useState, useEffect } from "react";
import api from "../../services/api";
import type { LoveCounter as LoveCounterType } from "../../types";
import { Heart, Clock, CalendarHeart, CalendarDays } from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

type Mode = "total" | "next_month" | "next_year";

const MODE_LABELS: Record<Mode, string> = {
  total: "counter.total",
  next_month: "counter.next.month",
  next_year: "counter.next.year",
};

const MODE_ICONS: Record<Mode, typeof Heart> = {
  total: Heart,
  next_month: CalendarDays,
  next_year: CalendarHeart,
};

const MODES: Mode[] = ["total", "next_month", "next_year"];

function getNextMonthiversary(anniversary: Date, now: Date): Date {
  // Find next occurrence of the same day-of-month
  const day = anniversary.getDate();
  let year = now.getFullYear();
  let month = now.getMonth();

  // Try current month first
  let candidate = new Date(year, month, day);
  if (candidate <= now) {
    // Move to next month
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    candidate = new Date(year, month, day);
  }
  // Handle months where the day doesn't exist (e.g., 31 in February)
  if (candidate.getDate() !== day) {
    // Day overflowed — use last day of intended month
    candidate = new Date(year, month + 1, 0);
  }
  return candidate;
}

function getNextAnniversary(anniversary: Date, now: Date): Date {
  const thisYear = new Date(now.getFullYear(), anniversary.getMonth(), anniversary.getDate());
  if (thisYear > now) return thisYear;
  return new Date(now.getFullYear() + 1, anniversary.getMonth(), anniversary.getDate());
}

function breakdown(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  const daysLeft = remainingDays % 30;
  return { years, months, days: daysLeft, hours, minutes, seconds };
}

export default function LoveCounter() {
  const { t } = useTranslation();
  const [counter, setCounter] = useState<LoveCounterType | null>(null);
  const [mode, setMode] = useState<Mode>("total");
  const [, setTick] = useState(0);

  useEffect(() => {
    api.get("/love-counter").then((res) => setCounter(res.data)).catch(() => {});
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!counter) return null;

  const anniversary = new Date(counter.anniversary_date);
  const now = new Date();

  let diff: number;
  let subtitle = "";

  if (mode === "total") {
    diff = Math.abs(now.getTime() - anniversary.getTime());
    subtitle = anniversary.getTime() > now.getTime() ? t("counter.until.start") : t("counter.loving");
  } else if (mode === "next_month") {
    const next = getNextMonthiversary(anniversary, now);
    diff = next.getTime() - now.getTime();
    subtitle = `${next.getDate()} de ${next.toLocaleDateString("es", { month: "long" })}`;
  } else {
    const next = getNextAnniversary(anniversary, now);
    diff = next.getTime() - now.getTime();
    const yearsCount = next.getFullYear() - anniversary.getFullYear();
    subtitle = `${yearsCount} año${yearsCount !== 1 ? "s" : ""} — ${next.toLocaleDateString("es", { day: "numeric", month: "long" })}`;
  }

  const b = breakdown(diff);

  const units =
    mode === "total"
      ? [
          { label: t("counter.years"), value: b.years },
          { label: t("counter.months"), value: b.months },
          { label: t("counter.days"), value: b.days },
          { label: t("counter.hours"), value: b.hours },
          { label: t("counter.min"), value: b.minutes },
          { label: t("counter.sec"), value: b.seconds },
        ]
      : [
          { label: t("counter.days"), value: Math.floor(diff / 86400000) },
          { label: t("counter.hours"), value: b.hours },
          { label: t("counter.min"), value: b.minutes },
          { label: t("counter.sec"), value: b.seconds },
        ];

  const ModeIcon = MODE_ICONS[mode];

  const cycleMode = () => {
    const idx = MODES.indexOf(mode);
    setMode(MODES[(idx + 1) % MODES.length]);
  };

  return (
    <div className="relative overflow-hidden bg-burnt-400 dark:bg-burnt-500 rounded-2xl md:rounded-3xl p-4 md:p-8">
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

      <div className="relative z-10">
        {/* Mode toggle */}
        <div className="flex items-center justify-between mb-2.5 md:mb-4">
          <div className="flex items-center gap-1.5">
            <ModeIcon size={14} className="text-sandy-100 fill-sandy-200 md:hidden" />
            <ModeIcon size={18} className="text-sandy-100 fill-sandy-200 hidden md:block" />
            <p className="font-handwriting text-base md:text-xl text-white/90">
              {subtitle}
            </p>
          </div>
          <button
            onClick={cycleMode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-[10px] md:text-xs text-white/80 font-medium"
          >
            {t(MODE_LABELS[MODES[(MODES.indexOf(mode) + 1) % MODES.length]])}
          </button>
        </div>

        <div className={`grid gap-1.5 md:gap-3 ${units.length === 6 ? "grid-cols-6" : "grid-cols-4"}`}>
          {units.map((u) => (
            <div key={u.label} className="bg-white/15 backdrop-blur-sm rounded-xl md:rounded-2xl p-1.5 md:p-3 text-center">
              <div className="text-lg md:text-3xl font-bold text-white tabular-nums">{u.value}</div>
              <div className="text-[8px] md:text-xs text-white/60 font-medium mt-0.5">{u.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mt-2.5 md:mt-4">
          <Clock size={10} className="text-white/40" />
          <p className="text-[9px] md:text-[11px] text-white/40">{t("real.time")}</p>
        </div>
      </div>
    </div>
  );
}
