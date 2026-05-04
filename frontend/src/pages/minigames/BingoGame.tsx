import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { BingoCell } from "../../types";
import {
  Check, Plus, Trash2, X, PartyPopper, Pencil, Send, Grid3X3, Sparkles,
} from "lucide-react";

// ─── Constants ───

const GRID_SIZE = 4;
const TOTAL = GRID_SIZE * GRID_SIZE;

const CELL_GRADIENTS = [
  "from-burnt-300 to-sandy-300",
  "from-pink-400 to-rose-400",
  "from-teal-400 to-emerald-400",
  "from-purple-400 to-violet-400",
  "from-amber-400 to-orange-400",
  "from-sky-400 to-blue-400",
  "from-rose-400 to-pink-400",
  "from-emerald-400 to-teal-400",
];

// ─── Helpers ───

function checkBingoLines(cells: BingoCell[]): boolean {
  if (cells.length < TOTAL) return false;
  const grid = [...cells].sort((a, b) => a.order - b.order);

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid.slice(r * GRID_SIZE, r * GRID_SIZE + GRID_SIZE).every((c) => c.completed)) return true;
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let allDone = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!grid[r * GRID_SIZE + c]?.completed) { allDone = false; break; }
    }
    if (allDone) return true;
  }
  const diag1 = Array.from({ length: GRID_SIZE }, (_, i) => grid[i * GRID_SIZE + i]);
  const diag2 = Array.from({ length: GRID_SIZE }, (_, i) => grid[i * GRID_SIZE + (GRID_SIZE - 1 - i)]);
  if (diag1.every((c) => c?.completed)) return true;
  if (diag2.every((c) => c?.completed)) return true;

  return false;
}

// ─── Main Component ───

