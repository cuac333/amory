import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import LoveCounter from "../components/shared/LoveCounter";
import WeeklySummary from "../components/shared/WeeklySummary";
import UpcomingEvents from "../components/shared/UpcomingEvents";
import AppTutorial from "../components/shared/AppTutorial";
import api from "../services/api";
import type { Streak, MonthlyActivity, DiaryEntry, WishlistItem, DailyQuestion, ThinkingOfYou, CoupleXP } from "../types";
import {
  CalendarHeart, MapPin, Heart, PenLine,
  Flame, Gamepad2, ChevronRight, Clock, CheckCircle2, Hourglass,
  Sparkles, Star, Quote, Send, MessageCircle, HeartHandshake, Check, Zap,
} from "lucide-react";

function useGreeting() {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  if (hour < 6) return t("home.greeting.night");
  if (hour < 12) return t("home.greeting.morning");
  if (hour < 19) return t("home.greeting.afternoon");
  return t("home.greeting.night");
}

const LOVE_QUOTES_KEYS = ["quote.1", "quote.2", "quote.3", "quote.4", "quote.5", "quote.6"];

export default function HomePage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const greeting = useGreeting();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [currentActivity, setCurrentActivity] = useState<MonthlyActivity | null>(null);
  const [recentDiary, setRecentDiary] = useState<DiaryEntry[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [visits, setVisits] = useState(0);
  const [quote] = useState(() => LOVE_QUOTES_KEYS[Math.floor(Math.random() * LOVE_QUOTES_KEYS.length)]);
  const [dailyQ, setDailyQ] = useState<DailyQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);
  const [nudges, setNudges] = useState<ThinkingOfYou[]>([]);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [sendingNudge, setSendingNudge] = useState(false);
  const [xp, setXP] = useState<CoupleXP | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem("amory_tutorial_done");
  });

  useEffect(() => {
    api.get("/daily-question/streak").then((res) => setStreak(res.data)).catch(() => {});
    api.get("/monthly/current").then((res) => setCurrentActivity(res.data)).catch(() => {});
    api.get("/diary/").then((res) => setRecentDiary(res.data.slice(0, 2))).catch(() => {});
    api.get("/wishlist/").then((res) => {
      const pending = res.data.filter((i: WishlistItem) => !i.completed);
      setWishlistCount(pending.length);
    }).catch(() => {});
    api.post("/visits/track").then((res) => setVisits(res.data.count)).catch(() => {});
    api.get("/xp").then((res) => setXP(res.data)).catch(() => {});
    api.post("/notifications/check-reminders").catch(() => {});

    // Fetch daily question
    api.get("/daily-question/today")
      .then((res) => setDailyQ(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          api.post("/daily-question/seed")
            .then(() => api.get("/daily-question/today"))
            .then((res) => setDailyQ(res.data))
            .catch(() => {});
        }
      });

    // Fetch thinking-of-you nudges
    api.get("/thinking-of-you")
      .then((res) => {
        const unseen = (res.data as ThinkingOfYou[]).filter((n) => !n.seen);
        setNudges(unseen);
        // Mark them as seen
        unseen.forEach((n) => {
          api.post(`/thinking-of-you/${n.id}/seen`).catch(() => {});
        });
      })
      .catch(() => {});
  }, []);

  const handleSendNudge = async () => {
    setSendingNudge(true);
    try {
      await api.post("/thinking-of-you", {});
      setNudgeSent(true);
      setTimeout(() => setNudgeSent(false), 3000);
    } catch {
      // ignore
    } finally {
      setSendingNudge(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!dailyQ || !answer.trim()) return;
    setAnswering(true);
    try {
      await api.post(`/daily-question/${dailyQ.id}/answer`, { answer_text: answer.trim() });
      const res = await api.get("/daily-question/today");
      setDailyQ(res.data);
      setAnswer("");
    } catch {
      // ignore
    } finally {
      setAnswering(false);
    }
  };

  const quickLinks = [
    { path: "/book", label: t("link.book"), desc: t("link.book.desc"), icon: Clock, color: "from-burnt-300 to-burnt-200", iconColor: "text-burnt-400" },
    { path: "/monthly", label: t("link.activity"), desc: t("link.activity.desc"), icon: CalendarHeart, color: "from-sandy-300 to-sandy-200", iconColor: "text-sandy-500" },
    { path: "/outings", label: t("link.outings"), desc: t("link.outings.desc"), icon: MapPin, color: "from-charcoal-300 to-charcoal-200", iconColor: "text-charcoal-500" },
    { path: "/wishlist", label: t("link.wishlist"), desc: t("link.wishlist.desc"), icon: Heart, color: "from-burnt-200 to-sandy-200", iconColor: "text-burnt-300" },
    { path: "/diary", label: t("link.diary"), desc: t("link.diary.desc"), icon: PenLine, color: "from-verdigris-300 to-verdigris-200", iconColor: "text-verdigris-500" },
    { path: "/quiz", label: t("link.quiz"), desc: t("link.quiz.desc"), icon: Gamepad2, color: "from-tuscan-300 to-tuscan-200", iconColor: "text-tuscan-500" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  const completeTutorial = () => {
    localStorage.setItem("amory_tutorial_done", "1");
    setShowTutorial(false);
  };

  return (
    <>
      <AnimatePresence>
        {showTutorial && <AppTutorial onComplete={completeTutorial} />}
      </AnimatePresence>
    <motion.div
      className="space-y-4 md:space-y-7 py-3 md:py-6 pb-20 md:pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Hero greeting */}
      <motion.div variants={itemVariants} className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-charcoal-400 font-medium">{greeting},</p>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-charcoal-700 mt-0.5">
              {user?.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {visits > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-warm-100/80 rounded-lg">
                <Sparkles size={12} className="text-tuscan-400" />
                <span className="text-xs text-charcoal-400 font-medium">{t("home.visit", { count: visits })}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Inspirational quote */}
      <motion.div
        variants={itemVariants}
        className="flex items-start gap-3 px-4 py-3 bg-white/60 rounded-2xl border border-warm-200/40"
      >
        <Quote size={16} className="text-tuscan-300 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-charcoal-400 italic font-medium leading-relaxed">{t(quote)}</p>
      </motion.div>

      {/* Thinking of You nudge */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-br from-burnt-50 to-sandy-50 rounded-2xl p-4 border border-burnt-100/40 space-y-3">
          <button
            onClick={handleSendNudge}
            disabled={sendingNudge || nudgeSent}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-burnt-300 to-tuscan-300 text-white rounded-xl font-medium text-sm shadow-lg shadow-burnt-200/30 hover:shadow-elevated hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70"
          >
            {nudgeSent ? (
              <>
                <Check size={16} />
                <span>{t("home.thinking.sent")}</span>
              </>
            ) : (
              <>
                <HeartHandshake size={16} />
                <span>{sendingNudge ? t("home.thinking.sending") : t("home.thinking")}</span>
              </>
            )}
          </button>

          {nudges.length > 0 && (
            <div className="space-y-2">
              {nudges.map((nudge) => (
                <div
                  key={nudge.id}
                  className="flex items-start gap-3 px-3 py-2.5 bg-white/70 rounded-xl border border-warm-200/40"
                >
                  <Heart size={14} className="text-burnt-300 flex-shrink-0 mt-0.5 fill-burnt-300" />
                  <div>
                    <p className="text-sm font-medium text-charcoal-600">
                      {t("home.thinking.partner", { name: nudge.sender_name })}
                    </p>
                    {nudge.message && (
                      <p className="text-xs text-charcoal-400 mt-0.5">{nudge.message}</p>
                    )}
                    <p className="text-[10px] text-warm-400 mt-1">
                      {new Date(nudge.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Love Counter */}
      <motion.div variants={itemVariants}>
        <LoveCounter />
      </motion.div>

      {/* XP Level Widget */}
      {xp && (
        <motion.div variants={itemVariants}>
          <Link to="/more" className="block bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-all border border-warm-200/30 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sandy-300 to-burnt-300 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-charcoal-400 font-medium">{t("home.level", { level: xp.level })}</p>
                  <span className="text-xs font-semibold text-burnt-400">{xp.total_xp} XP</span>
                </div>
                <div className="h-2 bg-warm-100 rounded-full overflow-hidden mt-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xp.progress_percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-sandy-300 to-burnt-300 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-charcoal-300 mt-1">{t("home.xp.next", { xp: xp.xp_for_next_level - xp.total_xp, level: xp.level + 1 })}</p>
              </div>
              <ChevronRight size={14} className="text-warm-300 group-hover:text-burnt-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Upcoming Events */}
      <motion.div variants={itemVariants}>
        <UpcomingEvents />
      </motion.div>

      {/* Weekly Summary */}
      <motion.div variants={itemVariants}>
        <WeeklySummary />
      </motion.div>

      {/* Daily Question */}
      {dailyQ && (
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-2xl p-4 shadow-soft border border-warm-200/30 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={14} className="text-verdigris-500" />
              <span className="text-xs text-charcoal-400 font-medium">{t("home.question")}</span>
            </div>
            <p className="font-display font-semibold text-charcoal-700 text-base leading-relaxed">
              {dailyQ.question_text}
            </p>

            {(() => {
              const myAnswer = dailyQ.answers.find((a) => a.user_id === user?.id);
              const partnerAnswer = dailyQ.answers.find((a) => a.user_id !== user?.id);

              if (myAnswer && partnerAnswer) {
                // Both answered
                return (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-verdigris-50/60 rounded-xl p-3 border border-verdigris-100/40">
                      <p className="text-[11px] font-medium text-verdigris-600 mb-1">{myAnswer.user_name}</p>
                      <p className="text-sm text-charcoal-600">{myAnswer.answer_text}</p>
                    </div>
                    <div className="bg-burnt-50/60 rounded-xl p-3 border border-burnt-100/40">
                      <p className="text-[11px] font-medium text-burnt-400 mb-1">{partnerAnswer.user_name}</p>
                      <p className="text-sm text-charcoal-600">{partnerAnswer.answer_text}</p>
                    </div>
                  </div>
                );
              }

              if (myAnswer && !partnerAnswer) {
                // User answered, waiting for partner
                return (
                  <div className="space-y-2 mt-2">
                    <div className="bg-warm-50 rounded-xl p-3 border border-warm-200/40">
                      <p className="text-xs text-charcoal-400 mb-1">{t("home.question.your")}</p>
                      <p className="text-sm text-charcoal-600">{myAnswer.answer_text}</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-sandy-50 rounded-lg">
                      <Hourglass size={12} className="text-sandy-500" />
                      <p className="text-xs text-sandy-600 font-medium">{t("home.question.waiting")}</p>
                    </div>
                  </div>
                );
              }

              // User hasn't answered yet
              return (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t("home.question.placeholder")}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-warm-200 bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-verdigris-300/50 focus:border-verdigris-300 text-charcoal-700 placeholder:text-charcoal-300 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={answering || !answer.trim()}
                    className="px-3 py-2 bg-gradient-to-r from-verdigris-400 to-verdigris-500 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {/* Streak + Activity row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Streak card */}
        {streak && streak.current_streak > 0 ? (
          <div className="bg-gradient-to-br from-sandy-50 to-tuscan-50 rounded-2xl p-4 border border-sandy-100/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-sandy-300 to-tuscan-300 flex items-center justify-center shadow-lg shadow-sandy-200/40">
                <Flame size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-bold text-sandy-500 tabular-nums">{streak.current_streak}</span>
                  <span className="text-sm text-charcoal-400 font-medium">{t("home.streak.days")}</span>
                </div>
                <p className="text-xs text-warm-400 mt-0.5">{t("home.streak.best", { count: streak.best_streak })}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-warm-50 to-warm-100/50 rounded-2xl p-4 border border-warm-200/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warm-200/60 flex items-center justify-center">
                <Flame size={22} className="text-warm-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal-500">{t("home.streak.none")}</p>
                <p className="text-xs text-warm-400">{t("home.streak.start")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Activity card */}
        {currentActivity ? (
          <Link to="/monthly" className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-all group border border-warm-200/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarHeart size={14} className="text-sandy-400" />
                <span className="text-xs text-charcoal-400 font-medium">{t("home.activity.title")}</span>
              </div>
              <ChevronRight size={14} className="text-warm-300 group-hover:text-sandy-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="font-display font-semibold text-charcoal-700 text-base">{currentActivity.title}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                currentActivity.status === "completed" ? "bg-verdigris-50 text-verdigris-700" :
                currentActivity.status === "waiting_partner" ? "bg-sandy-50 text-sandy-600" :
                "bg-warm-100 text-charcoal-400"
              }`}>
                {currentActivity.status === "completed" ? <><CheckCircle2 size={10} /> {t("home.activity.completed")}</> :
                 currentActivity.status === "waiting_partner" ? <><Hourglass size={10} /> {t("home.activity.waiting")}</> :
                 <><Clock size={10} /> {t("home.activity.pending")}</>}
              </span>
            </div>
          </Link>
        ) : (
          <Link to="/monthly" className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-all group border border-warm-200/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarHeart size={14} className="text-sandy-400" />
                <span className="text-xs text-charcoal-400 font-medium">{t("home.activity.title")}</span>
              </div>
              <ChevronRight size={14} className="text-warm-300 group-hover:text-sandy-400 transition-all" />
            </div>
            <p className="text-sm text-charcoal-400">{t("home.activity.create")}</p>
          </Link>
        )}
      </motion.div>

      {/* Quick links grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-sm font-medium text-charcoal-400 mb-3 px-1">{t("home.explore")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all group border border-warm-200/30"
              >
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-2 md:mb-3 group-hover:scale-105 transition-transform`}>
                  <Icon size={15} className="text-white md:hidden" /><Icon size={18} className="text-white hidden md:block" />
                </div>
                <p className="font-medium text-charcoal-700 text-xs md:text-sm">{link.label}</p>
                <p className="text-[10px] md:text-[11px] text-charcoal-400 mt-0.5">{link.desc}</p>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Recent diary entries */}
      {recentDiary.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-medium text-charcoal-400">{t("home.diary.recent")}</h2>
            <Link to="/diary" className="text-xs text-burnt-300 font-medium hover:text-burnt-400 transition-colors flex items-center gap-1">
              {t("home.diary.all")} <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentDiary.map((entry) => (
              <Link
                key={entry.id}
                to="/diary"
                className="block bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-all border border-warm-200/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-burnt-300 to-verdigris-400 flex items-center justify-center text-white text-[10px] font-bold">
                    {entry.user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-charcoal-500">{entry.user_name}</span>
                  <span className="text-[10px] text-warm-400 ml-auto">
                    {new Date(entry.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-sm text-charcoal-400 line-clamp-2 leading-relaxed">{entry.content}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Wishlist preview */}
      {wishlistCount > 0 && (
        <motion.div variants={itemVariants}>
          <Link
            to="/wishlist"
            className="flex items-center gap-4 bg-gradient-to-r from-burnt-50 to-sandy-50 rounded-2xl p-4 border border-burnt-100/40 hover:shadow-soft transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center flex-shrink-0">
              <Star size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal-700">
                {t("home.wishes.count", { count: wishlistCount })}
              </p>
              <p className="text-xs text-charcoal-400">{t("home.wishes.explore")}</p>
            </div>
            <ChevronRight size={16} className="text-warm-300 group-hover:text-burnt-300 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </motion.div>
      )}
    </motion.div>
    </>
  );
}
