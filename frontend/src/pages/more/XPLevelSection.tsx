import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, TrendingUp, Star, Award, ChevronDown,
  Sparkles, Trophy, Target, Heart,
} from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "../../context/I18nContext";
import type { CoupleXP, XPLogEntry } from "../../types";

const LEVEL_TITLE_KEYS: Record<number, string> = {
  1: "xp.level.1", 2: "xp.level.2", 3: "xp.level.3", 4: "xp.level.4",
  5: "xp.level.5", 6: "xp.level.6", 7: "xp.level.7", 8: "xp.level.8",
  9: "xp.level.9", 10: "xp.level.10", 11: "xp.level.11", 12: "xp.level.12",
  13: "xp.level.13", 14: "xp.level.14", 15: "xp.level.15",
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  capsule_created: "xp.action.capsule_created",
  capsule_opened: "xp.action.capsule_opened",
  diary_entry: "xp.action.diary_entry",
  photo_uploaded: "xp.action.photo_uploaded",
  quiz_answered: "xp.action.quiz_answered",
  outing_completed: "xp.action.outing_completed",
  dream_completed: "xp.action.dream_completed",
  challenge_completed: "xp.action.challenge_completed",
  book_page: "xp.action.book_page",
  message_sent: "xp.action.message_sent",
  recipe_cooked: "xp.action.recipe_cooked",
  pin_added: "xp.action.pin_added",
  open_when_created: "xp.action.open_when_created",
  open_when_opened: "xp.action.open_when_opened",
  song_added: "xp.action.song_added",
};

const ACTION_ICONS: Record<string, typeof Zap> = {
  capsule_created: Sparkles,
  capsule_opened: Sparkles,
  diary_entry: Heart,
  photo_uploaded: Star,
  quiz_answered: Target,
  outing_completed: Trophy,
  dream_completed: Trophy,
  challenge_completed: Award,
  book_page: Star,
  message_sent: Heart,
  recipe_cooked: Star,
  pin_added: Target,
  open_when_created: Sparkles,
  open_when_opened: Sparkles,
  song_added: Star,
};

const XP_REWARDS = [
  { labelKey: "xp.send.message", xp: 5, gradient: "from-verdigris-400 to-verdigris-500" },
  { labelKey: "xp.upload.photo", xp: 5, gradient: "from-sandy-300 to-sandy-400" },
  { labelKey: "xp.write.diary", xp: 10, gradient: "from-tuscan-300 to-tuscan-400" },
  { labelKey: "xp.cook.recipe", xp: 15, gradient: "from-burnt-300 to-burnt-400" },
  { labelKey: "xp.create.capsule", xp: 15, gradient: "from-burnt-400 to-tuscan-300" },
  { labelKey: "xp.complete.outing", xp: 20, gradient: "from-verdigris-400 to-verdigris-500" },
  { labelKey: "xp.complete.challenge", xp: 25, gradient: "from-sandy-400 to-burnt-300" },
  { labelKey: "xp.complete.dream", xp: 30, gradient: "from-tuscan-400 to-burnt-400" },
];

