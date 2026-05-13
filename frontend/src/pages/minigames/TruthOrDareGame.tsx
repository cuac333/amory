import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { TruthOrDare } from "../../types";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Plus,
  Trash2,
  X,
  Smile,
  Heart,
  Flame,
  Sparkles,
  Send,
  Eye,
  Zap,
} from "lucide-react";

// ─── Types ───

type Filter = "all" | "truth" | "dare";
type Mode = "normal" | "couples" | "hot";

const MODE_KEYS: {
  key: Mode;
  labelKey: string;
  icon: typeof Smile;
  descKey: string;
  gradient: string;
  gradientLight: string;
  text: string;
  ring: string;
}[] = [
  {
    key: "normal",
    labelKey: "tod.mode.normal",
    icon: Smile,
    descKey: "tod.mode.normal.desc",
    gradient: "from-teal-400 to-emerald-500",
    gradientLight: "from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20",
    text: "text-teal-500",
    ring: "ring-teal-300/40",
  },
  {
    key: "couples",
    labelKey: "tod.mode.couples",
    icon: Heart,
    descKey: "tod.mode.couples.desc",
    gradient: "from-burnt-300 to-burnt-400",
    gradientLight: "from-burnt-50 to-sandy-50 dark:from-burnt-900/20 dark:to-sandy-900/20",
    text: "text-burnt-400",
    ring: "ring-burnt-300/40",
  },
  {
    key: "hot",
    labelKey: "tod.mode.hot",
    icon: Flame,
    descKey: "tod.mode.hot.desc",
    gradient: "from-red-400 to-rose-500",
    gradientLight: "from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20",
    text: "text-red-500",
    ring: "ring-red-300/40",
  },
];

const FILTER_KEYS: { key: Filter; labelKey: string; icon: typeof Eye }[] = [
  { key: "all", labelKey: "tod.all", icon: Sparkles },
  { key: "truth", labelKey: "tod.truths", icon: Eye },
  { key: "dare", labelKey: "tod.dares", icon: Zap },
];

// ─── Helpers ───

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCardGradient(mode: Mode, type: "truth" | "dare") {
  if (mode === "hot") {
    return type === "truth"
      ? { bg: "from-red-400 via-rose-400 to-red-500", badge: "bg-white/20 text-white", textCol: "text-white" }
      : { bg: "from-rose-500 via-red-500 to-orange-500", badge: "bg-white/20 text-white", textCol: "text-white" };
  }
  if (mode === "couples") {
    return type === "truth"
      ? { bg: "from-burnt-300 via-burnt-400 to-sandy-400", badge: "bg-white/20 text-white", textCol: "text-white" }
      : { bg: "from-sandy-300 via-burnt-300 to-burnt-400", badge: "bg-white/20 text-white", textCol: "text-white" };
  }
  return type === "truth"
    ? { bg: "from-teal-400 via-emerald-400 to-teal-500", badge: "bg-white/20 text-white", textCol: "text-white" }
    : { bg: "from-emerald-400 via-teal-400 to-cyan-500", badge: "bg-white/20 text-white", textCol: "text-white" };
}

// ─── Main Component ───

