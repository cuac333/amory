import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Trophy, Zap, Check, Clock, SkipForward,
  Sparkles, Target, Swords, Flame, CalendarDays,
  ChevronDown, Award, Heart,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import type { WeeklyChallenge, DeletionRequest } from "../../types";
import DeleteButton from "../../components/shared/DeleteButton";

const STATUS_META: Record<string, { labelKey: string; gradient: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  active: { labelKey: "challenges.status.active", gradient: "from-emerald-400 to-green-300", icon: Zap },
  completed: { labelKey: "challenges.status.completed", gradient: "from-amber-400 to-yellow-300", icon: Trophy },
  skipped: { labelKey: "challenges.status.skipped", gradient: "from-charcoal-300 to-charcoal-400", icon: SkipForward },
};

export default function ChallengesSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [current, setCurrent] = useState<WeeklyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [res, delRes] = await Promise.all([
        api.get("/challenges"),
        api.get("/deletion-requests/", { params: { entity_type: "weekly_challenge", status: "pending" } }),
      ]);
      setChallenges(res.data);
      setDeletionRequests(delRes.data);
    } catch {}
  }, []);

  const loadCurrent = useCallback(async () => {
    try {
      const res = await api.get("/challenges/current");
      setCurrent(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        try {
          await api.post("/challenges/seed");
          const retry = await api.get("/challenges/current");
          setCurrent(retry.data);
        } catch { setCurrent(null); }
      } else {
        setCurrent(null);
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([loadCurrent(), loadAll()]).finally(() => setLoading(false));
  }, [loadCurrent, loadAll]);

  const complete = async (id: number) => {
    try {
      await api.post(`/challenges/${id}/complete`);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 3000);
      await Promise.all([loadCurrent(), loadAll()]);
    } catch {}
  };

  const canCreate = form.title.trim().length > 0;

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      await api.post("/challenges", form);
      setShowForm(false);
      setForm({ title: "", description: "" });
      await Promise.all([loadCurrent(), loadAll()]);
    } catch {}
    setSaving(false);
  };

  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;

  const history = challenges.filter((c) => c.id !== current?.id);
  const completedCount = challenges.filter((c) => c.status === "completed").length;
  const totalCount = challenges.length;
  const streak = (() => {
    let count = 0;
    const sorted = [...challenges].filter((c) => c.status !== "active").sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime());
    for (const ch of sorted) {
      if (ch.status === "completed") count++;
      else break;
    }
    return count;
  })();

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
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 flex items-center justify-center mx-auto shadow-lg"
        >
          <Swords size={28} className="text-white" />
        </motion.div>
        <div>
          <h2 className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{t("challenges.title")}</h2>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{t("challenges.desc")}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Trophy, value: completedCount, label: t("challenges.stat.completed"), color: "from-amber-400 to-yellow-300" },
            { icon: Flame, value: streak, label: t("challenges.stat.streak"), color: "from-orange-400 to-red-300" },
            { icon: Target, value: totalCount, label: t("challenges.stat.total"), color: "from-emerald-400 to-teal-300" },
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
      )}

      {/* ── Celebration overlay ── */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-400/10 dark:to-yellow-400/10 border border-amber-200/40 dark:border-amber-800/20 rounded-2xl p-5 text-center shadow-md"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.7 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center mx-auto shadow-lg mb-3">
                <Trophy size={28} className="text-white" />
              </div>
            </motion.div>
            <p className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("challenges.completed.title")}</p>
            <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5">{t("challenges.completed.desc")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Current challenge (hero card) ── */}
      {current ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-400/5 dark:to-teal-400/5 border border-emerald-200/40 dark:border-emerald-800/20 rounded-2xl overflow-hidden shadow-md"
        >
          {/* Active badge strip */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-300" />

          <div className="p-5">
            <div className="flex items-start gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-300 flex items-center justify-center shadow-lg shrink-0">
                <Target size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-300">
                  <Zap size={9} />
                  {t("challenges.this.week")}
                </span>
                <h3 className="text-base font-bold text-charcoal-700 dark:text-warm-100 mt-1.5">{current.title}</h3>
                {current.description && (
                  <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-1 leading-relaxed">{current.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  <CalendarDays size={10} className="text-charcoal-300 dark:text-charcoal-500" />
                  <p className="text-[10px] text-charcoal-300 dark:text-charcoal-600">
                    {t("challenges.week.of")} {new Date(current.week_start).toLocaleDateString(locale, { day: "numeric", month: "long" })}
                  </p>
                </div>
              </div>
            </div>

            {current.status === "active" && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => complete(current.id)}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Check size={16} strokeWidth={3} />
                {t("challenges.complete")}
              </motion.button>
            )}
            {current.status === "completed" && (
              <div className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-400/10 border border-amber-200/40 dark:border-amber-800/20">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">{t("challenges.status.completed")}</span>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-10 gap-3 bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/20 dark:border-charcoal-700/40"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100/50 to-teal-100/50 dark:from-emerald-400/10 dark:to-teal-400/10 flex items-center justify-center">
            <Sparkles size={24} className="text-emerald-300 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-charcoal-400 dark:text-charcoal-500">{t("challenges.no.active")}</p>
          <p className="text-xs text-charcoal-300 dark:text-charcoal-600">{t("challenges.no.active.hint")}</p>
        </motion.div>
      )}

      {/* ── Add button ── */}
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            showForm
              ? "bg-warm-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-warm-300"
              : "bg-gradient-to-r from-emerald-400 to-teal-300 text-white"
          }`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t("cancel") : t("challenges.new")}
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-300 flex items-center justify-center">
                <Swords size={13} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("challenges.new")}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Target size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("challenges.title.placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-emerald-200/50 dark:focus:ring-emerald-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                />
              </div>
              <div className="relative">
                <Heart size={13} className="absolute left-3 top-3 text-warm-400 dark:text-charcoal-500" />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("challenges.desc.placeholder")}
                  rows={2}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-emerald-200/50 dark:focus:ring-emerald-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500 resize-none"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={create}
                disabled={!canCreate || saving}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Swords size={15} />
                )}
                {saving ? t("creating") : t("challenges.create")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Clock size={13} className="text-charcoal-400 dark:text-charcoal-500" />
            <span className="text-xs font-semibold text-charcoal-500 dark:text-warm-300 uppercase tracking-wider flex-1">
              {t("challenges.history")} ({history.length})
            </span>
            <motion.div animate={{ rotate: showHistory ? 180 : 0 }}>
              <ChevronDown size={14} className="text-charcoal-300 dark:text-charcoal-500" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2"
              >
                {history.map((ch, i) => {
                  const meta = STATUS_META[ch.status] ?? STATUS_META.active;
                  const StatusIcon = meta.icon;
                  return (
                    <motion.div
                      key={ch.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden shadow-sm"
                    >
                      {/* Status gradient strip */}
                      <div className={`h-1 bg-gradient-to-r ${meta.gradient}`} />
                      <div className="p-3 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                          <StatusIcon size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-charcoal-700 dark:text-warm-100 truncate">{ch.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-charcoal-300 dark:text-charcoal-600">
                              {t("challenges.week.of")} {new Date(ch.week_start).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                            </p>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-gradient-to-r ${meta.gradient} text-white`}>
                              {t(meta.labelKey)}
                            </span>
                          </div>
                        </div>
                        <DeleteButton
                          entityType="weekly_challenge"
                          entityId={ch.id}
                          pendingRequest={getPendingRequest(ch.id)}
                          currentUserId={user?.id ?? 0}
                          onAction={() => Promise.all([loadCurrent(), loadAll()])}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
