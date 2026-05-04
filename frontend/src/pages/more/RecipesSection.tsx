import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat, Plus, X, Star, CheckCircle2, ShoppingCart,
  Circle, CheckCircle, CookingPot, Flame, UtensilsCrossed,
  Clock, Camera, ChevronDown, Search, BookOpen, Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { Recipe, DeletionRequest } from "../../types";
import DeleteButton from "../../components/shared/DeleteButton";

type FilterTab = "all" | "pending" | "cooked";

export default function RecipesSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<number, Set<number>>>({});
  const [searchFilter, setSearchFilter] = useState("");
  const [hoverRating, setHoverRating] = useState<Record<number, number>>({});
  const [expandedInstructions, setExpandedInstructions] = useState<Record<number, boolean>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [instructions, setInstructions] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/recipes"),
      api.get("/deletion-requests/", { params: { entity_type: "recipe", status: "pending" } }),
    ])
      .then(([recipeRes, delRes]) => {
        setRecipes(recipeRes.data);
        setDeletionRequests(delRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addIngredient = () => {
    const val = newIngredient.trim();
    if (!val) return;
    const items = val.split(",").map((s) => s.trim()).filter(Boolean);
    setIngredients((prev) => [...prev, ...items]);
    setNewIngredient("");
  };

  const removeIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post("/recipes", {
        title: title.trim(),
        description: description.trim() || null,
        ingredients: ingredients.length > 0 ? ingredients : null,
        instructions: instructions.trim() || null,
      });
      setTitle(""); setDescription(""); setIngredients([]); setNewIngredient(""); setInstructions("");
      setShowForm(false);
      load();
    } catch {}
    setSaving(false);
  };

  const toggleCooked = async (recipe: Recipe) => {
    try {
      await api.put(`/recipes/${recipe.id}`, { cooked: !recipe.cooked });
      load();
    } catch {}
  };

  const setRating = async (recipe: Recipe, rating: number) => {
    try {
      await api.put(`/recipes/${recipe.id}`, { rating });
      load();
    } catch {}
  };

  const uploadPhoto = async (recipeId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/recipes/${recipeId}/photo`, fd);
      load();
    } catch {}
  };

  const toggleCheck = (recipeId: number, ingIdx: number) => {
    setChecked((prev) => {
      const set = new Set(prev[recipeId] || []);
      if (set.has(ingIdx)) set.delete(ingIdx);
      else set.add(ingIdx);
      return { ...prev, [recipeId]: set };
    });
  };

  const getCheckedCount = (recipeId: number) => {
    const set = checked[recipeId];
    return set ? set.size : 0;
  };

  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;

  const filtered = recipes
    .filter((r) => {
      if (filter === "pending") return !r.cooked;
      if (filter === "cooked") return r.cooked;
      return true;
    })
    .filter((r) =>
      !searchFilter.trim() ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchFilter.toLowerCase())
    );

  const totalCooked = recipes.filter((r) => r.cooked).length;
  const totalPending = recipes.filter((r) => !r.cooked).length;
  const avgRating = recipes.filter((r) => r.rating).length > 0
    ? (recipes.filter((r) => r.rating).reduce((acc, r) => acc + (r.rating || 0), 0) / recipes.filter((r) => r.rating).length).toFixed(1)
    : null;

  const TABS: { key: FilterTab; labelKey: string; count: number }[] = [
    { key: "all", labelKey: "recipes.filter.all", count: recipes.length },
    { key: "pending", labelKey: "recipes.filter.pending", count: totalPending },
    { key: "cooked", labelKey: "recipes.filter.cooked", count: totalCooked },
  ];

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
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center mx-auto shadow-lg"
        >
          <ChefHat size={28} className="text-white" />
        </motion.div>
        <div>
          <h2 className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{t("recipes.title")}</h2>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{t("recipes.subtitle")}</p>
        </div>
      </div>

      {/* ── Stats ── */}
      {recipes.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: CookingPot, value: totalPending, label: t("recipes.stat.pending"), color: "from-orange-400 to-amber-300" },
            { icon: Flame, value: totalCooked, label: t("recipes.stat.cooked"), color: "from-green-500 to-emerald-400" },
            { icon: Star, value: avgRating || "-", label: t("recipes.stat.rating"), color: "from-amber-400 to-yellow-300" },
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

      {/* ── Filter tabs + actions ── */}
      <div className="flex items-center gap-2">
        <div className="flex bg-warm-100/60 dark:bg-charcoal-700/60 rounded-xl p-0.5 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                filter === tab.key
                  ? "bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-warm-100 shadow-sm"
                  : "text-charcoal-400 dark:text-charcoal-500 hover:text-charcoal-500"
              }`}
            >
              {t(tab.labelKey)}
              <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                filter === tab.key
                  ? "bg-burnt-100/60 dark:bg-burnt-400/10 text-burnt-500 dark:text-burnt-300"
                  : "bg-warm-200/40 dark:bg-charcoal-600 text-charcoal-400 dark:text-charcoal-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className={`p-2.5 rounded-xl transition-all shadow-sm shrink-0 ${
            showForm
              ? "bg-warm-100 dark:bg-charcoal-700 text-charcoal-500"
              : "bg-gradient-to-r from-orange-400 to-amber-300 text-white"
          }`}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </motion.button>
      </div>

      {/* ── Search (when many recipes) ── */}
      {recipes.length > 3 && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-charcoal-800 rounded-xl border border-warm-200/30 dark:border-charcoal-700/50">
          <Search size={14} className="text-charcoal-300 dark:text-charcoal-500 shrink-0" />
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={t("recipes.search.placeholder")}
            className="flex-1 bg-transparent text-xs outline-none text-charcoal-600 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter("")}>
              <X size={12} className="text-charcoal-300" />
            </button>
          )}
        </div>
      )}

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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center">
                <UtensilsCrossed size={13} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("recipes.create")}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <ChefHat size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("recipes.name.placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-orange-200/50 dark:focus:ring-orange-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                />
              </div>
              <div className="relative">
                <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                <input
                  type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("recipes.desc.placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-orange-200/50 dark:focus:ring-orange-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                />
              </div>

              {/* Ingredients builder */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-charcoal-500 dark:text-warm-300 flex items-center gap-1.5">
                  <ShoppingCart size={12} className="text-orange-400" />
                  {t("recipes.ingredients.label")}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngredient(); } }}
                    placeholder={t("recipes.ingredient.placeholder")}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-orange-200/50 dark:focus:ring-orange-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                  />
                  <button
                    type="button"
                    onClick={addIngredient}
                    disabled={!newIngredient.trim()}
                    className="px-3 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-400/10 text-orange-500 dark:text-orange-300 font-medium hover:bg-orange-100 dark:hover:bg-orange-400/15 transition-colors disabled:opacity-30 border border-orange-200/30 dark:border-orange-800/20"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {ingredients.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {ingredients.map((ing, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-3 py-2 bg-warm-50/60 dark:bg-charcoal-700/60 rounded-xl"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="flex-1 text-xs text-charcoal-600 dark:text-warm-300">{ing}</span>
                        <button onClick={() => removeIngredient(idx)} className="text-warm-300 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-charcoal-300 dark:text-charcoal-600">{t("recipes.ingredient.hint")}</p>
              </div>

              <div className="relative">
                <Sparkles size={13} className="absolute left-3 top-3 text-warm-400 dark:text-charcoal-500" />
                <textarea
                  value={instructions} onChange={(e) => setInstructions(e.target.value)}
                  placeholder={t("recipes.instructions.placeholder")}
                  rows={3}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-orange-200/50 dark:focus:ring-orange-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500 resize-none"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={saving || !title.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <ChefHat size={15} />
                )}
                {saving ? t("creating") : t("recipes.create")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recipe list ── */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100/50 to-amber-100/50 dark:from-orange-400/10 dark:to-amber-400/10 flex items-center justify-center">
            <UtensilsCrossed size={36} className="text-orange-300 dark:text-orange-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-charcoal-400 dark:text-charcoal-500">
              {recipes.length === 0 ? t("recipes.empty") : searchFilter ? t("no.results") : t("recipes.empty.cat")}
            </p>
            {recipes.length === 0 && (
              <p className="text-xs text-charcoal-300 dark:text-charcoal-600 mt-1">{t("recipes.empty.hint")}</p>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe, i) => {
            const isExpanded = expandedId === recipe.id;
            const ingCount = recipe.ingredients?.length || 0;
            const checkedCount = getCheckedCount(recipe.id);
            const recipeChecked = checked[recipe.id] || new Set<number>();
            const hover = hoverRating[recipe.id] || 0;

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Photo header */}
                {recipe.photo_url && (
                  <div className="relative h-36">
                    <img
                      src={recipe.photo_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {recipe.cooked && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/90 text-white text-[10px] font-bold backdrop-blur-sm">
                        <CheckCircle2 size={10} /> {t("recipes.cooked")}
                      </div>
                    )}
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h3 className="font-bold text-white text-sm drop-shadow-md">{recipe.title}</h3>
                      {recipe.description && (
                        <p className="text-[11px] text-white/70 mt-0.5 line-clamp-1">{recipe.description}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Title (when no photo) */}
                  {!recipe.photo_url && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          recipe.cooked
                            ? "bg-gradient-to-br from-green-400 to-emerald-300"
                            : "bg-gradient-to-br from-orange-400 to-amber-300"
                        }`}>
                          {recipe.cooked ? (
                            <CheckCircle2 size={18} className="text-white" />
                          ) : (
                            <CookingPot size={18} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-charcoal-700 dark:text-warm-100 text-sm truncate">{recipe.title}</p>
                          {recipe.description && (
                            <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-0.5 line-clamp-2">{recipe.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ingredients shopping list */}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="rounded-xl border border-warm-200/20 dark:border-charcoal-700/30 overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                        className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-warm-50/40 dark:hover:bg-charcoal-700/40 transition-colors"
                      >
                        <ShoppingCart size={13} className="text-orange-400 shrink-0" />
                        <span className="text-xs font-semibold text-charcoal-600 dark:text-warm-300">
                          {t("recipes.ingredients.label")} ({checkedCount}/{ingCount})
                        </span>
                        {checkedCount > 0 && checkedCount < ingCount && (
                          <div className="flex-1 max-w-[60px] h-1.5 bg-warm-100 dark:bg-charcoal-700 rounded-full overflow-hidden ml-auto mr-1">
                            <div
                              className="h-full bg-green-400 rounded-full transition-all duration-300"
                              style={{ width: `${(checkedCount / ingCount) * 100}%` }}
                            />
                          </div>
                        )}
                        {checkedCount === ingCount && ingCount > 0 && (
                          <span className="text-[10px] text-green-500 font-semibold ml-auto mr-1">{t("recipes.all.done")}</span>
                        )}
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="shrink-0">
                          <ChevronDown size={14} className="text-charcoal-300 dark:text-charcoal-500" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-2 pb-2 space-y-0.5">
                              {recipe.ingredients.map((ing, idx) => {
                                const isChecked = recipeChecked.has(idx);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => toggleCheck(recipe.id, idx)}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-warm-50 dark:hover:bg-charcoal-700/40 transition-colors text-left group"
                                  >
                                    {isChecked ? (
                                      <CheckCircle size={15} className="text-green-400 shrink-0" />
                                    ) : (
                                      <Circle size={15} className="text-warm-300 dark:text-charcoal-500 group-hover:text-orange-300 shrink-0" />
                                    )}
                                    <span className={`text-xs transition-all ${
                                      isChecked
                                        ? "text-charcoal-300 dark:text-charcoal-500 line-through"
                                        : "text-charcoal-600 dark:text-warm-300"
                                    }`}>
                                      {ing}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Instructions */}
                  {recipe.instructions && (
                    <div
                      className="px-3 py-2 bg-warm-50/40 dark:bg-charcoal-700/30 rounded-xl border-l-2 border-orange-300/40 cursor-pointer"
                      onClick={() => setExpandedInstructions(prev => ({ ...prev, [recipe.id]: !prev[recipe.id] }))}
                    >
                      <p className={`text-[11px] text-charcoal-500 dark:text-warm-300 leading-relaxed whitespace-pre-line ${expandedInstructions[recipe.id] ? "" : "line-clamp-3"}`}>
                        {recipe.instructions}
                      </p>
                      {recipe.instructions.length > 150 && (
                        <p className="text-[10px] text-burnt-400 dark:text-burnt-300 mt-1 font-medium">
                          {expandedInstructions[recipe.id] ? t("recipes.instructions.less") : t("recipes.instructions.more")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Footer: rating, actions ── */}
                  <div className="flex items-center justify-between pt-1 border-t border-warm-200/15 dark:border-charcoal-700/30">
                    {/* Star rating with hover */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = hover > 0 ? star <= hover : (recipe.rating !== null && star <= recipe.rating);
                        return (
                          <button
                            key={star}
                            onClick={() => setRating(recipe, star)}
                            onMouseEnter={() => setHoverRating((p) => ({ ...p, [recipe.id]: star }))}
                            onMouseLeave={() => setHoverRating((p) => ({ ...p, [recipe.id]: 0 }))}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <Star
                              size={16}
                              className={filled ? "text-amber-400 fill-amber-400" : "text-warm-200 dark:text-charcoal-600"}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Photo upload */}
                      <label className="p-1.5 rounded-lg text-charcoal-300 dark:text-charcoal-500 hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-400/10 transition-colors cursor-pointer">
                        <Camera size={14} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadPhoto(recipe.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {/* Toggle cooked */}
                      <button
                        onClick={() => toggleCooked(recipe)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${
                          recipe.cooked
                            ? "bg-green-50 dark:bg-green-900/10 text-green-500 dark:text-green-400 border border-green-200/40 dark:border-green-800/30"
                            : "bg-orange-50 dark:bg-orange-400/10 text-orange-500 dark:text-orange-300 border border-orange-200/30 dark:border-orange-800/20"
                        }`}
                      >
                        {recipe.cooked ? <CheckCircle2 size={12} /> : <Flame size={12} />}
                        {recipe.cooked ? t("recipes.unmark") : t("recipes.mark.cooked")}
                      </button>

                      {/* Delete */}
                      <DeleteButton
                        entityType="recipe"
                        entityId={recipe.id}
                        pendingRequest={getPendingRequest(recipe.id)}
                        currentUserId={user?.id ?? 0}
                        onAction={load}
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-[9px] text-charcoal-300 dark:text-charcoal-600">
                    {new Date(recipe.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
