import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { MoviePick } from "../../types";
import {
  Film, Tv, Plus, X, Send, Shuffle, Star,
  Eye, EyeOff, ChevronDown, Sparkles, Popcorn, Check,
  Swords, Laugh, Heart, Ghost, Drama, Rocket, Palette,
  Search, MonitorPlay, Layers,
} from "lucide-react";

// ─── Categories with Lucide icons ───

const CATEGORIES: {
  key: string;
  labelKey: string;
  icon: typeof Film;
  gradient: string;
  textColor: string;
  bgLight: string;
}[] = [
  { key: "all", labelKey: "movie.cat.all", icon: Layers, gradient: "from-charcoal-400 to-charcoal-500", textColor: "text-charcoal-500", bgLight: "bg-charcoal-50 dark:bg-charcoal-900/20" },
  { key: "action", labelKey: "movie.cat.action", icon: Swords, gradient: "from-red-400 to-orange-500", textColor: "text-red-500", bgLight: "bg-red-50 dark:bg-red-900/20" },
  { key: "comedy", labelKey: "movie.cat.comedy", icon: Laugh, gradient: "from-yellow-400 to-amber-500", textColor: "text-amber-500", bgLight: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "romance", labelKey: "movie.cat.romance", icon: Heart, gradient: "from-pink-400 to-rose-500", textColor: "text-pink-500", bgLight: "bg-pink-50 dark:bg-pink-900/20" },
  { key: "horror", labelKey: "movie.cat.horror", icon: Ghost, gradient: "from-gray-600 to-gray-800", textColor: "text-gray-600", bgLight: "bg-gray-100 dark:bg-gray-800/30" },
  { key: "drama", labelKey: "movie.cat.drama", icon: Drama, gradient: "from-purple-400 to-violet-500", textColor: "text-purple-500", bgLight: "bg-purple-50 dark:bg-purple-900/20" },
  { key: "scifi", labelKey: "movie.cat.scifi", icon: Rocket, gradient: "from-cyan-400 to-blue-500", textColor: "text-cyan-500", bgLight: "bg-cyan-50 dark:bg-cyan-900/20" },
  { key: "animation", labelKey: "movie.cat.animation", icon: Palette, gradient: "from-green-400 to-emerald-500", textColor: "text-green-500", bgLight: "bg-green-50 dark:bg-green-900/20" },
  { key: "thriller", labelKey: "movie.cat.thriller", icon: Search, gradient: "from-slate-500 to-slate-700", textColor: "text-slate-500", bgLight: "bg-slate-50 dark:bg-slate-800/20" },
  { key: "series", labelKey: "movie.cat.series", icon: MonitorPlay, gradient: "from-teal-400 to-teal-600", textColor: "text-teal-500", bgLight: "bg-teal-50 dark:bg-teal-900/20" },
];

// ─── Main Component ───

