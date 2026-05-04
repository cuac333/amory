import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { LoveReason } from "../../types";
import {
  Plus, Trash2, X, Heart, List, Sparkles, Send,
  ChevronDown, ChevronLeft, Lightbulb, BookHeart, Star,
} from "lucide-react";

// ─── Jar categories ───

type JarCategory = "love" | "improve" | "grateful" | "100reasons";

const JAR_CATEGORIES: {
  key: JarCategory;
  labelKey: string;
  descKey: string;
  emoji: string;
  gradient: string;
  gradientLight: string;
  text: string;
  icon: typeof Heart;
  jarColor: string;
}[] = [
  {
    key: "love",
    labelKey: "jar.cat.love",
    descKey: "jar.cat.love.desc",
    emoji: "💕",
    gradient: "from-pink-400 to-rose-400",
    gradientLight: "from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20",
    text: "text-pink-500",
    icon: Heart,
    jarColor: "from-pink-100/80 via-rose-50/60 to-pink-50/30",
  },
  {
    key: "grateful",
    labelKey: "jar.cat.grateful",
    descKey: "jar.cat.grateful.desc",
    emoji: "🙏",
    gradient: "from-amber-400 to-orange-400",
    gradientLight: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
    text: "text-amber-500",
    icon: Star,
    jarColor: "from-amber-100/80 via-orange-50/60 to-amber-50/30",
  },
  {
    key: "improve",
    labelKey: "jar.cat.improve",
    descKey: "jar.cat.improve.desc",
    emoji: "💡",
    gradient: "from-teal-400 to-emerald-400",
    gradientLight: "from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20",
    text: "text-teal-500",
    icon: Lightbulb,
    jarColor: "from-teal-100/80 via-emerald-50/60 to-teal-50/30",
  },
  {
    key: "100reasons",
    labelKey: "jar.cat.100",
    descKey: "jar.cat.100.desc",
    emoji: "💯",
    gradient: "from-burnt-300 to-burnt-400",
    gradientLight: "from-burnt-50 to-sandy-50 dark:from-burnt-900/20 dark:to-sandy-900/20",
    text: "text-burnt-400",
    icon: BookHeart,
    jarColor: "from-burnt-100/80 via-sandy-50/60 to-burnt-50/30",
  },
];

// ─── Note colors ───

const NOTE_STYLES = [
  { bg: "from-pink-200 to-pink-300" },
  { bg: "from-burnt-100 to-burnt-200" },
  { bg: "from-sandy-100 to-sandy-200" },
  { bg: "from-rose-200 to-rose-300" },
  { bg: "from-amber-100 to-amber-200" },
  { bg: "from-orange-100 to-orange-200" },
  { bg: "from-red-100 to-red-200" },
  { bg: "from-fuchsia-100 to-fuchsia-200" },
];

// ─── Main Component ───

