import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import {
  Plus, Eye, EyeOff, Send, CheckCircle2, Clock, X, Check,
  Heart, Brain, Tv, Music, Film, Sparkles, Trophy,
  ChevronRight, Flame, Star, Zap, ArrowLeft,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import type { QuizQuestion, QuizStats } from "../types";

const CATEGORIES = [
  { key: "love", labelKey: "quiz.cat.love", icon: Heart, color: "from-burnt-300 to-burnt-200", descKey: "quiz.cat.love.desc" },
  { key: "personality", labelKey: "quiz.cat.personality", icon: Brain, color: "from-verdigris-400 to-verdigris-300", descKey: "quiz.cat.personality.desc" },
  { key: "tvd", labelKey: "quiz.cat.tvd", icon: Tv, color: "from-charcoal-500 to-charcoal-400", descKey: "quiz.cat.tvd.desc" },
  { key: "bts", labelKey: "quiz.cat.bts", icon: Music, color: "from-sandy-400 to-sandy-300", descKey: "quiz.cat.bts.desc" },
  { key: "top", labelKey: "quiz.cat.top", icon: Zap, color: "from-tuscan-400 to-tuscan-300", descKey: "quiz.cat.top.desc" },
  { key: "kpop", labelKey: "quiz.cat.kpop", icon: Star, color: "from-burnt-200 to-sandy-200", descKey: "quiz.cat.kpop.desc" },
  { key: "movies", labelKey: "quiz.cat.movies", icon: Film, color: "from-charcoal-300 to-charcoal-200", descKey: "quiz.cat.movies.desc" },
  { key: "music", labelKey: "quiz.cat.music", icon: Music, color: "from-verdigris-300 to-verdigris-200", descKey: "quiz.cat.music.desc" },
  { key: "custom", labelKey: "quiz.cat.custom", icon: Sparkles, color: "from-tuscan-300 to-tuscan-200", descKey: "quiz.cat.custom.desc" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-verdigris-50 text-verdigris-700",
  medium: "bg-sandy-50 text-sandy-600",
  hard: "bg-burnt-50 text-burnt-400",
};
const DIFFICULTY_KEYS: Record<string, string> = {
  easy: "quiz.diff.easy",
  medium: "quiz.diff.medium",
  hard: "quiz.diff.hard",
};

export default function QuizPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [swiping, setSwiping] = useState(false);

  const loadStats = useCallback(() => {
    api.get("/quiz/stats").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const loadCategory = async (cat: string) => {
    setActiveCategory(cat);
    setCurrentIndex(0);
    setSelectedAnswer("");
    setViewMode("card");

    if (cat !== "custom") {
      setSeeding(true);
      await api.post("/quiz/seed-category", null, { params: { category: cat } }).catch(() => {});
      setSeeding(false);
    }

    const res = await api.get("/quiz", { params: { category: cat } });
    setQuestions(res.data);
  };

  const reload = async () => {
    if (!activeCategory) return;
    const res = await api.get("/quiz", { params: { category: activeCategory } });
    setQuestions(res.data);
    loadStats();
  };

  const submitAnswer = async (questionId: number, answer: string) => {
    if (!answer.trim()) return;
    await api.post(`/quiz/${questionId}/answer`, { answer });
    setSelectedAnswer("");
    reload();
  };

  const createQuestion = async () => {
    if (!newQuestion.trim()) return;
    await api.post("/quiz", {
      question: newQuestion,
      category: activeCategory || "custom",
      options: newOptions.length > 0 ? newOptions : null,
    });
    setNewQuestion("");
    setNewOptions([]);
    setShowCreate(false);
    reload();
  };

  const addOption = () => {
    if (newOptionText.trim() && newOptions.length < 6) {
      setNewOptions([...newOptions, newOptionText.trim()]);
      setNewOptionText("");
    }
  };

  const userAnswered = (q: QuizQuestion) => q.answers.some((a) => a.user_id === user?.id);
  const bothAnswered = (q: QuizQuestion) => q.answers.length >= 2;
  const isMatch = (q: QuizQuestion) => {
    if (q.answers.length < 2) return false;
    return q.answers[0].answer.trim().toLowerCase() === q.answers[1].answer.trim().toLowerCase();
  };

  const unanswered = questions.filter((q) => !userAnswered(q));
  const currentQ = viewMode === "card" ? unanswered[currentIndex] : null;

  const isYesNo = (q: QuizQuestion): boolean =>
    !!q.options && q.options.length === 2 &&
    q.options.every((o) => ["sí", "si", "no"].includes(o.trim().toLowerCase()));

  const handleSwipeRight = async () => {
    if (!currentQ || swiping) return;
    if (!selectedAnswer.trim()) return;
    setSwiping(true);
    setExitDirection("right");
    setTimeout(async () => {
      await submitAnswer(currentQ.id, selectedAnswer);
      setSwiping(false);
      setExitDirection(null);
    }, 300);
  };

  const handleSwipeLeft = () => {
    if (!currentQ || swiping) return;
    setSwiping(true);
    setExitDirection("left");
    setTimeout(() => {
      setSelectedAnswer("");
      setCurrentIndex((i) => Math.min(i + 1, unanswered.length - 1));
      setSwiping(false);
      setExitDirection(null);
    }, 300);
  };

  const toggleReveal = (id: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ============ CATEGORY MENU ============
  if (!activeCategory) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 py-6 pb-24 md:pb-8"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-charcoal-700">{t("quiz.title")}</h1>
          <p className="text-sm text-charcoal-400">{t("quiz.desc")}</p>
        </div>

        {/* Global stats */}
        {stats && stats.answered_both > 0 && (
          <div className="bg-gradient-to-br from-burnt-50 to-sandy-50 rounded-2xl p-5 border border-burnt-100/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center">
                <Trophy size={22} className="text-white" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-charcoal-700">{stats.match_rate}% Match</p>
                <p className="text-xs text-charcoal-400">{t("quiz.stats.matches", { matches: stats.matches, total: stats.answered_both })}</p>
              </div>
            </div>
            <div className="w-full bg-warm-200/50 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-burnt-300 to-sandy-300 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${stats.match_rate}%` }}
              />
            </div>
          </div>
        )}

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const catStats = stats?.by_category[cat.key];
            return (
              <button
                key={cat.key}
                onClick={() => loadCategory(cat.key)}
                className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all text-left group border border-warm-200/30"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal-700">{t(cat.labelKey)}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">{t(cat.descKey)}</p>
                    {catStats && catStats.answered > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-warm-100 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-burnt-300 to-sandy-300 h-1.5 rounded-full"
                            style={{ width: `${catStats.answered > 0 ? (catStats.matches / catStats.answered) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-warm-400 font-medium">
                          {catStats.matches}/{catStats.answered}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-warm-300 mt-1 group-hover:text-sandy-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ============ QUIZ CATEGORY VIEW ============
  const catData = CATEGORIES.find((c) => c.key === activeCategory);
  const CatIcon = catData?.icon || Sparkles;
  const answeredQuestions = questions.filter((q) => bothAnswered(q));
  const matchCount = answeredQuestions.filter(isMatch).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-5 py-6 pb-24 md:pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setActiveCategory(null); loadStats(); }} className="p-2 rounded-xl bg-warm-50 text-charcoal-400 hover:bg-warm-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CatIcon size={18} className="text-sandy-400" />
            <h1 className="text-xl font-display font-bold text-charcoal-700">{catData ? t(catData.labelKey) : ""}</h1>
          </div>
          <p className="text-xs text-charcoal-400">{t("quiz.questions", { count: questions.length })} · {t("quiz.pending", { count: unanswered.length })}</p>
        </div>
        {answeredQuestions.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-burnt-50 rounded-xl">
            <Flame size={14} className="text-burnt-300" />
            <span className="text-sm font-bold text-burnt-400">{matchCount}/{answeredQuestions.length}</span>
          </div>
        )}
      </div>

      {seeding && (
        <div className="text-center py-4 text-sm text-charcoal-400">{t("quiz.loading")}</div>
      )}

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-warm-100/60 rounded-xl">
        <button onClick={() => setViewMode("card")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === "card" ? "bg-white text-charcoal-700 shadow-soft" : "text-charcoal-400"}`}>
          {t("quiz.swipe")}
        </button>
        <button onClick={() => setViewMode("list")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === "list" ? "bg-white text-charcoal-700 shadow-soft" : "text-charcoal-400"}`}>
          {t("quiz.list")}
        </button>
      </div>

      {/* Add custom question button */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 text-sm"
      >
        <Plus size={16} /> {t("quiz.add")}
      </button>

      {/* Create question form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 shadow-soft space-y-3">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={t("quiz.placeholder")}
            className="w-full px-4 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
          />
          <p className="text-xs text-charcoal-400">{t("quiz.options.hint")}</p>
          <div className="flex flex-wrap gap-1.5">
            {newOptions.map((opt, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-warm-50 rounded-lg text-xs text-charcoal-500">
                {opt}
                <button onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))} className="text-warm-400 hover:text-burnt-300">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          {newOptions.length < 6 && (
            <div className="flex gap-2">
              <input
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                placeholder={t("quiz.option.placeholder")}
                className="flex-1 px-3 py-2 bg-warm-50 border border-warm-200 rounded-lg text-sm outline-none"
                onKeyDown={(e) => e.key === "Enter" && addOption()}
              />
              <button onClick={addOption} className="px-3 py-2 bg-warm-100 rounded-lg text-xs text-charcoal-500 hover:bg-warm-200">{t("quiz.add.option")}</button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={createQuestion} disabled={!newQuestion.trim()} className="flex-1 py-2.5 bg-burnt-300 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">{t("create")}</button>
            <button onClick={() => { setShowCreate(false); setNewOptions([]); }} className="px-4 py-2.5 bg-warm-50 rounded-xl text-sm text-charcoal-400">{t("cancel")}</button>
          </div>
        </motion.div>
      )}

      {/* ===== CARD / SWIPE MODE ===== */}
      {viewMode === "card" && (
        <>
          {unanswered.length > 0 && currentQ ? (
            <div className="relative">
              {/* Swipe hint labels - only for yes/no questions */}
              {isYesNo(currentQ) && (
                <div className="flex justify-between px-4 mb-2">
                  <span className="text-xs text-warm-400 flex items-center gap-1">
                    <X size={12} /> {t("no")}
                  </span>
                  <span className="text-xs text-warm-400 flex items-center gap-1">
                    {t("yes")} <Check size={12} />
                  </span>
                </div>
              )}

              <div className="relative" style={{ minHeight: currentQ?.options && !isYesNo(currentQ) ? `${180 + (currentQ.options.length * 52)}px` : "320px" }}>
                <AnimatePresence mode="wait">
                  <SwipeCard
                    key={currentQ.id}
                    question={currentQ}
                    selectedAnswer={selectedAnswer}
                    onSelectAnswer={setSelectedAnswer}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    exitDirection={exitDirection}
                    index={currentIndex}
                    total={unanswered.length}
                    onSubmit={(answer) => submitAnswer(currentQ.id, answer)}
                    swipeable={isYesNo(currentQ)}
                  />
                </AnimatePresence>
              </div>

              {/* Action buttons - only for yes/no (swipeable) questions */}
              {isYesNo(currentQ) ? (
                <div className="flex items-center justify-center gap-6 mt-5">
                  <button
                    onClick={() => { setSelectedAnswer("No"); handleSwipeLeft(); }}
                    className="w-14 h-14 rounded-full bg-white shadow-elevated border-2 border-warm-200 flex items-center justify-center text-warm-400 hover:border-burnt-200 hover:text-burnt-300 hover:scale-110 active:scale-95 transition-all"
                  >
                    <X size={24} />
                  </button>
                  <span className="text-xs text-warm-300">{currentIndex + 1}/{unanswered.length}</span>
                  <button
                    onClick={() => { setSelectedAnswer("Sí"); setTimeout(handleSwipeRight, 50); }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-burnt-300 to-sandy-300 shadow-elevated flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
                  >
                    <Heart size={24} />
                  </button>
                </div>
              ) : (
                <div className="text-center mt-5">
                  <span className="text-xs text-warm-300">{currentIndex + 1}/{unanswered.length}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="mx-auto text-verdigris-400 mb-3" />
              <p className="font-display font-bold text-charcoal-700 text-lg">{t("quiz.all.answered")}</p>
              <p className="text-sm text-charcoal-400 mt-1">{t("quiz.switch.list")}</p>
            </div>
          )}
        </>
      )}

      {/* ===== LIST MODE ===== */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {questions.map((q) => {
            const answered = userAnswered(q);
            const both = bothAnswered(q);
            const match = isMatch(q);
            const isRevealed = revealed.has(q.id);

            return (
              <div key={q.id} className={`bg-white rounded-2xl shadow-soft overflow-hidden border ${match && both ? "border-verdigris-200" : "border-warm-200/30"}`}>
                <div className="p-4">
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-medium text-charcoal-700 text-sm flex-1">{q.question}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                        {t(DIFFICULTY_KEYS[q.difficulty])}
                      </span>
                      {both && match && (
                        <span className="px-1.5 py-0.5 rounded bg-verdigris-50 text-verdigris-700 text-[9px] font-bold">MATCH</span>
                      )}
                      {both && !match && (
                        <span className="px-1.5 py-0.5 rounded bg-burnt-50 text-burnt-300 text-[9px] font-bold">NO MATCH</span>
                      )}
                    </div>
                  </div>

                  {/* Answer input */}
                  {!answered && (
                    <>
                      {q.options ? (
                        <div className="space-y-1.5 mb-3">
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => submitAnswer(q.id, opt)}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium bg-warm-50 text-charcoal-600 hover:bg-burnt-50 hover:text-burnt-400 border border-warm-200/50 transition-all"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <ListFreeAnswer questionId={q.id} onSubmit={submitAnswer} />
                      )}
                    </>
                  )}

                  {/* Waiting for partner */}
                  {answered && !both && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-sandy-50 rounded-lg">
                      <Clock size={12} className="text-sandy-500" />
                      <p className="text-xs text-sandy-600">{t("quiz.waiting")}</p>
                    </div>
                  )}

                  {/* Both answered - reveal */}
                  {both && (
                    <div>
                      <button onClick={() => toggleReveal(q.id)} className="flex items-center gap-1.5 text-xs text-burnt-400 font-medium hover:text-burnt-500 transition-colors mb-2">
                        {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        {isRevealed ? t("quiz.hide") : t("quiz.show")}
                      </button>
                      <AnimatePresence>
                        {isRevealed && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5 overflow-hidden"
                          >
                            {q.answers.map((a) => (
                              <div key={a.id} className={`rounded-lg px-3 py-2 flex items-center gap-2 ${match ? "bg-verdigris-50" : "bg-warm-50"}`}>
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-burnt-300 to-verdigris-400 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                                  {a.user_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-charcoal-500">{a.user_name}:</span>
                                <span className="text-xs text-charcoal-600">{a.answer}</span>
                              </div>
                            ))}
                            {match && (
                              <div className="flex items-center justify-center gap-1.5 py-2">
                                <Heart size={12} className="text-burnt-300 fill-burnt-300" />
                                <span className="text-xs font-bold text-burnt-400">{t("quiz.match")}</span>
                                <Heart size={12} className="text-burnt-300 fill-burnt-300" />
                              </div>
                            )}
                            {q.correct_answer && (
                              <div className="px-3 py-1.5 bg-tuscan-50 rounded-lg">
                                <span className="text-[10px] text-tuscan-600 font-medium">{t("quiz.correct", { answer: q.correct_answer })}</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {questions.length === 0 && !seeding && (
            <div className="text-center py-12">
              <Sparkles size={32} className="mx-auto text-warm-300 mb-2" />
              <p className="text-warm-400 text-sm">{t("quiz.no.questions")}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Tinder-style draggable card
function SwipeCard({
  question, selectedAnswer, onSelectAnswer, onSwipeRight, onSwipeLeft,
  exitDirection, index, total, onSubmit, swipeable,
}: {
  question: QuizQuestion;
  selectedAnswer: string;
  onSelectAnswer: (a: string) => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  exitDirection: "left" | "right" | null;
  index: number;
  total: number;
  onSubmit: (answer: string) => void;
  swipeable: boolean;
}) {
  const { t } = useTranslation();
  const hasOptions = !!question.options;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const nopeOpacity = useTransform(x, [-80, 0], [1, 0]);
  const [picked, setPicked] = useState<string | null>(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!swipeable) return;
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSelectAnswer("Sí");
      setTimeout(onSwipeRight, 50);
    } else if (info.offset.x < -threshold) {
      onSelectAnswer("No");
      onSwipeLeft();
    }
  };

  const handleOptionPick = (opt: string) => {
    setPicked(opt);
    onSelectAnswer(opt);
    setTimeout(() => onSubmit(opt), 400);
  };

  const exitX = exitDirection === "right" ? 400 : exitDirection === "left" ? -400 : 0;
  const exitRotate = exitDirection === "right" ? 20 : exitDirection === "left" ? -20 : 0;

  return (
    <motion.div
      style={swipeable ? { x, rotate } : undefined}
      drag={swipeable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={exitDirection ? {
        x: exitX, rotate: exitRotate, opacity: 0,
        transition: { duration: 0.3 }
      } : {
        opacity: 1, scale: 1, y: 0,
        transition: { duration: 0.25, ease: "easeOut" }
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`absolute inset-0 bg-white rounded-3xl shadow-elevated border border-warm-200/30 flex flex-col ${
        swipeable ? "cursor-grab active:cursor-grabbing touch-none" : ""
      }`}
    >
      {/* SÍ / NO stamps - only for yes/no swipeable */}
      {swipeable && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-6 right-6 border-3 border-verdigris-400 rounded-lg px-3 py-1 rotate-12 pointer-events-none z-10"
          >
            <span className="text-verdigris-400 font-bold text-xl tracking-wide">{t("yes").toUpperCase()}</span>
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-6 left-6 border-3 border-burnt-300 rounded-lg px-3 py-1 -rotate-12 pointer-events-none z-10"
          >
            <span className="text-burnt-300 font-bold text-xl tracking-wide">{t("no").toUpperCase()}</span>
          </motion.div>
        </>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between p-6 pb-0 mb-4">
        <span className="text-xs text-warm-400">{index + 1} / {total}</span>
        <div className="flex items-center gap-2">
          {hasOptions && !swipeable && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-tuscan-50 text-tuscan-500">
              {t("quiz.selection")}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {t(DIFFICULTY_KEYS[question.difficulty])}
          </span>
        </div>
      </div>

      {/* Question */}
      <h2 className="text-lg font-display font-bold text-charcoal-700 mb-4 leading-snug px-6">
        {question.question}
      </h2>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Options (multiple choice) */}
        {hasOptions && !swipeable ? (
          <div className="space-y-2">
            {question.options!.map((opt) => (
              <button
                key={opt}
                onClick={() => !picked && handleOptionPick(opt)}
                disabled={!!picked}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  picked === opt
                    ? "bg-burnt-300 text-white shadow-lg shadow-burnt-200/30 scale-[1.02]"
                    : picked
                      ? "bg-warm-50/60 text-charcoal-300 border border-warm-200/30"
                      : "bg-warm-50 text-charcoal-600 hover:bg-warm-100 border border-warm-200/50 active:scale-[0.98]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : !hasOptions ? (
          /* Free text input (no swipe, submit with button) */
          <div className="flex gap-2">
            <input
              value={selectedAnswer}
              onChange={(e) => onSelectAnswer(e.target.value)}
              placeholder={t("quiz.answer.placeholder")}
              className="flex-1 px-4 py-3 bg-warm-50 border border-warm-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedAnswer.trim()) onSubmit(selectedAnswer);
              }}
            />
            <button
              onClick={() => { if (selectedAnswer.trim()) onSubmit(selectedAnswer); }}
              disabled={!selectedAnswer.trim()}
              className="w-10 h-10 bg-burnt-300 text-white rounded-xl flex items-center justify-center hover:bg-burnt-400 disabled:opacity-30 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        ) : null}

        {/* Hint text */}
        <p className="text-center text-[11px] text-warm-300 mt-3">
          {swipeable
            ? t("quiz.swipe.hint")
            : hasOptions
              ? (picked ? t("quiz.sending") : t("quiz.tap.option"))
              : t("quiz.type.hint")
          }
        </p>
      </div>
    </motion.div>
  );
}

// Separate component to isolate state per question in list mode
function ListFreeAnswer({ questionId, onSubmit }: { questionId: number; onSubmit: (id: number, answer: string) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  return (
    <div className="flex gap-2 mb-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("quiz.your.answer")}
        className="flex-1 px-3 py-2 bg-warm-50 border border-warm-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-tuscan-200"
        onKeyDown={(e) => e.key === "Enter" && text.trim() && onSubmit(questionId, text)}
      />
      <button onClick={() => { if (text.trim()) onSubmit(questionId, text); }} className="w-8 h-8 bg-burnt-300 text-white rounded-lg flex items-center justify-center hover:bg-burnt-400">
        <Send size={12} />
      </button>
    </div>
  );
}
