import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Check, Plane, Home, Sparkles, User, Star,
  CloudSun, Camera, Target, Rocket, Heart, Trophy,
  ChevronDown, MapPin, Gem, Compass,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import type { DreamItem, DeletionRequest } from "../../types";
import DeleteButton from "../../components/shared/DeleteButton";

const CATEGORIES_DATA = [
  { key: "travel", labelKey: "dreams.cat.travel", icon: Plane, gradient: "from-sky-400 to-cyan-300" },
  { key: "home", labelKey: "dreams.cat.home", icon: Home, gradient: "from-amber-400 to-orange-300" },
  { key: "experiences", labelKey: "dreams.cat.experience", icon: Sparkles, gradient: "from-violet-400 to-purple-300" },
  { key: "personal", labelKey: "dreams.cat.personal", icon: User, gradient: "from-rose-400 to-pink-300" },
  { key: "general", labelKey: "dreams.cat.general", icon: Star, gradient: "from-burnt-400 to-sandy-300" },
];

const FILTER_KEYS = [
  { key: "all", labelKey: "dreams.filter.all" },
  { key: "pending", labelKey: "dreams.filter.pending" },
  { key: "completed", labelKey: "dreams.filter.achieved" },
];

function getCategoryMeta(key: string) {
  return CATEGORIES_DATA.find((c) => c.key === key) ?? CATEGORIES_DATA[4];
}

