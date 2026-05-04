import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, ChevronLeft, ChevronRight, Heart, Cake,
  Calendar, MapPin, Star, Clock, Repeat, CalendarDays,
  FileText, Sparkles, AlignLeft, Search, HeartHandshake,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import DatePicker from "../../components/shared/DatePicker";
import TimePicker from "../../components/shared/TimePicker";
import type { SharedCalendarEvent, DeletionRequest, CoupleResponse } from "../../types";
import CreatorBadge from "../../components/shared/CreatorBadge";
import DeleteButton from "../../components/shared/DeleteButton";

const MONTH_NAME_KEYS = [
  "budget.month.jan", "budget.month.feb", "budget.month.mar", "budget.month.apr",
  "budget.month.may", "budget.month.jun", "budget.month.jul", "budget.month.aug",
  "budget.month.sep", "budget.month.oct", "budget.month.nov", "budget.month.dec",
];

const DAY_NAME_KEYS = [
  "calendar.day.mon", "calendar.day.tue", "calendar.day.wed", "calendar.day.thu",
  "calendar.day.fri", "calendar.day.sat", "calendar.day.sun",
];

const CAT_GRADIENTS: Record<string, string> = {
  anniversary: "from-burnt-300 to-burnt-400",
  birthday: "from-sandy-300 to-sandy-400",
  date: "from-tuscan-300 to-tuscan-400",
  trip: "from-verdigris-400 to-verdigris-500",
  general: "from-charcoal-300 to-charcoal-400",
};

const CAT_COLORS: Record<string, string> = {
  anniversary: "#c4734d",
  birthday: "#dfc48e",
  date: "#9b6b8a",
  trip: "#2dd4bf",
  general: "#a0a0a0",
};

const EVENT_CATEGORIES_DATA = [
  { key: "anniversary", labelKey: "calendar.cat.anniversary", icon: Heart },
  { key: "birthday", labelKey: "calendar.cat.birthday", icon: Cake },
  { key: "date", labelKey: "calendar.cat.date", icon: Calendar },
  { key: "trip", labelKey: "calendar.cat.trip", icon: MapPin },
  { key: "general", labelKey: "calendar.cat.general", icon: Star },
];

const ICON_OPTIONS = [
  { key: "heart", icon: Heart },
  { key: "cake", icon: Cake },
  { key: "calendar", icon: Calendar },
  { key: "map-pin", icon: MapPin },
  { key: "star", icon: Star },
  { key: "clock", icon: Clock },
];

function getCategoryMeta(key: string) {
  return EVENT_CATEGORIES_DATA.find((c) => c.key === key) ?? EVENT_CATEGORIES_DATA[4];
}

function getIconComponent(key: string) {
  return ICON_OPTIONS.find((i) => i.key === key)?.icon ?? Star;
}

