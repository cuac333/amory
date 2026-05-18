import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Lock, Globe, PenLine, Smile, Frown, Heart,
  HeartHandshake, Angry, HelpCircle, Zap, Moon, PartyPopper,
  BookOpen, Camera, ChevronDown, ChevronUp, Calendar,
  TrendingUp, ImagePlus, X, Upload,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import DeleteButton from "../components/shared/DeleteButton";
import { ClickableImage } from "../components/shared/ImageViewer";
import DiaryCommentSection from "../components/shared/DiaryCommentSection";

import type { DiaryEntry, DeletionRequest } from "../types";

const MOODS = [
  { key: "happy", icon: Smile, label: "mood.happy", gradient: "from-sandy-300 to-sandy-400", bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-500", ring: "ring-sandy-200" },
  { key: "sad", icon: Frown, label: "mood.sad", gradient: "from-charcoal-400 to-charcoal-500", bg: "bg-charcoal-50 dark:bg-charcoal-700/30", text: "text-charcoal-500", ring: "ring-charcoal-200" },
  { key: "in_love", icon: Heart, label: "mood.in_love", gradient: "from-burnt-300 to-burnt-400", bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-400", ring: "ring-burnt-200" },
  { key: "grateful", icon: HeartHandshake, label: "mood.grateful", gradient: "from-tuscan-300 to-tuscan-400", bg: "bg-tuscan-50 dark:bg-tuscan-800/20", text: "text-tuscan-400", ring: "ring-tuscan-200" },
  { key: "frustrated", icon: Angry, label: "mood.frustrated", gradient: "from-burnt-400 to-burnt-500", bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-500", ring: "ring-burnt-200" },
  { key: "thoughtful", icon: HelpCircle, label: "mood.thoughtful", gradient: "from-verdigris-400 to-verdigris-500", bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-500", ring: "ring-verdigris-200" },
  { key: "energetic", icon: Zap, label: "mood.energetic", gradient: "from-sandy-400 to-tuscan-400", bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-500", ring: "ring-sandy-200" },
  { key: "sleepy", icon: Moon, label: "mood.sleepy", gradient: "from-charcoal-300 to-charcoal-400", bg: "bg-charcoal-50 dark:bg-charcoal-700/30", text: "text-charcoal-400", ring: "ring-charcoal-200" },
  { key: "celebrating", icon: PartyPopper, label: "mood.celebrating", gradient: "from-verdigris-400 to-sandy-400", bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-500", ring: "ring-verdigris-200" },
];

const getMoodData = (key: string) => MOODS.find(m => m.key === key);

export default function DiaryPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [isShared, setIsShared] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [deleteRequests, setDeleteRequests] = useState<DeletionRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "partner">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = () => {
    api.get("/diary/").then((res) => setEntries(res.data));
    api.get("/deletion-requests/", { params: { entity_type: "diary_entry", status: "pending" } }).then((res) => setDeleteRequests(res.data)).catch(() => {});
  };

  const getDeleteRequest = (entryId: number) =>
    deleteRequests.find((r) => r.entity_id === entryId);

  useEffect(() => { load(); }, []);

  const handlePhoto = (f: File | null) => {
    setPhotoFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  const submit = async () => {
    if (!content.trim()) return;
    const res = await api.post("/diary/", { content, mood: mood || null, is_shared: isShared });
    if (photoFile && res.data.id) {
      const formData = new FormData();
      formData.append("file", photoFile);
      await api.post(`/diary/${res.data.id}/upload-photo`, formData);
    }
    setContent("");
    setMood("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowForm(false);
    load();
  };

  // Stats
  const myEntries = entries.filter(e => e.user_id === user?.id).length;
  const partnerEntries = entries.filter(e => e.user_id !== user?.id).length;
  const moodCounts: Record<string, number> = {};
  entries.forEach(e => { if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const topMoodData = topMood ? getMoodData(topMood[0]) : null;

  // Filtered entries
  const filteredEntries = filter === "all" ? entries
    : filter === "mine" ? entries.filter(e => e.user_id === user?.id)
    : entries.filter(e => e.user_id !== user?.id);

  // Group entries by month
  const grouped: Record<string, DiaryEntry[]> = {};
  filteredEntries.forEach(e => {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const groupedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4 md:space-y-6 py-3 md:py-6">

      {/* ─── Header ─── */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-tuscan-300 via-burnt-300 to-sandy-400 shadow-lg shadow-tuscan-200/30 mb-3"
        >
          <BookOpen size={22} className="text-white" />
        </motion.div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal-700 dark:text-warm-200">
          {t("diary.title")}
        </h1>
        <p className="text-xs md:text-sm text-charcoal-400 dark:text-warm-500 mt-1">
          {t("diary.desc")}
        </p>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-burnt-300 to-burnt-400 flex items-center justify-center mb-2 shadow-sm">
            <PenLine size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{myEntries}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("diary.stat.mine")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mb-2 shadow-sm">
            <Heart size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{partnerEntries}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("diary.stat.partner")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          {topMoodData ? (
            <>
              <div className={`w-9 h-9 mx-auto rounded-xl bg-gradient-to-br ${topMoodData.gradient} flex items-center justify-center mb-2 shadow-sm`}>
                <topMoodData.icon size={16} className="text-white" />
              </div>
              <p className="text-xs font-bold text-charcoal-700 dark:text-warm-200 truncate">{t(topMoodData.label as any)}</p>
            </>
          ) : (
            <>
              <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-sandy-300 to-sandy-400 flex items-center justify-center mb-2 shadow-sm">
                <Smile size={16} className="text-white" />
              </div>
              <p className="text-xs font-bold text-charcoal-700 dark:text-warm-200">--</p>
            </>
          )}
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("diary.stat.top.mood")}</p>
        </div>
      </div>

      {/* ─── Mood Summary Strip ─── */}
      {entries.length > 0 && (
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={12} className="text-charcoal-400 dark:text-warm-500" />
            <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("diary.mood.summary")}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {MOODS.map(m => {
              const count = moodCounts[m.key] || 0;
              if (count === 0) return null;
              const Icon = m.icon;
              return (
                <div key={m.key} className={`flex items-center gap-1 px-2 py-1 rounded-lg ${m.bg}`}>
                  <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${m.gradient} flex items-center justify-center`}>
                    <Icon size={10} className="text-white" />
                  </div>
                  <span className={`text-[10px] font-bold ${m.text}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Filter Tabs ─── */}
      <div className="flex gap-1 p-1 bg-warm-100/60 dark:bg-charcoal-700/60 rounded-xl">
        {(["all", "mine", "partner"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl font-medium text-xs transition-all ${
              filter === f
                ? "bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-warm-200 shadow-soft"
                : "text-charcoal-400 dark:text-warm-500"
            }`}
          >
            {t(`diary.filter.${f}` as any)}
          </button>
        ))}
      </div>

      {/* ─── Create Button ─── */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 hover:shadow-xl transition-shadow"
      >
        <Plus size={18} /> {t("diary.new")}
      </button>

      {/* ─── Entries grouped by month ─── */}
      {groupedKeys.map(monthKey => {
        const monthEntries = grouped[monthKey];
        const [year, month] = monthKey.split("-");
        const monthLabel = new Date(+year, +month - 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
        return (
          <div key={monthKey} className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-charcoal-400 dark:text-warm-500" />
              <h2 className="text-xs font-display font-semibold text-charcoal-500 dark:text-warm-400 uppercase tracking-wider">
                {monthLabel}
              </h2>
              <span className="text-[10px] font-bold bg-warm-100 dark:bg-charcoal-700 text-charcoal-400 px-1.5 py-0.5 rounded-full">
                {monthEntries.length}
              </span>
            </div>
            {monthEntries.map((entry, idx) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                isOwn={entry.user_id === user?.id}
                deleteRequest={getDeleteRequest(entry.id)}
                currentUserId={user?.id ?? 0}
                onDeleteAction={load}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                index={idx}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        );
      })}

      {/* ─── Empty State ─── */}
      {filteredEntries.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-warm-100 dark:bg-charcoal-700 flex items-center justify-center mb-3">
            <PenLine size={28} className="text-warm-300 dark:text-charcoal-500" />
          </div>
          <p className="text-charcoal-400 dark:text-warm-500 text-sm font-medium">{t("diary.empty")}</p>
          <p className="text-charcoal-300 dark:text-charcoal-500 text-xs mt-1">{t("diary.empty.hint")}</p>
        </motion.div>
      )}

      {/* ═══════ CREATE FORM MODAL ═══════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
            style={{ zIndex: 9999 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-charcoal-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl"
              {...(content.trim() || mood ? { "data-unsaved-form": true } : {})}
            >
              {/* Modal header */}
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-tuscan-300 to-burnt-300 flex items-center justify-center mb-2">
                  <PenLine size={18} className="text-white" />
                </div>
                <h2 className="font-display font-bold text-lg text-charcoal-700 dark:text-warm-200">{t("diary.new")}</h2>
                <p className="text-xs text-charcoal-400 dark:text-warm-500 mt-0.5">{t("diary.how.feel")}</p>
              </div>

              {/* Mood selector grid */}
              <div>
                <p className="text-xs font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider mb-2">{t("diary.select.mood")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {MOODS.map(m => {
                    const Icon = m.icon;
                    const isActive = mood === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMood(mood === m.key ? "" : m.key)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                          isActive
                            ? `${m.bg} ring-2 ${m.ring}`
                            : "bg-warm-50/50 dark:bg-charcoal-700/50 hover:bg-warm-100 dark:hover:bg-charcoal-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? `bg-gradient-to-br ${m.gradient} shadow-sm` : "bg-warm-100 dark:bg-charcoal-600"
                        }`}>
                          <Icon size={14} className={isActive ? "text-white" : "text-charcoal-400 dark:text-warm-400"} />
                        </div>
                        <span className={`text-[10px] font-medium leading-tight ${isActive ? m.text : "text-charcoal-400 dark:text-warm-500"}`}>
                          {t(m.label as any)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("diary.placeholder")}
                className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200 resize-none"
                rows={5}
              />

              {/* Photo upload */}
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => handlePhoto(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 px-4 py-3 bg-warm-50/60 dark:bg-charcoal-700/50 rounded-xl cursor-pointer border border-dashed border-warm-200/50 dark:border-charcoal-600/50 hover:border-burnt-200 dark:hover:border-burnt-600 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-warm-100 dark:bg-charcoal-600 flex items-center justify-center">
                    <ImagePlus size={14} className="text-warm-400 dark:text-charcoal-400" />
                  </div>
                  <span className="text-xs text-charcoal-400 dark:text-warm-500 font-medium">{t("diary.add.photo")}</span>
                  <input type="file" accept="image/*" onChange={(e) => handlePhoto(e.target.files?.[0] || null)} className="hidden" />
                </label>
              )}

              {/* Shared toggle */}
              <label className="flex items-center gap-3 px-4 py-3 bg-warm-50/60 dark:bg-charcoal-700/50 rounded-xl cursor-pointer border border-warm-200/20 dark:border-charcoal-600/20 transition-colors hover:bg-warm-50 dark:hover:bg-charcoal-700">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isShared ? "bg-gradient-to-br from-verdigris-400 to-verdigris-500 shadow-sm" : "bg-gradient-to-br from-charcoal-300 to-charcoal-400 shadow-sm"
                }`}>
                  {isShared ? <Globe size={14} className="text-white" /> : <Lock size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-charcoal-600 dark:text-warm-300">{isShared ? t("diary.shared") : t("diary.private")}</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all flex items-center ${isShared ? "bg-gradient-to-r from-verdigris-400 to-verdigris-500 justify-end" : "bg-warm-200 dark:bg-charcoal-600 justify-start"}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm mx-1" />
                </div>
                <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="hidden" />
              </label>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={submit}
                  disabled={!content.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium hover:from-burnt-400 hover:to-sandy-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-burnt-200/20"
                >
                  {t("save")}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 bg-warm-50 dark:bg-charcoal-700 rounded-xl text-sm text-charcoal-400 hover:bg-warm-100 dark:hover:bg-charcoal-600 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ============================================================
   DIARY CARD
   ============================================================ */
function DiaryCard({ entry, isOwn, deleteRequest, currentUserId, onDeleteAction, expanded, onToggle, index, t, locale }: {
  entry: DiaryEntry;
  isOwn: boolean;
  deleteRequest?: DeletionRequest;
  currentUserId: number;
  onDeleteAction: () => void;
  expanded: boolean;
  onToggle: () => void;
  index: number;
  t: any;
  locale: string;
}) {
  const moodData = entry.mood ? getMoodData(entry.mood) : null;
  const MoodIcon = moodData?.icon;
  const isLong = entry.content.length > 200;
  const displayContent = isLong && !expanded ? entry.content.slice(0, 200) + "..." : entry.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 overflow-hidden"
    >
      {/* Mood gradient strip */}
      <div className={`h-1.5 bg-gradient-to-r ${moodData ? moodData.gradient : "from-warm-200 to-warm-300 dark:from-charcoal-600 dark:to-charcoal-500"}`} />

      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          {/* Author avatar */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isOwn ? "bg-gradient-to-br from-burnt-300 to-sandy-300" : "bg-gradient-to-br from-verdigris-400 to-verdigris-500"
          } shadow-sm`}>
            <span className="text-white text-xs font-bold">{entry.user_name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm text-charcoal-700 dark:text-warm-200">{entry.user_name}</span>
              {!entry.is_shared && (
                <div className="w-5 h-5 rounded-md bg-charcoal-50 dark:bg-charcoal-700 flex items-center justify-center">
                  <Lock size={9} className="text-charcoal-400" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-charcoal-300 dark:text-charcoal-500 flex items-center gap-1">
              <Calendar size={9} />
              {new Date(entry.created_at).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </div>

          {/* Mood badge */}
          {moodData && MoodIcon && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${moodData.bg}`}>
              <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${moodData.gradient} flex items-center justify-center`}>
                <MoodIcon size={10} className="text-white" />
              </div>
              <span className={`text-[9px] font-bold ${moodData.text}`}>{t(moodData.label as any)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-charcoal-500 dark:text-warm-400 whitespace-pre-wrap leading-relaxed">
          {displayContent}
        </p>
        {isLong && (
          <button onClick={onToggle} className="flex items-center gap-1 text-[10px] font-semibold text-burnt-400 mt-1.5 hover:text-burnt-500 transition-colors">
            {expanded ? <><ChevronUp size={10} /> {t("diary.show.less")}</> : <><ChevronDown size={10} /> {t("diary.show.more")}</>}
          </button>
        )}

        {/* Photo */}
        {entry.photo_url && (
          <ClickableImage src={entry.photo_url} alt="" className="mt-3 rounded-xl w-full max-h-56 object-cover shadow-sm" />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-warm-100/50 dark:border-charcoal-700/50">
          <div className="flex items-center gap-2">
            {entry.is_shared ? (
              <span className="text-[10px] text-verdigris-500 dark:text-verdigris-400 flex items-center gap-1 font-medium">
                <Globe size={9} /> {t("diary.shared")}
              </span>
            ) : (
              <span className="text-[10px] text-charcoal-400 dark:text-warm-500 flex items-center gap-1 font-medium">
                <Lock size={9} /> {t("diary.private")}
              </span>
            )}
            {entry.is_shared && (
              <DiaryCommentSection entryId={entry.id} commentsCount={entry.comments_count} />
            )}
          </div>
          <DeleteButton
            entityType="diary_entry"
            entityId={entry.id}
            pendingRequest={deleteRequest}
            currentUserId={currentUserId}
            onAction={onDeleteAction}
            size="sm"
            directDelete={isOwn && !entry.is_shared}
            directDeleteUrl={`/diary/${entry.id}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