export default function DreamBoardSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [dreams, setDreams] = useState<DreamItem[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [dreamsRes, delRes] = await Promise.all([
        api.get("/dreams"),
        api.get("/deletion-requests/", { params: { entity_type: "dream_item", status: "pending" } }),
      ]);
      setDreams(dreamsRes.data);
      setDeletionRequests(delRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = dreams.filter((d) => {
    if (filter === "pending") return !d.completed;
    if (filter === "completed") return d.completed;
    return true;
  });

  const totalCompleted = dreams.filter((d) => d.completed).length;
  const totalPending = dreams.filter((d) => !d.completed).length;
  const progress = dreams.length > 0 ? Math.round((totalCompleted / dreams.length) * 100) : 0;

  const canCreate = form.title.trim().length > 0;

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      await api.post("/dreams", form);
      setShowForm(false);
      setForm({ title: "", description: "", category: "general" });
      load();
    } catch {}
    setSaving(false);
  };

  const toggleComplete = async (id: number) => {
    try {
      await api.post(`/dreams/${id}/complete`);
      load();
    } catch {}
  };

  const uploadImage = async (dreamId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/dreams/${dreamId}/image`, fd);
      load();
    } catch {}
  };

  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-300 flex items-center justify-center mx-auto shadow-lg"
        >
          <Compass size={28} className="text-white" />
        </motion.div>
        <div>
          <h2 className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{t("dreams.title")}</h2>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{t("dreams.desc")}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      {dreams.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Target, value: totalPending, label: t("dreams.stat.pending"), color: "from-violet-400 to-purple-300" },
              { icon: Trophy, value: totalCompleted, label: t("dreams.stat.achieved"), color: "from-green-500 to-emerald-400" },
              { icon: Rocket, value: `${progress}%`, label: t("dreams.stat.progress"), color: "from-amber-400 to-orange-300" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-charcoal-800 border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={14} className="text-white" />
                </div>
                <p className="text-base font-bold text-charcoal-700 dark:text-warm-100">{stat.value}</p>
                <p className="text-[9px] text-charcoal-400 dark:text-charcoal-500 text-center leading-tight">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="px-1">
            <div className="h-2 bg-warm-100 dark:bg-charcoal-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-violet-400 to-green-400 rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Filter tabs + add ── */}
      <div className="flex items-center gap-2">
        <div className="flex bg-warm-100/60 dark:bg-charcoal-700/60 rounded-xl p-0.5 flex-1">
          {FILTER_KEYS.map((f) => {
            const count = f.key === "all" ? dreams.length : f.key === "pending" ? totalPending : totalCompleted;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                  filter === f.key
                    ? "bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-warm-100 shadow-sm"
                    : "text-charcoal-400 dark:text-charcoal-500 hover:text-charcoal-500"
                }`}
              >
                {t(f.labelKey)}
                <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                  filter === f.key
                    ? "bg-violet-100/60 dark:bg-violet-400/10 text-violet-500 dark:text-violet-300"
                    : "bg-warm-200/40 dark:bg-charcoal-600 text-charcoal-400 dark:text-charcoal-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className={`p-2.5 rounded-xl transition-all shadow-sm shrink-0 ${
            showForm
              ? "bg-warm-100 dark:bg-charcoal-700 text-charcoal-500"
              : "bg-gradient-to-r from-violet-400 to-purple-300 text-white"
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </motion.button>
      </div>

      {/* ── Create form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-elevated border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-warm-200/20 dark:border-charcoal-700/40">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-300 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("dreams.new")}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Gem size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("dreams.title.placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-violet-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                />
              </div>
              <div className="relative">
                <Heart size={13} className="absolute left-3 top-3 text-warm-400 dark:text-charcoal-500" />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("dreams.desc.placeholder")}
                  rows={2}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-violet-200/50 dark:focus:ring-violet-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500 resize-none"
                />
              </div>

              {/* Category grid */}
              <div>
                <p className="text-[11px] font-semibold text-charcoal-500 dark:text-warm-300 mb-2">{t("dreams.category.label")}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {CATEGORIES_DATA.map((cat) => {
                    const Icon = cat.icon;
                    const selected = form.category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setForm({ ...form, category: cat.key })}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all ${
                          selected
                            ? "bg-violet-50 dark:bg-violet-400/10 ring-2 ring-violet-300 dark:ring-violet-400/40"
                            : "bg-warm-50/60 dark:bg-charcoal-700/60 hover:bg-warm-100 dark:hover:bg-charcoal-700"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-sm`}>
                          <Icon size={14} className="text-white" />
                        </div>
                        <span className={`text-[9px] font-medium ${
                          selected ? "text-violet-600 dark:text-violet-300" : "text-charcoal-400 dark:text-charcoal-500"
                        }`}>
                          {t(cat.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={create}
                disabled={!canCreate || saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-400 to-purple-300 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                {saving ? t("creating") : t("dreams.add")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dream cards ── */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100/50 to-purple-100/50 dark:from-violet-400/10 dark:to-purple-400/10 flex items-center justify-center">
            <CloudSun size={36} className="text-violet-300 dark:text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-charcoal-400 dark:text-charcoal-500">
              {filter === "completed"
                ? t("dreams.empty.achieved")
                : filter === "pending"
                  ? t("dreams.empty.pending")
                  : t("dreams.empty.hint")}
            </p>
            {dreams.length === 0 && (
              <p className="text-xs text-charcoal-300 dark:text-charcoal-600 mt-1">{t("dreams.empty.sub")}</p>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((dream, i) => {
              const cat = getCategoryMeta(dream.category);
              const CatIcon = cat.icon;

              return (
                <motion.div
                  key={dream.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image or gradient header */}
                  {dream.image_url ? (
                    <div className="relative h-24">
                      <img
                        src={dream.image_url}
                        alt={dream.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {dream.completed && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                      <div className={`absolute top-2 left-2 w-6 h-6 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-sm`}>
                        <CatIcon size={10} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className={`relative h-16 bg-gradient-to-br ${cat.gradient} opacity-80`}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <CatIcon size={40} className="text-white" />
                      </div>
                      {dream.completed && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`p-3 space-y-2 ${dream.completed ? "opacity-70" : ""}`}>
                    {/* Category badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold bg-gradient-to-r ${cat.gradient} text-white shadow-sm`}>
                      <CatIcon size={9} />
                      {t(cat.labelKey)}
                    </span>

                    <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100 line-clamp-2 leading-snug">
                      {dream.title}
                    </h3>
                    {dream.description && (
                      <p className="text-[10px] text-charcoal-400 dark:text-charcoal-500 line-clamp-2 leading-relaxed">
                        {dream.description}
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-[9px] text-charcoal-300 dark:text-charcoal-600">
                      {new Date(dream.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                      {dream.completed && dream.completed_at && (
                        <span className="text-green-500 dark:text-green-400 ml-1.5">
                          — {t("dreams.achieved")} {new Date(dream.completed_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-warm-200/15 dark:border-charcoal-700/30">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleComplete(dream.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all active:scale-95 ${
                          dream.completed
                            ? "bg-green-50 dark:bg-green-900/10 text-green-500 dark:text-green-400 border border-green-200/40 dark:border-green-800/30"
                            : "bg-violet-50 dark:bg-violet-400/10 text-violet-500 dark:text-violet-300 border border-violet-200/30 dark:border-violet-800/20"
                        }`}
                      >
                        {dream.completed ? <Check size={11} /> : <Target size={11} />}
                        {dream.completed ? t("dreams.achieved") : t("dreams.complete")}
                      </motion.button>

                      {/* Photo upload */}
                      <label className="p-1.5 rounded-lg text-charcoal-300 dark:text-charcoal-500 hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-400/10 transition-colors cursor-pointer">
                        <Camera size={13} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage(dream.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      <DeleteButton
                        entityType="dream_item"
                        entityId={dream.id}
                        pendingRequest={getPendingRequest(dream.id)}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
