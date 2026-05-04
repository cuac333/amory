import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plane, Gift, Cake, Heart, Star, Music, Utensils,
  Plus, Trash2, X, Timer, Send, Sparkles, PartyPopper,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import DatePicker from "../../components/shared/DatePicker";
import type { EventCountdown } from "../../types";

// ─── Icons ───

const ICONS: Record<string, typeof Calendar> = {
  calendar: Calendar, plane: Plane, gift: Gift, cake: Cake,
  heart: Heart, star: Star, music: Music, utensils: Utensils,
};

const ICON_COLORS: Record<string, string> = {
  calendar: "from-burnt-300 to-sandy-300",
  plane: "from-sky-400 to-blue-500",
  gift: "from-pink-400 to-rose-500",
  cake: "from-amber-300 to-orange-400",
  heart: "from-rose-400 to-pink-500",
  star: "from-yellow-300 to-amber-400",
  music: "from-purple-400 to-violet-500",
  utensils: "from-teal-400 to-emerald-500",
};

// ─── Helpers ───

function getTimeLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return { passed: true, d: 0, h: 0, m: 0, s: 0 };
  return {
    passed: false,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function getProgress(created: string, target: string) {
  const start = new Date(created).getTime();
  const end = new Date(target).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main Component ───

export default function CountdownGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<EventCountdown[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", icon: "calendar" });
  const [, tick] = useState(0);
  const [partnerName, setPartnerName] = useState("");

  const load = () => {
    api.get("/countdowns").then((r) => setItems(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/auth/partner").then((r) => setPartnerName(r.data.name)).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const upcoming = [...items]
    .filter((i) => !getTimeLeft(i.event_date).passed)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const passed = [...items]
    .filter((i) => getTimeLeft(i.event_date).passed)
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  const create = async () => {
    if (!form.title.trim() || !form.event_date) return;
    await api.post("/countdowns", {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date,
      icon: form.icon,
    });
    setForm({ title: "", description: "", event_date: "", icon: "calendar" });
    setShowForm(false);
    load();
  };

  const remove = async (id: number) => {
    await api.delete(`/countdowns/${id}`);
    load();
  };

  const getCreatorName = (createdBy: number | null) => {
    if (!createdBy) return "";
    return createdBy === user?.id ? (user?.name || t("jar.you")) : (partnerName || t("jar.partner"));
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-burnt-300 via-sandy-300 to-teal-300 shadow-lg shadow-burnt-200/30 dark:shadow-burnt-900/30 mb-3">
          <Timer size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          {t("countdown.title")}
        </h2>
        <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-1">{t("countdown.desc")}</p>
      </div>

      {/* ── Add Button ── */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-warm-300/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] text-sm font-medium flex items-center justify-center gap-2 hover:border-burnt-300/60 hover:text-burnt-400 dark:hover:border-burnt-400/40 dark:hover:text-burnt-300 transition-colors"
      >
        <Plus size={16} /> {t("countdown.new")}
      </button>

      {/* ── Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-soft border border-warm-200/60 dark:border-[#3a3f42] space-y-4">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("countdown.title.placeholder")}
                maxLength={100}
                className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
              />
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("countdown.desc.placeholder")}
                maxLength={200}
                className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
              />
              <DatePicker
                value={form.event_date}
                onChange={(v) => setForm({ ...form, event_date: v })}
                placeholder={t("countdown.date")}
              />

              {/* Icon selector */}
              <div>
                <span className="text-xs font-medium text-charcoal-500 dark:text-[#a39e98] mb-2 block">{t("countdown.icon")}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(ICONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      onClick={() => setForm({ ...form, icon: key })}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        form.icon === key
                          ? "bg-gradient-to-br from-burnt-300 to-sandy-300 text-white shadow-md scale-110"
                          : "bg-warm-100/80 dark:bg-[#2e3133] text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-200 dark:hover:bg-[#353a3c]"
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={create}
                  disabled={!form.title.trim() || !form.event_date}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 dark:shadow-burnt-900/30"
                >
                  <Send size={15} /> {t("create")}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-3 rounded-2xl bg-warm-100 dark:bg-[#2e3133] text-charcoal-400 dark:text-[#8a8580] text-sm hover:bg-warm-200 dark:hover:bg-[#353a3c] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm-100/80 dark:bg-[#2e3133] mb-3">
            <Calendar size={28} className="text-warm-300 dark:text-[#5a5550]" />
          </div>
          <p className="text-charcoal-300 dark:text-[#6e6862] text-sm">{t("countdown.empty")}</p>
        </div>
      )}

      {/* ── Upcoming Events ── */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          {upcoming.map((item, i) => (
            <CountdownCard
              key={item.id}
              item={item}
              index={i}
              user={user}
              t={t}
              onRemove={remove}
              getCreatorName={getCreatorName}
            />
          ))}
        </div>
      )}

      {/* ── Passed Events ── */}
      {passed.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider px-1">
            {t("countdown.passed")} 🎉
          </p>
          {passed.map((item, i) => (
            <PassedCard
              key={item.id}
              item={item}
              index={i}
              user={user}
              t={t}
              onRemove={remove}
              getCreatorName={getCreatorName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Countdown Card (Upcoming) ───

interface CardProps {
  item: EventCountdown;
  index: number;
  user: any;
  t: (k: string) => string;
  onRemove: (id: number) => void;
  getCreatorName: (id: number | null) => string;
}

function CountdownCard({ item, index, user, t, onRemove, getCreatorName }: CardProps) {
  const tl = getTimeLeft(item.event_date);
  const progress = getProgress(item.created_at, item.event_date);
  const Icon = ICONS[item.icon] || Calendar;
  const gradient = ICON_COLORS[item.icon] || "from-burnt-300 to-sandy-300";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative bg-white dark:bg-[#232829] rounded-3xl shadow-soft border border-warm-200/60 dark:border-[#3a3f42] overflow-hidden"
    >
      {/* Gradient strip top */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md`}>
            <Icon size={22} className="text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-charcoal-600 dark:text-[#e4ddd5] truncate">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-xs text-charcoal-400 dark:text-[#8a8580] truncate mt-0.5">
                {item.description}
              </p>
            )}

            {/* Countdown digits */}
            <div className="flex gap-2 mt-3">
              {[
                { v: tl.d, l: t("countdown.days") },
                { v: tl.h, l: t("countdown.hrs") },
                { v: tl.m, l: t("countdown.min") },
                { v: tl.s, l: t("countdown.sec") },
              ].map((u) => (
                <div
                  key={u.l}
                  className="flex-1 bg-warm-50/80 dark:bg-[#1e2224] rounded-xl py-2 text-center"
                >
                  <motion.p
                    key={u.v}
                    initial={{ scale: 1.1, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-bold text-charcoal-600 dark:text-[#e4ddd5] leading-none tabular-nums"
                  >
                    {u.v}
                  </motion.p>
                  <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] mt-1 uppercase tracking-wider font-medium">
                    {u.l}
                  </p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 rounded-full bg-warm-100 dark:bg-[#1e2224] overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>

            {/* Footer: date + creator */}
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] text-charcoal-400 dark:text-[#6e6862]">
                📅 {formatDate(item.event_date)}
              </span>
              <span className="text-[10px] text-charcoal-400 dark:text-[#6e6862]">
                {getCreatorName(item.created_by)}
              </span>
            </div>
          </div>

          {/* Delete */}
          {item.created_by === user?.id && (
            <button
              onClick={() => onRemove(item.id)}
              className="p-2 rounded-xl text-charcoal-300 dark:text-[#5a5550] hover:bg-red-50 hover:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Passed Card ───

function PassedCard({ item, index, user, t, onRemove, getCreatorName }: CardProps) {
  const Icon = ICONS[item.icon] || Calendar;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative bg-white/60 dark:bg-[#232829]/60 rounded-3xl border border-warm-200/40 dark:border-[#3a3f42]/60 overflow-hidden"
    >
      <div className="p-4 flex items-center gap-3">
        {/* Icon muted */}
        <div className="w-10 h-10 rounded-xl bg-warm-100/80 dark:bg-[#2e3133] flex items-center justify-center shrink-0">
          <Icon size={18} className="text-charcoal-300 dark:text-[#6e6862]" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-charcoal-500 dark:text-[#a39e98] truncate">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              <PartyPopper size={10} /> {t("countdown.passed")}
            </span>
            <span className="text-[10px] text-charcoal-400 dark:text-[#6e6862]">
              {formatDate(item.event_date)}
            </span>
          </div>
        </div>

        {/* Confetti dots */}
        <div className="flex gap-0.5 mr-1">
          {["#ffd700", "#ff69b4", "#87ceeb"].map((c, j) => (
            <motion.div
              key={j}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: c }}
              animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.3 }}
            />
          ))}
        </div>

        {item.created_by === user?.id && (
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#5a5550] hover:bg-red-50 hover:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
