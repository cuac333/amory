import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/I18nContext";
import api from "../../services/api";
import type { SpinnerOption } from "../../types";
import {
  Plus, Trash2, Sparkles, RotateCw, X,
  Send,
} from "lucide-react";

// ─── Segment Colors ───

const SEGMENT_COLORS = [
  { bg: "#c4734d", text: "#fff" },   // burnt
  { bg: "#dfc48e", text: "#4a3520" }, // sandy
  { bg: "#2dd4bf", text: "#134e4a" }, // teal
  { bg: "#f0a0ac", text: "#4a1520" }, // rose
  { bg: "#c084d8", text: "#3b1550" }, // purple
  { bg: "#f0d050", text: "#4a3a10" }, // gold
  { bg: "#8b4226", text: "#fff" },    // burnt dark
  { bg: "#a8895a", text: "#2a2010" }, // sandy dark
];

// ─── Helpers ───

function buildConicGradient(count: number): string {
  if (count === 0) return "conic-gradient(from 0deg, #e5e5e5 0deg 360deg)";
  const sliceAngle = 360 / count;
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length].bg;
    const start = sliceAngle * i;
    const end = sliceAngle * (i + 1);
    stops.push(`${color} ${start}deg ${end}deg`);
  }
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

function getWinnerIndex(finalAngle: number, count: number): number {
  if (count === 0) return -1;
  const sliceAngle = 360 / count;
  const normalized = ((finalAngle % 360) + 360) % 360;
  const pointerAngle = (360 - normalized) % 360;
  return Math.floor(pointerAngle / sliceAngle);
}

// ─── Main Component ───

