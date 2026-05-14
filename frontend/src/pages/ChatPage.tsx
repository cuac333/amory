import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import api from "../services/api";
import type { ChatMessage } from "../types";
import { ClickableImage } from "../components/shared/ImageViewer";
import {
  Send, Image, Reply, Pin, Smile, Trash2, X,
  ChevronDown, PinOff, Heart, MessageCircle,
  Search, ArrowLeft, Camera, Check, CheckCheck,
  MoreVertical, Copy, BookmarkPlus, Sticker, Plus, ImagePlus,
} from "lucide-react";

const REACTION_EMOJIS = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE0D", "\uD83D\uDE22", "\uD83D\uDD25", "\uD83D\uDC4F", "\uD83E\uDD7A", "\uD83D\uDE2E"];
const POLL_INTERVAL = 3000;

/* ── Sticker packs ── */
interface StickerDef { id: string; emoji: string; label: string; }
interface StickerPack { id: string; name: string; icon: string; stickers: StickerDef[]; }

const STICKER_PACKS: StickerPack[] = [
  {
    id: "love", name: "\u7231\u60C5", icon: "\u2764\uFE0F",
    stickers: [
      { id: "heart-eyes", emoji: "\uD83D\uDE0D", label: "\u604B\u7231\u4E2D" },
      { id: "kiss", emoji: "\uD83D\uDE18", label: "\u4EB2\u4EB2" },
      { id: "hearts", emoji: "\uD83E\uDD70", label: "\u7231\u5FC3" },
      { id: "hug", emoji: "\uD83E\uDD17", label: "\u62E5\u62B1" },
      { id: "couple-heart", emoji: "\uD83D\uDC91", label: "\u60C5\u4FA3" },
      { id: "love-letter", emoji: "\uD83D\uDC8C", label: "\u60C5\u4E66" },
      { id: "heart-grow", emoji: "\uD83D\uDC97", label: "\u5FC3\u52A8" },
      { id: "two-hearts", emoji: "\uD83D\uDC95", label: "\u53CC\u7231\u5FC3" },
      { id: "cupid", emoji: "\uD83D\uDC98", label: "\u4E18\u6BD4\u7279" },
      { id: "sparkle-heart", emoji: "\uD83D\uDC96", label: "\u95EA\u4EAE" },
      { id: "revolving", emoji: "\uD83D\uDC9E", label: "\u65CB\u8F6C" },
      { id: "kiss-mark", emoji: "\uD83D\uDC8B", label: "\u5507\u5370" },
    ],
  },
  {
    id: "feelings", name: "情感", icon: "\uD83E\uDD79",
    stickers: [
      { id: "happy", emoji: "\uD83D\uDE04", label: "开心" },
      { id: "laugh-cry", emoji: "\uD83D\uDE02", label: "笑哭" },
      { id: "wink", emoji: "\uD83D\uDE09", label: "眨眼" },
      { id: "tongue", emoji: "\uD83D\uDE1C", label: "吐舌" },
      { id: "cool", emoji: "\uD83D\uDE0E", label: "酷" },
      { id: "shy", emoji: "\uD83D\uDE33", label: "害羞" },
      { id: "cry", emoji: "\uD83D\uDE2D", label: "哭泣" },
      { id: "angry", emoji: "\uD83D\uDE24", label: "生气" },
      { id: "thinking", emoji: "\uD83E\uDD14", label: "思考" },
      { id: "surprise", emoji: "\uD83D\uDE31", label: "惊讶" },
      { id: "sleepy", emoji: "\uD83D\uDE34", label: "睡觉" },
      { id: "sick", emoji: "\uD83E\uDD12", label: "生病" },
    ],
  },
  {
    id: "cute", name: "可爱", icon: "\uD83E\uDEF6",
    stickers: [
      { id: "pleading", emoji: "\uD83E\uDD7A", label: "求求了" },
      { id: "puppy", emoji: "\uD83D\uDC36", label: "小狗" },
      { id: "kitty", emoji: "\uD83D\uDE3B", label: "小猫" },
      { id: "bunny", emoji: "\uD83D\uDC30", label: "小兔" },
      { id: "bear", emoji: "\uD83D\uDC3B", label: "小熊" },
      { id: "panda", emoji: "\uD83D\uDC3C", label: "熊猫" },
      { id: "flower", emoji: "\uD83C\uDF38", label: "花朵" },
      { id: "bouquet", emoji: "\uD83D\uDC90", label: "花束" },
      { id: "star-eyes", emoji: "\uD83E\uDD29", label: "小星星" },
      { id: "rainbow", emoji: "\uD83C\uDF08", label: "彩虹" },
      { id: "butterfly", emoji: "\uD83E\uDD8B", label: "蝴蝶" },
      { id: "sparkles", emoji: "\u2728", label: "闪光" },
    ],
  },
  {
    id: "gestures", name: "动作", icon: "\uD83D\uDC4B",
    stickers: [
      { id: "thumbs-up", emoji: "\uD83D\uDC4D", label: "赞" },
      { id: "clap", emoji: "\uD83D\uDC4F", label: "鼓掌" },
      { id: "wave", emoji: "\uD83D\uDC4B", label: "你好" },
      { id: "pray", emoji: "\uD83D\uDE4F", label: "谢谢" },
      { id: "muscle", emoji: "\uD83D\uDCAA", label: "加油" },
      { id: "pinch", emoji: "\uD83E\uDD0F", label: "一点点" },
      { id: "heart-hands", emoji: "\uD83E\uDEF6", label: "比心" },
      { id: "fist", emoji: "\uD83D\uDC4A", label: "拳头" },
      { id: "peace", emoji: "\u270C\uFE0F", label: "和平" },
      { id: "ok", emoji: "\uD83D\uDC4C", label: "好的" },
      { id: "point-up", emoji: "\u261D\uFE0F", label: "指向" },
      { id: "shush", emoji: "\uD83E\uDD2B", label: "嘘" },
    ],
  },
  {
    id: "food", name: "美食", icon: "\uD83C\uDF55",
    stickers: [
      { id: "pizza", emoji: "\uD83C\uDF55", label: "披萨" },
      { id: "coffee", emoji: "\u2615", label: "咖啡" },
      { id: "cake", emoji: "\uD83C\uDF82", label: "蛋糕" },
      { id: "ice-cream", emoji: "\uD83C\uDF66", label: "冰淇淋" },
      { id: "taco", emoji: "\uD83C\uDF2E", label: "墨西哥卷" },
      { id: "sushi", emoji: "\uD83C\uDF63", label: "寿司" },
      { id: "wine", emoji: "\uD83C\uDF77", label: "红酒" },
      { id: "beer", emoji: "\uD83C\uDF7B", label: "啤酒" },
      { id: "chocolate", emoji: "\uD83C\uDF6B", label: "巧克力" },
      { id: "popcorn", emoji: "\uD83C\uDF7F", label: "爆米花" },
      { id: "donut", emoji: "\uD83C\uDF69", label: "甜甜圈" },
      { id: "cookie", emoji: "\uD83C\uDF6A", label: "饼干" },
    ],
  },
  {
    id: "fun", name: "娱乐", icon: "\uD83C\uDF89",
    stickers: [
      { id: "party", emoji: "\uD83C\uDF89", label: "派对" },
      { id: "fire", emoji: "\uD83D\uDD25", label: "火焰" },
      { id: "100", emoji: "\uD83D\uDCAF", label: "满分" },
      { id: "crown", emoji: "\uD83D\uDC51", label: "皇冠" },
      { id: "gem", emoji: "\uD83D\uDC8E", label: "宝石" },
      { id: "rocket", emoji: "\uD83D\uDE80", label: "火箭" },
      { id: "star", emoji: "\u2B50", label: "星星" },
      { id: "moon", emoji: "\uD83C\uDF19", label: "月亮" },
      { id: "sun", emoji: "\u2600\uFE0F", label: "太阳" },
      { id: "music", emoji: "\uD83C\uDFB5", label: "音乐" },
      { id: "ghost", emoji: "\uD83D\uDC7B", label: "幽灵" },
      { id: "dice", emoji: "\uD83C\uDFB2", label: "骰子" },
    ],
  },
];

