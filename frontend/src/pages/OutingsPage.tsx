import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Check, ThumbsUp, MapPin, Camera, Heart,
  Mountain, Bath, Theater, UtensilsCrossed, X, Send, ImagePlus,
  Calendar, ChevronDown, ChevronUp, Clock, CheckCircle2,
  Compass, ListChecks, Sparkles, Star, Users,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import DeleteButton from "../components/shared/DeleteButton";

import type { Outing, BucketListItem, DeletionRequest } from "../types";
import CreatorBadge from "../components/shared/CreatorBadge";
import DatePicker from "../components/shared/DatePicker";

const LocationPicker = lazy(() => import("../components/shared/LocationPicker"));
const MiniMap = lazy(() => import("../components/shared/MiniMap"));

const CATEGORIES = [
  { value: "romantic", label: "monthly.cat.romantic", icon: Heart, gradient: "from-burnt-300 to-burnt-400", bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-400", ring: "ring-burnt-200" },
  { value: "adventure", label: "monthly.cat.adventure", icon: Mountain, gradient: "from-verdigris-400 to-verdigris-500", bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-500", ring: "ring-verdigris-200" },
  { value: "relax", label: "monthly.cat.relax", icon: Bath, gradient: "from-tuscan-300 to-tuscan-400", bg: "bg-tuscan-50 dark:bg-tuscan-800/20", text: "text-tuscan-400", ring: "ring-tuscan-200" },
  { value: "cultural", label: "monthly.cat.cultural", icon: Theater, gradient: "from-charcoal-400 to-charcoal-500", bg: "bg-charcoal-50 dark:bg-charcoal-700/30", text: "text-charcoal-500", ring: "ring-charcoal-200" },
  { value: "food", label: "monthly.cat.food", icon: UtensilsCrossed, gradient: "from-sandy-400 to-sandy-500", bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-500", ring: "ring-sandy-200" },
];

const getCat = (key: string) => CATEGORIES.find(c => c.value === key) || CATEGORIES[0];

interface OutingDoc {
  id: number;
  user_name: string;
  photo_url: string;
  description: string;
  created_at: string;
}

export default function OutingsPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [outings, setOutings] = useState<Outing[]>([]);
  const [bucketList, setBucketList] = useState<BucketListItem[]>([]);
  const [tab, setTab] = useState<"outings" | "bucket">("outings");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", place: "", category: "romantic", proposed_date: "", latitude: null as number | null, longitude: null as number | null });
  const [bucketTitle, setBucketTitle] = useState("");
  const [deleteRequests, setDeleteRequests] = useState<DeletionRequest[]>([]);
  const [documentingId, setDocumentingId] = useState<number | null>(null);
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const load = () => {
    api.get("/outings/").then((res) => setOutings(res.data));
    api.get("/outings/bucket-list").then((res) => setBucketList(res.data));
    api.get("/deletion-requests/", { params: { status: "pending" } }).then((res) => {
      setDeleteRequests(res.data.filter((r: DeletionRequest) => r.entity_type === "outing" || r.entity_type === "bucket_list_item"));
    }).catch(() => {});
  };

  const getDeleteRequest = (entityType: string, entityId: number) =>
    deleteRequests.find((r) => r.entity_type === entityType && r.entity_id === entityId);

  useEffect(() => { load(); }, []);

  const canCreateOuting = form.title.trim().length > 0 && form.place.trim().length > 0 && form.proposed_date.length > 0 && form.latitude !== null;

  const createOuting = async () => {
    if (!canCreateOuting) return;
    await api.post("/outings/", { ...form, proposed_date: new Date(form.proposed_date).toISOString() });
    setShowForm(false);
    setForm({ title: "", description: "", place: "", category: "romantic", proposed_date: "", latitude: null, longitude: null });
    load();
  };

  const voteOuting = async (id: number) => { await api.post(`/outings/${id}/vote`, { approved: true }); load(); };
  const completeOuting = async (id: number) => { await api.put(`/outings/${id}/complete`); load(); };
  const startDocumenting = (id: number) => {
    setDocumentingId(id);
    setDocDescription("");
    setDocFile(null);
    setDocPreview(null);
  };

  const handleDocFile = (file: File | null) => {
    setDocFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setDocPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setDocPreview(null);
    }
  };

  const submitDocument = async () => {
    if (!documentingId || !docFile || !docDescription.trim()) return;
    setDocLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("description", docDescription);
      await api.post(`/outings/${documentingId}/document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocumentingId(null);
      setDocDescription("");
      setDocFile(null);
      setDocPreview(null);
      load();
    } catch { /* ignore */ }
    setDocLoading(false);
  };

  const addBucketItem = async () => { if (!bucketTitle) return; await api.post("/outings/bucket-list", { title: bucketTitle }); setBucketTitle(""); load(); };
  const toggleBucket = async (id: number) => { await api.put(`/outings/bucket-list/${id}/toggle`); load(); };

  // Stats
  const completedOutings = outings.filter(o => o.status === "completed" || o.status === "documented").length;
  const documentedOutings = outings.filter(o => o.status === "documented").length;
  const bucketDone = bucketList.filter(b => b.completed).length;

  return (
    <div className="space-y-4 md:space-y-6 py-3 md:py-6">

      {/* ─── Header ─── */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-verdigris-400 via-tuscan-400 to-burnt-300 shadow-lg shadow-verdigris-200/30 mb-3"
        >
          <Compass size={22} className="text-white" />
        </motion.div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal-700 dark:text-warm-200">
          {t("outings.title")}
        </h1>
        <p className="text-xs md:text-sm text-charcoal-400 dark:text-warm-500 mt-1">
          {t("outings.desc")}
        </p>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mb-2 shadow-sm">
            <MapPin size={16} className="text-white" />
          </div>
          <p className="text-xl font-bold text-charcoal-700 dark:text-warm-200">{outings.length}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium">{t("outings.stat.planned")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-sandy-400 to-sandy-500 flex items-center justify-center mb-2 shadow-sm">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <p className="text-xl font-bold text-charcoal-700 dark:text-warm-200">{completedOutings}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium">{t("outings.stat.completed")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-burnt-300 to-burnt-400 flex items-center justify-center mb-2 shadow-sm">
            <Camera size={16} className="text-white" />
          </div>
          <p className="text-xl font-bold text-charcoal-700 dark:text-warm-200">{documentedOutings}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium">{t("outings.stat.documented")}</p>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 p-1 bg-warm-100/60 dark:bg-charcoal-700/60 rounded-xl">
        <button
          onClick={() => setTab("outings")}
          className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${
            tab === "outings"
              ? "bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-warm-200 shadow-soft"
              : "text-charcoal-400 dark:text-warm-500"
          }`}
        >
          <Compass size={14} /> {t("outings.tab.outings")}
        </button>
        <button
          onClick={() => setTab("bucket")}
          className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${
            tab === "bucket"
              ? "bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-warm-200 shadow-soft"
              : "text-charcoal-400 dark:text-warm-500"
          }`}
        >
          <ListChecks size={14} /> {t("outings.tab.bucket")}
          {bucketList.length > 0 && (
            <span className="text-[9px] font-bold bg-burnt-100 dark:bg-burnt-800/30 text-burnt-500 px-1.5 py-0.5 rounded-full">
              {bucketDone}/{bucketList.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════ OUTINGS TAB ═══════ */}
      {tab === "outings" && (
        <>
          {/* Create button */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 hover:shadow-xl transition-shadow"
          >
            <Plus size={18} /> {t("outings.propose")}
          </button>

          {/* Outings list */}
          <div className="space-y-4">
            {outings.map((o, idx) => (
              <OutingCard
                key={o.id}
                outing={o}
                deleteRequest={getDeleteRequest("outing", o.id)}
                currentUserId={user?.id ?? 0}
                onVote={() => voteOuting(o.id)}
                onComplete={() => completeOuting(o.id)}
                onDocument={() => startDocumenting(o.id)}
                onDeleteAction={load}
                index={idx}
              />
            ))}
            {outings.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-warm-100 dark:bg-charcoal-700 flex items-center justify-center mb-3">
                  <MapPin size={28} className="text-warm-300 dark:text-charcoal-500" />
                </div>
                <p className="text-charcoal-400 dark:text-warm-500 text-sm font-medium">{t("outings.empty")}</p>
                <p className="text-charcoal-300 dark:text-charcoal-500 text-xs mt-1">{t("outings.empty.hint")}</p>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* ═══════ BUCKET LIST TAB ═══════ */}
      {tab === "bucket" && (
        <>
          {/* Add input */}
          <div className="flex gap-2">
            <input
              value={bucketTitle}
              onChange={(e) => setBucketTitle(e.target.value)}
              placeholder={t("outings.bucket.placeholder")}
              className="flex-1 px-4 py-3 bg-white dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
              onKeyDown={(e) => e.key === "Enter" && addBucketItem()}
            />
            <button
              onClick={addBucketItem}
              disabled={!bucketTitle.trim()}
              className="w-11 h-11 bg-gradient-to-br from-burnt-300 to-sandy-300 text-white rounded-xl flex items-center justify-center hover:from-burnt-400 hover:to-sandy-400 transition-all disabled:opacity-40 shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Progress bar */}
          {bucketList.length > 0 && (
            <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("outings.bucket.progress")}</span>
                <span className="text-xs font-bold text-charcoal-600 dark:text-warm-300">{bucketDone}/{bucketList.length}</span>
              </div>
              <div className="h-2 bg-warm-100 dark:bg-charcoal-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${bucketList.length > 0 ? (bucketDone / bucketList.length) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-verdigris-400 to-verdigris-500 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Bucket items */}
          <div className="space-y-2">
            {bucketList.map((item, idx) => {
              const confirmedSet = item.confirmed_by ? new Set(item.confirmed_by.split(",")) : new Set<string>();
              const myConfirmed = confirmedSet.has(String(user?.id));
              const confirmCount = confirmedSet.size;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`bg-white dark:bg-charcoal-800 rounded-xl p-3.5 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 transition-all ${item.completed ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBucket(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        item.completed
                          ? "bg-gradient-to-br from-verdigris-400 to-verdigris-500 border-verdigris-500 text-white shadow-sm"
                          : myConfirmed
                            ? "bg-gradient-to-br from-burnt-200 to-burnt-300 border-burnt-300 text-white"
                            : "border-warm-200 dark:border-charcoal-600 hover:border-burnt-200"
                      }`}
                    >
                      {(item.completed || myConfirmed) && <Check size={11} />}
                    </button>
                    <span
                      onClick={() => toggleBucket(item.id)}
                      className={`text-sm flex-1 cursor-pointer ${item.completed ? "line-through text-warm-400 dark:text-charcoal-500" : "text-charcoal-600 dark:text-warm-300"}`}
                    >
                      {item.title}
                    </span>
                    <DeleteButton
                      entityType="bucket_list_item"
                      entityId={item.id}
                      pendingRequest={getDeleteRequest("bucket_list_item", item.id)}
                      currentUserId={user?.id ?? 0}
                      onAction={load}
                    />
                  </div>
                  {!item.completed && confirmCount > 0 && (
                    <div className="ml-9 mt-1.5 flex items-center gap-1">
                      <div className="flex -space-x-1">
                        {Array.from({ length: confirmCount }).map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded-full bg-gradient-to-br from-burnt-200 to-sandy-200 border border-white dark:border-charcoal-800" />
                        ))}
                      </div>
                      <span className="text-[10px] text-burnt-400 font-medium">
                        {confirmCount}/2 {t("outings.confirmed")}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {bucketList.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-full bg-warm-100 dark:bg-charcoal-700 flex items-center justify-center mb-3">
                <ListChecks size={24} className="text-warm-300 dark:text-charcoal-500" />
              </div>
              <p className="text-charcoal-400 dark:text-warm-500 text-sm">{t("outings.bucket.empty")}</p>
            </motion.div>
          )}
        </>
      )}

      {/* ═══════ CREATE OUTING MODAL ═══════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
            style={{ zIndex: 9999 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-charcoal-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
              {...(form.title.trim() || form.description.trim() ? { "data-unsaved-form": true } : {})}
            >
              <div className="p-6 space-y-4">
                {/* Modal header */}
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-verdigris-400 to-tuscan-400 flex items-center justify-center mb-2">
                    <MapPin size={18} className="text-white" />
                  </div>
                  <h2 className="font-display font-bold text-lg text-charcoal-700 dark:text-warm-200">{t("outings.propose")}</h2>
                </div>

                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("outings.form.title")}
                  className={`w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200 ${!form.title.trim() ? "border-burnt-200/60" : "border-warm-200 dark:border-charcoal-600"}`}
                />

                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("outings.form.desc")}
                  className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
                  rows={2}
                />

                {/* Location picker */}
                <Suspense fallback={<div className="h-[280px] bg-warm-50 dark:bg-charcoal-700 rounded-xl animate-pulse" />}>
                  <LocationPicker
                    latitude={form.latitude}
                    longitude={form.longitude}
                    placeName={form.place}
                    onLocationChange={(lat, lng, name) => setForm({ ...form, latitude: lat, longitude: lng, place: name })}
                  />
                </Suspense>

                {/* Date */}
                <DatePicker value={form.proposed_date} onChange={(v) => setForm({ ...form, proposed_date: v })} placeholder={t("outings.when")} />

                {/* Category grid */}
                <div>
                  <p className="text-xs font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider mb-2">{t("outings.form.category")}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      const isActive = form.category === c.value;
                      return (
                        <button
                          key={c.value}
                          onClick={() => setForm({ ...form, category: c.value })}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                            isActive
                              ? `${c.bg} ring-2 ${c.ring}`
                              : "bg-warm-50/50 dark:bg-charcoal-700/50 hover:bg-warm-100 dark:hover:bg-charcoal-700"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isActive ? `bg-gradient-to-br ${c.gradient} shadow-sm` : "bg-warm-100 dark:bg-charcoal-600"
                          }`}>
                            <Icon size={14} className={isActive ? "text-white" : "text-charcoal-400 dark:text-warm-400"} />
                          </div>
                          <span className={`text-[10px] font-medium ${isActive ? c.text : "text-charcoal-400 dark:text-warm-500"}`}>
                            {t(c.label)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={createOuting}
                    disabled={!canCreateOuting}
                    className="flex-1 py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium hover:from-burnt-400 hover:to-sandy-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-burnt-200/20"
                  >
                    {t("outings.propose.btn")}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-5 py-3 bg-warm-50 dark:bg-charcoal-700 rounded-xl text-sm text-charcoal-400 hover:bg-warm-100 dark:hover:bg-charcoal-600 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ DOCUMENT MODAL ═══════ */}
      <AnimatePresence>
        {documentingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
            style={{ zIndex: 9999 }}
            onClick={() => setDocumentingId(null)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-charcoal-800 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center">
                    <Camera size={14} className="text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-charcoal-700 dark:text-warm-200">{t("outings.document")}</h3>
                </div>
                <button onClick={() => setDocumentingId(null)} className="p-1.5 rounded-lg hover:bg-warm-50 dark:hover:bg-charcoal-700 text-charcoal-400 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Photo upload */}
              {docPreview ? (
                <div className="relative">
                  <img src={docPreview} alt="" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => handleDocFile(null)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 bg-warm-50/80 dark:bg-charcoal-700/50 border-2 border-dashed border-warm-200/50 dark:border-charcoal-600/50 rounded-2xl cursor-pointer hover:border-burnt-200 dark:hover:border-burnt-600 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => handleDocFile(e.target.files?.[0] || null)} className="hidden" />
                  <div className="w-10 h-10 rounded-xl bg-warm-100 dark:bg-charcoal-600 flex items-center justify-center mb-2">
                    <ImagePlus size={18} className="text-warm-400 dark:text-charcoal-400" />
                  </div>
                  <span className="text-sm text-charcoal-400 dark:text-warm-500 font-medium">{t("outings.upload.photo")}</span>
                  <span className="text-xs text-warm-400 dark:text-charcoal-500 mt-0.5">{t("outings.tap.select")}</span>
                </label>
              )}

              <textarea
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
                placeholder={t("outings.review.placeholder")}
                className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200 resize-none"
                rows={3}
              />

              <button
                onClick={submitDocument}
                disabled={!docFile || !docDescription.trim() || docLoading}
                className="w-full py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-burnt-200/20 transition-all"
              >
                {docLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Clock size={14} />
                  </motion.div>
                ) : (
                  <Send size={14} />
                )}
                {docLoading ? t("saving") : t("outings.publish")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ============================================================
   OUTING CARD
   ============================================================ */
function OutingCard({ outing: o, deleteRequest, currentUserId, onVote, onComplete, onDocument, onDeleteAction, index }: {
  outing: Outing;
  deleteRequest?: DeletionRequest;
  currentUserId: number;
  onVote: () => void;
  onComplete: () => void;
  onDocument: () => void;
  onDeleteAction: () => void;
  index: number;
}) {
  const { t, locale } = useTranslation();
  const [docs, setDocs] = useState<OutingDoc[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const cat = getCat(o.category);
  const CatIcon = cat.icon;

  useEffect(() => {
    if (o.status === "documented") {
      api.get(`/outings/${o.id}/documents`).then((res) => setDocs(res.data)).catch(() => {});
    }
  }, [o.id, o.status]);

  const statusConfig: Record<string, { icon: any; bg: string; text: string; label: string }> = {
    proposed: { icon: Clock, bg: "bg-charcoal-50 dark:bg-charcoal-700/50", text: "text-charcoal-500 dark:text-charcoal-400", label: t("outings.status.proposed") },
    approved: { icon: ThumbsUp, bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-600 dark:text-verdigris-400", label: t("outings.status.approved") },
    completed: { icon: CheckCircle2, bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-600 dark:text-sandy-400", label: t("outings.status.completed") },
    documented: { icon: Camera, bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-500 dark:text-burnt-400", label: t("outings.status.documented") },
  };
  const status = statusConfig[o.status] || statusConfig.proposed;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 overflow-hidden"
    >
      {/* Gradient strip */}
      <div className={`h-1.5 bg-gradient-to-r ${cat.gradient} ${o.status === "proposed" ? "opacity-40" : ""}`} />

      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            o.status === "documented" ? `bg-gradient-to-br ${cat.gradient} shadow-sm` : `${cat.bg}`
          }`}>
            <CatIcon size={18} className={o.status === "documented" ? "text-white" : cat.text} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-charcoal-700 dark:text-warm-200 text-base leading-tight">{o.title}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium shrink-0 ${status.bg} ${status.text}`}>
                <StatusIcon size={10} /> {status.label}
              </span>
            </div>
            {o.place && (
              <p className="text-xs text-charcoal-400 dark:text-warm-500 flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="shrink-0" /> {o.place}
              </p>
            )}
            <CreatorBadge userId={o.proposed_by} date={o.created_at} />
          </div>
        </div>

        {/* Description */}
        {o.description && (
          <p className="text-sm text-charcoal-400 dark:text-warm-500 mb-3 leading-relaxed">{o.description}</p>
        )}

        {/* Date */}
        {o.proposed_date && (
          <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-warm-50/60 dark:bg-charcoal-700/30 rounded-xl w-fit">
            <Calendar size={12} className="text-burnt-400" />
            <span className="text-xs font-medium text-charcoal-500 dark:text-warm-400">
              {new Date(o.proposed_date).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}

        {/* Map */}
        {o.latitude && o.longitude && (
          <div className="mb-3 rounded-xl overflow-hidden border border-warm-200/20 dark:border-charcoal-600/20">
            <Suspense fallback={<div className="h-[120px] bg-warm-50 dark:bg-charcoal-700 animate-pulse" />}>
              <MiniMap latitude={o.latitude} longitude={o.longitude} />
            </Suspense>
          </div>
        )}

        {/* Documents gallery */}
        {o.status === "documented" && docs.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowDocs((s) => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 dark:text-warm-400 mb-2 w-full"
            >
              <Camera size={12} />
              {docs.length} {t("outings.photos")}
              {showDocs ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
            </button>
            <AnimatePresence>
              {showDocs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  {docs.map((doc) => (
                    <div key={doc.id} className="bg-warm-50/80 dark:bg-charcoal-700/50 rounded-xl overflow-hidden border border-warm-200/15 dark:border-charcoal-600/15">
                      <img src={doc.photo_url} alt="" className="w-full max-h-56 object-cover" />
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center text-white text-[8px] font-bold">
                            {doc.user_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-charcoal-600 dark:text-warm-300">{doc.user_name}</span>
                          <span className="text-[10px] text-charcoal-300 dark:text-charcoal-500 ml-auto">
                            {new Date(doc.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal-500 dark:text-warm-400 leading-relaxed">{doc.description}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons with dual-confirmation */}
        <div className="space-y-2">
          {o.status === "proposed" && (() => {
            const votedSet = o.voted_by ? new Set(o.voted_by.split(",")) : new Set<string>();
            const myVoted = votedSet.has(String(currentUserId));
            const voteCount = votedSet.size;
            return (
              <div className="bg-warm-50/60 dark:bg-charcoal-700/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={12} className="text-charcoal-400 dark:text-warm-500" />
                  <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("outings.approval.status")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {[0, 1].map((i) => (
                      <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-charcoal-800 flex items-center justify-center text-[8px] font-bold ${
                        i < voteCount
                          ? "bg-gradient-to-br from-verdigris-400 to-verdigris-500 text-white"
                          : "bg-warm-100 dark:bg-charcoal-600 text-charcoal-400"
                      }`}>
                        {i < voteCount ? <Check size={10} /> : null}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-charcoal-400 dark:text-warm-500">{voteCount}/2 {t("outings.confirmed")}</span>
                </div>
                {myVoted ? (
                  <p className="text-[10px] text-verdigris-500 font-medium flex items-center gap-1 py-1">
                    <CheckCircle2 size={10} /> {t("outings.approval.waiting")}
                  </p>
                ) : (
                  <button onClick={onVote} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-verdigris-400 to-verdigris-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all">
                    <ThumbsUp size={14} /> {t("outings.approve")}
                  </button>
                )}
              </div>
            );
          })()}

          {o.status === "approved" && (() => {
            const confirmSet = o.complete_confirmed_by ? new Set(o.complete_confirmed_by.split(",")) : new Set<string>();
            const myConfirmed = confirmSet.has(String(currentUserId));
            const confirmCount = confirmSet.size;
            return (
              <div className="bg-warm-50/60 dark:bg-charcoal-700/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={12} className="text-charcoal-400 dark:text-warm-500" />
                  <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("outings.complete.status")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {[0, 1].map((i) => (
                      <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-charcoal-800 flex items-center justify-center text-[8px] font-bold ${
                        i < confirmCount
                          ? "bg-gradient-to-br from-sandy-400 to-sandy-500 text-white"
                          : "bg-warm-100 dark:bg-charcoal-600 text-charcoal-400"
                      }`}>
                        {i < confirmCount ? <Check size={10} /> : null}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-charcoal-400 dark:text-warm-500">{confirmCount}/2 {t("outings.confirmed")}</span>
                </div>
                {myConfirmed ? (
                  <p className="text-[10px] text-sandy-500 font-medium flex items-center gap-1 py-1">
                    <CheckCircle2 size={10} /> {t("outings.complete.waiting")}
                  </p>
                ) : (
                  <button onClick={onComplete} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sandy-400 to-sandy-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all">
                    <CheckCircle2 size={14} /> {t("outings.complete.btn")}
                  </button>
                )}
              </div>
            );
          })()}

          {o.status === "completed" && (() => {
            const docSet = o.documented_by ? new Set(o.documented_by.split(",")) : new Set<string>();
            const myDocumented = docSet.has(String(currentUserId));
            const docCount = docSet.size;
            return (
              <div className="bg-warm-50/60 dark:bg-charcoal-700/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={12} className="text-charcoal-400 dark:text-warm-500" />
                  <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("outings.document.status")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {[0, 1].map((i) => (
                      <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-charcoal-800 flex items-center justify-center text-[8px] font-bold ${
                        i < docCount
                          ? "bg-gradient-to-br from-burnt-300 to-burnt-400 text-white"
                          : "bg-warm-100 dark:bg-charcoal-600 text-charcoal-400"
                      }`}>
                        {i < docCount ? <Check size={10} /> : null}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-charcoal-400 dark:text-warm-500">{docCount}/2 {t("outings.documented.s")}</span>
                </div>
                <button onClick={onDocument} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-burnt-300 to-burnt-400 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all">
                  <Camera size={14} /> {t("outings.document.btn")}
                </button>
              </div>
            );
          })()}

          {o.status === "documented" && (
            <button onClick={onDocument} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all">
              <Plus size={14} /> {t("outings.add.photo")}
            </button>
          )}
        </div>

        {/* Footer: completed date + delete */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-warm-100 dark:border-charcoal-700">
          <div className="flex-1">
            {o.completed_at && (
              <p className="text-[10px] text-charcoal-300 dark:text-charcoal-500 flex items-center gap-1">
                <CheckCircle2 size={10} className="text-verdigris-400" />
                {t("outings.completed.on")} {new Date(o.completed_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          <DeleteButton
            entityType="outing"
            entityId={o.id}
            pendingRequest={deleteRequest}
            currentUserId={currentUserId}
            onAction={onDeleteAction}
            size="sm"
          />
        </div>
      </div>
    </motion.div>
  );
}
