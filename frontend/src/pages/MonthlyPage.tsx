import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, CheckCircle2, Clock, Upload, Plus,
  Heart, Mountain, Bath, Theater, UtensilsCrossed,
  Trophy, Calendar, Sparkles, ChevronDown, ChevronUp,
  Camera, Star, TrendingUp, Users,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import DeleteButton from "../components/shared/DeleteButton";

import type { MonthlyActivity, Streak, DeletionRequest } from "../types";

const CATEGORIES = [
  { value: "romantic", label: "monthly.cat.romantic", icon: Heart, gradient: "from-burnt-300 to-burnt-400", bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-400", ring: "ring-burnt-200" },
  { value: "adventure", label: "monthly.cat.adventure", icon: Mountain, gradient: "from-verdigris-400 to-verdigris-500", bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-500", ring: "ring-verdigris-200" },
  { value: "relax", label: "monthly.cat.relax", icon: Bath, gradient: "from-tuscan-300 to-tuscan-400", bg: "bg-tuscan-50 dark:bg-tuscan-800/20", text: "text-tuscan-400", ring: "ring-tuscan-200" },
  { value: "cultural", label: "monthly.cat.cultural", icon: Theater, gradient: "from-charcoal-400 to-charcoal-500", bg: "bg-charcoal-50 dark:bg-charcoal-700/30", text: "text-charcoal-500", ring: "ring-charcoal-200" },
  { value: "food", label: "monthly.cat.food", icon: UtensilsCrossed, gradient: "from-sandy-400 to-sandy-500", bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-500", ring: "ring-sandy-200" },
];

const MONTH_NAMES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_FULL_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function MonthlyPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [activities, setActivities] = useState<MonthlyActivity[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [feelingText, setFeelingText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("romantic");
  const [deleteRequests, setDeleteRequests] = useState<DeletionRequest[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState("");

  const load = () => {
    api.get("/monthly/history").then((res) => setActivities(res.data));
    api.get("/monthly/streak").then((res) => setStreak(res.data));
    api.get("/deletion-requests/", { params: { entity_type: "monthly_activity", status: "pending" } }).then((res) => setDeleteRequests(res.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get("/auth/partner").then((res) => setPartnerName(res.data.name)).catch(() => {});
  }, []);

  const getDeleteRequest = (activityId: number) =>
    deleteRequests.find((r) => r.entity_id === activityId);

  const handleFileSelect = (f: File | null) => {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const submitEntry = async (activityId: number) => {
    if (!file || feelingText.length < 50) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("feeling_text", feelingText);
    await api.post(`/monthly/${activityId}/entry`, formData);
    setFeelingText("");
    setFile(null);
    setFilePreview(null);
    setSubmitting(false);
    load();
  };

  const canCreate = newTitle.trim().length > 0;

  const createActivity = async () => {
    if (!canCreate) return;
    const now = new Date();
    await api.post("/monthly/", { month: now.getMonth() + 1, year: now.getFullYear(), title: newTitle, description: newDesc, category: newCategory });
    setShowCreate(false);
    setNewTitle("");
    setNewDesc("");
    load();
  };

  const userAlreadySubmitted = (activity: MonthlyActivity) =>
    activity.entries.some((e) => e.user_id === user?.id);

  const getCategoryData = (cat: string) =>
    CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  const completedCount = activities.filter(a => a.status === "completed").length;
  const now = new Date();
  const currentMonthActivity = activities.find(a => a.month === now.getMonth() + 1 && a.year === now.getFullYear());

  // Separate current month vs past
  const pastActivities = activities.filter(a => !(a.month === now.getMonth() + 1 && a.year === now.getFullYear()));

  return (
    <div className="space-y-4 md:space-y-6 py-3 md:py-6">

      {/* ─── Header ─── */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-burnt-300 via-sandy-300 to-tuscan-400 shadow-lg shadow-burnt-200/30 mb-3"
        >
          <Calendar size={22} className="text-white" />
        </motion.div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal-700 dark:text-warm-200">
          {t("monthly.title")}
        </h1>
        <p className="text-xs md:text-sm text-charcoal-400 dark:text-warm-500 mt-1">
          {t("monthly.desc")}
        </p>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {/* Current Streak */}
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-sandy-300 to-sandy-500 flex items-center justify-center mb-2 shadow-sm">
            <Flame size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{streak?.current_streak || 0}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("monthly.streak.current")}</p>
        </div>

        {/* Best Streak */}
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-burnt-300 to-burnt-400 flex items-center justify-center mb-2 shadow-sm">
            <Trophy size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{streak?.best_streak || 0}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("monthly.streak.best")}</p>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mb-2 shadow-sm">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{completedCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("monthly.completed.count")}</p>
        </div>
      </div>

      {/* ─── Current Month Highlight ─── */}
      {currentMonthActivity ? (
        <CurrentMonthCard
          activity={currentMonthActivity}
          user={user}
          partnerName={partnerName}
          file={file}
          filePreview={filePreview}
          feelingText={feelingText}
          submitting={submitting}
          onFileSelect={handleFileSelect}
          onFeelingChange={setFeelingText}
          onSubmit={submitEntry}
          deleteRequest={getDeleteRequest(currentMonthActivity.id)}
          onDeleteAction={load}
          t={t}
          locale={locale}
        />
      ) : (
        /* No activity yet for this month — prominent create CTA */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-burnt-50 to-sandy-50 dark:from-burnt-800/20 dark:to-sandy-800/20 rounded-3xl p-5 md:p-6 border border-burnt-100/30 dark:border-charcoal-600/30 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center mb-3 shadow-lg shadow-burnt-200/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <h3 className="font-display font-bold text-lg text-charcoal-700 dark:text-warm-200">
            {MONTH_FULL_ES[now.getMonth()]} {now.getFullYear()}
          </h3>
          <p className="text-sm text-charcoal-400 dark:text-warm-500 mt-1 mb-4">
            {t("monthly.no.activity")}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 hover:shadow-xl transition-shadow mx-auto"
          >
            <Plus size={18} /> {t("monthly.create")}
          </button>
        </motion.div>
      )}

      {/* ─── Create Form Modal ─── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-charcoal-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
              {...(newTitle.trim() || newDesc.trim() ? { "data-unsaved-form": true } : {})}
            >
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center mb-2">
                  <Plus size={18} className="text-white" />
                </div>
                <h2 className="font-display font-bold text-lg text-charcoal-700 dark:text-warm-200">{t("monthly.create")}</h2>
                <p className="text-xs text-charcoal-400 dark:text-warm-500 mt-0.5">
                  {MONTH_FULL_ES[now.getMonth()]} {now.getFullYear()}
                </p>
              </div>

              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("monthly.title.placeholder")}
                className={`w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200 transition-colors ${!newTitle.trim() ? "border-burnt-200/60" : "border-warm-200 dark:border-charcoal-600"}`}
              />

              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t("monthly.desc.placeholder")}
                className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
                rows={2}
              />

              {/* Category Grid */}
              <div>
                <p className="text-xs font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider mb-2">{t("monthly.category")}</p>
                <div className="grid grid-cols-5 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const isActive = newCategory === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => setNewCategory(c.value)}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                          isActive
                            ? `${c.bg} ring-2 ${c.ring}`
                            : "bg-warm-50/50 dark:bg-charcoal-700/50 hover:bg-warm-100 dark:hover:bg-charcoal-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? `bg-gradient-to-br ${c.gradient} shadow-sm` : "bg-warm-100 dark:bg-charcoal-600"
                        }`}>
                          <Icon size={14} className={isActive ? "text-white" : "text-charcoal-400 dark:text-warm-400"} />
                        </div>
                        <span className={`text-[10px] font-medium ${isActive ? c.text : "text-charcoal-400 dark:text-warm-500"}`}>
                          {t(c.label)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={createActivity}
                  disabled={!canCreate}
                  className="flex-1 py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium hover:from-burnt-400 hover:to-sandy-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-burnt-200/20"
                >
                  {t("create")}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-3 bg-warm-50 dark:bg-charcoal-700 rounded-xl text-sm text-charcoal-400 hover:bg-warm-100 dark:hover:bg-charcoal-600 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Past Activities Timeline ─── */}
      {pastActivities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-charcoal-400 dark:text-warm-500" />
            <h2 className="text-sm font-display font-semibold text-charcoal-500 dark:text-warm-400 uppercase tracking-wider">
              {t("monthly.history")}
            </h2>
          </div>

          <div className="space-y-3">
            {pastActivities.map((activity, idx) => (
              <PastActivityCard
                key={activity.id}
                activity={activity}
                user={user}
                expanded={expandedId === activity.id}
                onToggle={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
                deleteRequest={getDeleteRequest(activity.id)}
                onDeleteAction={load}
                index={idx}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {activities.length === 0 && !showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-warm-100 dark:bg-charcoal-700 flex items-center justify-center mb-3">
            <Calendar size={28} className="text-warm-300 dark:text-charcoal-500" />
          </div>
          <p className="text-charcoal-400 dark:text-warm-500 text-sm font-medium">{t("monthly.empty")}</p>
          <p className="text-charcoal-300 dark:text-charcoal-500 text-xs mt-1">{t("monthly.empty.hint")}</p>
        </motion.div>
      )}

      {/* Floating create button when current month has activity */}
      {currentMonthActivity && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 hover:shadow-xl transition-shadow"
        >
          <Plus size={18} /> {t("monthly.create")}
        </button>
      )}
    </div>
  );
}


/* ============================================================
   CURRENT MONTH CARD — Hero card for this month's activity
   ============================================================ */
function CurrentMonthCard({ activity, user, partnerName, file, filePreview, feelingText, submitting, onFileSelect, onFeelingChange, onSubmit, deleteRequest, onDeleteAction, t, locale }: {
  activity: MonthlyActivity;
  user: any;
  partnerName: string;
  file: File | null;
  filePreview: string | null;
  feelingText: string;
  submitting: boolean;
  onFileSelect: (f: File | null) => void;
  onFeelingChange: (v: string) => void;
  onSubmit: (id: number) => void;
  deleteRequest?: DeletionRequest;
  onDeleteAction: () => void;
  t: any;
  locale: string;
}) {
  const cat = CATEGORIES.find(c => c.value === activity.category) || CATEGORIES[0];
  const CatIcon = cat.icon;
  const userSubmitted = activity.entries.some((e) => e.user_id === user?.id);
  const progress = activity.status === "completed" ? 100 : activity.entries.length === 1 ? 50 : 0;
  const textProgress = Math.min(100, (feelingText.length / 50) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-charcoal-800 rounded-3xl shadow-elevated border border-warm-200/20 dark:border-charcoal-600/20 overflow-hidden"
    >
      {/* Gradient header strip */}
      <div className={`h-2 bg-gradient-to-r ${cat.gradient}`} />

      <div className="p-5 md:p-6">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-sm`}>
              <CatIcon size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-charcoal-700 dark:text-warm-200">{activity.title}</h3>
              </div>
              <p className="text-xs text-charcoal-400 dark:text-warm-500 flex items-center gap-1.5 mt-0.5">
                <Calendar size={10} />
                {MONTH_FULL_ES[activity.month - 1]} {activity.year}
                <span className="px-1.5 py-0.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-[8px] font-bold rounded-full uppercase ml-1">
                  {t("monthly.current.month")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={activity.status} t={t} />
            <DeleteButton
              entityType="monthly_activity"
              entityId={activity.id}
              pendingRequest={deleteRequest}
              currentUserId={user?.id ?? 0}
              onAction={onDeleteAction}
              size="sm"
            />
          </div>
        </div>

        {activity.description && (
          <p className="text-sm text-charcoal-400 dark:text-warm-500 mb-4 leading-relaxed">{activity.description}</p>
        )}

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("monthly.progress")}</span>
            <span className="text-[10px] font-bold text-charcoal-500 dark:text-warm-400">{activity.entries.length}/2</span>
          </div>
          <div className="h-2 bg-warm-100 dark:bg-charcoal-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${cat.gradient} rounded-full`}
            />
          </div>
          {/* Who has submitted */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                userSubmitted ? "bg-gradient-to-br from-verdigris-400 to-verdigris-500 text-white" : "bg-warm-100 dark:bg-charcoal-700 text-charcoal-400"
              }`}>
                {userSubmitted ? <CheckCircle2 size={10} /> : user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className={`text-[10px] font-medium ${userSubmitted ? "text-verdigris-500" : "text-charcoal-400 dark:text-warm-500"}`}>
                {user?.name?.split(" ")[0]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {(() => {
                const partnerSubmitted = activity.entries.some((e) => e.user_id !== user?.id);
                return (
                  <>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      partnerSubmitted ? "bg-gradient-to-br from-verdigris-400 to-verdigris-500 text-white" : "bg-warm-100 dark:bg-charcoal-700 text-charcoal-400"
                    }`}>
                      {partnerSubmitted ? <CheckCircle2 size={10} /> : (partnerName?.charAt(0).toUpperCase() || "?")}
                    </div>
                    <span className={`text-[10px] font-medium ${partnerSubmitted ? "text-verdigris-500" : "text-charcoal-400 dark:text-warm-500"}`}>
                      {partnerName?.split(" ")[0] || t("monthly.partner")}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Entries */}
        {activity.entries.length > 0 && (
          <div className="space-y-3 mb-4">
            {activity.entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-warm-50/80 dark:bg-charcoal-700/50 rounded-2xl p-3.5 flex gap-3 border border-warm-200/20 dark:border-charcoal-600/20"
              >
                <img src={entry.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center text-white text-[9px] font-bold">
                      {entry.user_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-xs text-charcoal-600 dark:text-warm-300">{entry.user_name}</span>
                    <span className="text-[9px] text-charcoal-300 dark:text-charcoal-500 ml-auto">
                      {new Date(entry.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-400 dark:text-warm-500 line-clamp-3 leading-relaxed">{entry.feeling_text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Completed celebration */}
        {activity.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-verdigris-50 to-verdigris-100/50 dark:from-verdigris-800/20 dark:to-verdigris-700/10 rounded-2xl p-4 text-center border border-verdigris-200/30 dark:border-verdigris-600/20"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={14} className="text-verdigris-500 fill-verdigris-500" />
              <Sparkles size={14} className="text-verdigris-400" />
              <Star size={14} className="text-verdigris-500 fill-verdigris-500" />
            </div>
            <p className="text-sm font-semibold text-verdigris-700 dark:text-verdigris-300">{t("monthly.completed.celebrate")}</p>
            <p className="text-[10px] text-verdigris-500 dark:text-verdigris-400 mt-0.5">{t("monthly.completed.both")}</p>
          </motion.div>
        )}

        {/* Submit entry form */}
        {activity.status !== "completed" && !userSubmitted && (
          <div className="border-t border-warm-200/40 dark:border-charcoal-700 pt-4 space-y-3 mt-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-burnt-400" />
              <p className="text-sm font-semibold text-charcoal-600 dark:text-warm-300">{t("monthly.your.turn")}</p>
            </div>

            {/* Photo upload */}
            {filePreview ? (
              <div className="relative">
                <img src={filePreview} alt="" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => onFileSelect(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <span className="text-xs font-bold">X</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 px-4 py-6 bg-warm-50/80 dark:bg-charcoal-700/50 rounded-2xl cursor-pointer border-2 border-dashed border-warm-200/50 dark:border-charcoal-600/50 hover:border-burnt-200 dark:hover:border-burnt-600 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-warm-100 dark:bg-charcoal-600 flex items-center justify-center">
                  <Camera size={18} className="text-warm-400 dark:text-charcoal-400" />
                </div>
                <span className="text-xs text-charcoal-400 dark:text-warm-500 font-medium">{t("monthly.select.photo")}</span>
                <input type="file" accept="image/*" onChange={(e) => onFileSelect(e.target.files?.[0] || null)} className="hidden" />
              </label>
            )}

            {/* Feeling text */}
            <div className="relative">
              <textarea
                value={feelingText}
                onChange={(e) => onFeelingChange(e.target.value)}
                placeholder={t("monthly.feeling.placeholder")}
                className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200 resize-none"
                rows={3}
              />
              {/* Character progress ring */}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                <div className="relative w-6 h-6">
                  <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-warm-200 dark:text-charcoal-600" />
                    <circle
                      cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeDasharray={`${(textProgress / 100) * 62.83} 62.83`}
                      className={textProgress >= 100 ? "text-verdigris-400" : "text-burnt-300"}
                    />
                  </svg>
                  {textProgress >= 100 && (
                    <CheckCircle2 size={10} className="absolute inset-0 m-auto text-verdigris-500" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${feelingText.length >= 50 ? "text-verdigris-500" : "text-charcoal-300 dark:text-charcoal-500"}`}>
                  {feelingText.length}/50
                </span>
              </div>
            </div>

            <button
              onClick={() => onSubmit(activity.id)}
              disabled={submitting || !file || feelingText.length < 50}
              className="w-full py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:from-burnt-400 hover:to-sandy-400 transition-all shadow-lg shadow-burnt-200/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Clock size={16} />
                </motion.div>
              ) : (
                <Upload size={16} />
              )}
              {submitting ? t("monthly.submitting") : t("monthly.complete")}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}


/* ============================================================
   PAST ACTIVITY CARD — Compact, expandable
   ============================================================ */
function PastActivityCard({ activity, user, expanded, onToggle, deleteRequest, onDeleteAction, index, t, locale }: {
  activity: MonthlyActivity;
  user: any;
  expanded: boolean;
  onToggle: () => void;
  deleteRequest?: DeletionRequest;
  onDeleteAction: () => void;
  index: number;
  t: any;
  locale: string;
}) {
  const cat = CATEGORIES.find(c => c.value === activity.category) || CATEGORIES[0];
  const CatIcon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 overflow-hidden"
    >
      {/* Thin gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${cat.gradient} ${activity.status !== "completed" ? "opacity-40" : ""}`} />

      <div className="p-4">
        <button onClick={onToggle} className="w-full flex items-center gap-3">
          {/* Category icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            activity.status === "completed"
              ? `bg-gradient-to-br ${cat.gradient} shadow-sm`
              : "bg-warm-100 dark:bg-charcoal-700"
          }`}>
            <CatIcon size={16} className={activity.status === "completed" ? "text-white" : "text-charcoal-400 dark:text-warm-500"} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h3 className={`font-display font-semibold text-sm truncate ${
                activity.status === "completed" ? "text-charcoal-700 dark:text-warm-200" : "text-charcoal-400 dark:text-warm-500"
              }`}>
                {activity.title}
              </h3>
              <StatusBadge status={activity.status} t={t} compact />
            </div>
            <p className="text-[10px] text-charcoal-300 dark:text-charcoal-500 mt-0.5 flex items-center gap-1">
              <Calendar size={9} />
              {MONTH_NAMES_ES[activity.month - 1]} {activity.year}
              {activity.entries.length > 0 && (
                <span className="ml-1.5 flex items-center gap-0.5">
                  <Camera size={9} /> {activity.entries.length}
                </span>
              )}
            </p>
          </div>

          {/* Expand toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div onClick={(e) => e.stopPropagation()}>
              <DeleteButton
                entityType="monthly_activity"
                entityId={activity.id}
                pendingRequest={deleteRequest}
                currentUserId={user?.id ?? 0}
                onAction={onDeleteAction}
                size="sm"
              />
            </div>
            {expanded ? (
              <ChevronUp size={16} className="text-charcoal-300 dark:text-charcoal-500" />
            ) : (
              <ChevronDown size={16} className="text-charcoal-300 dark:text-charcoal-500" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-3 border-t border-warm-100 dark:border-charcoal-700 space-y-3">
                {activity.description && (
                  <p className="text-xs text-charcoal-400 dark:text-warm-500 leading-relaxed">{activity.description}</p>
                )}

                {activity.entries.length > 0 ? (
                  <div className="space-y-2.5">
                    {activity.entries.map((entry) => (
                      <div key={entry.id} className="bg-warm-50/80 dark:bg-charcoal-700/50 rounded-xl p-3 flex gap-3 border border-warm-200/15 dark:border-charcoal-600/15">
                        <img src={entry.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center text-white text-[8px] font-bold">
                              {entry.user_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[11px] text-charcoal-600 dark:text-warm-300">{entry.user_name}</span>
                          </div>
                          <p className="text-[11px] text-charcoal-400 dark:text-warm-500 line-clamp-3 leading-relaxed">{entry.feeling_text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Camera size={20} className="mx-auto text-warm-300 dark:text-charcoal-500 mb-1" />
                    <p className="text-xs text-charcoal-300 dark:text-charcoal-500">{t("monthly.no.entries")}</p>
                  </div>
                )}

                {activity.completed_at && (
                  <p className="text-[10px] text-charcoal-300 dark:text-charcoal-500 flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-verdigris-400" />
                    {t("monthly.completed.on")} {new Date(activity.completed_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


/* ============================================================
   STATUS BADGE
   ============================================================ */
function StatusBadge({ status, t, compact }: { status: string; t: any; compact?: boolean }) {
  const config = {
    completed: { icon: CheckCircle2, bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-600 dark:text-verdigris-400", label: t("monthly.completed") },
    waiting_partner: { icon: Clock, bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-600 dark:text-sandy-400", label: t("monthly.waiting") },
    pending: { icon: Clock, bg: "bg-warm-50 dark:bg-charcoal-700", text: "text-charcoal-400 dark:text-warm-500", label: t("monthly.pending") },
    in_progress: { icon: Clock, bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-400", label: t("monthly.pending") },
  }[status] || { icon: Clock, bg: "bg-warm-50", text: "text-charcoal-400", label: status };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${compact ? "text-[9px]" : "text-[10px]"} font-medium ${config.bg} ${config.text}`}>
      <Icon size={compact ? 9 : 10} />
      {config.label}
    </span>
  );
}
