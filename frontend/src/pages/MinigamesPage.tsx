import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import api from "../services/api";
import type { ScratchCard, Voucher, User as UserType } from "../types";
import {
  Gamepad2, Plus, Trash2, Sparkles, X, Gift, Palette,
  Ticket, Coffee, Film, UtensilsCrossed, Plane, Heart, Star, Music,
  Check, Scissors, ChevronRight, ArrowLeft,
  MessageCircle, RotateCcw, Mail, FlaskConical, Timer, Grid3X3, Users, Popcorn, Headphones,
} from "lucide-react";
import TruthOrDareGame from "./minigames/TruthOrDareGame";
import SpinnerGame from "./minigames/SpinnerGame";
import OpenWhenGame from "./minigames/OpenWhenGame";
import LoveJarGame from "./minigames/LoveJarGame";
import CountdownGame from "./minigames/CountdownGame";
import BingoGame from "./minigames/BingoGame";
import WhosMostLikelyGame from "./minigames/WhosMostLikelyGame";
import MoviePickerGame from "./minigames/MoviePickerGame";
import SongPickerGame from "./minigames/SongPickerGame";

// ─── Constants ───

const CARD_COLORS: Record<string, { bg: string; scratch: string; scratchLight: string; label: string }> = {
  burnt: { bg: "from-burnt-300 to-burnt-400", scratch: "#8b4226", scratchLight: "#c4734d", label: "scratch.color.burnt" },
  sandy: { bg: "from-sandy-200 to-sandy-400", scratch: "#a8895a", scratchLight: "#dfc48e", label: "scratch.color.sandy" },
  rose: { bg: "from-pink-300 to-rose-400", scratch: "#c25a6a", scratchLight: "#f0a0ac", label: "scratch.color.rose" },
  purple: { bg: "from-purple-300 to-purple-500", scratch: "#7b3e99", scratchLight: "#c084d8", label: "scratch.color.purple" },
  teal: { bg: "from-teal-300 to-teal-500", scratch: "#1a7a70", scratchLight: "#5cc4b8", label: "scratch.color.teal" },
  gold: { bg: "from-yellow-300 to-amber-400", scratch: "#b08a12", scratchLight: "#f0d050", label: "scratch.color.gold" },
};

const VOUCHER_ICONS: Record<string, typeof Ticket> = {
  ticket: Ticket, coffee: Coffee, film: Film, utensils: UtensilsCrossed,
  plane: Plane, heart: Heart, star: Star, music: Music,
};

const VOUCHER_ICON_LABELS: Record<string, string> = {
  ticket: "voucher.icon.ticket", coffee: "voucher.icon.coffee", film: "voucher.icon.film", utensils: "voucher.icon.utensils",
  plane: "voucher.icon.plane", heart: "voucher.icon.heart", star: "voucher.icon.star", music: "voucher.icon.music",
};

const GAMES = [
  {
    key: "scratch",
    label: "games.scratch",
    desc: "games.scratch.desc",
    icon: Sparkles,
    color: "from-sandy-300 to-sandy-400",
  },
  {
    key: "vouchers",
    label: "games.vouchers",
    desc: "games.vouchers.desc",
    icon: Ticket,
    color: "from-burnt-300 to-burnt-400",
  },
  {
    key: "truthordare",
    label: "games.truthordare",
    desc: "games.truthordare.desc",
    icon: MessageCircle,
    color: "from-rose-300 to-pink-400",
  },
  {
    key: "spinner",
    label: "games.spinner",
    desc: "games.spinner.desc",
    icon: RotateCcw,
    color: "from-purple-300 to-purple-500",
  },
  {
    key: "openwhen",
    label: "games.openwhen",
    desc: "games.openwhen.desc",
    icon: Mail,
    color: "from-teal-300 to-teal-500",
  },
  {
    key: "lovejar",
    label: "games.lovejar",
    desc: "games.lovejar.desc",
    icon: FlaskConical,
    color: "from-pink-300 to-rose-400",
  },
  {
    key: "countdown",
    label: "games.countdown",
    desc: "games.countdown.desc",
    icon: Timer,
    color: "from-amber-300 to-orange-400",
  },
  {
    key: "bingo",
    label: "games.bingo",
    desc: "games.bingo.desc",
    icon: Grid3X3,
    color: "from-green-300 to-emerald-400",
  },
  {
    key: "whosmostlikely",
    label: "games.whosmostlikely",
    desc: "games.whosmostlikely.desc",
    icon: Users,
    color: "from-blue-300 to-indigo-400",
  },
  {
    key: "moviepicker",
    label: "games.moviepicker",
    desc: "games.moviepicker.desc",
    icon: Popcorn,
    color: "from-red-400 to-purple-500",
  },
  {
    key: "songpicker",
    label: "games.songpicker",
    desc: "games.songpicker.desc",
    icon: Headphones,
    color: "from-pink-400 to-indigo-500",
  },
];

