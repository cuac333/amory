import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, MailOpen, Plus, X, Send,
  Smile, Frown, Brain, Flame, Heart, HandHeart,
  Meh, ShieldAlert, UserX, Trophy, Zap, CalendarHeart,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import DeleteButton from "../../components/shared/DeleteButton";
import type { OpenWhenLetter, DeletionRequest } from "../../types";

const CATEGORY_KEYS = [
  { key: "happy", labelKey: "openwhen.cat.happy", icon: Smile, gradient: "from-amber-200 via-yellow-200 to-amber-300", seal: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50", emoji: "😊", ring: "ring-amber-300/40" },
  { key: "sad", labelKey: "openwhen.cat.sad", icon: Frown, gradient: "from-blue-200 via-sky-200 to-blue-300", seal: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50", emoji: "😢", ring: "ring-blue-300/40" },
  { key: "stressed", labelKey: "openwhen.cat.stressed", icon: Brain, gradient: "from-orange-200 via-amber-200 to-orange-300", seal: "bg-orange-400", text: "text-orange-700", bg: "bg-orange-50", emoji: "😰", ring: "ring-orange-300/40" },
  { key: "angry", labelKey: "openwhen.cat.angry", icon: Flame, gradient: "from-red-200 via-rose-200 to-red-300", seal: "bg-red-400", text: "text-red-700", bg: "bg-red-50", emoji: "😤", ring: "ring-red-300/40" },
  { key: "missing_you", labelKey: "openwhen.cat.miss", icon: Heart, gradient: "from-pink-200 via-rose-200 to-pink-300", seal: "bg-pink-400", text: "text-pink-700", bg: "bg-pink-50", emoji: "💕", ring: "ring-pink-300/40" },
  { key: "grateful", labelKey: "openwhen.cat.grateful", icon: HandHeart, gradient: "from-emerald-200 via-green-200 to-emerald-300", seal: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50", emoji: "🙏", ring: "ring-emerald-300/40" },
  { key: "bored", labelKey: "openwhen.cat.bored", icon: Meh, gradient: "from-slate-200 via-gray-200 to-slate-300", seal: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50", emoji: "😴", ring: "ring-slate-300/40" },
  { key: "scared", labelKey: "openwhen.cat.scared", icon: ShieldAlert, gradient: "from-violet-200 via-purple-200 to-violet-300", seal: "bg-violet-400", text: "text-violet-700", bg: "bg-violet-50", emoji: "😨", ring: "ring-violet-300/40" },
  { key: "lonely", labelKey: "openwhen.cat.lonely", icon: UserX, gradient: "from-indigo-200 via-blue-200 to-indigo-300", seal: "bg-indigo-400", text: "text-indigo-700", bg: "bg-indigo-50", emoji: "🥺", ring: "ring-indigo-300/40" },
  { key: "proud", labelKey: "openwhen.cat.proud", icon: Trophy, gradient: "from-yellow-200 via-amber-200 to-yellow-300", seal: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", emoji: "🏆", ring: "ring-yellow-300/40" },
  { key: "need_motivation", labelKey: "openwhen.cat.motivation", icon: Zap, gradient: "from-cyan-200 via-teal-200 to-cyan-300", seal: "bg-cyan-400", text: "text-cyan-700", bg: "bg-cyan-50", emoji: "⚡", ring: "ring-cyan-300/40" },
  { key: "anniversary", labelKey: "openwhen.cat.anniversary", icon: CalendarHeart, gradient: "from-rose-200 via-pink-200 to-rose-300", seal: "bg-rose-400", text: "text-rose-700", bg: "bg-rose-50", emoji: "💝", ring: "ring-rose-300/40" },
];

function getCat(key: string) {
  return CATEGORY_KEYS.find((c) => c.key === key) ?? CATEGORY_KEYS[0];
}

export default function OpenWhenGame() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [letters, setLetters] = useState<OpenWhenLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("happy");
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [revealedId, setRevealedId] = useState<number | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [partnerName, setPartnerName] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/open-when"),
      api.get("/deletion-requests/", { params: { entity_type: "open_when_letter", status: "pending" } }),
    ]).then(([letRes, delRes]) => {
      setLetters(letRes.data);
      setDeletionRequests(delRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/auth/partner").then((res) => setPartnerName(res.data.name)).catch(() => {});
  }, []);

  const getAuthorName = (authorId: number) => authorId === user?.id ? (user?.name || t("you")) : partnerName || t("partner");
  const getRecipientName = (authorId: number) => authorId === user?.id ? partnerName || t("partner") : (user?.name || t("you"));

  const create = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post("/open-when", { content: content.trim(), category });
      setContent("");
      setCategory("happy");
      setShowForm(false);
      load();
    } catch {} finally {
      setSaving(false);
    }
  };

  const openLetter = async (id: number) => {
    setOpeningId(id);
    try {
      await api.post(`/open-when/${id}/open`);
      load();
      setTimeout(() => setRevealedId(id), 300);
    } catch {} finally {
      setOpeningId(null);
    }
  };

  const isAuthor = (l: OpenWhenLetter) => l.author_id === user?.id;
  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;
  const isOpened = (l: OpenWhenLetter) => !!l.opened_by;

  const unopened = letters.filter((l) => !isOpened(l));
  const opened = letters.filter((l) => isOpened(l));
  const selectedCat = getCat(category);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-burnt-200 via-sandy-200 to-burnt-300 flex items-center justify-center shadow-lg shadow-burnt-200/30"
        >
          <Mail size={26} className="text-white" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          {t("openwhen.title")}
        </h2>
        <p className="text-xs text-charcoal-300 dark:text-[#6e6862] max-w-[260px] mx-auto leading-relaxed">
          {t("openwhen.desc")}
        </p>
      </div>

      {/* New letter button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-burnt-200/60 dark:border-[#2e3638] text-burnt-400 dark:text-burnt-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-burnt-50/50 dark:hover:bg-burnt-800/10 transition-colors"
      >
        <Plus size={16} /> {t("openwhen.new")}
      </motion.button>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#1e2425] rounded-3xl p-5 shadow-elevated border border-warm-200/40 dark:border-[#2e3638] space-y-5">
              {/* Form header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-burnt-300" />
                  <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">
                    {t("openwhen.new")}
                  </span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-charcoal-300 hover:bg-warm-100 dark:hover:bg-[#262e30] transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Mood selector — scrollable horizontal pills */}
              <div>
                <p className="text-[11px] font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider mb-2.5">
                  {t("openwhen.select.mood")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_KEYS.map((cat) => {
                    const isActive = category === cat.key;
                    const CIcon = cat.icon;
                    return (
                      <motion.button
                        key={cat.key}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setCategory(cat.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? `${cat.bg} ${cat.text} ring-2 ${cat.ring} shadow-sm`
                            : "bg-warm-50/80 dark:bg-[#1a2022] text-charcoal-400 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#262e30]"
                        }`}
                      >
                        <span className="text-sm">{cat.emoji}</span>
                        <span>{t(cat.labelKey)}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Selected mood preview */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r ${selectedCat.gradient} bg-opacity-40`}>
                <span className="text-2xl">{selectedCat.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-charcoal-600">{t("openwhen.title")}</p>
                  <p className={`text-sm font-semibold ${selectedCat.text}`}>{t(selectedCat.labelKey)}</p>
                </div>
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("openwhen.write.hint")}
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#1a2022] border border-warm-200/60 dark:border-[#2e3638] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#4a4440] resize-none leading-relaxed"
              />

              {/* Send button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={create}
                disabled={saving || !content.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-burnt-200/30 flex items-center justify-center gap-2"
              >
                <Send size={15} /> {saving ? t("saving") : t("openwhen.seal")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {letters.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
            <Mail size={36} className="text-warm-400 dark:text-[#4a4440]" />
          </div>
          <p className="text-charcoal-400 dark:text-[#6e6862] text-sm font-medium">{t("openwhen.empty")}</p>
          <p className="text-charcoal-300 dark:text-[#4a4440] text-xs mt-1">{t("openwhen.empty.hint")}</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* ── Sealed letters ── */}
          {unopened.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-burnt-100 dark:bg-burnt-800/20 flex items-center justify-center">
                  <Mail size={10} className="text-burnt-400" />
                </div>
                <h3 className="text-xs font-bold text-charcoal-500 dark:text-[#a39e98] uppercase tracking-wider">
                  {t("openwhen.sealed")} ({unopened.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {unopened.map((letter, i) => {
                    const cat = getCat(letter.category);
                    const mine = isAuthor(letter);

                    return (
                      <motion.div
                        key={letter.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group"
                      >
                        {/* Envelope card */}
                        <div className="rounded-3xl overflow-hidden shadow-elevated">
                          {/* Envelope flap — gradient top */}
                          <div className={`bg-gradient-to-br ${cat.gradient} px-5 pt-5 pb-8 relative`}>
                            {/* Zigzag bottom edge */}
                            <div className="absolute bottom-0 left-0 right-0 h-3 bg-white dark:bg-[#1e2425]" style={{
                              clipPath: "polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)"
                            }} />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{cat.emoji}</span>
                                <div>
                                  <p className="text-[10px] font-semibold text-charcoal-500/60 uppercase tracking-wider">{t("openwhen.title")}</p>
                                  <p className={`text-sm font-bold ${cat.text}`}>{t(cat.labelKey)}</p>
                                </div>
                              </div>
                              {/* Wax seal */}
                              <div className={`w-10 h-10 rounded-full ${cat.seal} shadow-lg flex items-center justify-center ring-2 ring-white/30`}>
                                <Heart size={14} className="text-white fill-white" />
                              </div>
                            </div>
                          </div>

                          {/* Envelope body */}
                          <div className="bg-white dark:bg-[#1e2425] px-5 py-4 space-y-3">
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.from")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{getAuthorName(letter.author_id)}</span></span>
                              <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.for")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{getRecipientName(letter.author_id)}</span></span>
                            </div>

                            {mine && letter.content && (
                              <div className="bg-warm-50/80 dark:bg-[#1a2022] rounded-xl px-3.5 py-2.5 border border-warm-200/30 dark:border-[#2e3638]">
                                <p className="text-xs text-charcoal-400 dark:text-[#6e6862] italic line-clamp-2 leading-relaxed">
                                  "{letter.content}"
                                </p>
                              </div>
                            )}

                            {!mine ? (
                              <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => openLetter(letter.id)}
                                disabled={openingId === letter.id}
                                className={`w-full py-3 rounded-2xl bg-gradient-to-r ${cat.gradient} text-sm font-bold ${cat.text} flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-shadow hover:shadow-lg`}
                              >
                                <MailOpen size={15} />
                                {openingId === letter.id ? t("openwhen.opening") : t("openwhen.open")}
                              </motion.button>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 py-2">
                                <Mail size={12} className="text-warm-300 dark:text-[#4a4440]" />
                                <p className="text-[10px] text-charcoal-300 dark:text-[#4a4440] font-medium">
                                  {t("openwhen.wait.partner")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delete */}
                        <div className="absolute top-3 right-3 z-20">
                          <DeleteButton
                            entityType="open_when_letter"
                            entityId={letter.id}
                            pendingRequest={getPendingRequest(letter.id)}
                            currentUserId={user?.id ?? 0}
                            onAction={load}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── Opened letters ── */}
          {opened.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-warm-100 dark:bg-[#1a2022] flex items-center justify-center">
                  <MailOpen size={10} className="text-warm-400" />
                </div>
                <h3 className="text-xs font-bold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">
                  {t("openwhen.opened")} ({opened.length})
                </h3>
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {opened.map((letter) => {
                    const cat = getCat(letter.category);
                    const revealed = revealedId === letter.id;

                    return (
                      <motion.div
                        key={letter.id}
                        layout
                        initial={revealed ? { opacity: 0, y: 30, rotateX: -10 } : { opacity: 1 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ type: "spring", damping: 20 }}
                        className="relative group"
                      >
                        <div className="bg-white dark:bg-[#1e2425] rounded-3xl border border-warm-200/40 dark:border-[#2e3638] overflow-hidden shadow-soft">
                          {/* Colored top bar */}
                          <div className={`h-1.5 bg-gradient-to-r ${cat.gradient}`} />

                          <div className="p-5 space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${cat.bg} dark:bg-opacity-20 flex items-center justify-center`}>
                                <span className="text-xl">{cat.emoji}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">
                                  {t("openwhen.title")}
                                </p>
                                <p className={`text-sm font-bold ${cat.text}`}>
                                  {t(cat.labelKey)}
                                </p>
                              </div>
                              <MailOpen size={16} className="text-warm-300 dark:text-[#4a4440]" />
                            </div>

                            {/* Letter content — paper style */}
                            {letter.content && (
                              <div className="relative">
                                <div className="bg-gradient-to-b from-warm-50/80 to-warm-100/40 dark:from-[#1a2022] dark:to-[#1a2022] rounded-2xl px-5 py-4 border border-warm-200/20 dark:border-[#2e3638]">
                                  {/* Decorative quote mark */}
                                  <span className={`text-3xl font-serif leading-none ${cat.text} opacity-20 absolute top-3 left-3`}>"</span>
                                  <p className="text-sm text-charcoal-600 dark:text-[#c4bdb5] whitespace-pre-wrap leading-relaxed pl-4">
                                    {letter.content}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-3 text-[11px]">
                                <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.from")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{getAuthorName(letter.author_id)}</span></span>
                                <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.for")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{getRecipientName(letter.author_id)}</span></span>
                              </div>
                              <p className="text-[10px] text-charcoal-300 dark:text-[#4a4440]">
                                {t("openwhen.opened.date")} {letter.opened_at ? new Date(letter.opened_at).toLocaleDateString(locale, { day: "numeric", month: "long" }) : ""}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="absolute top-5 right-4 z-20">
                          <DeleteButton
                            entityType="open_when_letter"
                            entityId={letter.id}
                            pendingRequest={getPendingRequest(letter.id)}
                            currentUserId={user?.id ?? 0}
                            onAction={load}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