export default function LoveJarGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [reasons, setReasons] = useState<LoveReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [activeCategory, setActiveCategory] = useState<JarCategory | null>(null);

  // Random reason state
  const [randomReason, setRandomReason] = useState<LoveReason | null>(null);
  const [showRandom, setShowRandom] = useState(false);
  const [pulling, setPulling] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReasons = useCallback(async (cat?: JarCategory) => {
    setLoading(true);
    try {
      const params = cat ? { category: cat } : {};
      const res = await api.get("/love-reasons", { params });
      setReasons(res.data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeCategory) {
      loadReasons(activeCategory);
    }
  }, [activeCategory, loadReasons]);

  // Seed 100 reasons when entering that category
  const enter100Reasons = async () => {
    setActiveCategory("100reasons");
    try {
      await api.post("/love-reasons/seed-100");
    } catch {
      /* already seeded */
    }
  };

  // ─── Pull random reason ───

  const pullRandom = async () => {
    if (reasons.length === 0 || pulling) return;
    setPulling(true);
    try {
      const res = await api.get("/love-reasons/random", { params: { category: activeCategory } });
      setRandomReason(res.data);
      setTimeout(() => {
        setShowRandom(true);
        setPulling(false);
      }, 600);
    } catch {
      setPulling(false);
    }
  };

  // ─── CRUD ───

  const addReason = async () => {
    if (!newText.trim() || !activeCategory) return;
    setSaving(true);
    try {
      await api.post("/love-reasons", { text: newText.trim(), category: activeCategory });
      setNewText("");
      setShowForm(false);
      await loadReasons(activeCategory);
    } catch {
      /* */
    }
    setSaving(false);
  };

  const deleteReason = async (id: number) => {
    try {
      await api.delete(`/love-reasons/${id}`);
      setReasons((prev) => prev.filter((r) => r.id !== id));
    } catch {
      /* */
    }
  };

  // ─── Category selection screen ───

  if (activeCategory === null) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-pink-300 via-rose-300 to-burnt-300 flex items-center justify-center shadow-lg shadow-pink-200/30"
          >
            <Heart size={26} className="text-white" fill="currentColor" />
          </motion.div>
          <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
            {t("jar.title")}
          </h2>
          <p className="text-xs text-charcoal-300 dark:text-[#6e6862] max-w-[260px] mx-auto leading-relaxed">
            {t("jar.choose.jar")}
          </p>
        </div>

        <div className="space-y-3">
          {JAR_CATEGORIES.map((cat, i) => {
            const CatIcon = cat.icon;
            return (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => cat.key === "100reasons" ? enter100Reasons() : setActiveCategory(cat.key)}
                className="w-full bg-white dark:bg-[#232829] rounded-3xl overflow-hidden shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] hover:border-burnt-200/60 dark:hover:border-burnt-500/30 transition-all text-left"
              >
                <div className={`h-1.5 bg-gradient-to-r ${cat.gradient}`} />
                <div className="p-4 flex items-center gap-4">
                  <div className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-md`}>
                    <span className="text-2xl">{cat.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t(cat.labelKey)}</p>
                    <p className="text-xs text-charcoal-300 dark:text-[#6e6862] mt-0.5">{t(cat.descKey)}</p>
                  </div>
                  <CatIcon size={18} className={`${cat.text} shrink-0`} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ─── Active jar view ───

  const catConfig = JAR_CATEGORIES.find((c) => c.key === activeCategory)!;
  const CatIcon = catConfig.icon;
  const is100 = activeCategory === "100reasons";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setActiveCategory(null); setShowList(false); setShowForm(false); }}
          className="p-2 rounded-xl bg-warm-100 dark:bg-[#2e3335] text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-200 dark:hover:bg-[#353a3c] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center`}>
            <span className="text-sm">{catConfig.emoji}</span>
          </div>
          <span className="font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t(catConfig.labelKey)}</span>
        </div>
      </div>

      {/* ─── Jar Visual ─── */}
      <div className="flex flex-col items-center">
        {/* Jar lid */}
        <div className="relative z-10">
          <div className="w-[120px] h-5 rounded-t-xl bg-gradient-to-b from-charcoal-300 to-charcoal-400 dark:from-[#6e6862] dark:to-[#4a4440] shadow-md" />
          <div className="w-[136px] h-3.5 bg-gradient-to-b from-charcoal-400 to-charcoal-500 dark:from-[#5a5550] dark:to-[#4a4440] rounded-sm -mt-0.5 mx-auto shadow-sm" />
        </div>

        {/* Jar body */}
        <div className={`relative w-48 min-h-[220px] -mt-1 rounded-b-[2.5rem] border-2 border-warm-300/40 dark:border-[#3a3f42] bg-gradient-to-b ${catConfig.jarColor} dark:from-[#232829]/80 dark:via-[#1e2425]/60 dark:to-[#1a2022]/30 overflow-hidden shadow-elevated`}>
          <div className="absolute top-0 left-3 w-3 h-full bg-white/25 dark:bg-white/10 rounded-full blur-sm" />
          <div className="absolute top-0 left-7 w-1 h-full bg-white/15 dark:bg-white/5 rounded-full blur-[1px]" />

          <div className="relative p-3 pt-5 flex flex-wrap gap-1.5 justify-center items-end min-h-[200px]">
            {reasons.slice(0, 24).map((reason, i) => {
              const noteStyle = NOTE_STYLES[i % NOTE_STYLES.length];
              const rotation = ["-6", "3", "-2", "6", "-1", "4", "-3", "1"][i % 8];
              return (
                <motion.div
                  key={reason.id}
                  initial={{ opacity: 0, scale: 0, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.02, type: "spring", stiffness: 400, damping: 20 }}
                  className={`w-7 h-7 rounded-md bg-gradient-to-br ${noteStyle.bg} shadow-sm flex items-center justify-center`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <CatIcon size={10} className={`${catConfig.text} opacity-50`} fill="currentColor" />
                </motion.div>
              );
            })}
            {reasons.length > 24 && (
              <span className="text-[9px] text-charcoal-300 dark:text-[#6e6862] mt-1 font-medium">
                +{reasons.length - 24}
              </span>
            )}
          </div>

          <AnimatePresence>
            {pulling && (
              <motion.div
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -180, opacity: 0, rotate: 8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
              >
                <div className={`w-12 h-14 bg-gradient-to-br ${catConfig.gradient} rounded-lg shadow-lg flex items-center justify-center rotate-3 opacity-80`}>
                  <CatIcon size={16} className="text-white" fill="currentColor" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <CatIcon size={11} className={catConfig.text} fill="currentColor" />
          <span className="text-[11px] font-semibold text-charcoal-400 dark:text-[#8a8580]">
            {reasons.length} {reasons.length === 1 ? t("jar.reason") : t("jar.reasons")}
          </span>
        </div>
      </div>

      {/* Pull button */}
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={pullRandom}
          disabled={pulling || reasons.length === 0}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r ${catConfig.gradient} text-white font-bold text-sm shadow-lg disabled:opacity-40 transition-all`}
        >
          <Sparkles size={18} />
          {t("jar.draw")}
        </motion.button>
      </div>

      {/* ─── Random reason modal ─── */}
      <AnimatePresence>
        {showRandom && randomReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowRandom(false)}
          >
            <motion.div
              initial={{ scale: 0.3, rotateZ: -8, opacity: 0 }}
              animate={{ scale: 1, rotateZ: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotateZ: 6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs"
            >
              <div className="bg-white dark:bg-[#232829] rounded-3xl p-7 shadow-xl border border-warm-200/40 dark:border-[#3a3f42] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-gradient-to-br from-pink-100/40 to-rose-100/40 dark:from-pink-900/15 dark:to-rose-900/15 -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-gradient-to-br from-burnt-100/30 to-sandy-100/30 dark:from-burnt-900/10 dark:to-sandy-900/10 translate-y-8 -translate-x-8" />

                <button
                  onClick={() => setShowRandom(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl text-charcoal-300 dark:text-[#6e6862] hover:text-charcoal-500 hover:bg-warm-100 dark:hover:bg-[#2e3335] transition-colors z-10"
                >
                  <X size={14} />
                </button>

                <div className="flex justify-center mb-5">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-2xl">{catConfig.emoji}</span>
                  </motion.div>
                </div>

                <div className="relative z-10">
                  <span className={`text-3xl font-serif ${catConfig.text} opacity-20 absolute -top-3 -left-1 leading-none`}>&ldquo;</span>
                  <p className="text-charcoal-600 dark:text-[#e4ddd5] text-center text-lg leading-relaxed font-medium pl-4 pr-2">
                    {randomReason.text}
                  </p>
                  <span className={`text-3xl font-serif ${catConfig.text} opacity-20 absolute -bottom-5 right-0 leading-none`}>&rdquo;</span>
                </div>

                <div className="mt-6 text-center">
                  <span className="text-[10px] text-charcoal-300 dark:text-[#6e6862] font-medium uppercase tracking-wider">
                    {t("jar.from.jar")} {catConfig.emoji}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle list */}
      <div className="flex items-center justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowList(!showList)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
            showList
              ? "bg-charcoal-500 dark:bg-[#e4ddd5] text-white dark:text-charcoal-700 shadow-md"
              : "bg-warm-100/80 dark:bg-[#252a2c] text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-200 dark:hover:bg-[#2e3335]"
          }`}
        >
          {showList ? <X size={13} /> : <List size={13} />}
          {showList ? t("jar.hide.list") : t("jar.show.list")}
          {!showList && <ChevronDown size={12} />}
        </motion.button>
      </div>

      {/* List view */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              {reasons.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
                    <CatIcon size={28} className="text-warm-400 dark:text-[#4a4440]" />
                  </div>
                  <p className="text-charcoal-400 dark:text-[#6e6862] text-sm font-medium">
                    {t("jar.empty")}
                  </p>
                </motion.div>
              ) : (
                reasons.map((reason, i) => {
                  const noteStyle = NOTE_STYLES[i % NOTE_STYLES.length];
                  return (
                    <motion.div
                      key={reason.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="relative bg-white dark:bg-[#232829] rounded-2xl overflow-hidden shadow-soft border border-warm-200/40 dark:border-[#3a3f42]"
                    >
                      <div className={`h-1 bg-gradient-to-r ${noteStyle.bg}`} />
                      <div className="px-4 py-3">
                        <p className="text-sm text-charcoal-600 dark:text-[#e4ddd5] leading-relaxed pr-6">
                          {reason.text}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <CatIcon size={9} className={catConfig.text} fill="currentColor" />
                          <span className="text-[10px] text-charcoal-300 dark:text-[#6e6862] font-medium">
                            {reason.is_preset ? "✨ Preset" : (reason.author_id === user?.id ? t("jar.you") : t("jar.partner"))}
                          </span>
                        </div>
                      </div>

                      {!reason.is_preset && reason.author_id === user?.id && (
                        <button
                          onClick={() => deleteReason(reason.id)}
                          className="absolute top-3 right-3 p-1.5 rounded-xl text-charcoal-200 dark:text-[#4a4440] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add reason form (not for 100reasons presets) */}
      <div>
        {!showForm ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className={`w-full py-3 rounded-2xl border-2 border-dashed dark:border-[#3a3f42] ${catConfig.text} text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80 transition-colors`}
            style={{ borderColor: undefined }}
          >
            <Plus size={16} /> {t("jar.add")}
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CatIcon size={16} className={catConfig.text} fill="currentColor" />
                  <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t("jar.new")}</span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#8a8580] hover:bg-warm-100 dark:hover:bg-[#2e3335] transition-colors">
                  <X size={14} />
                </button>
              </div>

              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder={t(`jar.placeholder.${activeCategory}`)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-pink-200/50 dark:focus:ring-pink-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550] resize-none leading-relaxed"
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addReason}
                disabled={saving || !newText.trim()}
                className={`w-full py-3 rounded-2xl bg-gradient-to-r ${catConfig.gradient} text-white text-sm font-bold disabled:opacity-40 shadow-lg flex items-center justify-center gap-2`}
              >
                <Send size={15} /> {saving ? t("saving") : t("jar.add.btn")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