// ─── Voucher Card Component ───

function VoucherCard({
  voucher, isForMe, isMine, onRedeem, onDelete, authorName, recipientName,
}: {
  voucher: Voucher; isForMe: boolean; isMine: boolean; onRedeem: () => void; onDelete: () => void; authorName: string; recipientName: string;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const redeemed = voucher.redeemed_by !== null;
  const Icon = VOUCHER_ICONS[voucher.icon] || Ticket;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative group"
    >
      <div className={`bg-white dark:bg-[#232829] rounded-3xl overflow-hidden shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] ${redeemed ? "opacity-60" : ""}`}>
        {/* Ticket-style top with tear line */}
        <div className="relative">
          <div className={`px-5 pt-5 pb-6 ${redeemed ? "bg-warm-50 dark:bg-[#2a2e30]" : "bg-gradient-to-br from-burnt-50 via-sandy-50 to-burnt-50 dark:from-burnt-900/15 dark:via-[#2a2520] dark:to-burnt-900/15"}`}>
            {/* Zigzag bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-white dark:bg-[#232829]" style={{
              clipPath: "polygon(0% 100%, 3% 0%, 6% 100%, 9% 0%, 12% 100%, 15% 0%, 18% 100%, 21% 0%, 24% 100%, 27% 0%, 30% 100%, 33% 0%, 36% 100%, 39% 0%, 42% 100%, 45% 0%, 48% 100%, 51% 0%, 54% 100%, 57% 0%, 60% 100%, 63% 0%, 66% 100%, 69% 0%, 72% 100%, 75% 0%, 78% 100%, 81% 0%, 84% 100%, 87% 0%, 90% 100%, 93% 0%, 96% 100%, 100% 0%, 100% 100%)"
            }} />

            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                redeemed
                  ? "bg-warm-200 dark:bg-[#3a3f42]"
                  : "bg-gradient-to-br from-burnt-300 to-burnt-400 dark:from-burnt-400 dark:to-burnt-500"
              }`}>
                <Icon size={22} className={redeemed ? "text-warm-400 dark:text-[#6e6862]" : "text-white"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-bold truncate ${redeemed ? "text-charcoal-300 dark:text-[#6e6862] line-through" : "text-charcoal-600 dark:text-[#e4ddd5]"}`}>
                  {voucher.title}
                </p>
                {voucher.description && (
                  <p className={`text-xs mt-0.5 truncate ${redeemed ? "text-charcoal-200 dark:text-[#4a4440] line-through" : "text-charcoal-400 dark:text-[#a39e98]"}`}>
                    {voucher.description}
                  </p>
                )}
              </div>
              {redeemed && (
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                  <Check size={10} /> {t("used")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="px-5 py-3.5 flex items-center justify-between">
          {/* De / Para */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.from")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{authorName}</span></span>
            <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.for")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{recipientName}</span></span>
          </div>

          {/* Action */}
          {!redeemed && isForMe && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                if (!confirming) { setConfirming(true); return; }
                onRedeem();
                setConfirming(false);
              }}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                confirming
                  ? "bg-emerald-500 dark:bg-emerald-600 text-white shadow-md shadow-emerald-200/30"
                  : "bg-gradient-to-r from-burnt-300 to-burnt-400 dark:from-burnt-400 dark:to-burnt-500 text-white shadow-md shadow-burnt-200/30"
              }`}
            >
              {confirming ? <><Check size={12} /> {t("confirm")}</> : <><Scissors size={12} /> {t("voucher.use")}</>}
            </motion.button>
          )}
          {!redeemed && !isForMe && (
            <span className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sandy-50 dark:bg-sandy-900/20 text-sandy-500 dark:text-sandy-400">
              {t("for.your.partner")}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      {isMine && (
        <button onClick={onDelete}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-xl bg-white/90 dark:bg-[#2e3335]/90 text-charcoal-300 hover:text-red-400 hover:bg-white transition-colors shadow-sm backdrop-blur-sm">
          <Trash2 size={13} />
        </button>
      )}
    </motion.div>
  );
}

// ─── Scratch Card Canvas Component ───

function ScratchCardCanvas({ card, onScratched }: { card: ScratchCard; onScratched: () => void }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const checkCounter = useRef(0);
  const hasFired = useRef(false);
  const revealed = card.scratched_by !== null;
  const colorInfo = CARD_COLORS[card.color] || CARD_COLORS.burnt;

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, colorInfo.scratch);
    baseGrad.addColorStop(0.5, colorInfo.scratchLight);
    baseGrad.addColorStop(1, colorInfo.scratch);
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#fff";
    for (let y = 0; y < h; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 0.5);
      ctx.lineTo(w, y + Math.random() * 0.5);
      ctx.lineWidth = Math.random() * 0.6 + 0.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,255,255,${Math.random() * 0.12})`
        : `rgba(0,0,0,${Math.random() * 0.08})`;
      ctx.fillRect(x, y, Math.random() * 1.5 + 0.5, Math.random() * 1.5 + 0.5);
    }

    ctx.globalAlpha = 0.06;
    const shimmer = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.3, h * 0.3, w * 0.5);
    shimmer.addColorStop(0, "#fff");
    shimmer.addColorStop(1, "transparent");
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t("scratch.here"), w / 2, h / 2);

    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(r + 6, 6);
    ctx.lineTo(w - r - 6, 6);
    ctx.arcTo(w - 6, 6, w - 6, r + 6, r);
    ctx.lineTo(w - 6, h - r - 6);
    ctx.arcTo(w - 6, h - 6, w - r - 6, h - 6, r);
    ctx.lineTo(r + 6, h - 6);
    ctx.arcTo(6, h - 6, 6, h - r - 6, r);
    ctx.lineTo(6, r + 6);
    ctx.arcTo(6, 6, r + 6, 6, r);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }, [revealed, colorInfo, t]);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  const scratchLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.lineWidth = 46;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const checkReveal = useCallback(() => {
    if (hasFired.current) return;
    checkCounter.current++;
    if (checkCounter.current % 3 !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let scratched = 0, total = 0;
    for (let i = 3; i < imageData.data.length; i += 64) {
      total++;
      if (imageData.data[i] < 128) scratched++;
    }
    if (total > 0 && scratched / total > 0.35) {
      hasFired.current = true;
      onScratched();
    }
  }, [onScratched]);

  const handleScratch = useCallback((clientX: number, clientY: number) => {
    if (revealed || hasFired.current) return;
    const pos = getCanvasPos(clientX, clientY);
    const prev = lastPoint.current || pos;
    scratchLine(prev, pos);
    lastPoint.current = pos;
    checkReveal();
  }, [revealed, getCanvasPos, scratchLine, checkReveal]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDrawing.current = true;
    lastPoint.current = getCanvasPos(clientX, clientY);
  }, [getCanvasPos]);

  const handleEnd = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ minHeight: 180 }}
    >
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center p-5 bg-gradient-to-br ${colorInfo.bg}`}
        style={{ background: revealed ? undefined : "white" }}
      >
        {revealed ? (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
              transition={{ duration: 0.6 }}
            >
              <Sparkles size={28} className="mx-auto mb-3 text-white/90" />
            </motion.div>
            <p className="text-white font-bold text-lg leading-snug">{card.hidden_message}</p>
            <p className="text-white/50 text-[11px] mt-3 font-medium uppercase tracking-wider">{card.title}</p>
          </motion.div>
        ) : (
          <div className="text-center px-4">
            <Gift size={32} className="mx-auto mb-2 text-warm-300/70" />
            <p className="text-warm-400 text-sm font-semibold">{card.title}</p>
            <p className="text-warm-300/80 text-[11px] mt-1">{t("scratch.reveal")}</p>
          </div>
        )}
      </div>
      {!revealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: "none", cursor: "grab" }}
          data-no-page-swipe="true"
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onMouseMove={(e) => { if (isDrawing.current) handleScratch(e.clientX, e.clientY); }}
          onTouchStart={(e) => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
          onTouchEnd={handleEnd}
          onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; handleScratch(t.clientX, t.clientY); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ───

export default function MinigamesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<string | null>(null);

  // Scratch cards state
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newColor, setNewColor] = useState("burnt");
  const [saving, setSaving] = useState(false);

  // Vouchers state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [showVoucherCreate, setShowVoucherCreate] = useState(false);
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDesc, setVoucherDesc] = useState("");
  const [voucherIcon, setVoucherIcon] = useState("ticket");
  const [voucherSaving, setVoucherSaving] = useState(false);

  // Partner name for De/Para labels
  const [partnerName, setPartnerName] = useState("");

  // Selected scratch card (expanded from stack)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  // Selected voucher (expanded from stack)
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);

  // Segmentation tab: "para_mi" (for me) or "de_mi" (from me)
  const [scratchTab, setScratchTab] = useState<"para_mi" | "de_mi">("para_mi");
  const [voucherTab, setVoucherTab] = useState<"para_mi" | "de_mi">("para_mi");

  useEffect(() => {
    api.get("/auth/partner").then((res) => setPartnerName(res.data.name)).catch(() => {});
  }, []);

  const loadCards = useCallback(() => {
    setCardsLoading(true);
    api.get("/scratch-cards").then((res) => { setCards(res.data); setCardsLoading(false); }).catch(() => setCardsLoading(false));
  }, []);

  const loadVouchers = useCallback(() => {
    setVouchersLoading(true);
    api.get("/vouchers").then((res) => { setVouchers(res.data); setVouchersLoading(false); }).catch(() => setVouchersLoading(false));
  }, []);

  const openGame = (key: string) => {
    setActiveGame(key);
    if (key === "scratch") loadCards();
    if (key === "vouchers") loadVouchers();
  };

  // Scratch card actions
  const createCard = async () => {
    if (!newTitle.trim() || !newMessage.trim()) return;
    setSaving(true);
    try {
      await api.post("/scratch-cards", { title: newTitle.trim(), hidden_message: newMessage.trim(), color: newColor });
      setNewTitle(""); setNewMessage(""); setNewColor("burnt"); setShowCreate(false); loadCards();
    } catch { /* */ }
    setSaving(false);
  };

  const scratchCard = async (cardId: number) => {
    try {
      const res = await api.post(`/scratch-cards/${cardId}/scratch`);
      setCards((prev) => prev.map((c) => (c.id === cardId ? res.data : c)));
    } catch { /* */ }
  };

  const deleteCard = async (cardId: number) => {
    try { await api.delete(`/scratch-cards/${cardId}`); loadCards(); } catch { /* */ }
  };

  // Voucher actions
  const createVoucher = async () => {
    if (!voucherTitle.trim()) return;
    setVoucherSaving(true);
    try {
      await api.post("/vouchers", { title: voucherTitle.trim(), description: voucherDesc.trim() || null, icon: voucherIcon });
      setVoucherTitle(""); setVoucherDesc(""); setVoucherIcon("ticket"); setShowVoucherCreate(false); loadVouchers();
    } catch { /* */ }
    setVoucherSaving(false);
  };

  const redeemVoucher = async (id: number) => {
    try {
      const res = await api.post(`/vouchers/${id}/redeem`);
      setVouchers((prev) => prev.map((v) => (v.id === id ? res.data : v)));
    } catch { /* */ }
  };

  const deleteVoucher = async (id: number) => {
    try { await api.delete(`/vouchers/${id}`); loadVouchers(); } catch { /* */ }
  };

  // ─── Menu Screen ───
  if (!activeGame) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-charcoal-500 flex items-center gap-2">
            <Gamepad2 size={24} className="text-burnt-300" />
            {t("games.title")}
          </h1>
          <p className="text-sm text-charcoal-300 mt-0.5">{t("games.desc")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GAMES.map((game) => {
            const GIcon = game.icon;
            return (
              <button
                key={game.key}
                onClick={() => openGame(game.key)}
                className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all text-left group border border-warm-200/30"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <GIcon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-charcoal-600">{t(game.label)}</p>
                    <p className="text-xs text-charcoal-300 mt-0.5">{t(game.desc)}</p>
                  </div>
                  <ChevronRight size={16} className="text-warm-300 mt-1 group-hover:text-sandy-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  const gameData = GAMES.find((g) => g.key === activeGame)!;
  const GameIcon = gameData.icon;

  // ─── Game Views ───
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveGame(null)}
          className="p-2 -ml-1 rounded-xl hover:bg-warm-100 transition-colors text-charcoal-400"
        >
          <ArrowLeft size={20} />
        </button>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gameData.color} flex items-center justify-center`}>
          <GameIcon size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold text-charcoal-500">{t(gameData.label)}</h1>
          <p className="text-xs text-charcoal-300">{t(gameData.desc)}</p>
        </div>
      </div>

      {/* ─── Scratch Cards Game ─── */}
      {activeGame === "scratch" && (() => {
        const forMe = cards.filter((c) => c.for_user_id === user?.id || (!c.for_user_id && c.created_by !== user?.id));
        const fromMe = cards.filter((c) => c.created_by === user?.id);
        const filtered = scratchTab === "para_mi" ? forMe : fromMe;
        return (
          <div className="space-y-5">
            {/* New card button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(!showCreate)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-sandy-200/60 dark:border-[#3a3f42] text-sandy-500 dark:text-amber-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-sandy-50/50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <Plus size={16} /> {t("scratch.new")}
            </motion.button>

            {/* Create form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] space-y-5">
                    {/* Form header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-400" />
                        <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t("scratch.new")}</span>
                      </div>
                      <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#8a8580] hover:bg-warm-100 dark:hover:bg-[#2e3335] transition-colors">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-sandy-50 dark:bg-[#2e3133] border border-sandy-200/30 dark:border-[#3a3f42]">
                      <Gift size={18} className="text-sandy-500 dark:text-amber-400 shrink-0" />
                      <p className="text-xs text-charcoal-500 dark:text-[#b0aaa4]">{t("scratch.partner.can")}</p>
                    </div>

                    {/* Title */}
                    <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={t("scratch.title.placeholder")} maxLength={200}
                      className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-sandy-200/50 dark:focus:ring-amber-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]" />

                    {/* Hidden message */}
                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t("scratch.message.placeholder")} maxLength={500} rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-sandy-200/50 dark:focus:ring-amber-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550] resize-none leading-relaxed" />

                    {/* Color selector */}
                    <div>
                      <p className="text-[11px] font-semibold text-charcoal-400 dark:text-[#9a9590] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Palette size={12} /> {t("scratch.color.label")}
                      </p>
                      <div className="flex gap-2.5 flex-wrap">
                        {Object.entries(CARD_COLORS).map(([key, val]) => (
                          <motion.button key={key} whileTap={{ scale: 0.9 }} onClick={() => setNewColor(key)}
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${val.bg} transition-all ${
                              newColor === key
                                ? "ring-2 ring-amber-400 dark:ring-amber-500 ring-offset-2 dark:ring-offset-[#1e2425] scale-110 shadow-lg"
                                : "opacity-70 hover:opacity-100 hover:scale-105 shadow-sm"
                            }`}
                            title={t(val.label)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Send button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={createCard}
                      disabled={saving || !newTitle.trim() || !newMessage.trim()}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-burnt-400 dark:from-burnt-400 dark:to-amber-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-burnt-300/20 dark:shadow-amber-600/15 flex items-center justify-center gap-2"
                    >
                      <Sparkles size={15} /> {saving ? t("creating") : t("scratch.create")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex bg-warm-100/80 dark:bg-[#252a2c] rounded-2xl p-1 gap-1">
              {(["para_mi", "de_mi"] as const).map((tab) => (
                <button key={tab} onClick={() => setScratchTab(tab)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    scratchTab === tab
                      ? "bg-white dark:bg-[#353a3c] text-sandy-500 dark:text-amber-400 shadow-sm"
                      : "text-charcoal-400 dark:text-[#8a8580] hover:text-charcoal-500 dark:hover:text-[#a5a09a]"
                  }`}
                >
                  {tab === "para_mi" ? t("scratch.for.you", { count: forMe.length }) : t("scratch.from.you", { count: fromMe.length })}
                </button>
              ))}
            </div>

            {cardsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-sandy-200 border-t-sandy-400 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-14">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
                  <Gift size={36} className="text-warm-400 dark:text-[#4a4440]" />
                </div>
                <p className="text-charcoal-400 dark:text-[#6e6862] text-sm font-medium">
                  {scratchTab === "para_mi" ? t("scratch.empty.for") : t("scratch.empty.from")}
                </p>
              </motion.div>
            ) : selectedCardId !== null && filtered.find((c) => c.id === selectedCardId) ? (() => {
              const card = filtered.find((c) => c.id === selectedCardId)!;
              const isForMe = card.for_user_id === user?.id || (!card.for_user_id && card.created_by !== user?.id);
              const isMine = card.created_by === user?.id;
              const colorInfo = CARD_COLORS[card.color] || CARD_COLORS.burnt;
              const isScratched = card.scratched_by !== null;

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative"
                >
                  {/* Back to stack */}
                  <button
                    onClick={() => setSelectedCardId(null)}
                    className="flex items-center gap-1.5 text-xs font-medium text-charcoal-400 dark:text-[#8a8580] mb-3 hover:text-burnt-400 transition-colors"
                  >
                    <ArrowLeft size={14} /> {t("scratch.back.stack")}
                  </button>

                  <div className="bg-white dark:bg-[#232829] rounded-3xl overflow-hidden shadow-elevated border border-warm-200/40 dark:border-[#3a3f42]">
                    <div className={`h-2 bg-gradient-to-r ${colorInfo.bg}`} />

                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorInfo.bg} flex items-center justify-center shadow-sm`}>
                            {isScratched ? <Sparkles size={14} className="text-white" /> : <Gift size={14} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{card.title}</p>
                            <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">
                              {new Date(card.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </div>
                        {isScratched && (
                          <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Check size={10} /> {t("scratch.revealed")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] mt-1">
                        <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.from")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{card.created_by === user?.id ? (user?.name || t("you")) : partnerName || t("partner")}</span></span>
                        <span className="text-charcoal-300 dark:text-[#6e6862]">{t("openwhen.for")}: <span className="font-semibold text-charcoal-500 dark:text-[#a39e98]">{card.created_by === user?.id ? partnerName || t("partner") : (user?.name || t("you"))}</span></span>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      {isForMe ? (
                        <ScratchCardCanvas card={card} onScratched={() => scratchCard(card.id)} />
                      ) : (
                        <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${colorInfo.bg}`} style={{ minHeight: 180 }}>
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-5">
                            {isScratched ? (
                              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-4">
                                <Sparkles size={28} className="mx-auto mb-3 text-white/90" />
                                <p className="text-white font-bold text-lg leading-snug">{card.hidden_message}</p>
                              </motion.div>
                            ) : (
                              <div className="text-center px-4">
                                <Gift size={32} className="mx-auto mb-2 text-white/50" />
                                <p className="text-white/70 text-sm font-medium">{t("scratch.waiting")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isMine && (
                    <button onClick={() => { deleteCard(card.id); setSelectedCardId(null); }}
                      className="absolute top-12 right-4 z-20 p-1.5 rounded-xl bg-white/90 dark:bg-[#2e3335]/90 text-charcoal-300 hover:text-red-400 hover:bg-white transition-colors shadow-sm backdrop-blur-sm">
                      <Trash2 size={13} />
                    </button>
                  )}
                </motion.div>
              );
            })() : (
              /* ── Stacked cards view ── */
              <div className="relative" style={{ minHeight: filtered.length === 1 ? 100 : Math.min(filtered.length * 72 + 40, 400) }}>
                {filtered.map((card, i) => {
                  const colorInfo = CARD_COLORS[card.color] || CARD_COLORS.burnt;
                  const isScratched = card.scratched_by !== null;
                  const total = filtered.length;
                  const offset = i * 68;

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{
                        opacity: 1,
                        y: offset,
                        scale: 1 - i * 0.01,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.05 }}
                      whileHover={{ y: offset - 8, scale: 1, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCardId(card.id)}
                      className="absolute left-0 right-0 cursor-pointer"
                      style={{ zIndex: total - i }}
                    >
                      <div className="bg-white dark:bg-[#232829] rounded-2xl overflow-hidden shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] hover:border-burnt-200/60 dark:hover:border-burnt-500/30 transition-colors">
                        <div className={`h-1.5 bg-gradient-to-r ${colorInfo.bg}`} />
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorInfo.bg} flex items-center justify-center shadow-sm shrink-0`}>
                            {isScratched ? <Sparkles size={16} className="text-white" /> : <Gift size={16} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5] truncate">{card.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">
                                {card.created_by === user?.id ? (user?.name || t("you")) : partnerName || t("partner")}
                              </p>
                              <span className="text-[8px] text-charcoal-200 dark:text-[#4a4440]">•</span>
                              <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">
                                {new Date(card.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </div>
                          {isScratched ? (
                            <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md shrink-0">
                              {t("scratch.revealed")}
                            </span>
                          ) : (
                            <ChevronRight size={16} className="text-warm-300 dark:text-[#4a4440] shrink-0" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Vouchers Game ─── */}
      {activeGame === "vouchers" && (() => {
        const forMe = vouchers.filter((v) => v.for_user_id === user?.id || (!v.for_user_id && v.created_by !== user?.id));
        const fromMe = vouchers.filter((v) => v.created_by === user?.id);
        const filtered = voucherTab === "para_mi" ? forMe : fromMe;
        return (
          <div className="space-y-5">
            {/* New voucher button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowVoucherCreate(!showVoucherCreate)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-burnt-200/60 dark:border-[#3a3f42] text-burnt-400 dark:text-burnt-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-burnt-50/50 dark:hover:bg-burnt-900/10 transition-colors"
            >
              <Plus size={16} /> {t("voucher.new")}
            </motion.button>

            {/* Create form */}
            <AnimatePresence>
              {showVoucherCreate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="bg-white dark:bg-[#232829] rounded-3xl p-5 shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] space-y-5">
                    {/* Form header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket size={16} className="text-burnt-400" />
                        <span className="text-sm font-bold text-charcoal-600 dark:text-[#e4ddd5]">{t("voucher.new")}</span>
                      </div>
                      <button onClick={() => setShowVoucherCreate(false)} className="p-1.5 rounded-lg text-charcoal-300 dark:text-[#8a8580] hover:bg-warm-100 dark:hover:bg-[#2e3335] transition-colors">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-burnt-50 dark:bg-[#2e3133] border border-burnt-100/30 dark:border-[#3a3f42]">
                      <Gift size={18} className="text-burnt-400 shrink-0" />
                      <p className="text-xs text-charcoal-500 dark:text-[#b0aaa4]">{t("voucher.partner.can")}</p>
                    </div>

                    {/* Title */}
                    <input type="text" value={voucherTitle} onChange={(e) => setVoucherTitle(e.target.value)}
                      placeholder={t("voucher.title.placeholder")} maxLength={200}
                      className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]" />

                    {/* Description */}
                    <input type="text" value={voucherDesc} onChange={(e) => setVoucherDesc(e.target.value)}
                      placeholder={t("voucher.desc.placeholder")} maxLength={300}
                      className="w-full px-4 py-3 rounded-2xl bg-warm-50/80 dark:bg-[#252a2c] border border-warm-200/60 dark:border-[#3a3f42] text-sm focus:outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-500/30 text-charcoal-600 dark:text-[#e4ddd5] placeholder:text-warm-400 dark:placeholder:text-[#5a5550]" />

                    {/* Icon selector */}
                    <div>
                      <p className="text-[11px] font-semibold text-charcoal-400 dark:text-[#9a9590] uppercase tracking-wider mb-2.5">{t("voucher.icon.label")}</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(VOUCHER_ICONS).map(([key, VIcon]) => (
                          <motion.button key={key} whileTap={{ scale: 0.9 }} onClick={() => setVoucherIcon(key)}
                            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all text-xs ${
                              voucherIcon === key
                                ? "bg-burnt-50 dark:bg-burnt-900/25 text-burnt-400 ring-2 ring-burnt-200 dark:ring-burnt-500/40 shadow-sm"
                                : "text-charcoal-300 dark:text-[#7a7570] hover:bg-warm-50 dark:hover:bg-[#2e3335] hover:text-charcoal-400"
                            }`}>
                            <VIcon size={18} />
                            <span className="text-[9px] font-medium">{t(VOUCHER_ICON_LABELS[key])}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Create button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={createVoucher}
                      disabled={voucherSaving || !voucherTitle.trim()}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-burnt-300 to-burnt-400 dark:from-burnt-400 dark:to-burnt-500 text-white text-sm font-bold disabled:opacity-40 shadow-lg shadow-burnt-200/30 dark:shadow-burnt-600/15 flex items-center justify-center gap-2"
                    >
                      <Ticket size={15} /> {voucherSaving ? t("creating") : t("voucher.create")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex bg-warm-100/80 dark:bg-[#252a2c] rounded-2xl p-1 gap-1">
              {(["para_mi", "de_mi"] as const).map((tab) => (
                <button key={tab} onClick={() => setVoucherTab(tab)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    voucherTab === tab
                      ? "bg-white dark:bg-[#353a3c] text-burnt-400 dark:text-burnt-300 shadow-sm"
                      : "text-charcoal-400 dark:text-[#8a8580] hover:text-charcoal-500 dark:hover:text-[#a5a09a]"
                  }`}
                >
                  {tab === "para_mi" ? t("scratch.for.you", { count: forMe.length }) : t("scratch.from.you", { count: fromMe.length })}
                </button>
              ))}
            </div>

            {vouchersLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-14">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
                  <Ticket size={36} className="text-warm-400 dark:text-[#4a4440]" />
                </div>
                <p className="text-charcoal-400 dark:text-[#6e6862] text-sm font-medium">
                  {voucherTab === "para_mi" ? t("voucher.empty.for") : t("voucher.empty.from")}
                </p>
              </motion.div>
            ) : selectedVoucherId !== null && filtered.find((v) => v.id === selectedVoucherId) ? (() => {
              const voucher = filtered.find((v) => v.id === selectedVoucherId)!;
              return (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <button
                    onClick={() => setSelectedVoucherId(null)}
                    className="flex items-center gap-1.5 text-xs font-medium text-charcoal-400 dark:text-[#8a8580] mb-3 hover:text-burnt-400 transition-colors"
                  >
                    <ArrowLeft size={14} /> {t("voucher.back.stack")}
                  </button>
                  <VoucherCard
                    voucher={voucher}
                    isForMe={voucher.for_user_id === user?.id || (!voucher.for_user_id && voucher.created_by !== user?.id)}
                    isMine={voucher.created_by === user?.id}
                    authorName={voucher.created_by === user?.id ? (user?.name || t("you")) : partnerName || t("partner")}
                    recipientName={voucher.created_by === user?.id ? partnerName || t("partner") : (user?.name || t("you"))}
                    onRedeem={() => { redeemVoucher(voucher.id); }}
                    onDelete={() => { deleteVoucher(voucher.id); setSelectedVoucherId(null); }}
                  />
                </motion.div>
              );
            })() : (
              /* ── Stacked vouchers view ── */
              <div className="relative" style={{ minHeight: filtered.length === 1 ? 100 : Math.min(filtered.length * 72 + 40, 400) }}>
                {filtered.map((voucher, i) => {
                  const redeemed = voucher.redeemed_by !== null;
                  const VIcon = VOUCHER_ICONS[voucher.icon] || Ticket;
                  const total = filtered.length;
                  const offset = i * 68;

                  return (
                    <motion.div
                      key={voucher.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{
                        opacity: 1,
                        y: offset,
                        scale: 1 - i * 0.01,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.05 }}
                      whileHover={{ y: offset - 8, scale: 1, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedVoucherId(voucher.id)}
                      className="absolute left-0 right-0 cursor-pointer"
                      style={{ zIndex: total - i }}
                    >
                      <div className={`bg-white dark:bg-[#232829] rounded-2xl overflow-hidden shadow-elevated border border-warm-200/40 dark:border-[#3a3f42] hover:border-burnt-200/60 dark:hover:border-burnt-500/30 transition-colors ${redeemed ? "opacity-50" : ""}`}>
                        <div className="h-1.5 bg-gradient-to-r from-burnt-300 to-burnt-400" />
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                            redeemed
                              ? "bg-warm-100 dark:bg-[#2e3335]"
                              : "bg-gradient-to-br from-burnt-100 to-sandy-100 dark:from-burnt-900/30 dark:to-sandy-900/30"
                          }`}>
                            <VIcon size={18} className={redeemed ? "text-warm-400 dark:text-[#6e6862]" : "text-burnt-400"} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${redeemed ? "text-charcoal-300 dark:text-[#6e6862] line-through" : "text-charcoal-600 dark:text-[#e4ddd5]"}`}>
                              {voucher.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">
                                {voucher.created_by === user?.id ? (user?.name || t("you")) : partnerName || t("partner")}
                              </p>
                              <span className="text-[8px] text-charcoal-200 dark:text-[#4a4440]">•</span>
                              <p className="text-[10px] text-charcoal-300 dark:text-[#6e6862]">
                                {new Date(voucher.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </div>
                          {redeemed ? (
                            <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                              <Check size={9} /> {t("used")}
                            </span>
                          ) : (
                            <ChevronRight size={16} className="text-warm-300 dark:text-[#4a4440] shrink-0" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── Truth or Dare ─── */}
      {activeGame === "truthordare" && <TruthOrDareGame />}

      {/* ─── Spinner ─── */}
      {activeGame === "spinner" && <SpinnerGame />}

      {/* ─── Open When ─── */}
      {activeGame === "openwhen" && <OpenWhenGame />}

      {/* ─── Love Jar ─── */}
      {activeGame === "lovejar" && <LoveJarGame />}

      {/* ─── Countdown ─── */}
      {activeGame === "countdown" && <CountdownGame />}

      {/* ─── Bingo ─── */}
      {activeGame === "bingo" && <BingoGame />}

      {/* ─── Who's Most Likely ─── */}
      {activeGame === "whosmostlikely" && <WhosMostLikelyGame />}

      {/* ─── Movie Picker ─── */}
      {activeGame === "moviepicker" && <MoviePickerGame />}
      {activeGame === "songpicker" && <SongPickerGame />}
    </motion.div>
  );
}