const isSticker = (text: string | null) => (text?.startsWith("[sticker:") || text?.startsWith("[custom-sticker:")) && text?.endsWith("]");
const isCustomSticker = (text: string | null) => text?.startsWith("[custom-sticker:") && text?.endsWith("]");
const getCustomStickerUrl = (text: string): string | null => {
  const match = text.match(/\[custom-sticker:(.+?)\]/);
  return match ? match[1] : null;
};
const getStickerEmoji = (text: string): string | null => {
  const match = text.match(/\[sticker:(.+?):(.+?)\]/);
  if (!match) return null;
  const [, packId, stickerId] = match;
  const pack = STICKER_PACKS.find(p => p.id === packId);
  return pack?.stickers.find(s => s.id === stickerId)?.emoji || null;
};

export default function ChatPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showReactions, setShowReactions] = useState<number | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeMsg, setActiveMsg] = useState<number | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [activeStickerPack, setActiveStickerPack] = useState("love");
  const [customStickers, setCustomStickers] = useState<{id: number; name: string; image_url: string; pack_name: string}[]>([]);
  const stickerFileRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const latestIdRef = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const loadMessages = useCallback(async (initial = false) => {
    try {
      const res = await api.get("/chat/messages", { params: { limit: 50 } });
      const msgs: ChatMessage[] = res.data;
      if (initial || msgs.length === 0) {
        setMessages(msgs);
        latestIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
        setTimeout(() => scrollToBottom(false), 50);
      } else {
        const newLatestId = msgs[msgs.length - 1]?.id || 0;
        if (newLatestId > latestIdRef.current) {
          setMessages(msgs);
          latestIdRef.current = newLatestId;
          if (chatRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
            if (scrollHeight - scrollTop - clientHeight < 150) {
              setTimeout(() => scrollToBottom(), 50);
            }
          }
        }
      }
    } catch {}
  }, []);

  const loadPinned = useCallback(async () => {
    try {
      const res = await api.get("/chat/messages", { params: { pinned_only: true, limit: 50 } });
      setPinnedMessages(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadMessages(true);
    loadPinned();
    const interval = setInterval(() => loadMessages(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadMessages, loadPinned]);

  const loadOlder = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const res = await api.get("/chat/messages", {
        params: { limit: 50, before_id: messages[0].id },
      });
      const older: ChatMessage[] = res.data;
      if (older.length < 50) setHasMore(false);
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
    } catch {}
    setLoadingMore(false);
  };

  const handleScroll = () => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
    if (scrollTop < 50 && hasMore && !loadingMore) {
      loadOlder();
    }
  };

  const sendText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post("/chat/messages", {
        text: text.trim(),
        reply_to_id: replyTo?.id || null,
      });
      setText("");
      setReplyTo(null);
      await loadMessages();
      setTimeout(() => scrollToBottom(), 100);
    } catch {}
    setSending(false);
    inputRef.current?.focus();
  };

  const sendImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/chat/messages/upload-image", fd);
      await loadMessages();
      setTimeout(() => scrollToBottom(), 100);
    } catch {}
  };

  const sendSticker = async (packId: string, stickerId: string) => {
    setSending(true);
    try {
      await api.post("/chat/messages", {
        text: `[sticker:${packId}:${stickerId}]`,
        reply_to_id: replyTo?.id || null,
      });
      setReplyTo(null);
      setShowStickers(false);
      await loadMessages();
      setTimeout(() => scrollToBottom(), 100);
    } catch {}
    setSending(false);
  };

  // ── Custom stickers ──
  const loadCustomStickers = useCallback(async () => {
    try {
      const res = await api.get("/chat/stickers");
      setCustomStickers(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadCustomStickers(); }, [loadCustomStickers]);

  const uploadCustomSticker = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/chat/stickers?name=" + encodeURIComponent(file.name.replace(/\.[^.]+$/, "")), fd);
      await loadCustomStickers();
    } catch {}
  };

  const sendCustomSticker = async (imageUrl: string) => {
    setSending(true);
    try {
      await api.post("/chat/messages", {
        text: `[custom-sticker:${imageUrl}]`,
        reply_to_id: replyTo?.id || null,
      });
      setReplyTo(null);
      setShowStickers(false);
      await loadMessages();
      setTimeout(() => scrollToBottom(), 100);
    } catch {}
    setSending(false);
  };

  const deleteCustomSticker = async (id: number) => {
    try {
      await api.delete(`/chat/stickers/${id}`);
      await loadCustomStickers();
    } catch {}
  };

  const handleImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url });
  };

  const confirmImageSend = async () => {
    if (!imagePreview) return;
    setSending(true);
    await sendImage(imagePreview.file);
    URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setSending(false);
  };

  const cancelImagePreview = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    }
  };

  const toggleReaction = async (msgId: number, emoji: string) => {
    try {
      const res = await api.post(`/chat/messages/${msgId}/react`, { emoji });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? res.data : m)));
    } catch {}
    setShowReactions(null);
    setActiveMsg(null);
  };

  const togglePin = async (msgId: number) => {
    try {
      const res = await api.post(`/chat/messages/${msgId}/pin`);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? res.data : m)));
      loadPinned();
    } catch {}
    setActiveMsg(null);
  };

  const deleteMsg = async (msgId: number) => {
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch {}
    setActiveMsg(null);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMsg(null);
  };

  // Long press for mobile
  const handleTouchStart = (msgId: number) => {
    longPressTimer.current = setTimeout(() => {
      setActiveMsg(msgId);
      setShowReactions(null);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t("today");
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t("yesterday");
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const date = new Date(msg.created_at).toDateString();
    if (date !== lastDate) {
      groupedMessages.push({ date: msg.created_at, messages: [msg] });
      lastDate = date;
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  // Search filtering
  const filteredGroups = searchQuery.trim()
    ? groupedMessages
        .map((g) => ({
          ...g,
          messages: g.messages.filter(
            (m) =>
              m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.sender_name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.messages.length > 0)
    : groupedMessages;

  const isMe = (senderId: number) => senderId === user?.id;
  const pinnedCount = pinnedMessages.length;

  // Partner name from messages
  const partnerName =
    messages.find((m) => m.sender_id !== user?.id)?.sender_name || t("chat.partner");

  return (
    <div className="flex flex-col h-[calc(100vh-88px)] md:h-[calc(100vh-92px)] max-w-3xl mx-auto relative -mb-20 md:-mb-10">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/80 dark:bg-charcoal-800/80 backdrop-blur-md border-b border-warm-200/30 dark:border-charcoal-700/50">
        {searchMode ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-1"
          >
            <button
              onClick={() => { setSearchMode(false); setSearchQuery(""); }}
              className="p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
            >
              <ArrowLeft size={18} className="text-charcoal-500 dark:text-warm-300" />
            </button>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("chat.search.placeholder")}
              autoFocus
              className="flex-1 px-3 py-2 bg-warm-50 dark:bg-charcoal-700 border border-warm-200/40 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-400"
            />
          </motion.div>
        ) : (
          <>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center shadow-soft">
                <Heart size={16} className="text-white fill-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-charcoal-800" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">
                {partnerName}
              </h1>
              <p className="text-[10px] text-charcoal-400 dark:text-charcoal-400">
                {t("chat.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {pinnedCount > 0 && (
                <button
                  onClick={() => setShowPinned(!showPinned)}
                  className={`p-2 rounded-xl transition-colors relative ${
                    showPinned
                      ? "bg-burnt-100/60 dark:bg-burnt-400/10"
                      : "hover:bg-warm-100 dark:hover:bg-charcoal-700"
                  }`}
                >
                  <Pin size={16} className={showPinned ? "text-burnt-400" : "text-charcoal-400 dark:text-charcoal-400"} />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-burnt-400 text-white text-[8px] font-bold flex items-center justify-center">
                    {pinnedCount}
                  </span>
                </button>
              )}
              <button
                onClick={() => { setSearchMode(true); setTimeout(() => searchRef.current?.focus(), 100); }}
                className="p-2 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
              >
                <Search size={16} className="text-charcoal-400 dark:text-charcoal-400" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Pinned messages panel ── */}
      <AnimatePresence>
        {showPinned && pinnedCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-warm-200/30 dark:border-charcoal-700/50 bg-burnt-50/30 dark:bg-burnt-400/5"
          >
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Pin size={12} className="text-burnt-400" />
                <span className="text-[10px] font-semibold text-burnt-500 dark:text-burnt-300 uppercase tracking-wide">
                  {t("chat.pinned")} ({pinnedCount})
                </span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {pinnedMessages.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-charcoal-800/60 cursor-pointer hover:bg-white dark:hover:bg-charcoal-700 transition-colors"
                  >
                    <BookmarkPlus size={10} className="text-burnt-400 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-burnt-400">{pm.sender_name}</p>
                      <p className="text-xs text-charcoal-600 dark:text-warm-300 truncate">
                        {pm.text || t("chat.photo")}
                      </p>
                    </div>
                    <span className="text-[9px] text-charcoal-300 dark:text-charcoal-500 shrink-0">
                      {formatTime(pm.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages area ── */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        onClick={() => { setActiveMsg(null); setShowReactions(null); }}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-warm-50/30 dark:bg-charcoal-900/30"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(201,138,97,0.03) 0%, transparent 70%)" }}
      >
        {loadingMore && (
          <div className="text-center py-3">
            <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {filteredGroups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="h-px flex-1 bg-warm-200/30 dark:bg-charcoal-700/40" />
              <span className="px-3 py-1 bg-white dark:bg-charcoal-800 rounded-full text-[10px] font-medium text-charcoal-400 dark:text-charcoal-400 shadow-sm border border-warm-200/20 dark:border-charcoal-700/40 mx-3">
                {formatDate(group.date)}
              </span>
              <div className="h-px flex-1 bg-warm-200/30 dark:bg-charcoal-700/40" />
            </div>

            {group.messages.map((msg, i) => {
              const me = isMe(msg.sender_id);
              const prev = i > 0 ? group.messages[i - 1] : null;
              const consecutive = prev && prev.sender_id === msg.sender_id;
              const isActive = activeMsg === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${me ? "justify-end" : "justify-start"} ${consecutive ? "mt-0.5" : "mt-3"}`}
                >
                  {/* Partner avatar */}
                  {!me && !consecutive && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sandy-200 to-warm-300 flex items-center justify-center mr-1.5 mt-auto mb-1 shrink-0 shadow-sm">
                      <span className="text-[9px] font-bold text-white">
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {!me && consecutive && <div className="w-7 mr-1.5 shrink-0" />}

                  <div
                    className={`max-w-[78%] md:max-w-[60%] relative select-none`}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onContextMenu={(e) => { e.preventDefault(); setActiveMsg(msg.id); }}
                  >
                    {/* Sender name */}
                    {!me && !consecutive && (
                      <p className="text-[10px] font-semibold text-burnt-400 dark:text-burnt-300 mb-0.5 ml-1">
                        {msg.sender_name}
                      </p>
                    )}

                    {/* Reply preview */}
                    {msg.reply_preview && (
                      <div
                        className={`mx-1 mb-0.5 px-3 py-1.5 rounded-xl text-[10px] border-l-2 ${
                          me
                            ? "bg-white/10 border-white/40 text-white/80"
                            : "bg-warm-100/60 dark:bg-charcoal-700/60 border-burnt-300/60 text-charcoal-500 dark:text-warm-300"
                        }`}
                      >
                        <Reply size={8} className="inline mr-1 opacity-60" />
                        {msg.reply_preview}
                      </div>
                    )}

                    {/* Bubble */}
                    {isSticker(msg.text) ? (
                      /* Sticker — no bubble, just big emoji */
                      <div className="relative py-1">
                        {msg.pinned && (
                          <div className={`absolute -top-1.5 ${me ? "-left-1" : "-right-1"} z-10`}>
                            <div className="w-4 h-4 rounded-full bg-burnt-400 flex items-center justify-center shadow-sm">
                              <Pin size={8} className="text-white" />
                            </div>
                          </div>
                        )}
                        {isCustomSticker(msg.text) ? (
                          <img
                            src={getCustomStickerUrl(msg.text!) || ""}
                            alt="sticker"
                            className="w-28 h-28 object-contain drop-shadow-lg"
                          />
                        ) : (
                          <span className="text-7xl leading-none block drop-shadow-lg">
                            {getStickerEmoji(msg.text!) || msg.text}
                          </span>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${me ? "justify-end" : ""}`}>
                          <p className="text-[9px] text-charcoal-300 dark:text-charcoal-500">
                            {formatTime(msg.created_at)}
                          </p>
                          {me && <CheckCheck size={10} className="text-charcoal-300 dark:text-charcoal-500" />}
                        </div>
                      </div>
                    ) : (
                    <div
                      className={`px-3.5 py-2 relative transition-all ${
                        me
                          ? `bg-gradient-to-br from-burnt-400 to-burnt-300 text-white shadow-sm ${
                              consecutive ? "rounded-2xl rounded-tr-lg" : "rounded-2xl rounded-tr-sm"
                            }`
                          : `bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-warm-200 border border-warm-200/30 dark:border-charcoal-700/50 shadow-sm ${
                              consecutive ? "rounded-2xl rounded-tl-lg" : "rounded-2xl rounded-tl-sm"
                            }`
                      } ${isActive ? "ring-2 ring-burnt-300/50 dark:ring-burnt-400/50" : ""}`}
                    >
                      {msg.pinned && (
                        <div className={`absolute -top-1.5 ${me ? "-left-1" : "-right-1"}`}>
                          <div className="w-4 h-4 rounded-full bg-burnt-400 flex items-center justify-center shadow-sm">
                            <Pin size={8} className="text-white" />
                          </div>
                        </div>
                      )}

                      {msg.image_url && (
                        <ClickableImage
                          src={msg.image_url}
                          alt=""
                          className="rounded-xl max-w-full max-h-64 object-cover mb-1.5"
                        />
                      )}

                      {msg.text && (
                        <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                          {searchQuery && msg.text ? highlightSearch(msg.text, searchQuery) : msg.text}
                        </p>
                      )}

                      <div className={`flex items-center gap-1 mt-1 ${me ? "justify-end" : ""}`}>
                        <p className={`text-[9px] ${me ? "text-white/50" : "text-charcoal-300 dark:text-charcoal-500"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                        {me && (
                          <CheckCheck size={10} className="text-white/50" />
                        )}
                      </div>
                    </div>
                    )}

                    {/* Reactions display */}
                    {Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${me ? "justify-end" : "justify-start"} mx-1`}>
                        {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] border transition-all hover:scale-105 ${
                              userIds.includes(user?.id || 0)
                                ? "bg-burnt-50 dark:bg-burnt-400/10 border-burnt-200 dark:border-burnt-400/30 shadow-sm"
                                : "bg-white dark:bg-charcoal-800 border-warm-200/40 dark:border-charcoal-700"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[9px] font-medium text-charcoal-400 dark:text-charcoal-400">
                              {userIds.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Action menu (long-press / right-click) ── */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 8 }}
                          transition={{ type: "spring", damping: 25, stiffness: 400 }}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute ${me ? "right-0" : "left-0"} -bottom-2 translate-y-full z-30 bg-white dark:bg-charcoal-800 rounded-2xl shadow-elevated border border-warm-200/30 dark:border-charcoal-700/50 overflow-hidden min-w-[160px]`}
                        >
                          {/* Quick reactions row */}
                          <div className="flex gap-0.5 p-2 border-b border-warm-200/20 dark:border-charcoal-700/40">
                            {REACTION_EMOJIS.slice(0, 6).map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="w-8 h-8 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 flex items-center justify-center text-base transition-all hover:scale-110 active:scale-95"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          {/* Actions */}
                          <div className="py-1">
                            <button
                              onClick={() => { setReplyTo(msg); setActiveMsg(null); inputRef.current?.focus(); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors"
                            >
                              <Reply size={14} className="text-charcoal-400 dark:text-charcoal-400" />
                              <span className="text-xs text-charcoal-600 dark:text-warm-300">{t("chat.action.reply")}</span>
                            </button>
                            {msg.text && (
                              <button
                                onClick={() => copyText(msg.text!)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors"
                              >
                                <Copy size={14} className="text-charcoal-400 dark:text-charcoal-400" />
                                <span className="text-xs text-charcoal-600 dark:text-warm-300">{t("chat.action.copy")}</span>
                              </button>
                            )}
                            <button
                              onClick={() => togglePin(msg.id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors"
                            >
                              {msg.pinned ? (
                                <>
                                  <PinOff size={14} className="text-burnt-400" />
                                  <span className="text-xs text-burnt-500 dark:text-burnt-300">{t("chat.action.unpin")}</span>
                                </>
                              ) : (
                                <>
                                  <Pin size={14} className="text-charcoal-400 dark:text-charcoal-400" />
                                  <span className="text-xs text-charcoal-600 dark:text-warm-300">{t("chat.action.pin")}</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => { setShowReactions(msg.id); setActiveMsg(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors"
                            >
                              <Smile size={14} className="text-charcoal-400 dark:text-charcoal-400" />
                              <span className="text-xs text-charcoal-600 dark:text-warm-300">{t("chat.action.react")}</span>
                            </button>
                            {me && (
                              <button
                                onClick={() => deleteMsg(msg.id)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                              >
                                <Trash2 size={14} className="text-red-400" />
                                <span className="text-xs text-red-500">{t("delete")}</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Full reaction picker */}
                    <AnimatePresence>
                      {showReactions === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute ${me ? "right-0" : "left-0"} -top-12 z-30 flex gap-0.5 bg-white dark:bg-charcoal-800 rounded-2xl shadow-elevated border border-warm-200/30 dark:border-charcoal-700/50 p-1.5`}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="w-8 h-8 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 flex items-center justify-center text-base transition-all hover:scale-110 active:scale-95"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Own avatar */}
                  {me && !consecutive && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-burnt-300 to-burnt-400 flex items-center justify-center ml-1.5 mt-auto mb-1 shrink-0 shadow-sm">
                      <span className="text-[9px] font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                  {me && consecutive && <div className="w-7 ml-1.5 shrink-0" />}
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-burnt-100/50 to-sandy-100/50 dark:from-burnt-400/10 dark:to-sandy-400/10 flex items-center justify-center"
            >
              <MessageCircle size={36} className="text-burnt-300 dark:text-burnt-400" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-charcoal-500 dark:text-warm-300">
                {t("chat.empty")}
              </p>
              <p className="text-xs text-charcoal-400 dark:text-charcoal-500 mt-1">
                {t("chat.empty.hint")}
              </p>
            </div>
          </div>
        )}

        {/* Search no results */}
        {searchQuery && filteredGroups.length === 0 && messages.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Search size={28} className="text-charcoal-300 dark:text-charcoal-500" />
            <p className="text-sm text-charcoal-400 dark:text-charcoal-500">{t("no.results")}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Scroll to bottom button ── */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 right-4 md:bottom-24 w-10 h-10 rounded-full bg-white dark:bg-charcoal-800 shadow-elevated border border-warm-200/30 dark:border-charcoal-700/50 flex items-center justify-center z-10 hover:scale-105 transition-transform"
          >
            <ChevronDown size={18} className="text-charcoal-500 dark:text-warm-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Image preview overlay ── */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          >
            <div className="relative max-w-sm w-full">
              <img
                src={imagePreview.url}
                alt=""
                className="w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl"
              />
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={cancelImagePreview}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X size={22} className="text-white" />
                </button>
                <button
                  onClick={confirmImageSend}
                  disabled={sending}
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-burnt-400 to-burnt-300 flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:scale-105"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={22} className="text-white ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reply indicator ── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-warm-200/30 dark:border-charcoal-700/50 bg-white/60 dark:bg-charcoal-800/60 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <div className="w-1 h-8 rounded-full bg-burnt-400" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-burnt-400 dark:text-burnt-300">
                  {replyTo.sender_name}
                </p>
                <p className="text-xs text-charcoal-400 dark:text-charcoal-400 truncate">
                  {replyTo.text || t("chat.photo")}
                </p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1.5 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
              >
                <X size={14} className="text-charcoal-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticker picker ── */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 280, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="overflow-hidden border-t border-warm-200/30 dark:border-charcoal-700/50 bg-white dark:bg-charcoal-800"
          >
            {/* Pack tabs */}
            <div className="flex gap-1 px-3 pt-2 pb-1 border-b border-warm-200/20 dark:border-charcoal-700/40">
              {STICKER_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setActiveStickerPack(pack.id)}
                  className={`px-3 py-1.5 rounded-xl text-base transition-all ${
                    activeStickerPack === pack.id
                      ? "bg-burnt-100 dark:bg-burnt-400/20 scale-110"
                      : "hover:bg-warm-50 dark:hover:bg-charcoal-700"
                  }`}
                >
                  {pack.icon}
                </button>
              ))}
              {/* Custom stickers tab */}
              <button
                onClick={() => setActiveStickerPack("custom")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeStickerPack === "custom"
                    ? "bg-burnt-100 dark:bg-burnt-400/20 scale-110"
                    : "hover:bg-warm-50 dark:hover:bg-charcoal-700"
                }`}
              >
                <ImagePlus size={18} className={activeStickerPack === "custom" ? "text-burnt-500" : "text-charcoal-400"} />
              </button>
            </div>

            {activeStickerPack === "custom" ? (
              <>
                {/* Custom stickers header */}
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <p className="text-[10px] font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wider">
                    {t("chat.stickers.custom")}
                  </p>
                  <button
                    onClick={() => stickerFileRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-burnt-100 dark:bg-burnt-400/20 text-burnt-500 dark:text-burnt-300 text-[10px] font-semibold hover:bg-burnt-200 dark:hover:bg-burnt-400/30 transition-colors"
                  >
                    <Plus size={12} />
                    {t("chat.stickers.add")}
                  </button>
                  <input
                    ref={stickerFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCustomSticker(f);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Custom stickers grid */}
                <div className="grid grid-cols-4 gap-1 px-3 pb-3 overflow-y-auto" style={{ maxHeight: 200 }}>
                  {customStickers.length === 0 ? (
                    <div className="col-span-4 flex flex-col items-center justify-center py-8 text-charcoal-400 dark:text-charcoal-500">
                      <ImagePlus size={32} className="mb-2 opacity-40" />
                      <p className="text-xs">{t("chat.stickers.empty")}</p>
                    </div>
                  ) : (
                    customStickers.map((s) => (
                      <motion.button
                        key={s.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => sendCustomSticker(s.image_url)}
                        onContextMenu={(e) => { e.preventDefault(); deleteCustomSticker(s.id); }}
                        className="relative flex flex-col items-center gap-0.5 p-1.5 rounded-2xl hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors group"
                      >
                        <img
                          src={s.image_url}
                          alt={s.name}
                          className="w-14 h-14 object-contain rounded-xl"
                        />
                        <span className="text-[7px] text-charcoal-400 dark:text-charcoal-500 truncate w-full text-center">{s.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteCustomSticker(s.id); }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={8} className="text-white" />
                        </button>
                      </motion.button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Pack name */}
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-charcoal-400 dark:text-charcoal-500 uppercase tracking-wider">
                  {STICKER_PACKS.find(p => p.id === activeStickerPack)?.name}
                </p>

                {/* Sticker grid */}
                <div className="grid grid-cols-4 gap-1 px-3 pb-3 overflow-y-auto" style={{ maxHeight: 200 }}>
                  {STICKER_PACKS.find(p => p.id === activeStickerPack)?.stickers.map((s) => (
                    <motion.button
                      key={s.id}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => sendSticker(activeStickerPack, s.id)}
                      className="flex flex-col items-center gap-0.5 p-2 rounded-2xl hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-colors"
                    >
                      <span className="text-4xl">{s.emoji}</span>
                      <span className="text-[8px] text-charcoal-400 dark:text-charcoal-500 truncate w-full text-center">{s.label}</span>
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <div className="px-3 py-3 border-t border-warm-200/30 dark:border-charcoal-700/50 bg-white/80 dark:bg-charcoal-800/80 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors shrink-0 mb-0.5"
          >
            <Camera size={20} className="text-charcoal-400 dark:text-charcoal-400" />
          </button>
          <button
            onClick={() => setShowStickers(!showStickers)}
            className={`p-2.5 rounded-xl transition-colors shrink-0 mb-0.5 ${
              showStickers
                ? "bg-burnt-100 dark:bg-burnt-400/20 text-burnt-500 dark:text-burnt-300"
                : "hover:bg-warm-100 dark:hover:bg-charcoal-700 text-charcoal-400"
            }`}
          >
            <Sticker size={20} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageSelect(file);
              e.target.value = "";
            }}
          />
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); if (showStickers) setShowStickers(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              placeholder={t("chat.placeholder")}
              className="w-full px-4 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200/40 dark:border-charcoal-600 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500 pr-10"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-warm-100/60 dark:hover:bg-charcoal-600 transition-colors md:hidden"
            >
              <Image size={14} className="text-charcoal-300 dark:text-charcoal-500" />
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={sendText}
            disabled={sending || !text.trim()}
            className="p-3 rounded-2xl bg-gradient-to-br from-burnt-400 to-burnt-300 text-white disabled:opacity-30 shadow-md hover:shadow-lg transition-all shrink-0"
          >
            <Send size={18} className={text.trim() ? "" : "opacity-60"} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function highlightSearch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-burnt-200/40 dark:bg-burnt-400/20 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
