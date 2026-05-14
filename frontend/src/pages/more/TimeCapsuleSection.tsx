import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Lock, Unlock, Clock, Send, Camera,
  Package, PartyPopper, FileText, AlignLeft,
  CalendarDays, Hourglass, Archive, Search, Quote,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import DeleteButton from "../../components/shared/DeleteButton";
import DatePicker from "../../components/shared/DatePicker";
import TimePicker from "../../components/shared/TimePicker";
import type { TimeCapsule, DeletionRequest } from "../../types";
import CreatorBadge from "../../components/shared/CreatorBadge";
import { ClickableImage } from "../../components/shared/ImageViewer";

function timeUntil(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function isReady(opens_at: string) {
  return new Date(opens_at).getTime() <= Date.now();
}

// Progress from creation to open date (0-100)
function capsuleProgress(created_at: string, opens_at: string): number {
  const start = new Date(created_at).getTime();
  const end = new Date(opens_at).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

type FilterTab = "all" | "locked" | "ready" | "opened";

export default function TimeCapsuleSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [opensDate, setOpensDate] = useState("");
  const [opensTime, setOpensTime] = useState("09:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const [capRes, delRes] = await Promise.all([
        api.get("/capsules"),
        api.get("/deletion-requests/", { params: { entity_type: "time_capsule", status: "pending" } }),
      ]);
      setCapsules(capRes.data);
      setDeletionRequests(delRes.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Refresh countdowns every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCapsules((prev) => [...prev]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const create = async () => {
    if (!title.trim() || !opensDate) return;
    setSaving(true);
    try {
      const dt = new Date(`${opensDate}T${opensTime || "09:00"}:00`);
      await api.post("/capsules", {
        title: title.trim(),
        message: message.trim() || null,
        opens_at: dt.toISOString(),
      });
      setShowForm(false);
      setTitle("");
      setMessage("");
      setOpensDate("");
      setOpensTime("09:00");
      load();
    } catch {} finally {
      setSaving(false);
    }
  };

  const openCapsule = async (id: number) => {
    setOpeningId(id);
    try {
      await api.post(`/capsules/${id}/open`);
      load();
    } catch {} finally {
      setOpeningId(null);
    }
  };

  const uploadPhoto = async (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/capsules/${id}/upload-photo`, fd);
      load();
    } catch {}
  };

  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;

  const locked = capsules.filter((c) => !c.opened && !isReady(c.opens_at));
  const ready = capsules.filter((c) => !c.opened && isReady(c.opens_at));
  const opened = capsules.filter((c) => c.opened);

  const filteredCapsules = useMemo(() => {
    let list: TimeCapsule[];
    switch (activeTab) {
      case "locked": list = locked; break;
      case "ready": list = ready; break;
      case "opened": list = opened; break;
      default: list = [...ready, ...locked, ...opened];
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.message && c.message.toLowerCase().includes(q))
    );
  }, [capsules, activeTab, search, locked, ready, opened]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-burnt-300 to-tuscan-300 flex items-center justify-center mx-auto mb-1.5">
            <Lock size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{locked.length}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("capsule.stat.locked")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mx-auto mb-1.5">
            <PartyPopper size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{ready.length}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("capsule.stat.ready")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-sm border border-warm-200/30 dark:border-charcoal-700/50 text-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sandy-300 to-sandy-400 flex items-center justify-center mx-auto mb-1.5">
            <Archive size={16} className="text-white" />
          </div>
          <p className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{opened.length}</p>
          <p className="text-[10px] text-charcoal-300 dark:text-warm-400">{t("capsule.stat.opened")}</p>
        </div>
      </div>

      {/* ── Add Button ── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-400 to-tuscan-300 text-white text-sm font-semibold shadow-md shadow-burnt-200/30 flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        {t("capsule.new")}
      </motion.button>

      {/* ── Create Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
          >
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm">
              {/* Form header */}
              <div className="bg-gradient-to-r from-burnt-50 to-tuscan-50 dark:from-charcoal-700 dark:to-charcoal-700 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-burnt-400 to-tuscan-300 flex items-center justify-center">
                    <Package size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-charcoal-700 dark:text-warm-100">{t("capsule.new")}</span>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1 text-charcoal-300 dark:text-warm-400 hover:text-charcoal-500">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Title */}
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("capsule.title.placeholder")}
                    className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
                  />
                </div>

                {/* Message */}
                <div className="relative">
                  <AlignLeft size={14} className="absolute left-3 top-3 text-warm-400" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("capsule.message.placeholder")}
                    rows={3}
                    className="w-full pl-9 pr-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400 resize-none"
                  />
                </div>

                {/* Date + Time */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-charcoal-500 dark:text-warm-300">{t("capsule.opens.label")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      value={opensDate}
                      onChange={setOpensDate}
                      placeholder={t("capsule.date.placeholder")}
                    />
                    <TimePicker
                      value={opensTime}
                      onChange={setOpensTime}
                      placeholder={t("capsule.time.placeholder")}
                    />
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={create}
                  disabled={saving || !title.trim() || !opensDate}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-burnt-400 to-tuscan-300 text-white text-sm font-semibold disabled:opacity-40 shadow-md shadow-burnt-200/20 flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  {saving ? t("capsule.creating") : t("capsule.create")}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter Tabs ── */}
      {capsules.length > 0 && (
        <div className="flex gap-1 bg-warm-50 dark:bg-charcoal-800 rounded-xl p-1 border border-warm-200/30 dark:border-charcoal-700/50">
          {(["all", "ready", "locked", "opened"] as FilterTab[]).map((tab) => {
            const count = tab === "all" ? capsules.length : tab === "ready" ? ready.length : tab === "locked" ? locked.length : opened.length;
            const TabIcon = tab === "all" ? Package : tab === "ready" ? PartyPopper : tab === "locked" ? Lock : Archive;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  activeTab === tab
                    ? "bg-white dark:bg-charcoal-700 text-charcoal-700 dark:text-warm-100 shadow-sm"
                    : "text-charcoal-400 dark:text-warm-400 hover:text-charcoal-500"
                }`}
              >
                <TabIcon size={11} />
                {t(`capsule.tab.${tab}`)}
                {count > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    activeTab === tab
                      ? "bg-burnt-100 dark:bg-burnt-900/30 text-burnt-500 dark:text-burnt-300"
                      : "bg-warm-200/50 dark:bg-charcoal-600 text-charcoal-400 dark:text-warm-400"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search ── */}
      {capsules.length > 3 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("capsule.search.placeholder")}
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-charcoal-800 border border-warm-200/30 dark:border-charcoal-700/50 rounded-xl text-sm outline-none focus:border-burnt-200 dark:focus:border-burnt-400 text-charcoal-700 dark:text-warm-100 placeholder:text-warm-400"
          />
        </div>
      )}

      {/* ── Capsule List ── */}
      {capsules.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-charcoal-700 dark:to-charcoal-600 flex items-center justify-center mx-auto mb-3">
            <Package className="text-warm-400" size={24} />
          </div>
          <p className="text-sm font-medium text-charcoal-400 dark:text-warm-400">{t("capsule.empty")}</p>
          <p className="text-xs text-charcoal-300 dark:text-warm-500 mt-1">{t("capsule.empty.hint")}</p>
        </div>
      ) : filteredCapsules.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-charcoal-400 dark:text-warm-400">{t("no.results")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCapsules.map((c, i) => {
            const capsuleReady = isReady(c.opens_at);
            const remaining = timeUntil(c.opens_at);
            const progress = capsuleProgress(c.created_at, c.opens_at);
            const delReq = getPendingRequest(c.id);

            // Ready to open
            if (!c.opened && capsuleReady) {
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-charcoal-800 rounded-2xl border border-verdigris-200/50 dark:border-verdigris-700/30 shadow-sm overflow-hidden"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-verdigris-400 to-verdigris-300" />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center shrink-0 relative">
                          <PartyPopper size={20} className="text-white" />
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-verdigris-300 rounded-full animate-ping" />
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-verdigris-400 rounded-full" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-charcoal-700 dark:text-warm-100 text-sm">{c.title}</h4>
                          <CreatorBadge userId={c.author_id} date={c.created_at} />
                          <p className="text-[10px] text-verdigris-500 dark:text-verdigris-300 mt-0.5 font-medium">
                            {t("capsule.ready.since")} {new Date(c.opens_at).toLocaleDateString(locale, { day: "numeric", month: "long" })}
                          </p>
                        </div>
                      </div>
                      <DeleteButton
                        entityType="time_capsule"
                        entityId={c.id}
                        pendingRequest={delReq}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openCapsule(c.id)}
                      disabled={openingId === c.id}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-verdigris-400 to-verdigris-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-verdigris-200/30 disabled:opacity-60"
                    >
                      <Unlock size={14} />
                      {openingId === c.id ? t("capsule.opening") : t("capsule.open")}
                    </motion.button>
                  </div>
                </motion.div>
              );
            }

            // Locked
            if (!c.opened && !capsuleReady) {
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-burnt-400 to-tuscan-300" />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-burnt-100 to-tuscan-100 dark:from-burnt-900/30 dark:to-tuscan-900/20 flex items-center justify-center shrink-0">
                          <Lock size={18} className="text-burnt-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-charcoal-700 dark:text-warm-100 text-sm">{c.title}</h4>
                          <CreatorBadge userId={c.author_id} date={c.created_at} />
                          <div className="flex items-center gap-1.5 mt-1">
                            <CalendarDays size={10} className="text-warm-400" />
                            <span className="text-[10px] text-charcoal-400 dark:text-warm-400">
                              {t("capsule.opens.on")} {new Date(c.opens_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DeleteButton
                        entityType="time_capsule"
                        entityId={c.id}
                        pendingRequest={delReq}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                      />
                    </div>

                    {/* Progress bar + countdown */}
                    <div className="mt-3 space-y-1.5">
                      <div className="w-full h-2 bg-warm-100 dark:bg-charcoal-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-burnt-300 to-tuscan-300"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-charcoal-300 dark:text-warm-500">{progress}%</span>
                        {remaining && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-burnt-50 dark:bg-burnt-900/20 text-[10px] font-semibold text-burnt-500 dark:text-burnt-300">
                            <Hourglass size={9} />
                            {t("capsule.remaining", { time: remaining })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Opened
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm overflow-hidden"
              >
                <div className="h-1 w-full bg-gradient-to-r from-sandy-300 to-sandy-400" />

                {/* Photo header */}
                {c.photo_url && (
                  <div className="relative h-40">
                    <ClickableImage src={c.photo_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <h4 className="font-bold text-white text-sm drop-shadow">{c.title}</h4>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2.5">
                  {!c.photo_url && (
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sandy-100 to-warm-100 dark:from-sandy-900/20 dark:to-warm-900/10 flex items-center justify-center shrink-0">
                          <Unlock size={18} className="text-sandy-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-charcoal-700 dark:text-warm-100 text-sm">{c.title}</h4>
                          <CreatorBadge userId={c.author_id} date={c.created_at} />
                        </div>
                      </div>
                      <DeleteButton
                        entityType="time_capsule"
                        entityId={c.id}
                        pendingRequest={delReq}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                      />
                    </div>
                  )}

                  {c.photo_url && (
                    <div className="flex items-center justify-between">
                      <CreatorBadge userId={c.author_id} date={c.created_at} />
                      <DeleteButton
                        entityType="time_capsule"
                        entityId={c.id}
                        pendingRequest={delReq}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-charcoal-400 dark:text-warm-400 flex items-center gap-1">
                    <Clock size={9} />
                    {t("capsule.opened.on")} {c.opened_at ? new Date(c.opened_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : ""}
                  </p>

                  {c.message && (
                    <div className="bg-warm-50 dark:bg-charcoal-700 rounded-xl p-3 border-l-3 border-sandy-300 dark:border-sandy-500">
                      <div className="flex items-start gap-2">
                        <Quote size={12} className="text-sandy-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-charcoal-600 dark:text-warm-200 whitespace-pre-wrap leading-relaxed">{c.message}</p>
                      </div>
                    </div>
                  )}

                  {!c.photo_url && c.author_id === user?.id && (
                    <label className="flex items-center justify-center gap-2 py-2.5 bg-warm-50 dark:bg-charcoal-700 rounded-xl text-xs font-medium text-charcoal-400 dark:text-warm-400 cursor-pointer hover:bg-warm-100 dark:hover:bg-charcoal-600 transition-colors border border-dashed border-warm-200 dark:border-charcoal-600">
                      <Camera size={13} /> {t("capsule.add.photo")}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(c.id, file);
                      }} />
                    </label>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
