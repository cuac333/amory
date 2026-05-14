import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock4, Plus, X, Trash2,
  Heart, Diamond, Plane, Home, Baby, GraduationCap, Cake, Star,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { TimelineEvent } from "../../types";
import DatePicker from "../../components/shared/DatePicker";
import CreatorBadge from "../../components/shared/CreatorBadge";
import { ClickableImage } from "../../components/shared/ImageViewer";

const ICON_OPTIONS_DATA: { key: string; labelKey: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { key: "heart", labelKey: "timeline.icon.love", icon: Heart },
  { key: "ring", labelKey: "timeline.icon.ring", icon: Diamond },
  { key: "plane", labelKey: "timeline.icon.trip", icon: Plane },
  { key: "home", labelKey: "timeline.icon.home", icon: Home },
  { key: "baby", labelKey: "timeline.icon.baby", icon: Baby },
  { key: "graduation", labelKey: "timeline.icon.achievement", icon: GraduationCap },
  { key: "cake", labelKey: "timeline.icon.birthday", icon: Cake },
  { key: "star", labelKey: "timeline.icon.special", icon: Star },
];

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = Object.fromEntries(
  ICON_OPTIONS_DATA.map((o) => [o.key, o.icon])
);

export default function TimelineSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [icon, setIcon] = useState("heart");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/timeline")
      .then((res) => {
        const sorted = (res.data as TimelineEvent[]).sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );
        setEvents(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim() || !eventDate) return;
    setSaving(true);
    try {
      await api.post("/timeline", {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        icon,
      });
      setTitle(""); setDescription(""); setEventDate(""); setIcon("heart");
      setShowForm(false);
      load();
    } catch { /* */ }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/timeline/${id}`); load(); } catch { /* */ }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-sandy-200 border-t-sandy-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-medium text-burnt-300 hover:text-burnt-400 transition-colors"
        >
          <Plus size={16} /> {t("timeline.add")}
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="bg-white rounded-2xl p-4 shadow-soft space-y-3 border border-warm-200/60">
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={t("timeline.title.placeholder")}
                className="w-full px-3 py-2 rounded-xl bg-warm-50 border border-warm-200 text-sm focus:outline-none focus:border-burnt-200 text-charcoal-500"
              />
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={t("timeline.desc.placeholder")}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-warm-50 border border-warm-200 text-sm focus:outline-none focus:border-burnt-200 text-charcoal-500 resize-none"
              />
              <DatePicker value={eventDate} onChange={setEventDate} placeholder={t("timeline.date")} />

              {/* Icon selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {ICON_OPTIONS_DATA.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setIcon(opt.key)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all text-xs ${
                        icon === opt.key
                          ? "bg-sandy-50 text-sandy-500 ring-1 ring-sandy-200"
                          : "text-charcoal-300 hover:bg-warm-50"
                      }`}
                    >
                      <OptIcon size={16} />
                      <span className="text-[9px]">{t(opt.labelKey)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !title.trim() || !eventDate}
                  className="flex-1 py-2 rounded-xl bg-burnt-300 text-white text-sm font-medium hover:bg-burnt-400 transition-colors disabled:opacity-40"
                >
                  {saving ? t("creating") : t("timeline.add.btn")}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl bg-warm-100 text-charcoal-400 text-sm hover:bg-warm-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Clock4 size={44} className="mx-auto mb-3 text-warm-300" />
          <p className="text-charcoal-300 text-sm">{t("timeline.empty")}</p>
        </motion.div>
      ) : (
        <div className="relative ml-4">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-sandy-200 via-burnt-200 to-sandy-200 rounded-full" />

          <div className="space-y-6">
            {events.map((event, i) => {
              const EventIcon = ICON_MAP[event.icon] || Heart;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative pl-10"
                >
                  {/* Dot */}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-sandy-300 to-burnt-300 flex items-center justify-center shadow-md">
                    <EventIcon size={12} className="text-white" />
                  </div>

                  <div className="bg-white rounded-2xl shadow-soft border border-warm-200/60 p-4">
                    {/* Date */}
                    <p className="text-[10px] font-medium text-sandy-400 uppercase tracking-wider mb-1">
                      {formatDate(event.event_date)}
                    </p>

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-charcoal-600 text-sm">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">{event.description}</p>
                        )}
                        <CreatorBadge userId={event.added_by} date={event.created_at} />
                      </div>
                      {user && event.added_by === user.id && (
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-1.5 rounded-lg text-warm-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {event.photo_url && (
                      <ClickableImage
                        src={event.photo_url}
                        alt={event.title}
                        className="mt-2.5 rounded-xl w-full h-32 object-cover"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
