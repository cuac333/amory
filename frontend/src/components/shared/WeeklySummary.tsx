import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, MessageCircle, PenLine, Zap, Music2,
  MapPin, Package, Mail, Star, ChevronDown, ChevronUp,
  TrendingUp, Calendar,
} from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "../../context/I18nContext";

interface WeeklySummaryData {
  stats: {
    messages: number;
    diary_entries: number;
    xp_earned: number;
    songs_added: number;
    pins_added: number;
    capsules_created: number;
    letters_created: number;
    dreams_completed: number;
  };
  engagement: {
    activity_score: number;
    active_days: number;
    total_xp: number;
    level: number;
  };
}

const STAT_ITEMS = [
  { key: "messages", label: "stat.messages", icon: MessageCircle, color: "text-verdigris-500" },
  { key: "diary_entries", label: "stat.diary", icon: PenLine, color: "text-burnt-400" },
  { key: "xp_earned", label: "stat.xp", icon: Zap, color: "text-sandy-500" },
  { key: "songs_added", label: "stat.songs", icon: Music2, color: "text-tuscan-400" },
  { key: "pins_added", label: "stat.places", icon: MapPin, color: "text-verdigris-400" },
  { key: "capsules_created", label: "stat.capsules", icon: Package, color: "text-burnt-300" },
  { key: "letters_created", label: "stat.letters", icon: Mail, color: "text-sandy-400" },
  { key: "dreams_completed", label: "stat.dreams", icon: Star, color: "text-tuscan-500" },
] as const;

function getScoreEmoji(score: number) {
  if (score >= 80) return "🔥";
  if (score >= 50) return "💪";
  if (score >= 20) return "👋";
  return "😴";
}

export default function WeeklySummary() {
  const { t } = useTranslation();
  const [data, setData] = useState<WeeklySummaryData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/summary/weekly")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getScoreLabel(score: number): string {
    if (score >= 80) return t("score.amazing");
    if (score >= 50) return t("score.great");
    if (score >= 20) return t("score.active");
    return t("score.quiet");
  }

  if (loading || !data) return null;

  const { stats, engagement } = data;
  const hasActivity = Object.values(stats).some((v) => v > 0);

  if (!hasActivity && !expanded) {
    return null;
  }

  const activeStats = STAT_ITEMS.filter((s) => stats[s.key] > 0);

  return (
    <div className="bg-white dark:bg-[#1e2425] rounded-2xl shadow-soft border border-warm-200/30 dark:border-[#2e3638] overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-warm-50/50 dark:hover:bg-[#262e30]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-verdigris-300 to-verdigris-500 flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-charcoal-700 dark:text-[#e4ddd5]">{t("widget.weekly")}</p>
            <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] flex items-center gap-1">
              <Calendar size={9} /> {t("widget.weekly.period")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getScoreEmoji(engagement.activity_score)}</span>
          {expanded ? (
            <ChevronUp size={14} className="text-warm-300" />
          ) : (
            <ChevronDown size={14} className="text-warm-300" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Activity score */}
              <div className="bg-gradient-to-br from-verdigris-50 to-verdigris-100/50 dark:from-verdigris-500/10 dark:to-verdigris-400/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-verdigris-500" />
                    <span className="text-xs font-semibold text-verdigris-600 dark:text-verdigris-400">
                      {getScoreLabel(engagement.activity_score)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-verdigris-500">{engagement.activity_score}/100</span>
                </div>
                <div className="h-2 bg-white/60 dark:bg-[#1a2022] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${engagement.activity_score}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-verdigris-400 to-verdigris-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-charcoal-400 dark:text-[#6e6862]">
                  <span>{t("widget.weekly.days", { count: engagement.active_days })}</span>
                  <span>{t("widget.weekly.level", { level: engagement.level })}</span>
                </div>
              </div>

              {/* Stats grid */}
              {activeStats.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {activeStats.map((item) => {
                    const Icon = item.icon;
                    const value = stats[item.key];
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-2.5 px-3 py-2.5 bg-warm-50 dark:bg-[#1a2022] rounded-xl"
                      >
                        <Icon size={14} className={item.color} />
                        <div>
                          <p className="text-sm font-bold text-charcoal-700 dark:text-[#e4ddd5]">{value}</p>
                          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862]">{t(item.label)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-charcoal-400 dark:text-[#6e6862]">{t("widget.weekly.none")}</p>
                  <p className="text-[10px] text-charcoal-300 dark:text-[#4a4440] mt-0.5">{t("widget.weekly.hint")}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