export default function TruthOrDareGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [cards, setCards] = useState<TruthOrDare[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<Mode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<"truth" | "dare">("truth");
  const [saving, setSaving] = useState(false);

  const isCreator = user?.role === "partner_1";

  const loadCards = useCallback(async () => {
    try {
      const res = await api.get("/truth-or-dare");
      setCards(res.data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await api.post("/truth-or-dare/seed");
      } catch {
        /* already seeded */
      }
      loadCards();
    };
    init();
  }, [loadCards]);

  // Filtered cards by mode + type
  const filtered = cards.filter((c) => {
    if (mode && (c.category || "normal") !== mode) return false;
    if (filter !== "all" && c.card_type !== filter) return false;
    return true;
  });

  // Reset index when filter/mode changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filter, mode]);

  const card = filtered[currentIndex] ?? null;

  const goTo = (dir: -1 | 1) => {
    if (filtered.length === 0) return;
    setDirection(dir);
    setCurrentIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return filtered.length - 1;
      if (next >= filtered.length) return 0;
      return next;
    });
  };

  const handleShuffle = () => {
    setCards(shuffleArray(cards));
    setCurrentIndex(0);
    setDirection(0);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      goTo(info.offset.x > 0 ? -1 : 1);
    }
  };

  // CRUD
  const createCard = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await api.post("/truth-or-dare", {
        text: newText.trim(),
        card_type: newType,
        category: mode || "normal",
      });
      setNewText("");
      setNewType("truth");
      setShowForm(false);
      await loadCards();
    } catch {
      /* */
    }
    setSaving(false);
  };

  const deleteCard = async (id: number) => {
    try {
      await api.delete(`/truth-or-dare/${id}`);
      setCards((prev) => prev.filter((c) => c.id !== id));
      if (currentIndex >= filtered.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch {
      /* */
    }
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Mode selection screen
  if (mode === null) {
    return (
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-200 via-pink-200 to-burnt-200 flex items-center justify-center shadow-lg shadow-rose-200/30">
            <Sparkles size={26} className="text-white" />
          </div>
          <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
            {t("tod.title")}
          </h2>
          <p className="text-xs text-charcoal-300 dark:text-[#6e6862] max-w-[260px] mx-auto leading-relaxed">
            {t("tod.choose.mode")}
          </p>
        </div>

        <div className="space-y-3">
          {MODE_KEYS.map((m) => {
            const Icon = m.icon;
            const count = cards.filter((c) => (c.category || "normal") === m.key).length;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className="w-full bg-white dark:bg-[#232829] rounded-3xl overflow-hidden shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] hover:border-burnt-200/60 dark:hover:border-burnt-500/30 transition-all text-left active:scale-[0.98]"
              >
                <div className={`h-1.5 bg-gradient-to-r ${m.gradient}`} />
                <div className="p-4 flex items-center gap-4">
                  <div className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-md`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t(m.labelKey)}</p>
                    <p className="text-xs text-charcoal-300 dark:text-[#6e6862] mt-0.5">{t(m.descKey)}</p>
                  </div>
                  <div className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-semibold ${m.text} bg-gradient-to-r ${m.gradientLight}`}>
                    {count} {t("tod.cards")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentMode = MODE_KEYS.find((m) => m.key === mode)!;
  const ModeIcon = currentMode.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5 pb-6"
    >
      {/* Mode header + back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMode(null)}
          className="p-2 rounded-xl bg-warm-100 dark:bg-[#2e3335] text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-200 dark:hover:bg-[#353a3c] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentMode.gradient} flex items-center justify-center`}>
            <ModeIcon size={14} className="text-white" />
          </div>
          <span className="font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t(currentMode.labelKey)}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-warm-100/80 dark:bg-[#252a2c] rounded-2xl p-1 gap-1">
        {FILTER_KEYS.map((f) => {
          const FIcon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                filter === f.key
                  ? `bg-white dark:bg-[#353a3c] ${currentMode.text} shadow-sm`
                  : "text-charcoal-400 dark:text-[#8a8580] hover:text-charcoal-500 dark:hover:text-[#a5a09a]"
              }`}
            >
              <FIcon size={12} />
              {t(f.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Card deck area */}
      <div className="relative flex flex-col items-center" data-no-page-swipe>
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-14">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
              <Sparkles size={36} className="text-warm-400 dark:text-[#4a4440]" />
            </div>
            <p className="text-charcoal-400 dark:text-[#6e6862] text-sm font-medium">
              {t("tod.empty")}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Card counter */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${currentMode.gradient} flex items-center justify-center`}>
                <span className="text-[9px] font-bold text-white">{currentIndex + 1}</span>
              </div>
              <span className="text-xs text-charcoal-300 dark:text-[#6e6862] font-medium">
                / {filtered.length}
              </span>
            </div>

            {/* Swipeable card */}
            <div className="relative w-full max-w-sm" style={{ minHeight: 300 }}>

              <AnimatePresence mode="wait" custom={direction}>
                {card && (() => {
                  const style = getCardGradient(mode, card.card_type);
                  return (
                    <motion.div
                      key={card.id}
                      custom={direction}
                      initial={{ opacity: 0, x: direction >= 0 ? 120 : -120, scale: 0.92, rotateZ: direction >= 0 ? 6 : -6 }}
                      animate={{ opacity: 1, x: 0, scale: 1, rotateZ: 0 }}
                      exit={{ opacity: 0, x: direction >= 0 ? -120 : 120, scale: 0.92, rotateZ: direction >= 0 ? -6 : 6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.3}
                      onDragEnd={handleDragEnd}
                      className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    >
                      <div className={`relative rounded-3xl shadow-elevated overflow-hidden bg-gradient-to-br ${style.bg} h-full min-h-[300px] flex flex-col`}>
                        {/* Top decoration */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-white/5" />
                        <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-white/5" />
                        <div className="absolute bottom-8 left-4 w-16 h-16 rounded-full bg-white/5" />

                        {/* Badge */}
                        <div className="relative z-10 px-5 pt-5 flex items-center justify-between">
                          <span className={`px-4 py-1.5 rounded-xl text-xs font-bold ${style.badge} backdrop-blur-sm`}>
                            {card.card_type === "truth" ? t("tod.truth") : t("tod.dare")}
                          </span>

                          {/* Delete button for non-preset cards */}
                          {isCreator && !card.is_preset && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCard(card.id);
                              }}
                              className="p-2 rounded-xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Card text */}
                        <div className="flex-1 flex items-center justify-center px-8 py-6">
                          <p className={`${style.textCol} text-xl font-bold text-center leading-relaxed select-none`}>
                            {card.text}
                          </p>
                        </div>

                        {/* Bottom info */}
                        <div className="relative z-10 px-5 pb-5 flex items-center justify-between">
                          <span className="text-[10px] text-white/30 font-medium flex items-center gap-1">
                            {card.is_preset ? <><Sparkles size={10} /> 预设</> : "自定义"}
                          </span>
                          <span className="text-[10px] text-white/30 font-medium">
                            ← {t("tod.swipe")} →
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Navigation arrows + shuffle */}
            <div className="flex items-center gap-3 mt-5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => goTo(-1)}
                className="p-3 rounded-2xl bg-white dark:bg-[#232829] text-charcoal-400 dark:text-[#8a8580] shadow-soft border border-warm-200/40 dark:border-[#3a3f42] hover:border-burnt-200/60 transition-colors"
              >
                <ChevronLeft size={20} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9, rotate: 180 }}
                onClick={handleShuffle}
                className={`p-3 rounded-2xl bg-gradient-to-br ${currentMode.gradient} text-white shadow-lg shadow-burnt-200/20`}
                title={t("tod.shuffle")}
              >
                <Shuffle size={20} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => goTo(1)}
                className="p-3 rounded-2xl bg-white dark:bg-[#232829] text-charcoal-400 dark:text-[#8a8580] shadow-soft border border-warm-200/40 dark:border-[#3a3f42] hover:border-burnt-200/60 transition-colors"
              >
                <ChevronRight size={20} />
              </motion.button>
            </div>
          </>
        )}
      </div>

      {/* Add card form (creator only) */}
      {isCreator && (
        <div className="pt-1">
          {!showForm ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-burnt-200/60 dark:border-[#3a3f42] text-burnt-400 dark:text-burnt-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-burnt-50/50 dark:hover:bg-burnt-900/10 transition-colors"
            >
              <Plus size={16} /> {t("tod.add.custom")}
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] space-y-5">
                {/* Form header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus size={16} className={currentMode.text} />
                    <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">
                      {t("tod.new.card")}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${currentMode.text} bg-gradient-to-r ${currentMode.gradientLight}`}>
                      {t(currentMode.labelKey)}
                    </span>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#8a8580] hover:bg-warm-100 dark:hover:bg-[#2e3335] transition-colors">
                    <X size={14} />
                  </button>
                </div>

                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder={t("tod.placeholder")}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550] resize-none leading-relaxed"
                />

                {/* Truth / Dare toggle */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewType("truth")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      newType === "truth"
                        ? `${currentMode.text} bg-gradient-to-r ${currentMode.gradientLight} ring-2 ${currentMode.ring}`
                        : "bg-warm-50/80 dark:bg-[#252a2c] text-charcoal-300 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#2e3335]"
                    }`}
                  >
                    <Eye size={14} /> {t("tod.truth")}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setNewType("dare")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      newType === "dare"
                        ? `${currentMode.text} bg-gradient-to-r ${currentMode.gradientLight} ring-2 ${currentMode.ring}`
                        : "bg-warm-50/80 dark:bg-[#252a2c] text-charcoal-300 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#2e3335]"
                    }`}
                  >
                    <Zap size={14} /> {t("tod.dare")}
                  </motion.button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={createCard}
                  disabled={saving || !newText.trim()}
                  className={`w-full py-3 rounded-2xl bg-gradient-to-r ${currentMode.gradient} text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-burnt-200/20 flex items-center justify-center gap-2`}
                >
                  <Send size={15} /> {saving ? t("saving") : t("tod.add.card")}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
