import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Heart, Cake, MapPin, Star, Calendar,
  ChevronRight, Clock, HeartHandshake, Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "../../context/I18nContext";
import type { CoupleResponse } from "../../types";

interface UpcomingEvent {
  id: number;
  title: string;
  event_date: string;
  event_time: string | null;
  category: string;
  icon: string;
  recurring: string | null;
  days_until: number;
}

const CAT_COLORS: Record<string, { gradient: string; color: string }> = {
  anniversary: { gradient: "from-burnt-300 to-burnt-400", color: "#c4734d" },
  birthday: { gradient: "from-sandy-300 to-sandy-400", color: "#dfc48e" },
  date: { gradient: "from-tuscan-300 to-tuscan-400", color: "#9b6b8a" },
  trip: { gradient: "from-verdigris-400 to-verdigris-500", color: "#2dd4bf" },
  general: { gradient: "from-charcoal-300 to-charcoal-400", color: "#a0a0a0" },
};

const CAT_ICONS: Record<string, typeof Heart> = {
  anniversary: Heart,
  birthday: Cake,
  date: Calendar,
  trip: MapPin,
  general: Star,
};

function getDaysStyle(days: number): string {
  if (days === 0) return "bg-gradient-to-r from-burnt-400 to-burnt-300 text-white shadow-sm";
  if (days <= 3) return "bg-sandy-100 dark:bg-sandy-900/30 text-sandy-700 dark:text-sandy-300";
  if (days <= 7) return "bg-verdigris-50 dark:bg-verdigris-900/20 text-verdigris-600 dark:text-verdigris-300";
  return "bg-warm-100 dark:bg-charcoal-700 text-charcoal-400 dark:text-warm-400";
}

export default function UpcomingEvents() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/calendar/upcoming"),
      api.get<CoupleResponse>("/auth/couple"),
    ]).then(([evRes, coupleRes]) => {
      setEvents(evRes.data.slice(0, 5));
      setAnniversaryDate(new Date(coupleRes.data.anniversary_date));
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getDaysLabel(days: number): string {
    if (days === 0) return t("today");
    if (days === 1) return t("tomorrow");
    return t("in.days", { count: days });
  }

  // Calculate mesiversario info
  const mesiversario = useMemo(() => {
    if (!anniversaryDate) return null;
    const now = new Date();
    const annDay = anniversaryDate.getDate();

    // Find next mesiversario date
    let nextMonth = now.getMonth();
    let nextYear = now.getFullYear();

    // Check if this month's mesiversario has passed
    const maxDaysThisMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const effectiveDayThisMonth = Math.min(annDay, maxDaysThisMonth);
    const thisMonthMesiversario = new Date(nextYear, nextMonth, effectiveDayThisMonth);

    if (now > thisMonthMesiversario) {
      // Move to next month
      nextMonth++;
      if (nextMonth > 11) { nextMonth = 0; nextYear++; }
    }

    const maxDaysNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const effectiveDay = Math.min(annDay, maxDaysNextMonth);
    const nextDate = new Date(nextYear, nextMonth, effectiveDay);

    const diffTime = nextDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Which mesiversario number is it?
    const monthsCount = (nextYear - anniversaryDate.getFullYear()) * 12 + (nextMonth - anniversaryDate.getMonth());

    if (monthsCount <= 0) return null;
    if (daysUntil > 30) return null;

    return {
      daysUntil,
      monthsCount,
      isAnniversary: monthsCount % 12 === 0,
      dateStr: `${effectiveDay}/${nextMonth + 1}`,
    };
  }, [anniversaryDate]);

  if (loading) return null;

  const hasEvents = events.length > 0;
  const hasMesiversario = !!mesiversario;

  if (!hasEvents && !hasMesiversario) return null;

  return (
    <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/30 dark:border-charcoal-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tuscan-300 to-tuscan-400 flex items-center justify-center">
            <CalendarDays size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">{t("widget.upcoming")}</p>
            <p className="text-[10px] text-charcoal-400 dark:text-warm-500">{t("widget.upcoming.period")}</p>
          </div>
        </div>
        <Link to="/more" className="flex items-center gap-0.5 text-[11px] text-burnt-300 hover:text-burnt-400 font-medium transition-colors">
          {t("widget.upcoming.all")} <ChevronRight size={12} />
        </Link>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {/* Mesiversario card */}
        {hasMesiversario && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-burnt-400 to-burnt-300 dark:from-burnt-500 dark:to-burnt-400 rounded-xl p-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <HeartHandshake size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {mesiversario.isAnniversary
                    ? t("widget.anniversary.title")
                    : t("widget.mesiversario.title")
                  }
                </p>
                <p className="text-white/75 text-[10px] mt-0.5">
                  {mesiversario.isAnniversary
                    ? t("calendar.anniversary.label", { n: String(mesiversario.monthsCount / 12) })
                    : t("calendar.mesiversario.label", { n: String(mesiversario.monthsCount) })
                  }
                </p>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                  mesiversario.daysUntil === 0
                    ? "bg-white/30 text-white"
                    : "bg-white/20 text-white/90"
                }`}>
                  {getDaysLabel(mesiversario.daysUntil)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Event list */}
        <AnimatePresence>
          {events.map((ev, i) => {
            const cat = CAT_COLORS[ev.category] ?? CAT_COLORS.general;
            const Icon = CAT_ICONS[ev.category] ?? Star;
            const dateParts = ev.event_date.split("-");
            const dateLabel = dateParts.length === 3
              ? `${parseInt(dateParts[2])}/${parseInt(dateParts[1])}`
              : ev.event_date;

            return (
              <motion.div
                key={`${ev.id}-${ev.event_date}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (hasMesiversario ? 1 : 0) * 0.05 + i * 0.05 }}
                className="flex items-center gap-3 px-3 py-2.5 bg-warm-50/50 dark:bg-charcoal-700/50 rounded-xl"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: cat.color + "18", color: cat.color }}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal-600 dark:text-warm-100 truncate">{ev.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-charcoal-400 dark:text-warm-500">{dateLabel}</span>
                    {ev.event_time && (
                      <span className="flex items-center gap-0.5 text-[10px] text-charcoal-300 dark:text-warm-500">
                        <Clock size={8} />
                        {ev.event_time}
                      </span>
                    )}
                    {ev.recurring && (
                      <span className="text-[9px] text-tuscan-400 dark:text-tuscan-300 font-medium">
                        {ev.recurring}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 ${getDaysStyle(ev.days_until)}`}>
                  {getDaysLabel(ev.days_until)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty events but has mesiversario */}
        {!hasEvents && hasMesiversario && (
          <p className="text-[11px] text-charcoal-300 dark:text-warm-500 text-center py-1">
            {t("widget.upcoming.no.other")}
          </p>
        )}
      </div>
    </div>
  );
}
