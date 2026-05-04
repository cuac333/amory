import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../context/I18nContext";
import {
  Home, BookOpen, CalendarHeart, MapPin, Heart, PenLine,
  Gamepad2, HelpCircle, MessageCircle, Map, Sparkles, Zap,
  ChevronRight, ChevronLeft, X, Rocket,
} from "lucide-react";

const TUTORIAL_STEPS = [
  { key: "welcome", icon: Rocket, gradient: "from-burnt-400 via-sandy-300 to-tuscan-300" },
  { key: "home", icon: Home, gradient: "from-burnt-300 to-sandy-300" },
  { key: "book", icon: BookOpen, gradient: "from-tuscan-300 to-burnt-300" },
  { key: "monthly", icon: CalendarHeart, gradient: "from-sandy-300 to-sandy-500" },
  { key: "outings", icon: MapPin, gradient: "from-verdigris-400 to-verdigris-600" },
  { key: "wishlist", icon: Heart, gradient: "from-burnt-200 to-burnt-400" },
  { key: "diary", icon: PenLine, gradient: "from-tuscan-200 to-tuscan-400" },
  { key: "games", icon: Gamepad2, gradient: "from-sandy-400 to-burnt-300" },
  { key: "quiz", icon: HelpCircle, gradient: "from-verdigris-300 to-verdigris-500" },
  { key: "chat", icon: MessageCircle, gradient: "from-burnt-300 to-tuscan-300" },
  { key: "map", icon: Map, gradient: "from-verdigris-400 to-sandy-300" },
  { key: "more", icon: Sparkles, gradient: "from-tuscan-300 to-sandy-400" },
  { key: "xp", icon: Zap, gradient: "from-sandy-400 to-burnt-400" },
];

interface Props {
  onComplete: () => void;
}

export default function AppTutorial({ onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === TUTORIAL_STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goPrev = () => {
    if (isFirst) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const title = current.key === "welcome"
    ? t("tutorial.welcome")
    : t(`tutorial.${current.key}.title` as any);

  const desc = current.key === "welcome"
    ? t("tutorial.welcome.desc")
    : t(`tutorial.${current.key}.desc` as any);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-[#1e2425] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-br ${current.gradient} px-6 pt-8 pb-12`}>
          {/* Skip button */}
          {!isLast && (
            <button
              onClick={onComplete}
              className="absolute top-4 right-4 flex items-center gap-1 text-white/70 hover:text-white text-xs font-medium transition-colors"
            >
              {t("tutorial.skip")}
              <X size={14} />
            </button>
          )}

          {/* Animated icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Icon size={40} className="text-white" strokeWidth={1.5} />
            </motion.div>
          </AnimatePresence>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6 -mt-4 bg-white dark:bg-[#1e2425] rounded-t-3xl relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: direction >= 0 ? 60 : -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction >= 0 ? -60 : 60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="min-h-[120px]"
            >
              <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5] mb-2">
                {title}
              </h2>
              <p className="text-sm text-charcoal-400 dark:text-[#a39e98] leading-relaxed">
                {desc}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Step counter */}
          <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862] text-center mt-3 mb-4">
            {t("tutorial.step", { current: String(step + 1), total: String(TUTORIAL_STEPS.length) })}
          </p>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-charcoal-400 dark:text-[#a39e98] hover:bg-warm-50 dark:hover:bg-[#2a3032] transition-colors"
              >
                <ChevronLeft size={16} />
                {t("tutorial.prev")}
              </button>
            )}

            <button
              onClick={goNext}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isLast
                  ? "bg-gradient-to-r from-burnt-300 to-sandy-300 text-white shadow-elevated hover:shadow-lg hover:-translate-y-0.5"
                  : "bg-gradient-to-r from-burnt-300 to-sandy-300 text-white shadow-soft hover:shadow-elevated"
              }`}
            >
              {isLast ? t("tutorial.start") : t("tutorial.next")}
              {isLast ? <Rocket size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
