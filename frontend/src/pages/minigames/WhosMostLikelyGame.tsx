import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { WhosMostLikely } from "../../types";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X, Check,
  Clock, Heart, Send, Users, Sparkles,
} from "lucide-react";

// ─── Main Component ───

export default function WhosMostLikelyGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<WhosMostLikely[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [voting, setVoting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [partnerName, setPartnerName] = useState("");

  // ─── Derive partner ID from questions data ───
  const partnerId = useMemo(() => {
    if (!user) return null;
    for (const q of questions) {
      if (q.created_by !== user.id) return q.created_by;
      for (const v of q.votes) {
        if (v.user_id !== user.id) return v.user_id;
        if (v.voted_for !== user.id) return v.voted_for;
      }
    }
    return null;
  }, [questions, user]);

  // ─── Data loading ───

  const loadQuestions = useCallback(async () => {
    try {
      const res = await api.get("/whos-most-likely");
      setQuestions(res.data);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await api.post("/whos-most-likely/seed"); } catch { /* */ }
      loadQuestions();
    };
    init();
    api.get("/auth/partner").then((r) => setPartnerName(r.data.name)).catch(() => {});
  }, [loadQuestions]);

  // ─── Stats ───

  const stats = useMemo(() => {
    if (!user) return { answered: 0, total: 0, matches: 0 };
    let answered = 0;
    let matches = 0;
    for (const q of questions) {
      const myVote = q.votes.find((v) => v.user_id === user.id);
      const partnerVote = q.votes.find((v) => v.user_id !== user.id);
      if (myVote && partnerVote) {
        answered++;
        if (myVote.voted_for === partnerVote.voted_for) matches++;
      }
    }
    return { answered, total: questions.length, matches };
  }, [questions, user]);

  const matchRate = stats.answered > 0 ? Math.round((stats.matches / stats.answered) * 100) : 0;

  // ─── Navigation ───

  const question = questions[currentIndex] ?? null;

  const goTo = (dir: -1 | 1) => {
    if (questions.length === 0) return;
    setDirection(dir);
    setCurrentIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return questions.length - 1;
      if (next >= questions.length) return 0;
      return next;
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      goTo(info.offset.x > 0 ? -1 : 1);
    }
  };

  // ─── Voting ───

  const handleVote = async (votedFor: number) => {
    if (!question || voting) return;
    setVoting(true);
    try {
      await api.post(`/whos-most-likely/${question.id}/vote`, { voted_for: votedFor });
      await loadQuestions();
    } catch { /* */ }
    setVoting(false);
  };

  // ─── CRUD ───

  const createQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSaving(true);
    try {
      await api.post("/whos-most-likely", { question: newQuestion.trim() });
      setNewQuestion("");
      setShowForm(false);
      await loadQuestions();
    } catch { /* */ }
    setSaving(false);
  };

  const deleteQuestion = async (id: number) => {
    try {
      await api.delete(`/whos-most-likely/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (currentIndex >= questions.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch { /* */ }
  };

  // ─── Vote state helpers ───

  const getVoteState = (q: WhosMostLikely) => {
    if (!user) return { myVote: null, partnerVote: null, bothVoted: false };
    const myVote = q.votes.find((v) => v.user_id === user.id) ?? null;
    const partnerVote = q.votes.find((v) => v.user_id !== user.id) ?? null;
    return { myVote, partnerVote, bothVoted: !!myVote && !!partnerVote };
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-6">
      {/* ── Header ── */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 via-pink-400 to-burnt-300 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/30 mb-3">
          <Users size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          {t("games.whosmost")}
        </h2>
        <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-1">{t("games.whosmost.desc")}</p>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-charcoal-600 dark:text-[#e4ddd5]">{stats.answered}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("wml.answered")}</p>
        </div>
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-burnt-400">{stats.matches}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("wml.matches")}</p>
        </div>
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-purple-400">{matchRate}%</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("wml.rate")}</p>
        </div>
      </div>

      {/* ── Card Deck ── */}
      <div className="relative flex flex-col items-center">
        {questions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm-100/80 dark:bg-[#2e3133] mb-3">
              <Users size={28} className="text-warm-300 dark:text-[#5a5550]" />
            </div>
            <p className="text-charcoal-300 dark:text-[#6e6862] text-sm">{t("wml.empty")}</p>
          </div>
        ) : (
          <>
            {/* Card counter */}
            <p className="text-xs text-charcoal-400 dark:text-[#6e6862] mb-3 font-medium">
              {currentIndex + 1} / {questions.length}
            </p>

            {/* Swipeable card */}
            <div className="relative w-full max-w-sm" style={{ minHeight: 380 }}>
              {/* Shadow cards behind */}
              <div className="absolute inset-x-3 top-2 bottom-0 bg-warm-100/60 dark:bg-[#1e2224] rounded-3xl" />
              <div className="absolute inset-x-1.5 top-1 bottom-0 bg-warm-50/80 dark:bg-[#252a2c] rounded-3xl" />

              <AnimatePresence mode="wait" custom={direction}>
                {question && (
                  <motion.div
                    key={question.id}
                    custom={direction}
                    initial={{ opacity: 0, x: direction >= 0 ? 140 : -140, rotate: direction >= 0 ? 6 : -6 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    exit={{ opacity: 0, x: direction >= 0 ? -140 : 140, rotate: direction >= 0 ? -6 : 6 }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragEnd={handleDragEnd}
                    className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  >
                    <QuestionCard
                      question={question}
                      userId={user?.id ?? 0}
                      userName={user?.name ?? ""}
                      partnerId={partnerId}
                      partnerName={partnerName}
                      voteState={getVoteState(question)}
                      voting={voting}
                      onVote={handleVote}
                      onDelete={deleteQuestion}
                      t={t}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => goTo(-1)}
                className="p-3 rounded-2xl bg-white dark:bg-[#232829] border border-warm-200/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-50 dark:hover:bg-[#2e3133] transition-colors shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs text-charcoal-400 dark:text-[#6e6862]">{t("tod.swipe")}</span>
              <button
                onClick={() => goTo(1)}
                className="p-3 rounded-2xl bg-white dark:bg-[#232829] border border-warm-200/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-50 dark:hover:bg-[#2e3133] transition-colors shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Add Question ── */}
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-warm-300/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] text-sm font-medium flex items-center justify-center gap-2 hover:border-purple-300/60 hover:text-purple-400 dark:hover:border-purple-400/40 dark:hover:text-purple-300 transition-colors"
          >
            <Plus size={16} /> {t("wml.add")}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-soft border border-warm-200/60 dark:border-[#3a3f42] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">
                {t("wml.new")}
              </span>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#6e6862] hover:text-charcoal-500 dark:hover:text-[#a39e98] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={t("wml.placeholder")}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-purple-200/50 dark:focus:ring-purple-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550] resize-none"
            />

            <button
              onClick={createQuestion}
              disabled={saving || !newQuestion.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-400 to-pink-400 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/30"
            >
              <Send size={15} /> {saving ? t("saving") : t("wml.add.btn")}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Question Card ───

interface QuestionCardProps {
  question: WhosMostLikely;
  userId: number;
  userName: string;
  partnerId: number | null;
  partnerName: string;
  voteState: {
    myVote: WhosMostLikely["votes"][number] | null;
    partnerVote: WhosMostLikely["votes"][number] | null;
    bothVoted: boolean;
  };
  voting: boolean;
  onVote: (votedFor: number) => void;
  onDelete: (id: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function QuestionCard({
  question, userId, userName, partnerId, partnerName,
  voteState, voting, onVote, onDelete, t,
}: QuestionCardProps) {
  const { myVote, partnerVote, bothVoted } = voteState;
  const isMatch = bothVoted && myVote!.voted_for === partnerVote!.voted_for;

  const getVotedLabel = (votedFor: number) =>
    votedFor === userId ? (userName || t("wml.me")) : (partnerName || t("wml.partner"));

  return (
    <div className="relative bg-white dark:bg-[#232829] rounded-3xl shadow-lg border border-warm-200/60 dark:border-[#3a3f42] flex flex-col h-full min-h-[380px] select-none overflow-hidden">
      {/* Gradient strip */}
      <div className="h-1.5 bg-gradient-to-r from-purple-400 via-pink-400 to-burnt-300" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4">
        {question.is_preset ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-400">
            <Sparkles size={10} /> 预设
          </span>
        ) : (
          <span />
        )}
        {!question.is_preset && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}
            className="p-2 rounded-xl text-charcoal-300 dark:text-[#5a5550] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Decorative circles */}
      <div className="absolute top-16 right-4 w-20 h-20 rounded-full bg-purple-100/30 dark:bg-purple-900/10 blur-xl pointer-events-none" />
      <div className="absolute bottom-28 left-4 w-16 h-16 rounded-full bg-pink-100/30 dark:bg-pink-900/10 blur-xl pointer-events-none" />

      {/* Question */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <p className="text-charcoal-600 dark:text-[#e4ddd5] text-lg font-semibold text-center leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Vote / Results */}
      <div className="px-5 pb-5 space-y-3">
        {!myVote ? (
          /* ── Vote buttons ── */
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onVote(userId)}
              disabled={voting}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-400 to-purple-500 text-white font-bold text-sm shadow-md shadow-purple-200/30 dark:shadow-purple-900/30 disabled:opacity-50 transition-all"
            >
              {userName || t("wml.me")}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => partnerId && onVote(partnerId)}
              disabled={voting || !partnerId}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold text-sm shadow-md shadow-pink-200/30 dark:shadow-pink-900/30 disabled:opacity-50 transition-all"
            >
              {partnerName || t("wml.partner")}
            </motion.button>
          </div>
        ) : !bothVoted ? (
          /* ── Waiting ── */
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#1e2224] border border-warm-200/60 dark:border-[#2e3133]">
              <span className="text-sm text-charcoal-500 dark:text-[#a39e98]">
                {t("wml.voted")}{" "}
                <span className="font-bold">{getVotedLabel(myVote.voted_for)}</span>
              </span>
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check size={12} className="text-green-500" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-charcoal-400 dark:text-[#6e6862]">
              <Clock size={13} className="animate-pulse" />
              {t("wml.waiting")}
            </div>
          </div>
        ) : (
          /* ── Results ── */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {isMatch && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/60 dark:border-green-800/40"
              >
                <Heart size={16} className="text-green-500 fill-green-500" />
                <span className="text-green-600 dark:text-green-400 font-bold text-sm">{t("wml.match")}</span>
                <Heart size={16} className="text-green-500 fill-green-500" />
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className={`py-3 px-3 rounded-2xl text-center ${
                isMatch
                  ? "bg-green-50/80 dark:bg-green-900/15 border border-green-200/60 dark:border-green-800/30"
                  : "bg-warm-50/80 dark:bg-[#1e2224] border border-warm-200/60 dark:border-[#2e3133]"
              }`}>
                <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] mb-1 uppercase tracking-wider">{t("wml.your.vote")}</p>
                <p className={`font-bold text-sm ${isMatch ? "text-green-600 dark:text-green-400" : "text-charcoal-500 dark:text-[#a39e98]"}`}>
                  {getVotedLabel(myVote!.voted_for)}
                </p>
              </div>
              <div className={`py-3 px-3 rounded-2xl text-center ${
                isMatch
                  ? "bg-green-50/80 dark:bg-green-900/15 border border-green-200/60 dark:border-green-800/30"
                  : "bg-warm-50/80 dark:bg-[#1e2224] border border-warm-200/60 dark:border-[#2e3133]"
              }`}>
                <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] mb-1 uppercase tracking-wider">{t("wml.their.vote")}</p>
                <p className={`font-bold text-sm ${isMatch ? "text-green-600 dark:text-green-400" : "text-charcoal-500 dark:text-[#a39e98]"}`}>
                  {getVotedLabel(partnerVote!.voted_for)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