export default function MoviePickerGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [movies, setMovies] = useState<MoviePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showWatched, setShowWatched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [form, setForm] = useState({ title: "", year: "", category: "drama", media_type: "movie" });
  const [saving, setSaving] = useState(false);

  const [picked, setPicked] = useState<MoviePick | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [ratingMovie, setRatingMovie] = useState<MoviePick | null>(null);
  const [tempRating, setTempRating] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/movies");
      setMovies(res.data);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await api.post("/movies/seed"); } catch { /* */ }
      load();
    };
    init();
  }, [load]);

  const filtered = useMemo(() => {
    let list = movies;
    if (activeCategory !== "all") {
      if (activeCategory === "series") {
        list = list.filter((m) => m.media_type === "series");
      } else {
        list = list.filter((m) => m.category === activeCategory && m.media_type === "movie");
      }
    }
    if (!showWatched) list = list.filter((m) => !m.watched);
    return list;
  }, [movies, activeCategory, showWatched]);

  const watchedCount = useMemo(() => movies.filter((m) => m.watched).length, [movies]);
  const totalCount = movies.length;

  const getCatCount = (key: string) => {
    if (key === "all") return showWatched ? movies.length : movies.filter((m) => !m.watched).length;
    if (key === "series") return movies.filter((m) => m.media_type === "series" && (showWatched || !m.watched)).length;
    return movies.filter((m) => m.category === key && m.media_type === "movie" && (showWatched || !m.watched)).length;
  };

  const getCatConfig = (key: string) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];

  // ─── Actions ───

  const pickRandom = () => {
    if (filtered.length === 0) return;
    setSpinning(true);
    setPicked(null);
    let count = 0;
    const interval = setInterval(() => {
      const rand = filtered[Math.floor(Math.random() * filtered.length)];
      setPicked(rand);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 120);
  };

  const markWatched = async (movie: MoviePick, rating?: number) => {
    try {
      await api.post(`/movies/${movie.id}/watch`, null, { params: rating ? { rating } : {} });
      load();
      setRatingMovie(null);
      if (picked?.id === movie.id) setPicked(null);
    } catch { /* */ }
  };

  const unmarkWatched = async (movie: MoviePick) => {
    try {
      await api.post(`/movies/${movie.id}/unwatch`);
      load();
    } catch { /* */ }
  };

  const createMovie = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/movies", {
        title: form.title.trim(),
        year: form.year ? parseInt(form.year) : null,
        category: form.category,
        media_type: form.media_type,
        poster_emoji: "icon",
      });
      setForm({ title: "", year: "", category: "drama", media_type: "movie" });
      setShowForm(false);
      load();
    } catch { /* */ }
    setSaving(false);
  };

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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 via-purple-400 to-blue-500 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/30 mb-3">
          <Popcorn size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          {t("movie.title")}
        </h2>
        <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-1">{t("movie.desc")}</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-charcoal-600 dark:text-[#e4ddd5]">{totalCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("movie.total")}</p>
        </div>
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-green-500">{watchedCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("movie.watched")}</p>
        </div>
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-burnt-400">{totalCount - watchedCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("movie.pending")}</p>
        </div>
      </div>

      {/* ── Category Grid ── */}
      <div className="bg-white dark:bg-[#232829] rounded-3xl p-3 shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const CatIcon = cat.icon;
            const count = getCatCount(cat.key);
            return (
              <motion.button
                key={cat.key}
                whileTap={{ scale: 0.93 }}
                onClick={() => setActiveCategory(cat.key)}
                className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${cat.gradient} text-white shadow-md`
                    : "text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-50 dark:hover:bg-[#2e3133]"
                }`}
              >
                <CatIcon size={16} className={isActive ? "text-white" : ""} />
                <span className="text-[9px] font-semibold mt-1 leading-tight text-center truncate w-full">
                  {t(cat.labelKey)}
                </span>
                {count > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[8px] font-bold flex items-center justify-center ${
                    isActive
                      ? "bg-white text-charcoal-600"
                      : "bg-warm-200/80 dark:bg-[#3a3f42] text-charcoal-500 dark:text-[#a39e98]"
                  }`}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Random Pick Button ── */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={pickRandom}
        disabled={spinning || filtered.length === 0}
        className="w-full py-4 rounded-3xl bg-gradient-to-r from-red-400 via-purple-500 to-blue-500 text-white font-bold text-base shadow-lg shadow-purple-300/30 dark:shadow-purple-900/30 disabled:opacity-40 flex items-center justify-center gap-3"
      >
        <motion.div animate={spinning ? { rotate: 360 } : {}} transition={{ duration: 0.5, repeat: spinning ? Infinity : 0, ease: "linear" }}>
          <Shuffle size={22} />
        </motion.div>
        {spinning ? t("movie.spinning") : t("movie.pick.random")}
      </motion.button>

      {/* ── Picked Result ── */}
      <AnimatePresence>
        {picked && !spinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="relative overflow-hidden bg-white dark:bg-[#232829] rounded-3xl shadow-elevated border border-warm-200/60 dark:border-[#3a3f42]"
          >
            <div className={`h-2 bg-gradient-to-r ${getCatConfig(picked.media_type === "series" ? "series" : picked.category).gradient}`} />

            <div className="absolute top-8 right-4 w-24 h-24 rounded-full bg-purple-100/20 dark:bg-purple-900/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full bg-blue-100/20 dark:bg-blue-900/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 p-5 text-center">
              {/* Icon instead of emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${getCatConfig(picked.media_type === "series" ? "series" : picked.category).gradient} shadow-lg mb-3`}
              >
                {picked.media_type === "series" ? <MonitorPlay size={28} className="text-white" /> : <Film size={28} className="text-white" />}
              </motion.div>

              <h3 className="text-lg font-bold text-charcoal-600 dark:text-[#e4ddd5]">
                {picked.title}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                {picked.year && (
                  <span className="text-xs text-charcoal-400 dark:text-[#8a8580]">{picked.year}</span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  picked.media_type === "series"
                    ? "bg-teal-50 dark:bg-teal-900/20 text-teal-500"
                    : "bg-purple-50 dark:bg-purple-900/20 text-purple-500"
                }`}>
                  {picked.media_type === "series" ? <Tv size={10} /> : <Film size={10} />}
                  {t(picked.media_type === "series" ? "movie.type.series" : "movie.type.movie")}
                </span>
                {(() => {
                  const cc = getCatConfig(picked.media_type === "series" ? "series" : picked.category);
                  const CIcon = cc.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs ${cc.textColor}`}>
                      <CIcon size={10} /> {t(`movie.cat.${picked.media_type === "series" ? "series" : picked.category}`)}
                    </span>
                  );
                })()}
              </div>

              <div className="flex gap-2 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setRatingMovie(picked); setTempRating(0); }}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> {t("movie.mark.watched")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={pickRandom}
                  className="px-4 py-3 rounded-2xl bg-warm-100 dark:bg-[#2e3133] text-charcoal-500 dark:text-[#a39e98] text-sm font-medium"
                >
                  <Shuffle size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rating Modal ── */}
      <AnimatePresence>
        {ratingMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setRatingMovie(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#232829] rounded-3xl p-6 w-full max-w-sm shadow-xl border border-warm-200/60 dark:border-[#3a3f42] space-y-4"
            >
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${getCatConfig(ratingMovie.media_type === "series" ? "series" : ratingMovie.category).gradient} shadow-md mb-2`}>
                  {ratingMovie.media_type === "series" ? <MonitorPlay size={24} className="text-white" /> : <Film size={24} className="text-white" />}
                </div>
                <h3 className="text-base font-bold text-charcoal-600 dark:text-[#e4ddd5] mt-1">{ratingMovie.title}</h3>
                <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-1">{t("movie.rate.it")}</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setTempRating(s)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={s <= tempRating ? "text-yellow-400 fill-yellow-400" : "text-warm-300 dark:text-[#3a3f42]"}
                    />
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => markWatched(ratingMovie, tempRating || undefined)}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Check size={16} /> {t("movie.confirm")}
                </button>
                <button
                  onClick={() => setRatingMovie(null)}
                  className="px-4 py-3 rounded-2xl bg-warm-100 dark:bg-[#2e3133] text-charcoal-400 dark:text-[#8a8580] text-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle watched + List ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowWatched(!showWatched)}
          className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            showWatched
              ? "bg-green-50 dark:bg-green-900/20 text-green-500 border border-green-200/60 dark:border-green-800/30"
              : "bg-white dark:bg-[#232829] text-charcoal-400 dark:text-[#8a8580] border border-warm-200/60 dark:border-[#3a3f42]"
          }`}
        >
          {showWatched ? <Eye size={14} /> : <EyeOff size={14} />}
          {showWatched ? t("movie.hide.watched") : t("movie.show.watched")}
        </button>
        <button
          onClick={() => setShowList(!showList)}
          className="flex-1 py-2.5 rounded-2xl bg-white dark:bg-[#232829] text-charcoal-400 dark:text-[#8a8580] border border-warm-200/60 dark:border-[#3a3f42] text-xs font-semibold flex items-center justify-center gap-2"
        >
          <ChevronDown size={14} className={`transition-transform ${showList ? "rotate-180" : ""}`} />
          {showList ? t("movie.hide.list") : t("movie.show.list")}
        </button>
      </div>

      {/* ── Movie List ── */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-warm-100/80 dark:bg-[#2e3133] mb-2">
                    <Popcorn size={24} className="text-warm-300 dark:text-[#5a5550]" />
                  </div>
                  <p className="text-xs text-charcoal-300 dark:text-[#6e6862]">{t("movie.empty")}</p>
                </div>
              ) : (
                filtered.map((movie, i) => {
                  const cc = getCatConfig(movie.media_type === "series" ? "series" : movie.category);
                  const CIcon = cc.icon;
                  return (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.5) }}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                        movie.watched
                          ? "bg-green-50/50 dark:bg-green-900/10 border border-green-200/40 dark:border-green-800/20"
                          : "bg-white dark:bg-[#232829] border border-warm-200/60 dark:border-[#3a3f42]"
                      }`}
                    >
                      {/* Category icon */}
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cc.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                        <CIcon size={14} className="text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          movie.watched
                            ? "text-charcoal-400 dark:text-[#8a8580] line-through"
                            : "text-charcoal-600 dark:text-[#e4ddd5]"
                        }`}>
                          {movie.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {movie.year && <span className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">{movie.year}</span>}
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            movie.media_type === "series"
                              ? "bg-teal-50 dark:bg-teal-900/20 text-teal-500"
                              : "bg-purple-50 dark:bg-purple-900/20 text-purple-400"
                          }`}>
                            {movie.media_type === "series" ? <Tv size={8} /> : <Film size={8} />}
                            {t(movie.media_type === "series" ? "movie.type.series" : "movie.type.movie")}
                          </span>
                          {movie.watched && movie.rating && (
                            <span className="flex items-center gap-0.5">
                              {[...Array(movie.rating)].map((_, j) => (
                                <Star key={j} size={8} className="text-yellow-400 fill-yellow-400" />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                      {movie.watched ? (
                        <button
                          onClick={() => unmarkWatched(movie)}
                          className="p-2 rounded-xl text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors shrink-0"
                          title={t("movie.unwatch")}
                        >
                          <Eye size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setRatingMovie(movie); setTempRating(0); }}
                          className="p-2 rounded-xl text-charcoal-300 dark:text-[#5a5550] hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0"
                          title={t("movie.mark.watched")}
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Movie ── */}
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-warm-300/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] text-sm font-medium flex items-center justify-center gap-2 hover:border-purple-300/60 hover:text-purple-400 dark:hover:border-purple-400/40 dark:hover:text-purple-300 transition-colors"
          >
            <Plus size={16} /> {t("movie.add")}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-soft border border-warm-200/60 dark:border-[#3a3f42] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t("movie.add.title")}</span>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#6e6862] hover:text-charcoal-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("movie.placeholder.title")}
              maxLength={200}
              className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-purple-200/50 dark:focus:ring-purple-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
            />

            <div className="flex gap-2">
              <input
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder={t("movie.placeholder.year")}
                className="w-24 px-3 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-purple-200/50 dark:focus:ring-purple-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
              />
              <div className="flex bg-warm-50/80 dark:bg-[#252a2c] rounded-2xl p-1 flex-1 border border-warm-200/60 dark:border-[#3a3f42]">
                <button
                  onClick={() => setForm({ ...form, media_type: "movie" })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    form.media_type === "movie"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-500 shadow-sm"
                      : "text-charcoal-400 dark:text-[#6e6862]"
                  }`}
                >
                  <Film size={12} /> {t("movie.type.movie")}
                </button>
                <button
                  onClick={() => setForm({ ...form, media_type: "series" })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    form.media_type === "series"
                      ? "bg-teal-100 dark:bg-teal-900/30 text-teal-500 shadow-sm"
                      : "text-charcoal-400 dark:text-[#6e6862]"
                  }`}
                >
                  <Tv size={12} /> {t("movie.type.series")}
                </button>
              </div>
            </div>

            {/* Category selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.filter((c) => c.key !== "all" && c.key !== "series").map((cat) => {
                const CIcon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setForm({ ...form, category: cat.key })}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-semibold transition-all ${
                      form.category === cat.key
                        ? `bg-gradient-to-br ${cat.gradient} text-white shadow-sm`
                        : "bg-warm-50/80 dark:bg-[#1e2224] text-charcoal-400 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#2e3133]"
                    }`}
                  >
                    <CIcon size={14} />
                    {t(cat.labelKey)}
                  </button>
                );
              })}
            </div>

            <button
              onClick={createMovie}
              disabled={saving || !form.title.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-400 via-purple-500 to-blue-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/30"
            >
              <Send size={15} /> {saving ? t("saving") : t("movie.add.btn")}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
