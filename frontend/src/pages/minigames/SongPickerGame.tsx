import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { SongPick } from "../../types";
import {
  Music, Mic2, Plus, X, Send, Shuffle, Star,
  Headphones, HeadphoneOff, ChevronDown, Sparkles, Check,
  Heart, Zap, CloudRain, Sunset, Smile, Flame,
  Search, Layers, Guitar, Piano, Radio, Disc3, Drum,
} from "lucide-react";

// ─── Genre categories ───

const GENRES: {
  key: string;
  labelKey: string;
  icon: typeof Music;
  gradient: string;
  textColor: string;
  bgLight: string;
}[] = [
  { key: "all", labelKey: "song.genre.all", icon: Layers, gradient: "from-charcoal-400 to-charcoal-500", textColor: "text-charcoal-500", bgLight: "bg-charcoal-50 dark:bg-charcoal-900/20" },
  { key: "pop", labelKey: "song.genre.pop", icon: Music, gradient: "from-pink-400 to-rose-500", textColor: "text-pink-500", bgLight: "bg-pink-50 dark:bg-pink-900/20" },
  { key: "rock", labelKey: "song.genre.rock", icon: Guitar, gradient: "from-red-500 to-orange-600", textColor: "text-red-500", bgLight: "bg-red-50 dark:bg-red-900/20" },
  { key: "rnb", labelKey: "song.genre.rnb", icon: Mic2, gradient: "from-purple-400 to-violet-500", textColor: "text-purple-500", bgLight: "bg-purple-50 dark:bg-purple-900/20" },
  { key: "reggaeton", labelKey: "song.genre.reggaeton", icon: Flame, gradient: "from-amber-400 to-orange-500", textColor: "text-amber-500", bgLight: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "electronic", labelKey: "song.genre.electronic", icon: Radio, gradient: "from-cyan-400 to-blue-500", textColor: "text-cyan-500", bgLight: "bg-cyan-50 dark:bg-cyan-900/20" },
  { key: "hiphop", labelKey: "song.genre.hiphop", icon: Disc3, gradient: "from-gray-600 to-gray-800", textColor: "text-gray-600", bgLight: "bg-gray-100 dark:bg-gray-800/30" },
  { key: "indie", labelKey: "song.genre.indie", icon: Sunset, gradient: "from-teal-400 to-emerald-500", textColor: "text-teal-500", bgLight: "bg-teal-50 dark:bg-teal-900/20" },
  { key: "ballad", labelKey: "song.genre.ballad", icon: Heart, gradient: "from-burnt-300 to-burnt-400", textColor: "text-burnt-400", bgLight: "bg-burnt-50 dark:bg-burnt-900/20" },
  { key: "kpop", labelKey: "song.genre.kpop", icon: Sparkles, gradient: "from-fuchsia-400 to-pink-500", textColor: "text-fuchsia-500", bgLight: "bg-fuchsia-50 dark:bg-fuchsia-900/20" },
  { key: "jazz", labelKey: "song.genre.jazz", icon: Piano, gradient: "from-yellow-500 to-amber-600", textColor: "text-yellow-600", bgLight: "bg-yellow-50 dark:bg-yellow-900/20" },
  { key: "classical", labelKey: "song.genre.classical", icon: Drum, gradient: "from-indigo-400 to-indigo-600", textColor: "text-indigo-500", bgLight: "bg-indigo-50 dark:bg-indigo-900/20" },
];

const MOODS: {
  key: string;
  labelKey: string;
  icon: typeof Smile;
  gradient: string;
  textColor: string;
}[] = [
  { key: "all", labelKey: "song.mood.all", icon: Layers, gradient: "from-charcoal-400 to-charcoal-500", textColor: "text-charcoal-500" },
  { key: "happy", labelKey: "song.mood.happy", icon: Smile, gradient: "from-yellow-400 to-amber-400", textColor: "text-yellow-500" },
  { key: "sad", labelKey: "song.mood.sad", icon: CloudRain, gradient: "from-blue-400 to-blue-600", textColor: "text-blue-500" },
  { key: "energetic", labelKey: "song.mood.energetic", icon: Zap, gradient: "from-orange-400 to-red-500", textColor: "text-orange-500" },
  { key: "chill", labelKey: "song.mood.chill", icon: Sunset, gradient: "from-teal-400 to-cyan-500", textColor: "text-teal-500" },
  { key: "romantic", labelKey: "song.mood.romantic", icon: Heart, gradient: "from-pink-400 to-rose-500", textColor: "text-pink-500" },
  { key: "nostalgic", labelKey: "song.mood.nostalgic", icon: Sunset, gradient: "from-purple-400 to-violet-500", textColor: "text-purple-500" },
];

// ─── Helpers ───