export default function BingoGame() {
  const { user: _user } = useAuth();
  const { t } = useTranslation();
  const [cells, setCells] = useState<BingoCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [prevHadBingo, setPrevHadBingo] = useState(false);

  const loadCells = useCallback(async () => {
    try {
      const res = await api.get("/bingo");
      setCells(res.data);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try { await api.post("/bingo/seed"); } catch { /* already seeded */ }
      loadCells();
    };
    init();
  }, [loadCells]);

  const sorted = useMemo(() => [...cells].sort((a, b) => a.order - b.order), [cells]);
  const completedCount = useMemo(() => cells.filter((c) => c.completed).length, [cells]);
  const hasBingo = useMemo(() => checkBingoLines(cells), [cells]);
  const progress = cells.length > 0 ? (completedCount / cells.length) * 100 : 0;

  // Trigger celebration only on new bingo
  useEffect(() => {
    if (hasBingo && !prevHadBingo) {
      setCelebrationVisible(true);
      const timer = setTimeout(() => setCelebrationVisible(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevHadBingo(hasBingo);
  }, [hasBingo, prevHadBingo]);

  const toggleCell = async (cell: BingoCell) => {
    if (togglingId !== null) return;
    setTogglingId(cell.id);
    try {
      const res = await api.post(`/bingo/${cell.id}/toggle`);
      setCells((prev) => prev.map((c) => (c.id === cell.id ? res.data : c)));
    } catch { /* */ }
    setTogglingId(null);
  };

  const createCell = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await api.post("/bingo", { text: newText.trim() });
      setNewText("");
      setShowForm(false);
      await loadCells();
    } catch { /* */ }
    setSaving(false);
  };

  const deleteCell = async (id: number) => {
    try {
      await api.delete(`/bingo/${id}`);
      setCells((prev) => prev.filter((c) => c.id !== id));
    } catch { /* */ }
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-burnt-300 via-pink-300 to-purple-400 shadow-lg shadow-burnt-200/30 dark:shadow-burnt-900/30 mb-3">
          <Grid3X3 size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          Bingo
        </h2>
        <p className="text-xs text-charcoal-400 dark:text-[#8a8580] mt-1">{t("games.bingo.desc")}</p>
      </div>

      {/* ── Progress Card ── */}
      <div className="bg-white dark:bg-[#232829] rounded-3xl p-4 shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">
              {completedCount}/{cells.length}
            </span>
            <span className="text-xs text-charcoal-400 dark:text-[#8a8580]">
              {t("bingo.completed")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {hasBingo && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-burnt-300 to-sandy-300 bg-clip-text text-transparent"
                >
                  <Sparkles size={12} className="text-burnt-400" /> BINGO!
                </motion.span>
              )}
            </AnimatePresence>
            {cells.length > 0 && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`p-2 rounded-xl transition-colors ${
                  editMode
                    ? "bg-red-50 dark:bg-red-900/20 text-red-400"
                    : "text-charcoal-300 dark:text-[#6e6862] hover:bg-warm-100 dark:hover:bg-[#2e3133]"
                }`}
                title={editMode ? t("bingo.edit.exit") : t("bingo.edit")}
              >
                {editMode ? <X size={16} /> : <Pencil size={14} />}
              </button>
            )}
          </div>
        </div>
        <div className="w-full h-2.5 bg-warm-100 dark:bg-[#1e2224] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-burnt-300 via-pink-300 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        {progress > 0 && (
          <p className="text-[10px] text-charcoal-400 dark:text-[#6e6862] mt-1.5 text-right">
            {Math.round(progress)}%
          </p>
        )}
      </div>

      {/* ── Bingo Celebration ── */}
      <AnimatePresence>
        {(hasBingo && celebrationVisible) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-burnt-300 via-pink-400 to-purple-400 p-5 text-center shadow-lg"
          >
            {/* Confetti */}
            {[...Array(16)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: ["#ffd700", "#ff69b4", "#87ceeb", "#fff", "#ffa500", "#98fb98"][i % 6],
                }}
                animate={{
                  y: [0, -30, 10],
                  x: [0, (Math.random() - 0.5) * 40],
                  opacity: [1, 0.8, 0],
                  scale: [0.5, 1.2, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <PartyPopper size={22} className="text-white" />
                <span className="text-lg font-bold text-white">BINGO!</span>
                <PartyPopper size={22} className="text-white" />
              </div>
              <p className="text-sm text-white/80">{t("bingo.line.complete")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grid ── */}
      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm-100/80 dark:bg-[#2e3133] mb-3">
            <Grid3X3 size={28} className="text-warm-300 dark:text-[#5a5550]" />
          </div>
          <p className="text-charcoal-300 dark:text-[#6e6862] text-sm">{t("bingo.empty")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#232829] rounded-3xl p-3 shadow-soft border border-warm-200/60 dark:border-[#3a3f42]">
          <div className="grid grid-cols-4 gap-1.5">
            {sorted.map((cell, idx) => (
              <motion.button
                key={cell.id}
                onClick={() => editMode ? deleteCell(cell.id) : toggleCell(cell)}
                disabled={!editMode && togglingId !== null}
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                className={`relative rounded-2xl p-1.5 h-[4.8rem] flex flex-col items-center justify-center transition-all focus:outline-none ${
                  editMode
                    ? "bg-red-50 dark:bg-red-900/15 border border-red-200/80 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/25"
                    : cell.completed
                      ? `bg-gradient-to-br ${CELL_GRADIENTS[idx % CELL_GRADIENTS.length]} shadow-md`
                      : "bg-warm-50/80 dark:bg-[#1e2224] border border-warm-200/60 dark:border-[#2e3133] hover:border-burnt-200/60 dark:hover:border-burnt-500/30 hover:shadow-sm"
                }`}
              >
                {editMode ? (
                  <div className="flex flex-col items-center gap-1">
                    <Trash2 size={13} className="text-red-400" />
                    <p className="text-[8px] leading-tight text-center text-red-400 dark:text-red-300 line-clamp-2 px-0.5">
                      {cell.text}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Check badge */}
                    <AnimatePresence>
                      {cell.completed && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 45 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="absolute top-1 right-1"
                        >
                          <div className="w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                            <Check size={11} className="text-white" strokeWidth={3} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <p className={`text-[9px] leading-tight text-center font-medium select-none line-clamp-3 px-0.5 ${
                      cell.completed
                        ? "text-white drop-shadow-sm"
                        : "text-charcoal-500 dark:text-[#a39e98]"
                    }`}>
                      {cell.text}
                    </p>
                  </>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Add Cell ── */}
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-warm-300/60 dark:border-[#3a3f42] text-charcoal-400 dark:text-[#8a8580] text-sm font-medium flex items-center justify-center gap-2 hover:border-burnt-300/60 hover:text-burnt-400 dark:hover:border-burnt-400/40 dark:hover:text-burnt-300 transition-colors"
          >
            <Plus size={16} /> {t("bingo.add")}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-soft border border-warm-200/60 dark:border-[#3a3f42] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">
                {t("bingo.new")}
              </span>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#6e6862] hover:text-charcoal-500 dark:hover:text-[#a39e98] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t("bingo.placeholder")}
              maxLength={60}
              className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
            />

            <button
              onClick={createCell}
              disabled={saving || !newText.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30 dark:shadow-burnt-900/30"
            >
              <Send size={15} /> {saving ? t("saving") : t("bingo.add")}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
