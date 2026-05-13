import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MailOpen, Lock, Plus, Trash2, X, Send, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import type { SecretLetterGame } from "../../types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("zh-CN", { day: "numeric", month: "short", year: "numeric" });

const timeLeft = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function SecretLettersGame() {
  const { user } = useAuth();
  const [letters, setLetters] = useState<SecretLetterGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [opensAt, setOpensAt] = useState(tomorrow());
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [revealedId, setRevealedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/secret-letters-game").then((r) => setLetters(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!content.trim() || !opensAt) return;
    setSaving(true);
    try {
      await api.post("/secret-letters-game", { content: content.trim(), opens_at: opensAt });
      setContent(""); setOpensAt(tomorrow()); setShowForm(false); load();
    } catch { /* */ }
    setSaving(false);
  };

  const open = async (id: number) => {
    setOpeningId(id);
    try {
      const res = await api.post(`/secret-letters-game/${id}/open`);
      setLetters((prev) => prev.map((l) => (l.id === id ? res.data : l)));
      setTimeout(() => setRevealedId(id), 400);
    } catch { /* */ }
    setOpeningId(null);
  };

  const remove = async (id: number) => {
    try { await api.delete(`/secret-letters-game/${id}`); load(); } catch { /* */ }
  };

  const isAuthor = (l: SecretLetterGame) => l.author_id === user?.id;
  const isLocked = (l: SecretLetterGame) => !l.opened_at && new Date(l.opens_at).getTime() > Date.now();
  const isReady = (l: SecretLetterGame) => !l.opened_at && new Date(l.opens_at).getTime() <= Date.now();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-charcoal-500 flex items-center gap-2">
            <Mail size={22} className="text-burnt-300" /> 秘密信件
          </h2>
          <p className="text-xs text-charcoal-300 mt-0.5">写下会在未来开启的信件</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-medium text-burnt-300 hover:text-burnt-400 transition-colors">
          <Plus size={16} /> 新建
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-2xl p-4 shadow-soft space-y-3 border border-warm-200/60">
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="写下你的秘密信..." rows={4} maxLength={2000}
                className="w-full px-3 py-2 rounded-xl bg-warm-50 border border-warm-200 text-sm focus:outline-none focus:border-burnt-200 text-charcoal-500 resize-none" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-charcoal-400 whitespace-nowrap">开启时间：</label>
                <input type="date" value={opensAt} min={tomorrow()}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-warm-50 border border-warm-200 text-sm focus:outline-none focus:border-burnt-200 text-charcoal-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={create} disabled={saving || !content.trim()}
                  className="flex-1 py-2 rounded-xl bg-burnt-300 text-white text-sm font-medium hover:bg-burnt-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <Send size={14} /> {saving ? "发送中..." : "封存信件"}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl bg-warm-100 text-charcoal-400 text-sm hover:bg-warm-200 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Letters grid */}
      {letters.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Mail size={44} className="mx-auto mb-3 text-warm-300" />
          <p className="text-charcoal-300 text-sm">还没有信件，写下第一封吧！</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {letters.map((letter) => {
              const locked = isLocked(letter);
              const ready = isReady(letter);
              const opened = !!letter.opened_at;
              const revealed = revealedId === letter.id;

              return (
                <motion.div key={letter.id} layout
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group">
                  <div className={`relative rounded-2xl overflow-hidden shadow-soft border transition-all ${
                    opened ? "border-warm-200/40 bg-warm-50/50"
                    : ready ? "border-burnt-200 bg-gradient-to-br from-burnt-50 to-sandy-50 ring-2 ring-burnt-200/40"
                    : "border-warm-200/60 bg-gradient-to-br from-warm-100 to-sandy-100"
                  }`}>
                    {/* Wax seal */}
                    <div className="flex justify-center -mb-5 pt-4 relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                        opened ? "bg-warm-200 text-warm-400"
                        : ready ? "bg-gradient-to-br from-burnt-400 to-burnt-500 text-white animate-pulse"
                        : "bg-gradient-to-br from-burnt-300 to-burnt-400 text-white/80"
                      }`}>
                        {opened ? <MailOpen size={20} /> : locked ? <Lock size={16} /> : <Sparkles size={18} />}
                      </div>
                    </div>

                    <div className="px-4 pt-7 pb-4 text-center space-y-2">
                      {/* Status */}
                      {locked && (
                        <>
                          <p className="text-xs font-medium text-charcoal-400">{fmt(letter.opens_at)} 开启</p>
                          {timeLeft(letter.opens_at) && (
                            <p className="text-[11px] text-burnt-300 font-medium">还剩 {timeLeft(letter.opens_at)}</p>
                          )}
                          {isAuthor(letter) && letter.content && (
                            <p className="text-xs text-charcoal-300 italic mt-1 line-clamp-2">"{letter.content}"</p>
                          )}
                        </>
                      )}

                      {ready && (
                        <>
                          <p className="text-sm font-semibold text-burnt-400">可以打开了！</p>
                          <button onClick={() => open(letter.id)} disabled={openingId === letter.id}
                            className="mt-1 px-5 py-2 rounded-xl bg-burnt-300 text-white text-sm font-medium hover:bg-burnt-400 transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto">
                            <MailOpen size={14} /> {openingId === letter.id ? "打开中..." : "打开信件"}
                          </button>
                        </>
                      )}

                      {opened && (
                        <AnimatePresence>
                          <motion.div
                            initial={revealed ? { opacity: 0, y: 20 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          >
                            <p className="text-sm text-charcoal-500 leading-relaxed whitespace-pre-wrap">
                              {letter.content}
                            </p>
                            <p className="text-[11px] text-charcoal-300 mt-2">
                              {fmt(letter.opened_at!)} 已开启
                            </p>
                          </motion.div>
                        </AnimatePresence>
                      )}
                    </div>
                  </div>

                  {/* Delete button (author only) */}
                  {isAuthor(letter) && (
                    <button onClick={() => remove(letter.id)}
                      className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-white/80 text-warm-300 hover:text-red-400 hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
