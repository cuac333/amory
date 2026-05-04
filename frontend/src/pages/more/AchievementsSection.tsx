import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Pen, Map, Brain, ChefHat, Flame, Music,
  LayoutGrid, Sparkles, PiggyBank, Mail, Trophy,
  Lock, RefreshCw,
} from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "../../context/I18nContext";
import type { Achievement } from "../../types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  camera: Camera,
  pen: Pen,
  map: Map,
  brain: Brain,
  chef: ChefHat,
  fire: Flame,
  music: Music,
  grid: LayoutGrid,
  sparkles: Sparkles,
  piggy: PiggyBank,
  mail: Mail,
  trophy: Trophy,
};

function getIcon(key: string) {
  return ICON_MAP[key] ?? Trophy;
}

export default function AchievementsSection() {
  const { t, locale } = useTranslation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/achievements");
      const data: Achievement[] = res.data;
      if (data.length === 0) {
        await api.post("/achievements/seed");
        const retry = await api.get("/achievements");
        setAchievements(retry.data);
      } else {
        setAchievements(data);
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unlocked = achievements.filter((a) => a.unlocked_at);
  const total = achievements.length;

  const checkAchievements = async () => {
    setChecking(true);
    setNewlyUnlocked([]);
    try {
      const before = achievements.filter((a) => a.unlocked_at).map((a) => a.id);
      await api.post("/achievements/check");
      const res = await api.get("/achievements");
      const updated: Achievement[] = res.data;
      setAchievements(updated);
      const after = updated.filter((a) => a.unlocked_at).map((a) => a.id);
      const newOnes = after.filter((id) => !before.includes(id));
      if (newOnes.length > 0) {
        setNewlyUnlocked(newOnes);
        setTimeout(() => setNewlyUnlocked([]), 3000);
      }
    } catch {
      /* empty */
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-charcoal-700">{t("achievements.title")}</h2>
          <p className="text-xs text-charcoal-400">
            {total > 0
              ? `${unlocked.length} de ${total} ${t("achievements.unlocked")}`
              : t("achievements.hint")}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={checkAchievements}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 text-white text-xs font-semibold shadow-md shadow-verdigris-200/30 disabled:opacity-60"
        >
          <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
          {t("achievements.check")}
        </motion.button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-warm-100 rounded-full h-2.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(unlocked.length / total) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-burnt-300 to-sandy-300 rounded-full"
          />
        </div>
      )}

      {/* Celebration banner */}
      <AnimatePresence>
        {newlyUnlocked.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-sandy-100 to-tuscan-100 border border-sandy-200 rounded-2xl p-3 text-center"
          >
            <Sparkles size={20} className="mx-auto text-sandy-500 mb-1" />
            <p className="text-sm font-semibold text-charcoal-700">
              {newlyUnlocked.length === 1 ? t("achievements.new.single") : `${newlyUnlocked.length} ${t("achievements.new.multi")}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((ach) => {
            const Icon = getIcon(ach.icon);
            const isUnlocked = !!ach.unlocked_at;
            const isNew = newlyUnlocked.includes(ach.id);
            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
                className={`relative flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                  isUnlocked
                    ? "bg-white border-sandy-200 shadow-sm"
                    : "bg-warm-50 border-warm-100"
                } ${isNew ? "ring-2 ring-sandy-300 shadow-lg shadow-sandy-200/40" : ""}`}
              >
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                    isUnlocked
                      ? "bg-gradient-to-br from-burnt-200 to-sandy-200 shadow-md shadow-sandy-200/40"
                      : "bg-warm-200/60"
                  }`}
                >
                  {isUnlocked ? (
                    <Icon size={20} className="text-burnt-600" />
                  ) : (
                    <Lock size={16} className="text-warm-400" />
                  )}
                </div>

                {/* Glow for unlocked */}
                {isUnlocked && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sandy-100/30 to-transparent pointer-events-none" />
                )}

                <h3
                  className={`text-[11px] font-semibold line-clamp-2 ${
                    isUnlocked ? "text-charcoal-700" : "text-charcoal-300"
                  }`}
                >
                  {ach.title}
                </h3>
                <p
                  className={`text-[9px] mt-0.5 line-clamp-2 ${
                    isUnlocked ? "text-charcoal-400" : "text-warm-300"
                  }`}
                >
                  {ach.description}
                </p>

                {isUnlocked && ach.unlocked_at && (
                  <span className="mt-1.5 text-[8px] text-verdigris-500 font-medium">
                    {new Date(ach.unlocked_at).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