function getCardGradient(genre: string) {
  const g = GENRES.find((c) => c.key === genre);
  return g ? g.gradient : "from-pink-400 to-rose-500";
}

// ─── Main Component ───

export default function SongPickerGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [songs, setSongs] = useState<SongPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("all");
  const [activeMood, setActiveMood] = useState("all");
  const [showListened, setShowListened] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(false);
  const [form, setForm] = useState({ title: "", artist: "", year: "", genre: "pop", mood: "happy" });
  const [saving, setSaving] = useState(false);

  const [picked, setPicked] = useState<SongPick | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [ratingSong, setRatingSong] = useState<SongPick | null>(null);
  const [tempRating, setTempRating] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/songs");
      setSongs(res.data);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await api.post("/songs/seed"); } catch { /* */ }
      load();
    };
    init();
  }, [load]);

  const filtered = useMemo(() => {
    let list = songs;
    if (activeGenre !== "all") list = list.filter((s) => s.genre === activeGenre);
    if (activeMood !== "all") list = list.filter((s) => s.mood === activeMood);
    if (!showListened) list = list.filter((s) => !s.listened);
    return list;
  }, [songs, activeGenre, activeMood, showListened]);

  const listenedCount = useMemo(() => songs.filter((s) => s.listened).length, [songs]);
  const totalCount = songs.length;

  const getGenreCount = (key: string) => {
    if (key === "all") return showListened ? songs.length : songs.filter((s) => !s.listened).length;
    return songs.filter((s) => s.genre === key && (showListened || !s.listened)).length;
  };

  const getGenreConfig = (key: string) => GENRES.find((c) => c.key === key) || GENRES[0];
  const getMoodConfig = (key: string) => MOODS.find((m) => m.key === key) || MOODS[0];

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

  const markListened = async (song: SongPick, rating?: number) => {
    try {
      await api.post(`/songs/${song.id}/listen`, null, { params: rating ? { rating } : {} });
      load();
      setRatingSong(null);
      if (picked?.id === song.id) setPicked(null);
    } catch { /* */ }
  };

  const unmarkListened = async (song: SongPick) => {
    try {
      await api.post(`/songs/${song.id}/unlisten`);
      load();
    } catch { /* */ }
  };

  const createSong = async () => {
    if (!form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    try {
      await api.post("/songs", {
        title: form.title.trim(),
        artist: form.artist.trim(),
        year: form.year ? parseInt(form.year) : null,
        genre: form.genre,
        mood: form.mood,
      });
      setForm({ title: "", artist: "", year: "", genre: "pop", mood: "happy" });
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/30 mb-3">
          <Headphones size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          {t("song.title")}
        </h2>
        <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-1">{t("song.desc")}</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-charcoal-600 dark:text-[#e4ddd5]">{totalCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("song.total")}</p>
        </div>
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-green-500">{listenedCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("song.listened")}</p>
        </div>
        <div className="bg-white dark:bg-[#232829] rounded-2xl p-3 text-center shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <p className="text-lg font-bold text-burnt-400">{totalCount - listenedCount}</p>
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider">{t("song.pending")}</p>
        </div>
      </div>

      {/* ── Genre Grid ── */}
      <div className="bg-white dark:bg-[#232829] rounded-3xl p-3 shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
        <p className="text-[10px] font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider px-1 mb-2">{t("song.filter.genre")}</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {GENRES.map((g) => {
            const isActive = activeGenre === g.key;
            const GIcon = g.icon;
            const count = getGenreCount(g.key);
            return (
              <button
                key={g.key}
                onClick={() => setActiveGenre(g.key)}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${g.gradient} text-white shadow-md`
                    : "text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-50 dark:hover:bg-[#2e3133]"
                }`}
              >
                <GIcon size={14} className={isActive ? "text-white" : ""} />
                <span className="text-[8px] font-semibold mt-0.5 leading-tight text-center truncate w-full">
                  {t(g.labelKey)}
                </span>
                {count > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[7px] font-bold flex items-center justify-center ${
                    isActive
                      ? "bg-white text-charcoal-600"
                      : "bg-warm-200/80 dark:bg-[#3a3f42] text-charcoal-500 dark:text-[#a39e98]"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mood Filter ── */}
      <div className="bg-white dark:bg-[#232829] rounded-3xl p-3 shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
        <p className="text-[10px] font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider px-1 mb-2">{t("song.filter.mood")}</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {MOODS.map((m) => {
            const isActive = activeMood === m.key;
            const MIcon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => setActiveMood(m.key)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${m.gradient} text-white shadow-md`
                    : "text-charcoal-400 dark:text-[#8a8580] hover:bg-warm-50 dark:hover:bg-[#2e3133]"
                }`}
              >
                <MIcon size={14} className={isActive ? "text-white" : ""} />
                <span className="text-[8px] font-semibold mt-0.5 leading-tight text-center truncate w-full">
                  {t(m.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Random Pick Button ── */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={pickRandom}
        disabled={spinning || filtered.length === 0}
        className="w-full py-4 rounded-3xl bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 text-white font-bold text-base shadow-lg shadow-purple-300/30 dark:shadow-purple-900/30 disabled:opacity-40 flex items-center justify-center gap-3"
      >
        <motion.div animate={spinning ? { rotate: 360 } : {}} transition={{ duration: 0.5, repeat: spinning ? Infinity : 0, ease: "linear" }}>
          <Shuffle size={22} />
        </motion.div>
        {spinning ? t("song.spinning") : t("song.pick.random")}
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
            <div className={`h-2 bg-gradient-to-r ${getCardGradient(picked.genre)}`} />

            <div className="absolute top-8 right-4 w-24 h-24 rounded-full bg-purple-100/20 dark:bg-purple-900/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full bg-pink-100/20 dark:bg-pink-900/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 p-5 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${getCardGradient(picked.genre)} shadow-lg mb-3`}
              >
                <Music size={28} className="text-white" />
              </motion.div>

              <h3 className="text-lg font-bold text-charcoal-600 dark:text-[#e4ddd5]">
                {picked.title}
              </h3>
              <p className="text-sm text-charcoal-400 dark:text-[#8a8580] mt-0.5">{picked.artist}</p>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {picked.year && (
                  <span className="text-xs text-charcoal-400 dark:text-[#8a8580]">{picked.year}</span>
                )}
                {(() => {
                  const gc = getGenreConfig(picked.genre);
                  const GIcon = gc.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${gc.bgLight} ${gc.textColor}`}>
                      <GIcon size={10} /> {t(`song.genre.${picked.genre}`)}
                    </span>
                  );
                })()}
                {(() => {
                  const mc = getMoodConfig(picked.mood);
                  const MIcon = mc.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 text-xs ${mc.textColor}`}>
                      <MIcon size={10} /> {t(`song.mood.${picked.mood}`)}
                    </span>
                  );
                })()}
              </div>

              <div className="flex gap-2 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setRatingSong(picked); setTempRating(0); }}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <Headphones size={16} /> {t("song.mark.listened")}
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
        {ratingSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setRatingSong(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#232829] rounded-3xl p-6 w-full max-w-sm shadow-xl border border-warm-200/60 dark:border-[#3a3f42] space-y-4"
            >
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${getCardGradient(ratingSong.genre)} shadow-md mb-2`}>
                  <Music size={24} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-charcoal-600 dark:text-[#e4ddd5] mt-1">{ratingSong.title}</h3>
                <p className="text-xs text-charcoal-400 dark:text-[#8a8580]">{ratingSong.artist}</p>
                <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-2">{t("song.rate.it")}</p>
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
                  onClick={() => markListened(ratingSong, tempRating || undefined)}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Check size={16} /> {t("song.confirm")}
                </button>
                <button
                  onClick={() => setRatingSong(null)}
                  className="px-4 py-3 rounded-2xl bg-warm-100 dark:bg-[#2e3133] text-charcoal-400 dark:text-[#8a8580] text-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle listened + List ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowListened(!showListened)}
          className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
            showListened
              ? "bg-green-50 dark:bg-green-900/20 text-green-500 border border-green-200/60 dark:border-green-800/30"
              : "bg-white dark:bg-[#232829] text-charcoal-400 dark:text-[#8a8580] border border-warm-200/60 dark:border-[#3a3f42]"
          }`}
        >
          {showListened ? <Headphones size={14} /> : <HeadphoneOff size={14} />}
          {showListened ? t("song.hide.listened") : t("song.show.listened")}
        </button>
        <button
          onClick={() => setShowList(!showList)}
          className="flex-1 py-2.5 rounded-2xl bg-white dark:bg-[#232829] text-charcoal-400 dark:text-[#8a8580] border border-warm-200/60 dark:border-[#3a3f42] text-xs font-semibold flex items-center justify-center gap-2"
        >
          <ChevronDown size={14} className={`transition-transform ${showList ? "rotate-180" : ""}`} />
          {showList ? t("song.hide.list") : t("song.show.list")}
        </button>
      </div>

      {/* ── Song List ── */}
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
                    <Headphones size={24} className="text-warm-300 dark:text-[#5a5550]" />
                  </div>
                  <p className="text-xs text-charcoal-300 dark:text-[#6e6862]">{t("song.empty")}</p>
                </div>
              ) : (
                filtered.map((song, i) => {
                  const gc = getGenreConfig(song.genre);
                  const GIcon = gc.icon;
                  return (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.5) }}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                        song.listened
                          ? "bg-green-50/50 dark:bg-green-900/10 border border-green-200/40 dark:border-green-800/20"
                          : "bg-white dark:bg-[#232829] border border-warm-200/60 dark:border-[#3a3f42]"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gc.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                        <GIcon size={14} className="text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          song.listened
                            ? "text-charcoal-400 dark:text-[#8a8580] line-through"
                            : "text-charcoal-600 dark:text-[#e4ddd5]"
                        }`}>
                          {song.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-charcoal-300 dark:text-[#6e6862] truncate">{song.artist}</span>
                          {song.year && <span className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">({song.year})</span>}
                          {song.listened && song.rating && (
                            <span className="flex items-center gap-0.5">
                              {[...Array(song.rating)].map((_, j) => (
                                <Star key={j} size={8} className="text-yellow-400 fill-yellow-400" />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                      {song.listened ? (
                        <button
                          onClick={() => unmarkListened(song)}
                          className="p-2 rounded-xl text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors shrink-0"
                          title={t("song.unlisten")}
                        >
                          <Headphones size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setRatingSong(song); setTempRating(0); }}
                          className="p-2 rounded-xl text-charcoal-300 dark:text-[#5a5550] hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0"
                          title={t("song.mark.listened")}
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

      {/* ── Add Song ── */}
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-warm-300/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] text-sm font-medium flex items-center justify-center gap-2 hover:border-purple-300/60 hover:text-purple-400 dark:hover:border-purple-400/40 dark:hover:text-purple-300 transition-colors"
          >
            <Plus size={16} /> {t("song.add")}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-soft border border-warm-200/60 dark:border-[#3a3f42] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t("song.add.title")}</span>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#6e6862] hover:text-charcoal-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-warm-50/80 dark:bg-[#252a2c] rounded-2xl px-4 py-3 border border-warm-200/60 dark:border-[#3a3f42] focus-within:ring-2 focus-within:ring-purple-200/50 dark:focus-within:ring-purple-500/30">
                <Music size={16} className="text-charcoal-300 dark:text-[#5a5550] shrink-0" />
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("song.placeholder.title")}
                  maxLength={200}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
                />
              </div>

              <div className="flex items-center gap-2 bg-warm-50/80 dark:bg-[#252a2c] rounded-2xl px-4 py-3 border border-warm-200/60 dark:border-[#3a3f42] focus-within:ring-2 focus-within:ring-purple-200/50 dark:focus-within:ring-purple-500/30">
                <Mic2 size={16} className="text-charcoal-300 dark:text-[#5a5550] shrink-0" />
                <input
                  value={form.artist}
                  onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  placeholder={t("song.placeholder.artist")}
                  maxLength={200}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
                />
              </div>

              <div className="flex items-center gap-2 bg-warm-50/80 dark:bg-[#252a2c] rounded-2xl px-4 py-3 border border-warm-200/60 dark:border-[#3a3f42] focus-within:ring-2 focus-within:ring-purple-200/50 dark:focus-within:ring-purple-500/30 w-28">
                <Search size={16} className="text-charcoal-300 dark:text-[#5a5550] shrink-0" />
                <input
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  placeholder={t("song.placeholder.year")}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550] w-full"
                />
              </div>
            </div>

            {/* Genre selector */}
            <div>
              <p className="text-[10px] font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider mb-1.5">{t("song.filter.genre")}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {GENRES.filter((g) => g.key !== "all").map((g) => {
                  const GIcon = g.icon;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setForm({ ...form, genre: g.key })}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-[9px] font-semibold transition-all ${
                        form.genre === g.key
                          ? `bg-gradient-to-br ${g.gradient} text-white shadow-sm`
                          : "bg-warm-50/80 dark:bg-[#1e2224] text-charcoal-400 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#2e3133]"
                      }`}
                    >
                      <GIcon size={13} />
                      {t(g.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood selector */}
            <div>
              <p className="text-[10px] font-semibold text-charcoal-400 dark:text-[#6e6862] uppercase tracking-wider mb-1.5">{t("song.filter.mood")}</p>
              <div className="flex gap-1.5 flex-wrap">
                {MOODS.filter((m) => m.key !== "all").map((m) => {
                  const MIcon = m.icon;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setForm({ ...form, mood: m.key })}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${
                        form.mood === m.key
                          ? `bg-gradient-to-r ${m.gradient} text-white shadow-sm`
                          : "bg-warm-50/80 dark:bg-[#1e2224] text-charcoal-400 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#2e3133]"
                      }`}
                    >
                      <MIcon size={11} />
                      {t(m.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={createSong}
              disabled={saving || !form.title.trim() || !form.artist.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/30"
            >
              <Send size={15} /> {saving ? t("saving") : t("song.add.btn")}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
