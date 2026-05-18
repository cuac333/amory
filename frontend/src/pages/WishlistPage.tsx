import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Star, Gift, MapPin, UtensilsCrossed, Film,
  Target, LayoutList, Heart, Sparkles, CheckCircle2,
  ChevronDown, ChevronUp, Crown, TrendingUp, Calendar,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import DeleteButton from "../components/shared/DeleteButton";
import CreatorBadge from "../components/shared/CreatorBadge";

import type { WishlistItem, DeletionRequest } from "../types";

const CATEGORIES = [
  { key: "all", label: "cat.all", icon: LayoutList, gradient: "from-charcoal-400 to-charcoal-500", bg: "bg-charcoal-50 dark:bg-charcoal-700/30", text: "text-charcoal-500", ring: "ring-charcoal-200" },
  { key: "place", label: "cat.place", icon: MapPin, gradient: "from-verdigris-400 to-verdigris-500", bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-500", ring: "ring-verdigris-200" },
  { key: "restaurant", label: "cat.restaurant", icon: UtensilsCrossed, gradient: "from-sandy-400 to-sandy-500", bg: "bg-sandy-50 dark:bg-sandy-800/20", text: "text-sandy-500", ring: "ring-sandy-200" },
  { key: "movie", label: "cat.movie", icon: Film, gradient: "from-tuscan-300 to-tuscan-400", bg: "bg-tuscan-50 dark:bg-tuscan-800/20", text: "text-tuscan-400", ring: "ring-tuscan-200" },
  { key: "gift", label: "cat.gift", icon: Gift, gradient: "from-burnt-300 to-burnt-400", bg: "bg-burnt-50 dark:bg-burnt-800/20", text: "text-burnt-400", ring: "ring-burnt-200" },
  { key: "experience", label: "cat.experience", icon: Target, gradient: "from-charcoal-500 to-verdigris-500", bg: "bg-verdigris-50 dark:bg-verdigris-800/20", text: "text-verdigris-500", ring: "ring-verdigris-200" },
];

const getCat = (key: string) => CATEGORIES.find(c => c.key === key) || CATEGORIES[1];

export default function WishlistPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", is_secret: false, category: "place" });
  const [deleteRequests, setDeleteRequests] = useState<DeletionRequest[]>([]);
  const [ratingHover, setRatingHover] = useState<Record<number, number>>({});

  const load = () => {
    const params = activeCategory !== "all" ? `?category=${activeCategory}` : "";
    api.get(`/wishlist/${params}`).then((res) => setItems(res.data));
    api.get("/deletion-requests/", { params: { entity_type: "wishlist_item", status: "pending" } }).then((res) => setDeleteRequests(res.data)).catch(() => {});
  };

  const getDeleteRequest = (itemId: number) =>
    deleteRequests.find((r) => r.entity_id === itemId);

  useEffect(() => { load(); }, [activeCategory]);

  const canCreate = form.title.trim().length > 0;

  const create = async () => {
    if (!canCreate) return;
    await api.post("/wishlist/", { ...form });
    setShowForm(false);
    setForm({ title: "", description: "", is_secret: false, category: "place" });
    load();
  };

  const complete = async (id: number, rating: number) => {
    await api.put(`/wishlist/${id}/complete`, { rating });
    load();
  };

  // Stats
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const pendingItems = totalItems - completedItems;
  const secretItems = items.filter(i => i.is_secret).length;

  return (
    <div className="space-y-4 md:space-y-6 py-3 md:py-6">

      {/* ─── Header ─── */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-burnt-300 via-sandy-300 to-verdigris-400 shadow-lg shadow-burnt-200/30 mb-3"
        >
          <Heart size={22} className="text-white" />
        </motion.div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal-700 dark:text-warm-200">
          {t("wishlist.title")}
        </h1>
        <p className="text-xs md:text-sm text-charcoal-400 dark:text-warm-500 mt-1">
          {t("wishlist.desc")}
        </p>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-burnt-300 to-burnt-400 flex items-center justify-center mb-2 shadow-sm">
            <Heart size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{pendingItems}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("wishlist.stat.pending")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-verdigris-400 to-verdigris-500 flex items-center justify-center mb-2 shadow-sm">
            <CheckCircle2 size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{completedItems}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("wishlist.stat.completed")}</p>
        </div>
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-3 md:p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-sandy-300 to-sandy-400 flex items-center justify-center mb-2 shadow-sm">
            <Gift size={16} className="text-white" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-charcoal-700 dark:text-warm-200">{secretItems}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-warm-500 font-medium mt-0.5">{t("wishlist.stat.secret")}</p>
        </div>
      </div>

      {/* ─── Category Grid ─── */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = activeCategory === c.key;
          const count = c.key === "all" ? items.length : items.filter(i => i.category === c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                isActive
                  ? `bg-white dark:bg-charcoal-800 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20`
                  : "bg-warm-50/50 dark:bg-charcoal-700/30 hover:bg-warm-100 dark:hover:bg-charcoal-700"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isActive ? `bg-gradient-to-br ${c.gradient} shadow-sm` : "bg-warm-100 dark:bg-charcoal-600"
              }`}>
                <Icon size={16} className={isActive ? "text-white" : "text-charcoal-400 dark:text-warm-500"} />
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? c.text : "text-charcoal-400 dark:text-warm-500"}`}>
                {t(c.label as any)}
              </span>
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full -mt-0.5 ${
                  isActive ? "bg-burnt-100 dark:bg-burnt-800/30 text-burnt-500" : "bg-warm-100/80 dark:bg-charcoal-700 text-charcoal-400"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Progress bar ─── */}
      {totalItems > 0 && (
        <div className="bg-white dark:bg-charcoal-800 rounded-2xl p-4 shadow-soft border border-warm-200/20 dark:border-charcoal-600/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("wishlist.stat.progress")}</span>
            <span className="text-xs font-bold text-charcoal-600 dark:text-warm-300">{completedItems}/{totalItems}</span>
          </div>
          <div className="h-2 bg-warm-100 dark:bg-charcoal-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-verdigris-400 to-verdigris-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* ─── Create Button ─── */}
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 hover:shadow-xl transition-shadow"
      >
        <Plus size={18} /> {t("wishlist.add")}
      </button>

      {/* ─── Wish Cards ─── */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <WishCard
            key={item.id}
            item={item}
            deleteRequest={getDeleteRequest(item.id)}
            currentUserId={user?.id ?? 0}
            onComplete={complete}
            onDeleteAction={load}
            ratingHover={ratingHover[item.id] || 0}
            onRatingHover={(v) => setRatingHover(prev => ({ ...prev, [item.id]: v }))}
            index={idx}
            t={t}
            locale={locale}
          />
        ))}
        {items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-warm-100 dark:bg-charcoal-700 flex items-center justify-center mb-3">
              <Heart size={28} className="text-warm-300 dark:text-charcoal-500" />
            </div>
            <p className="text-charcoal-400 dark:text-warm-500 text-sm font-medium">{t("wishlist.empty")}</p>
            <p className="text-charcoal-300 dark:text-charcoal-500 text-xs mt-1">{t("wishlist.empty.hint")}</p>
          </motion.div>
        )}
      </div>

      {/* ═══════ CREATE FORM MODAL ═══════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-charcoal-800 rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
              {...(form.title.trim() || form.description.trim() ? { "data-unsaved-form": true } : {})}
            >
              {/* Modal header */}
              <div className="text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center mb-2">
                  <Sparkles size={18} className="text-white" />
                </div>
                <h2 className="font-display font-bold text-lg text-charcoal-700 dark:text-warm-200">{t("wishlist.add")}</h2>
                <p className="text-xs text-charcoal-400 dark:text-warm-500 mt-0.5">{t("wishlist.form.hint")}</p>
              </div>

              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("wishlist.title.placeholder")}
                className={`w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200 transition-colors ${!form.title.trim() ? "border-burnt-200/60" : "border-warm-200 dark:border-charcoal-600"}`}
              />

              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("wishlist.desc.placeholder")}
                className="w-full px-4 py-3 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tuscan-200"
                rows={2}
              />

              {/* Category Grid */}
              <div>
                <p className="text-xs font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider mb-2">{t("wishlist.form.category")}</p>
                <div className="grid grid-cols-5 gap-2">
                  {CATEGORIES.filter(c => c.key !== "all").map((c) => {
                    const Icon = c.icon;
                    const isActive = form.category === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => setForm({ ...form, category: c.key })}
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
                          {t(c.label as any)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secret toggle */}
              <label className="flex items-center gap-3 px-4 py-3 bg-warm-50/60 dark:bg-charcoal-700/50 rounded-xl cursor-pointer border border-warm-200/20 dark:border-charcoal-600/20 transition-colors hover:bg-warm-50 dark:hover:bg-charcoal-700">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  form.is_secret ? "bg-gradient-to-br from-sandy-300 to-sandy-400 shadow-sm" : "bg-warm-100 dark:bg-charcoal-600"
                }`}>
                  <Gift size={14} className={form.is_secret ? "text-white" : "text-charcoal-400 dark:text-warm-400"} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-charcoal-600 dark:text-warm-300">{t("wishlist.secret")}</span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all flex items-center ${form.is_secret ? "bg-gradient-to-r from-sandy-300 to-sandy-400 justify-end" : "bg-warm-200 dark:bg-charcoal-600 justify-start"}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm mx-1" />
                </div>
                <input type="checkbox" checked={form.is_secret} onChange={(e) => setForm({ ...form, is_secret: e.target.checked })} className="hidden" />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={create}
                  disabled={!canCreate}
                  className="flex-1 py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl text-sm font-medium hover:from-burnt-400 hover:to-sandy-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-burnt-200/20"
                >
                  {t("add")}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 bg-warm-50 dark:bg-charcoal-700 rounded-xl text-sm text-charcoal-400 hover:bg-warm-100 dark:hover:bg-charcoal-600 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ============================================================
   WISH CARD
   ============================================================ */
function WishCard({ item, deleteRequest, currentUserId, onComplete, onDeleteAction, ratingHover, onRatingHover, index, t, locale }: {
  item: WishlistItem;
  deleteRequest?: DeletionRequest;
  currentUserId: number;
  onComplete: (id: number, rating: number) => void;
  onDeleteAction: () => void;
  ratingHover: number;
  onRatingHover: (v: number) => void;
  index: number;
  t: any;
  locale: string;
}) {
  const cat = getCat(item.category);
  const CatIcon = cat.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className={`bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft border border-warm-200/20 dark:border-charcoal-600/20 overflow-hidden transition-opacity ${item.completed ? "opacity-70" : ""}`}
    >
      {/* Gradient strip */}
      <div className={`h-1.5 bg-gradient-to-r ${cat.gradient} ${item.completed ? "opacity-40" : ""}`} />

      <div className="p-4 md:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              item.completed
                ? "bg-gradient-to-br from-verdigris-400 to-verdigris-500 shadow-sm"
                : `bg-gradient-to-br ${cat.gradient} shadow-sm`
            }`}>
              {item.completed ? (
                <CheckCircle2 size={18} className="text-white" />
              ) : (
                <CatIcon size={18} className="text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-display font-semibold text-base ${item.completed ? "line-through text-charcoal-400 dark:text-warm-500" : "text-charcoal-700 dark:text-warm-200"}`}>
                  {item.title}
                </h3>
                {item.is_secret && (
                  <div className="w-5 h-5 rounded-md bg-sandy-100 dark:bg-sandy-800/20 flex items-center justify-center shrink-0">
                    <Gift size={10} className="text-sandy-400" />
                  </div>
                )}
              </div>
              <CreatorBadge userId={item.added_by} date={item.created_at} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Completed rating display */}
            {item.completed && item.rating && (
              <div className="flex items-center gap-0.5 px-2 py-1 bg-sandy-50 dark:bg-sandy-800/20 rounded-lg">
                <Star size={10} className="text-sandy-400 fill-sandy-400" />
                <span className="text-[10px] font-bold text-sandy-600 dark:text-sandy-400">{item.rating}</span>
              </div>
            )}
            <DeleteButton
              entityType="wishlist_item"
              entityId={item.id}
              pendingRequest={deleteRequest}
              currentUserId={currentUserId}
              onAction={onDeleteAction}
              size="sm"
              directDelete={item.is_secret && item.added_by === currentUserId}
              directDeleteUrl={`/wishlist/${item.id}`}
            />
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-charcoal-400 dark:text-warm-500 mt-2 leading-relaxed">{item.description}</p>
        )}

        {/* Review */}
        {item.review && (
          <div className="mt-3 bg-warm-50/60 dark:bg-charcoal-700/30 rounded-xl p-3 border border-warm-200/15 dark:border-charcoal-600/15">
            <p className="text-xs text-charcoal-500 dark:text-warm-400 italic leading-relaxed">"{item.review}"</p>
          </div>
        )}

        {/* Completed date */}
        {item.completed && item.completed_at && (
          <p className="text-[10px] text-charcoal-300 dark:text-charcoal-500 flex items-center gap-1 mt-3 pt-2 border-t border-warm-100 dark:border-charcoal-700">
            <CheckCircle2 size={10} className="text-verdigris-400" />
            {t("wishlist.completed.on")} {new Date(item.completed_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        {/* Rating stars (not completed) */}
        {!item.completed && (
          <div className="mt-3 pt-3 border-t border-warm-100/50 dark:border-charcoal-700/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("wishlist.rate.complete")}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => onComplete(item.id, r)}
                    onMouseEnter={() => onRatingHover(r)}
                    onMouseLeave={() => onRatingHover(0)}
                    className="group p-0.5 transition-transform hover:scale-110"
                    title={`${r} ${t("wishlist.stars.label")}`}
                  >
                    <Star
                      size={18}
                      className={`transition-colors ${
                        r <= ratingHover
                          ? "text-sandy-400 fill-sandy-400"
                          : "text-warm-200 dark:text-charcoal-600 group-hover:text-sandy-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Full star rating display for completed */}
        {item.completed && item.rating && (
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} className={s <= item.rating! ? "text-sandy-400 fill-sandy-400" : "text-warm-200 dark:text-charcoal-600"} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