export default function CalendarSection() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<SharedCalendarEvent[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [_loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [anniversaryDay, setAnniversaryDay] = useState<number | null>(null);
  const [anniversaryDate, setAnniversaryDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    title: "",
    event_date: today.toISOString().slice(0, 10),
    event_time: "",
    description: "",
    category: "general",
    icon: "star",
    recurring: "",
  });

  const monthKey = viewYear + "-" + String(viewMonth + 1).padStart(2, "0");

  const load = async () => {
    try {
      const [res, delRes] = await Promise.all([
        api.get("/calendar?month=" + monthKey),
        api.get("/deletion-requests/", { params: { entity_type: "calendar_event", status: "pending" } }),
      ]);
      setEvents(res.data);
      setDeletionRequests(delRes.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  };

  // Fetch anniversary date once
  useEffect(() => {
    api.get<CoupleResponse>("/auth/couple").then((res) => {
      const d = new Date(res.data.anniversary_date);
      setAnniversaryDate(d);
      setAnniversaryDay(d.getDate());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [monthKey]);

  // Check if the anniversary day is valid for this month (e.g. day 31 in a 30-day month)
  const mesiversarioDay = useMemo(() => {
    if (!anniversaryDay) return null;
    const maxDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    // If anniversary day exceeds month's days, use last day of month
    return anniversaryDay <= maxDays ? anniversaryDay : maxDays;
  }, [anniversaryDay, viewYear, viewMonth]);

  // Calculate which mesiversario number this is
  const mesiversarioNumber = useMemo(() => {
    if (!anniversaryDate) return 0;
    const annYear = anniversaryDate.getFullYear();
    const annMonth = anniversaryDate.getMonth();
    return (viewYear - annYear) * 12 + (viewMonth - annMonth);
  }, [anniversaryDate, viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isViewingCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;

  const eventsByDay = useMemo(() => {
    const map: Record<number, SharedCalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = new Date(ev.event_date + "T12:00:00");
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    });
    return map;
  }, [events, viewYear, viewMonth]);

  const selectedEvents = useMemo(() => {
    const evs = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];
    if (!search.trim()) return evs;
    const q = search.toLowerCase();
    return evs.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  }, [selectedDay, eventsByDay, search]);

  const totalEvents = events.length;
  const daysWithEvents = Object.keys(eventsByDay).length;
  const upcomingCount = useMemo(() => {
    const todayStr = today.toISOString().slice(0, 10);
    return events.filter((e) => e.event_date >= todayStr).length;
  }, [events]);

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const canCreate = form.title.trim().length > 0 && form.event_date.length > 0;

  const create = async () => {
    if (!canCreate) return;
    await api.post("/calendar", {
      title: form.title,
      event_date: form.event_date,
      event_time: form.event_time || null,
      description: form.description || null,
      category: form.category,
      icon: form.icon,
      recurring: form.recurring || null,
    });
    setShowForm(false);
    setForm({ title: "", event_date: today.toISOString().slice(0, 10), event_time: "", description: "", category: "general", icon: "star", recurring: "" });
    load();
  };

  return (
    <div className="space-y-5">

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-tuscan-300 to-tuscan-400 flex items-center justify-center mx-auto mb-1.5">
            <CalendarDays size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{totalEvents}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("calendar.stat.total")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mx-auto mb-1.5">
            <Sparkles size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{daysWithEvents}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("calendar.stat.days")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center mx-auto mb-1.5">
            <Clock size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{upcomingCount}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("calendar.stat.upcoming")}</p>
        </div>
      </div>

      {/* ── Month Navigation ── */}
      <div className="flex items-center justify-between bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 px-2 py-2.5 shadow-sm">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 text-charcoal-400 dark:text-warm-300 transition-colors"
        >
          <ChevronLeft size={18} />
        </motion.button>
        <div className="text-center">
          <p className="text-sm font-bold text-charcoal-700 dark:text-warm-100">
            {t(MONTH_NAME_KEYS[viewMonth])} {viewYear}
          </p>
          {!isViewingCurrentMonth && (
            <button
              onClick={goToday}
              className="text-[10px] text-burnt-400 hover:text-burnt-500 font-medium mt-0.5"
            >
              {t("budget.go.current")}
            </button>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 text-charcoal-400 dark:text-warm-300 transition-colors"
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>

      {/* ── Calendar Grid ── */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 p-3 shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAME_KEYS.map((dk) => (
            <div key={dk} className="text-center text-[10px] font-semibold text-charcoal-300 dark:text-warm-500 py-1 uppercase tracking-wider">
              {t(dk)}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={"e-" + i} className="h-11" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayEvents = eventsByDay[day];
            const hasEvents = !!dayEvents;
            const selected = selectedDay === day;
            const todayDay = isToday(day);
            const isMesiversario = mesiversarioDay === day && mesiversarioNumber > 0;
            return (
              <motion.button
                key={day}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDay(selected ? null : day)}
                className={`h-11 flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all relative ${
                  selected
                    ? isMesiversario
                      ? "bg-gradient-to-br from-burnt-400 to-burnt-300 text-white shadow-md shadow-burnt-200/40"
                      : "bg-gradient-to-br from-tuscan-300 to-tuscan-400 text-white shadow-md shadow-tuscan-200/30"
                    : isMesiversario
                      ? "bg-burnt-50 dark:bg-burnt-900/20 text-burnt-500 dark:text-burnt-300 font-bold ring-1 ring-burnt-200 dark:ring-burnt-700"
                      : todayDay
                        ? "bg-tuscan-50 dark:bg-tuscan-900/20 text-tuscan-600 dark:text-tuscan-300 font-bold ring-1 ring-tuscan-200 dark:ring-tuscan-700"
                        : "text-charcoal-600 dark:text-warm-200 hover:bg-warm-50 dark:hover:bg-charcoal-700"
                }`}
              >
                {day}
                {isMesiversario && !selected && (
                  <Heart size={7} className="absolute top-1 right-1 text-burnt-400 fill-burnt-400" />
                )}
                {isMesiversario && selected && (
                  <Heart size={7} className="absolute top-1 right-1 text-white fill-white" />
                )}
                {hasEvents && (
                  <div className="flex gap-0.5 absolute bottom-1">
                    {(dayEvents.length <= 3 ? dayEvents : dayEvents.slice(0, 3)).map((ev, idx) => (
                      <span
                        key={idx}
                        className="w-1 h-1 rounded-full"
                        style={{ background: selected ? "#fff" : (CAT_COLORS[ev.category] || "#a0a0a0") }}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Selected Day Events ── */}
      <AnimatePresence mode="wait">
        {selectedDay !== null && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Day header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-charcoal-600 dark:text-warm-200">
                {selectedDay} {t("calendar.of")} {t(MONTH_NAME_KEYS[viewMonth])}
              </h3>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-tuscan-300 to-tuscan-400 text-white text-xs font-semibold shadow-sm"
              >
                <Plus size={13} />
                {t("calendar.new")}
              </motion.button>
            </div>

            {/* Mesiversario banner */}
            {mesiversarioDay === selectedDay && mesiversarioNumber > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-burnt-400 to-burnt-300 dark:from-burnt-500 dark:to-burnt-400 rounded-2xl p-4 shadow-lg shadow-burnt-200/30 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-8 -translate-x-8" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <HeartHandshake size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">
                      {t("calendar.mesiversario.title")}
                    </p>
                    <p className="text-white/80 text-xs mt-0.5">
                      {mesiversarioNumber === 12 || mesiversarioNumber % 12 === 0
                        ? t("calendar.anniversary.label", { n: String(mesiversarioNumber / 12) })
                        : t("calendar.mesiversario.label", { n: String(mesiversarioNumber) })
                      }
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-white">{mesiversarioNumber}</span>
                    <span className="text-[9px] text-white/70 uppercase tracking-wider">
                      {mesiversarioNumber % 12 === 0 ? t("calendar.years") : t("calendar.months")}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Search (if events > 3) */}
            {(eventsByDay[selectedDay]?.length ?? 0) > 3 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("calendar.search.placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-charcoal-800 border border-warm-200/30 dark:border-charcoal-700/50 rounded-xl text-sm outline-none focus:border-tuscan-200 dark:focus:border-tuscan-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                />
              </div>
            )}

            {/* Events list */}
            {selectedEvents.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-charcoal-700 dark:to-charcoal-600 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="text-warm-400" size={24} />
                </div>
                <p className="text-sm font-medium text-charcoal-400 dark:text-warm-400">{t("calendar.no.events")}</p>
                <p className="text-xs text-charcoal-300 dark:text-warm-500 mt-1">{t("calendar.empty.hint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev, i) => {
                  const cat = getCategoryMeta(ev.category);
                  const EvIcon = getIconComponent(ev.icon);
                  const gradient = CAT_GRADIENTS[ev.category] || CAT_GRADIENTS.general;
                  const catColor = CAT_COLORS[ev.category] || CAT_COLORS.general;
                  const delReq = deletionRequests.find(
                    (r) => r.entity_type === "calendar_event" && r.entity_id === ev.id
                  );
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden"
                    >
                      {/* Category color strip */}
                      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

                      <div className="p-3.5 flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: catColor + "18", color: catColor }}
                        >
                          <EvIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-charcoal-600 dark:text-warm-100 truncate">{ev.title}</h4>
                            {ev.recurring && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-tuscan-50 dark:bg-tuscan-900/20 text-tuscan-500 dark:text-tuscan-300 rounded-lg text-[9px] font-semibold">
                                <Repeat size={8} />
                                {ev.recurring}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {ev.event_time && (
                              <span className="flex items-center gap-1 text-[10px] text-charcoal-400 dark:text-warm-400 bg-warm-50 dark:bg-charcoal-700 px-2 py-0.5 rounded-lg">
                                <Clock size={9} />
                                {ev.event_time}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] text-charcoal-300 dark:text-warm-500 bg-warm-50 dark:bg-charcoal-700 px-2 py-0.5 rounded-lg" style={{ color: catColor }}>
                              {(() => { const CI = cat.icon; return <CI size={9} />; })()}
                              {t(cat.labelKey)}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-[11px] text-charcoal-400 dark:text-warm-400 mt-1.5 leading-relaxed">{ev.description}</p>
                          )}
                          <div className="mt-1.5">
                            <CreatorBadge userId={ev.added_by} date={ev.created_at} />
                          </div>
                        </div>
                        <DeleteButton
                          entityType="calendar_event"
                          entityId={ev.id}
                          pendingRequest={delReq}
                          currentUserId={user?.id ?? 0}
                          onAction={load}
                          size="sm"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm">
              {/* Form header bar */}
              <div className="bg-gradient-to-r from-tuscan-50 to-warm-50 dark:from-charcoal-700 dark:to-charcoal-700 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-tuscan-300 to-tuscan-400 flex items-center justify-center">
                    <CalendarDays size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">{t("calendar.new")}</span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1 text-charcoal-300 dark:text-warm-400 hover:text-charcoal-500">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Title */}
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t("calendar.event.title")}
                    className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-tuscan-200 dark:focus:border-tuscan-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                  />
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker
                    value={form.event_date}
                    onChange={(v) => setForm({ ...form, event_date: v })}
                    placeholder={t("calendar.event.date")}
                  />
                  <TimePicker
                    value={form.event_time}
                    onChange={(v) => setForm({ ...form, event_time: v })}
                    placeholder={t("calendar.event.time")}
                  />
                </div>

                {/* Description */}
                <div className="relative">
                  <AlignLeft size={14} className="absolute left-3 top-3 text-warm-400" />
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("calendar.event.desc")}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-tuscan-200 dark:focus:border-tuscan-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400 resize-none"
                  />
                </div>

                {/* Category selector */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-charcoal-500 dark:text-warm-300">{t("calendar.category")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_CATEGORIES_DATA.map((cat) => {
                      const CIcon = cat.icon;
                      const isActive = form.category === cat.key;
                      const catColor = CAT_COLORS[cat.key];
                      return (
                        <motion.button
                          key={cat.key}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => setForm({ ...form, category: cat.key })}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            isActive
                              ? "text-white shadow-sm"
                              : "bg-warm-50 dark:bg-charcoal-700 text-charcoal-400 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-charcoal-600"
                          }`}
                          style={isActive ? { background: catColor } : undefined}
                        >
                          <CIcon size={12} />
                          {t(cat.labelKey)}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Icon selector */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-charcoal-500 dark:text-warm-300">{t("calendar.icon")}</p>
                  <div className="flex gap-1.5">
                    {ICON_OPTIONS.map((opt) => {
                      const OptIcon = opt.icon;
                      const isActive = form.icon === opt.key;
                      return (
                        <motion.button
                          key={opt.key}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setForm({ ...form, icon: opt.key })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-gradient-to-br from-tuscan-300 to-tuscan-400 text-white shadow-sm"
                              : "bg-warm-50 dark:bg-charcoal-700 text-charcoal-400 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-charcoal-600"
                          }`}
                        >
                          <OptIcon size={16} />
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={create}
                  disabled={!canCreate}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-tuscan-300 to-tuscan-400 text-white text-sm font-semibold disabled:opacity-40 shadow-md shadow-tuscan-200/20"
                >
                  {t("calendar.create")}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