export default function SpinnerGame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [options, setOptions] = useState<SpinnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Spin state
  const [spinning, setSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(4);
  const [winner, setWinner] = useState<SpinnerOption | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const isCreator = user?.role === "partner_1";

  const loadOptions = useCallback(async () => {
    try {
      const res = await api.get("/spinner/options");
      setOptions(res.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await api.post("/spinner/seed");
      } catch {
        /* already seeded */
      }
      loadOptions();
    };
    init();
  }, [loadOptions]);

  const sliceAngle = options.length > 0 ? 360 / options.length : 0;

  const conicGradient = useMemo(
    () => buildConicGradient(options.length),
    [options.length],
  );

  // ─── Spin ───

  const handleSpin = () => {
    if (spinning || options.length < 2) return;
    setWinner(null);
    setShowCelebration(false);

    let randomOffset: number;
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      randomOffset = Math.random() * 360;
      const testAngle = currentRotation + 7 * 360 + randomOffset;
      const idx = getWinnerIndex(testAngle, options.length);
      if (!winner || idx !== options.indexOf(winner) || options.length <= 2) break;
    }

    const extraSpins = 5 + Math.floor(Math.random() * 5);
    const finalAngle = currentRotation + extraSpins * 360 + randomOffset!;
    const dur = 3 + Math.random() * 2;

    setSpinDuration(dur);
    setCurrentRotation(finalAngle);
    setSpinning(true);

    setTimeout(() => {
      const idx = getWinnerIndex(finalAngle, options.length);
      if (idx >= 0 && idx < options.length) {
        setWinner(options[idx]);
      }
      setSpinning(false);
      setShowCelebration(true);
    }, dur * 1000 + 300);
  };

  // ─── CRUD ───

  const addOption = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await api.post("/spinner/options", { text: newText.trim() });
      setNewText("");
      setShowForm(false);
      loadOptions();
    } catch {
      /* empty */
    }
    setSaving(false);
  };

  const deleteOption = async (id: number) => {
    try {
      await api.delete(`/spinner/options/${id}`);
      setOptions((prev) => prev.filter((o) => o.id !== id));
      if (winner?.id === id) {
        setWinner(null);
        setShowCelebration(false);
      }
    } catch {
      /* empty */
    }
  };

  // ─── Loading ───

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-6"
    >
      {/* ─── Header ─── */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-300 via-burnt-300 to-sandy-300 flex items-center justify-center shadow-lg shadow-purple-200/30"
        >
          <RotateCw size={26} className="text-white" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-charcoal-600 dark:text-[#e4ddd5]">
          {t("spinner.title")}
        </h2>
        <p className="text-xs text-charcoal-300 dark:text-[#6e6862] max-w-[260px] mx-auto leading-relaxed">
          {t("spinner.desc")}
        </p>
      </div>

      {/* ─── Wheel ─── */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex flex-col items-center">
          {/* Pointer */}
          <div className="relative z-20">
            <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-charcoal-600 dark:border-t-[#e4ddd5] drop-shadow-lg" />
          </div>

          {/* Wheel container */}
          <div className="relative -mt-1.5" style={{ width: 290, height: 290 }}>
            {/* Glow effect */}
            {spinning && (
              <motion.div
                className="absolute -inset-3 rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, rgba(196,115,77,0.4) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}

            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full shadow-elevated" style={{
              background: "linear-gradient(135deg, #c4734d 0%, #dfc48e 50%, #c4734d 100%)",
              padding: 5,
            }}>
              <div className="w-full h-full rounded-full" style={{ background: "linear-gradient(135deg, #8b4226, #c4734d)" }}>
                {/* Tick marks */}
                {options.length > 0 && Array.from({ length: options.length * 2 }).map((_, i) => {
                  const angle = (360 / (options.length * 2)) * i;
                  const isMajor = i % 2 === 0;
                  return (
                    <div
                      key={`tick-${i}`}
                      className="absolute"
                      style={{
                        width: 2,
                        height: isMajor ? 8 : 4,
                        background: "rgba(255,255,255,0.4)",
                        top: isMajor ? 3 : 5,
                        left: "50%",
                        transformOrigin: `50% ${145}px`,
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Spinning wheel */}
            <motion.div
              className="absolute rounded-full overflow-hidden"
              style={{
                inset: 8,
                background: conicGradient,
              }}
              animate={{ rotate: currentRotation }}
              transition={{
                duration: spinning ? spinDuration : 0,
                ease: [0.2, 0.8, 0.3, 1],
              }}
            >
              {/* Segment labels */}
              {options.map((opt, i) => {
                const angle = sliceAngle * i + sliceAngle / 2;
                const colorInfo = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
                const rad = ((angle - 90) * Math.PI) / 180;
                const radius = 88;
                const x = 50 + (radius / 137) * 100 * Math.cos(rad);
                const y = 50 + (radius / 137) * 100 * Math.sin(rad);

                return (
                  <div
                    key={opt.id}
                    className="absolute text-center font-bold leading-tight"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                      color: colorInfo.text,
                      fontSize: options.length > 6 ? 9 : options.length > 4 ? 10 : 12,
                      width: 68,
                      textShadow:
                        colorInfo.text === "#fff"
                          ? "0 1px 3px rgba(0,0,0,0.4)"
                          : "0 1px 1px rgba(255,255,255,0.4)",
                    }}
                  >
                    {opt.text.length > 18
                      ? opt.text.slice(0, 16) + "..."
                      : opt.text}
                  </div>
                );
              })}

              {/* Segment dividers */}
              {options.length > 1 &&
                options.map((_, i) => {
                  const angle = sliceAngle * i;
                  return (
                    <div
                      key={`divider-${i}`}
                      className="absolute top-1/2 left-1/2 origin-left"
                      style={{
                        width: "50%",
                        height: 1.5,
                        background: "rgba(255,255,255,0.3)",
                        transform: `rotate(${angle}deg)`,
                        transformOrigin: "0% 50%",
                      }}
                    />
                  );
                })}
            </motion.div>

            {/* Center button */}
            <button
              onClick={handleSpin}
              disabled={spinning || options.length < 2}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[72px] h-[72px] rounded-full bg-gradient-to-br from-charcoal-500 to-charcoal-700 dark:from-[#e4ddd5] dark:to-[#c4bdb5] text-white dark:text-charcoal-700 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-4 border-white/20 dark:border-charcoal-600/20"
            >
              {spinning ? (
                <RotateCw size={22} className="animate-spin" />
              ) : (
                t("spinner.spin")
              )}
            </button>
          </div>
        </div>

        {options.length < 2 && (
          <p className="text-xs text-charcoal-300 dark:text-[#6e6862] text-center font-medium">
            {t("spinner.min.options")}
          </p>
        )}
      </div>

      {/* ─── Celebration ─── */}
      <AnimatePresence>
        {showCelebration && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mx-auto max-w-xs text-center"
          >
            <div className="bg-white dark:bg-[#232829] rounded-3xl p-6 shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-burnt-100/30 to-sandy-100/30 dark:from-burnt-900/15 dark:to-sandy-900/15 -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-gradient-to-br from-teal-100/30 to-purple-100/30 dark:from-teal-900/15 dark:to-purple-900/15 translate-y-6 -translate-x-6" />

              {/* Sparkles */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute top-3 right-4"
              >
                <Sparkles size={14} className="text-yellow-400" />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-4 left-4"
              >
                <Sparkles size={10} className="text-pink-300" />
              </motion.div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-4 right-5"
              >
                <Sparkles size={12} className="text-teal-400" />
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                className="relative z-10"
              >
                <span className="text-3xl mb-3 block">🎉</span>
                <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862] mb-1.5 uppercase tracking-widest font-semibold">
                  {t("spinner.result")}
                </p>
                <p className="text-xl font-black text-charcoal-600 dark:text-[#e4ddd5] font-display">
                  {winner.text}
                </p>
              </motion.div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowCelebration(false);
                  setWinner(null);
                }}
                className="mt-4 text-xs font-medium text-burnt-400 hover:text-burnt-500 transition-colors relative z-10"
              >
                {t("close")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Options List ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-burnt-100 dark:bg-burnt-800/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-burnt-400">{options.length}</span>
          </div>
          <h3 className="text-xs font-bold text-charcoal-500 dark:text-[#a39e98] uppercase tracking-wider">
            {t("spinner.options")}
          </h3>
        </div>

        {/* Add option button */}
        {isCreator && !showForm && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-burnt-200/60 dark:border-[#3a3f42] text-burnt-400 dark:text-burnt-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-burnt-50/50 dark:hover:bg-burnt-900/10 transition-colors"
          >
            <Plus size={16} /> {t("spinner.add.option")}
          </motion.button>
        )}

        {/* Add option form */}
        <AnimatePresence>
          {isCreator && showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus size={16} className="text-burnt-400" />
                    <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t("spinner.add.option")}</span>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#8a8580] hover:bg-warm-100 dark:hover:bg-[#2e3335] transition-colors">
                    <X size={14} />
                  </button>
                </div>

                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addOption(); }}
                  placeholder={t("spinner.new.placeholder")}
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]"
                />

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={addOption}
                  disabled={saving || !newText.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-burnt-400 dark:from-burnt-400 dark:to-burnt-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-burnt-200/20 flex items-center justify-center gap-2"
                >
                  <Send size={15} /> {saving ? t("saving") : t("add")}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options list */}
        <div className="space-y-2">
          <AnimatePresence>
            {options.map((opt, i) => {
              const colorInfo = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
              return (
                <motion.div
                  key={opt.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  className="flex items-center gap-3 bg-white dark:bg-[#232829] rounded-2xl px-4 py-3 shadow-soft border border-warm-200/40 dark:border-[#3a3f42]"
                >
                  <div
                    className="w-4 h-4 rounded-lg shrink-0 shadow-sm"
                    style={{ background: colorInfo.bg }}
                  />
                  <span className="flex-1 text-sm font-medium text-charcoal-600 dark:text-[#e4ddd5] truncate">
                    {opt.text}
                  </span>
                  {isCreator && (
                    <button
                      onClick={() => deleteOption(opt.id)}
                      className="p-1.5 rounded-xl text-charcoal-200 dark:text-[#4a4440] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {options.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
                <RotateCw size={28} className="text-warm-400 dark:text-[#4a4440]" />
              </div>
              <p className="text-charcoal-400 dark:text-[#6e6862] text-sm font-medium">
                {isCreator ? t("spinner.empty") : t("spinner.empty.hint")}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
