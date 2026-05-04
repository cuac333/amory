import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music, Plus, X, Trash2, Play, Link2, Heart, Disc3,
  ListMusic, Headphones, PauseCircle, ExternalLink, Quote,
  Mic2, Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import { useSpotify } from "../../context/SpotifyContext";
import api from "../../services/api";
import type { SharedSong } from "../../types";
import DeleteButton from "../../components/shared/DeleteButton";
import type { DeletionRequest } from "../../types";

const SPOTIFY_REGEX =
  /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show|artist)\/|^spotify:(track|album|playlist|episode|show|artist):/;

function isSpotifyUrl(url: string): boolean {
  return SPOTIFY_REGEX.test(url);
}

// Rotating vinyl animation colors
const VINYL_COLORS = [
  "from-burnt-400 to-sandy-300",
  "from-rose-400 to-pink-300",
  "from-violet-400 to-purple-300",
  "from-cyan-400 to-teal-300",
  "from-amber-400 to-orange-300",
];

export default function PlaylistSection() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const spotify = useSpotify();
  const [songs, setSongs] = useState<SharedSong[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [note, setNote] = useState("");

  const [spotifyLink, setSpotifyLink] = useState("");
  const [showSpotifyInput, setShowSpotifyInput] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/playlist"),
      api.get("/deletion-requests/", { params: { entity_type: "shared_song", status: "pending" } }),
    ])
      .then(([songRes, delRes]) => {
        setSongs(songRes.data);
        setDeletionRequests(delRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim() || !artist.trim()) return;
    setSaving(true);
    try {
      await api.post("/playlist", {
        title: title.trim(),
        artist: artist.trim(),
        song_url: songUrl.trim() || null,
        note: note.trim() || null,
      });
      setTitle(""); setArtist(""); setSongUrl(""); setNote("");
      setShowForm(false);
      load();
    } catch {}
    setSaving(false);
  };

  const handlePlaySpotify = () => {
    if (spotifyLink.trim() && isSpotifyUrl(spotifyLink.trim())) {
      spotify.play(spotifyLink.trim());
      setShowSpotifyInput(false);
    }
  };

  const handlePlaySong = (song: SharedSong) => {
    if (song.song_url && isSpotifyUrl(song.song_url)) {
      spotify.play(song.song_url, `${song.title} — ${song.artist}`);
    }
  };

  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;

  const filtered = searchFilter.trim()
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          s.artist.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : songs;

  const withSpotify = songs.filter((s) => s.song_url && isSpotifyUrl(s.song_url)).length;
  const withNotes = songs.filter((s) => s.note).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header with stats ── */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-burnt-400 to-sandy-300 flex items-center justify-center mx-auto shadow-lg"
        >
          <Headphones size={28} className="text-white" />
        </motion.div>
        <div>
          <h2 className="text-lg font-bold text-charcoal-700 dark:text-warm-100">{t("playlist.title")}</h2>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{t("playlist.subtitle")}</p>
        </div>
      </div>

      {/* Stats row */}
      {songs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ListMusic, value: songs.length, label: t("playlist.stat.songs"), color: "from-burnt-400 to-burnt-300" },
            { icon: Disc3, value: withSpotify, label: "Spotify", color: "from-green-500 to-emerald-400" },
            { icon: Heart, value: withNotes, label: t("playlist.stat.with.story"), color: "from-rose-400 to-pink-300" },
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

      {/* ── Spotify connect banner ── */}
      <div className="bg-gradient-to-br from-[#191414] to-[#1a1a2e] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#1DB954] flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.64 5.801 15.54 6.001 20.1 8.82c.541.3.719 1.02.42 1.56-.299.421-1.02.599-1.439.3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-bold">Spotify</p>
              <p className="text-white/40 text-[10px]">{t("playlist.spotify.link")}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {showSpotifyInput ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={spotifyLink}
                    onChange={(e) => setSpotifyLink(e.target.value)}
                    placeholder={t("playlist.spotify.placeholder")}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#1DB954]/60 focus:ring-1 focus:ring-[#1DB954]/30"
                    onKeyDown={(e) => e.key === "Enter" && handlePlaySpotify()}
                    autoFocus
                  />
                  <button
                    onClick={handlePlaySpotify}
                    disabled={!spotifyLink.trim() || !isSpotifyUrl(spotifyLink.trim())}
                    className="px-4 rounded-xl bg-[#1DB954] text-white font-semibold hover:bg-[#1ed760] transition-all disabled:opacity-25 active:scale-95"
                  >
                    <Play size={16} className="fill-white" />
                  </button>
                  <button
                    onClick={() => { setShowSpotifyInput(false); setSpotifyLink(""); }}
                    className="px-2 rounded-xl text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                {spotifyLink.trim() && !isSpotifyUrl(spotifyLink.trim()) && (
                  <p className="text-red-300/60 text-[10px] mt-1.5 ml-1">
                    {t("playlist.spotify.invalid")}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.button
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowSpotifyInput(true)}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-[#1DB954] text-white text-sm font-bold hover:bg-[#1ed760] transition-all active:scale-[0.98] shadow-md"
              >
                <Play size={16} className="fill-white" /> {t("playlist.spotify.play")}
              </motion.button>
            )}
          </AnimatePresence>

          {spotify.visible && spotify.originalUrl && (
            <button
              onClick={() => spotify.setExpanded(true)}
              className="w-full mt-2.5 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/8 text-[#1DB954] text-xs font-medium hover:bg-white/12 transition-colors border border-white/5"
            >
              <Disc3 size={13} className="animate-spin" style={{ animationDuration: "3s" }} />
              {t("playlist.spotify.playing")}
            </button>
          )}
        </div>
      </div>

      {/* ── Actions bar ── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        {songs.length > 3 && (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-charcoal-800 rounded-xl border border-warm-200/30 dark:border-charcoal-700/50">
            <Search size={14} className="text-charcoal-300 dark:text-charcoal-500 shrink-0" />
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t("playlist.search.placeholder")}
              className="flex-1 bg-transparent text-xs outline-none text-charcoal-600 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter("")}>
                <X size={12} className="text-charcoal-300" />
              </button>
            )}
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            showForm
              ? "bg-warm-100 dark:bg-charcoal-700 text-charcoal-500 dark:text-warm-300"
              : "bg-gradient-to-r from-burnt-400 to-burnt-300 text-white"
          }`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          <span className="hidden sm:inline">{showForm ? t("cancel") : t("playlist.add")}</span>
        </motion.button>
      </div>

      {/* ── Create form (modal bottom-sheet style) ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-elevated border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden"
          >
            {/* Form header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-warm-200/20 dark:border-charcoal-700/40">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-burnt-400 to-sandy-300 flex items-center justify-center">
                <Music size={13} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("playlist.add")}</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Music size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                  <input
                    type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("playlist.title.placeholder")}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                  />
                </div>
                <div className="relative">
                  <Mic2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                  <input
                    type="text" value={artist} onChange={(e) => setArtist(e.target.value)}
                    placeholder={t("playlist.artist.placeholder")}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                  />
                </div>
              </div>
              <div className="relative">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 dark:text-charcoal-500" />
                <input
                  type="url" value={songUrl} onChange={(e) => setSongUrl(e.target.value)}
                  placeholder={t("playlist.url.placeholder")}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                />
                {songUrl && isSpotifyUrl(songUrl) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#1DB954] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="relative">
                <Heart size={13} className="absolute left-3 top-3 text-warm-400 dark:text-charcoal-500" />
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={t("playlist.why.placeholder")}
                  rows={2}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500 resize-none"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={saving || !title.trim() || !artist.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-burnt-400 to-burnt-300 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                {saving ? t("playlist.adding") : t("playlist.add.btn")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Song list ── */}
      {songs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-burnt-100/50 to-sandy-100/50 dark:from-burnt-400/10 dark:to-sandy-400/10 flex items-center justify-center">
            <Music size={36} className="text-burnt-300 dark:text-burnt-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-charcoal-400 dark:text-charcoal-500">{t("playlist.empty")}</p>
            <p className="text-xs text-charcoal-300 dark:text-charcoal-600 mt-1">{t("playlist.empty.hint")}</p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((song, i) => {
            const hasSpotify = song.song_url && isSpotifyUrl(song.song_url);
            const vinylColor = VINYL_COLORS[i % VINYL_COLORS.length];

            return (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-white dark:bg-charcoal-800 rounded-2xl border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Vinyl / Play button */}
                  <button
                    onClick={() => hasSpotify && handlePlaySong(song)}
                    disabled={!hasSpotify}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                      hasSpotify
                        ? "bg-[#1DB954] hover:bg-[#1ed760] shadow-md cursor-pointer"
                        : `bg-gradient-to-br ${vinylColor} shadow-sm cursor-default`
                    }`}
                  >
                    {hasSpotify ? (
                      <Play size={18} className="text-white fill-white ml-0.5" />
                    ) : (
                      <Music size={18} className="text-white" />
                    )}
                  </button>

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-charcoal-700 dark:text-warm-100 text-sm truncate">{song.title}</p>
                        <p className="text-xs text-charcoal-400 dark:text-charcoal-500 truncate">{song.artist}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {song.song_url && !hasSpotify && (
                          <a
                            href={song.song_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-charcoal-300 hover:text-burnt-400 hover:bg-burnt-50 dark:hover:bg-burnt-400/10 transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <DeleteButton
                          entityType="shared_song"
                          entityId={song.id}
                          pendingRequest={getPendingRequest(song.id)}
                          currentUserId={user?.id ?? 0}
                          onAction={load}
                        />
                      </div>
                    </div>

                    {/* Note */}
                    {song.note && (
                      <div className="flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 bg-burnt-50/40 dark:bg-burnt-400/5 rounded-lg border-l-2 border-burnt-300/40">
                        <Quote size={10} className="text-burnt-300 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-charcoal-500 dark:text-warm-300 italic leading-relaxed line-clamp-2">
                          {song.note}
                        </p>
                      </div>
                    )}

                    {/* Date */}
                    <p className="text-[9px] text-charcoal-300 dark:text-charcoal-600 mt-1.5">
                      {t("playlist.added.on")} {new Date(song.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Search no results */}
          {searchFilter && filtered.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-2">
              <Search size={22} className="text-charcoal-300 dark:text-charcoal-600" />
              <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{t("no.results")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