export default function XPLevelSection() {
  const { t, locale } = useTranslation();
  const [xp, setXP] = useState<CoupleXP | null>(null);
  const [log, setLog] = useState<XPLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showAllLog, setShowAllLog] = useState(false);

  function getLevelTitle(level: number) {
    const key = LEVEL_TITLE_KEYS[level];
    return key ? t(key) : t("xp.level", { level });
  }

  function getActionLabel(action: string) {
    const key = ACTION_LABEL_KEYS[action];
    return key ? t(key) : action;
  }

  useEffect(() => {
    Promise.all([
      api.get("/xp").then((r) => setXP(r.data)),
      api.get("/xp/log").then((r) => setLog(r.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visibleLog = showAllLog ? log : log.slice(0, 8);

  // Group log by date
  const groupedLog = useMemo(() => {
    const groups: Record<string, XPLogEntry[]> = {};
    visibleLog.forEach((entry) => {
      const dateKey = new Date(entry.created_at).toLocaleDateString(locale, { day: "numeric", month: "long" });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return groups;
  }, [visibleLog, locale]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!xp) return null;

  const xpRemaining = xp.xp_for_next_level - xp.total_xp;

  return (
    <div className="space-y-5">

      {/* ── Level Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-burnt-300 via-sandy-300 to-tuscan-300 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10">
          {/* Level badge + title */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center relative">
                <Star size={28} className="text-white" />
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold text-white">
                  {xp.level}
                </span>
              </div>
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium">{t("xp.level", { level: xp.level })}</p>
                <h2 className="text-xl font-display font-bold leading-tight">{getLevelTitle(xp.level)}</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold leading-none">{xp.total_xp}</p>
              <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">{t("xp.total")}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-white/70">
              <span>{xp.xp_for_current_level} XP</span>
              <span>{xp.xp_for_next_level} XP</span>
            </div>
            <div className="h-3 bg-white/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xp.progress_percent}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-white rounded-full relative"
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-md" />
              </motion.div>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Zap size={10} className="text-white/70" />
              <p className="text-[11px] text-white/70 font-medium">
                {t("xp.next", { xp: xpRemaining })}
              </p>
            </div>
          </div>

          {/* Next level preview */}
          {xp.level < 15 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-white/50">{t("xp.next.level")}</span>
              <span className="text-xs font-semibold text-white/80 flex items-center gap-1">
                <Sparkles size={10} />
                {getLevelTitle(xp.level + 1)}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sandy-300 to-burnt-300 flex items-center justify-center mx-auto mb-1.5">
            <Zap size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{xp.total_xp}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("xp.total")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mx-auto mb-1.5">
            <TrendingUp size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{log.length}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("xp.stat.actions")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-tuscan-300 to-tuscan-400 flex items-center justify-center mx-auto mb-1.5">
            <Target size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{xp.progress_percent}%</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("xp.stat.progress")}</p>
        </div>
      </div>

      {/* ── How to earn XP ── */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm">
        <button
          onClick={() => setShowHowTo(!showHowTo)}
          className="w-full px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center">
              <TrendingUp size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">{t("xp.how")}</span>
          </div>
          <motion.div
            animate={{ rotate: showHowTo ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-charcoal-300 dark:text-warm-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showHowTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                {XP_REWARDS.map((item) => (
                  <div
                    key={item.labelKey}
                    className="flex items-center gap-2.5 px-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 rounded-xl"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
                      <Zap size={11} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-charcoal-600 dark:text-warm-200 truncate">{t(item.labelKey)}</p>
                      <p className="text-[10px] font-bold text-verdigris-500">+{item.xp} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Activity Log ── */}
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm">
        <div className="px-4 py-3.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sandy-300 to-burnt-300 flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">{t("xp.recent")}</span>
          {log.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-sandy-100 dark:bg-sandy-900/30 text-[10px] font-bold text-sandy-600 dark:text-sandy-300">
              {log.length}
            </span>
          )}
        </div>

        <div className="px-4 pb-4">
          {log.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-charcoal-700 dark:to-charcoal-600 flex items-center justify-center mx-auto mb-3">
                <Award className="text-warm-400" size={24} />
              </div>
              <p className="text-sm font-medium text-charcoal-400 dark:text-warm-400">{t("xp.no.activity")}</p>
              <p className="text-xs text-charcoal-300 dark:text-warm-500 mt-1">{t("xp.no.activity.hint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedLog).map(([date, entries]) => (
                <div key={date}>
                  <p className="text-[10px] font-semibold text-charcoal-300 dark:text-warm-500 uppercase tracking-wider mb-1.5">{date}</p>
                  <div className="space-y-1">
                    {entries.map((entry) => {
                      const ActionIcon = ACTION_ICONS[entry.action] || Zap;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-warm-50/50 dark:bg-charcoal-700/50 hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-sandy-100 dark:bg-sandy-900/20 flex items-center justify-center">
                              <ActionIcon size={12} className="text-sandy-500 dark:text-sandy-300" />
                            </div>
                            <span className="text-xs text-charcoal-600 dark:text-warm-200">{getActionLabel(entry.action)}</span>
                          </div>
                          <span className="text-xs font-bold text-verdigris-500 dark:text-verdigris-400 bg-verdigris-50 dark:bg-verdigris-900/20 px-2 py-0.5 rounded-lg">
                            +{entry.xp_amount}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {log.length > 8 && !showAllLog && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAllLog(true)}
                  className="w-full py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 text-xs font-semibold text-charcoal-400 dark:text-warm-400 hover:bg-warm-100 dark:hover:bg-charcoal-600 transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronDown size={13} />
                  {t("xp.show.all", { count: String(log.length) })}
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
