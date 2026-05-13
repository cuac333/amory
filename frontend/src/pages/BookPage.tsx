import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, X, MessageCircle, Send, Quote,
  Sparkles, Clock, Plus, Camera, MapPin, FileText, Check, Pencil,
  Calendar, ImagePlus, ChevronRight,
} from "lucide-react";
import api from "../services/api";
import type { BookPage as BookPageType, Comment, DeletionRequest } from "../types";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import ReactionBar from "../components/book/ReactionBar";
import LikeButton from "../components/book/LikeButton";
import DeleteButton from "../components/shared/DeleteButton";
import DatePickerShared from "../components/shared/DatePicker";

const LocationPicker = lazy(() => import("../components/shared/LocationPicker"));
const MiniMap = lazy(() => import("../components/shared/MiniMap"));

interface FramePhotoData {
  id?: number;
  frame_index: number;
  photo_url: string;
  caption?: string | null;
  taken_date?: string | null;
  place_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const PLACEHOLDER_PAGES: BookPageType[] = [
  {
    id: -1, couple_id: 0, title: "我们的第一年", text: "我们的故事从这里开始。",
    photo_url: null, audio_url: null, page_type: "cover", order: 0,
    particle_type: null, created_at: "2025-03-01", likes_count: 0, comments_count: 0,
  },
  {
    id: -2, couple_id: 0, title: "一切的开始",
    text: "我们的故事从这里开始。那一天一切都变了，从那以后在一起的每一刻都是我永远珍惜的礼物。",
    photo_url: null, audio_url: null, page_type: "inner", order: 1,
    particle_type: null, created_at: "2025-03-15", likes_count: 3, comments_count: 1,
  },
  {
    id: -3, couple_id: 0, title: "我们的第一次约会",
    text: "紧张、欢笑，还有我知道你很特别的那一刻。那天的每一个细节都深深刻在我的记忆中，仿佛就在昨天。",
    photo_url: null, audio_url: null, page_type: "inner", order: 2,
    particle_type: null, created_at: "2025-04-02", likes_count: 5, comments_count: 2,
  },
  {
    id: -4, couple_id: 0, title: "我珍藏的时刻",
    text: "一起度过的午后、漫无目的的散步、聊到天亮的对话。和你在一起的每一个小瞬间，都变成了我心中珍藏的回忆。",
    photo_url: null, audio_url: null, page_type: "inner", order: 3,
    particle_type: null, created_at: "2025-05-10", likes_count: 2, comments_count: 0,
  },
  {
    id: -5, couple_id: 0, title: "我们最喜欢的地方",
    text: "那个成为我们避风港的地方，世界在那里停止，只剩下你和我。我承诺每当我们需要逃离时，都会带你回到那里。",
    photo_url: null, audio_url: null, page_type: "inner", order: 4,
    particle_type: null, created_at: "2025-07-20", likes_count: 4, comments_count: 1,
  },
  {
    id: -6, couple_id: 0, title: "我最爱你的地方",
    text: "你的笑容、你看我的方式、你仅凭存在就让一切变得更美好。没有任何语言能描述你对我的全部意义。",
    photo_url: null, audio_url: null, page_type: "inner", order: 5,
    particle_type: null, created_at: "2025-09-14", likes_count: 8, comments_count: 3,
  },
  {
    id: -7, couple_id: 0, title: "而这仅仅是开始",
    text: "而这仅仅是我们故事的开始...",
    photo_url: null, audio_url: null, page_type: "back_cover", order: 6,
    particle_type: null, created_at: "2026-03-01", likes_count: 0, comments_count: 0,
  },
];

const MONTH_DEFAULT_CONTENT: Record<string, { title: string; text: string }> = {
  "2025-2": { title: "一切的开始", text: "2025年3月，改变一切的月份。我们的爱情故事从这里开始，从那以后的每一天都值得。" },
  "2025-3": { title: "互相了解", text: "四月带来了我们第一次一起冒险，那些长长的对话和永远不会忘记的心动。" },
  "2025-4": { title: "一起成长", text: "五月我们开始一起建立日常，那些让感情变得特别的小仪式。" },
  "2025-5": { title: "我们的第一个夏天", text: "六月带着热情到来，想要一起经历所有事情。计划、出行、无尽的欢笑。" },
  "2025-6": { title: "七月冒险", text: "七月是探索的月份，走出舒适区，发现在一起一切都更美好。" },
  "2025-7": { title: "八月在一起", text: "一个享受的月份，漫长的午后、冰淇淋和依偎看剧的夜晚。" },
  "2025-8": { title: "特别的九月", text: "在一起半年感觉就像一眨眼。九月带来了新的回忆和这是真实的确定感。" },
  "2025-9": { title: "我们的十月", text: "更凉的夜晚、恐怖片、一起过万圣节。有你在身边的十月是魔法般的。" },
  "2025-10": { title: "温暖的十一月", text: "虽然外面很冷，但我们之间总是温暖的。十一月是长长的拥抱和一起喝咖啡。" },
  "2025-11": { title: "魔法般的十二月", text: "一起过圣诞、灯光、礼物，还有最好的礼物：拥有彼此。" },
  "2026-0": { title: "新年，同样的爱", text: "2026年一月带着继续一起书写这个故事的承诺开始，一页一页地。" },
  "2026-1": { title: "爱情的二月", text: "爱情的月份，但对我们来说每个月都是。二月充满了心意、惊喜和满满的爱。" },
  "2026-2": { title: "在一起一年", text: "我们来到了2026年三月！整整一年的爱、欢笑、成长，以及想要更多的确定。" },
};

function generateTimelineMonths() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const months: { year: number; month: number; label: string; shortLabel: string }[] = [];
  let y = 2025;
  let m = 2;
  const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const MONTH_SHORT = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  while (true) {
    months.push({ year: y, month: m, label: `${MONTH_NAMES[m]} ${y}`, shortLabel: `${MONTH_SHORT[m]} ${y}` });
    if (y === currentYear && m === currentMonth) break;
    if (y > currentYear || (y === currentYear && m > currentMonth)) break;
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
}

function getMonthDefault(year: number, month: number): BookPageType {
  const key = `${year}-${month}`;
  const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const content = MONTH_DEFAULT_CONTENT[key] || { title: MONTH_NAMES[month], text: "我们故事中的又一个月。" };
  return {
    id: -(year * 100 + month),
    couple_id: 0,
    title: content.title,
    text: content.text,
    photo_url: null,
    audio_url: null,
    page_type: "inner",
    order: 0,
    particle_type: null,
    created_at: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    likes_count: 0,
    comments_count: 0,
  };
}

function getEventMonth(dateStr: string) {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const MONTH_SHORT_FMT = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${MONTH_SHORT_FMT[d.getMonth()]}${d.getDate()}日`;
}

/* ============================================================
   GRADIENTS for timeline nodes — rotating colors per month
   ============================================================ */
const NODE_GRADIENTS = [
  "from-burnt-300 to-sandy-400",
  "from-tuscan-400 to-burnt-300",
  "from-sandy-400 to-tuscan-400",
  "from-verdigris-400 to-tuscan-400",
  "from-burnt-400 to-verdigris-400",
  "from-sandy-300 to-burnt-400",
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function BookPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [pages, setPages] = useState<BookPageType[]>([]);
  const [selectedPage, setSelectedPage] = useState<BookPageType | null>(null);
  const [deleteRequests, setDeleteRequests] = useState<DeletionRequest[]>([]);

  const TIMELINE_MONTHS = generateTimelineMonths();

  const loadPages = () => {
    api.get("/book/pages").then((res) => {
      setPages(res.data.length > 0 ? res.data : PLACEHOLDER_PAGES);
    }).catch(() => setPages(PLACEHOLDER_PAGES));
    api.get("/deletion-requests/", { params: { status: "pending" } }).then((res) => {
      setDeleteRequests(res.data.filter((r: DeletionRequest) => r.entity_type === "book_page"));
    }).catch(() => {});
  };

  const getDeleteRequest = (pageId: number) =>
    deleteRequests.find((r) => r.entity_type === "book_page" && r.entity_id === pageId);

  useEffect(() => { loadPages(); }, []);

  const events = pages.filter((p) => p.page_type === "inner");
  const coverPage = pages.find((p) => p.page_type === "cover");
  const endPage = pages.find((p) => p.page_type === "back_cover");

  const eventsByMonth = new Map<string, BookPageType>();
  events.forEach((e) => {
    const { year, month } = getEventMonth(e.created_at);
    const key = `${year}-${month}`;
    if (!eventsByMonth.has(key) || (eventsByMonth.get(key)!.id < 0 && e.id > 0)) {
      eventsByMonth.set(key, e);
    }
  });

  const memoriesCount = events.filter((e) => e.id > 0 || e.photo_url).length;

  return (
    <div className="py-3 md:py-6 pb-24 md:pb-8">

      {/* ─── Header ─── */}
      <div className="text-center mb-6 md:mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-burnt-300 via-sandy-300 to-tuscan-400 shadow-lg shadow-burnt-200/30 mb-3"
        >
          <Clock size={22} className="text-white" />
        </motion.div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal-700 dark:text-warm-200">
          {t("timeline.title")}
        </h1>
        <p className="text-xs md:text-sm text-charcoal-400 dark:text-warm-500 mt-1">
          {t("timeline.desc")}
        </p>

        {/* Stats pills */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-burnt-50 dark:bg-burnt-800/20 rounded-xl">
            <Calendar size={12} className="text-burnt-400" />
            <span className="text-xs font-semibold text-burnt-500">{TIMELINE_MONTHS.length} {t("timeline.months")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sandy-50 dark:bg-sandy-800/20 rounded-xl">
            <Heart size={12} className="text-sandy-500 fill-sandy-500" />
            <span className="text-xs font-semibold text-sandy-600">{memoriesCount} {t("timeline.memories")}</span>
          </div>
        </div>
      </div>

      {/* ─── Cover ─── */}
      {coverPage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-lg mx-auto mb-8 md:mb-12 px-4"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-charcoal-600 via-charcoal-500 to-charcoal-700 dark:from-charcoal-700 dark:via-charcoal-800 dark:to-charcoal-900 p-6 md:p-8 shadow-elevated text-center">
            {/* Decorative glow */}
            <div className="absolute inset-0 opacity-15" style={{
              background: "radial-gradient(ellipse at 50% 30%, rgba(212,163,115,0.5) 0%, transparent 60%)",
            }} />
            <div className="absolute top-3 right-3 opacity-10">
              <Heart size={80} className="text-sandy-300" />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sandy-300/20 mb-3">
                <Heart size={18} className="text-sandy-300 fill-sandy-300/40" />
              </div>
              <h2 className="font-display text-xl md:text-2xl text-sandy-50 font-bold">{coverPage.title}</h2>
              {coverPage.text && (
                <p className="font-handwriting text-sandy-200/70 text-sm mt-2 max-w-xs mx-auto">{coverPage.text}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Timeline ─── */}
      <div className="relative max-w-3xl mx-auto px-4 md:px-6">

        {/* Vertical line */}
        <div className="absolute left-[30px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-[2px]">
          <div className="w-full h-full bg-gradient-to-b from-burnt-200/70 via-sandy-200/50 to-tuscan-200/40 dark:from-burnt-600/40 dark:via-sandy-600/30 dark:to-tuscan-600/20 rounded-full" />
        </div>

        {TIMELINE_MONTHS.map((tm, mIdx) => {
          const key = `${tm.year}-${tm.month}`;
          const monthEvent = eventsByMonth.get(key);
          const hasEvent = !!monthEvent;
          const displayPage = monthEvent || getMonthDefault(tm.year, tm.month);
          const now = new Date();
          const isCurrent = now.getFullYear() === tm.year && now.getMonth() === tm.month;
          const isFuture = new Date(tm.year, tm.month) > now;
          const isLeft = mIdx % 2 === 0;
          const gradient = NODE_GRADIENTS[mIdx % NODE_GRADIENTS.length];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: mIdx * 0.03 }}
              className="relative mb-6 md:mb-8"
            >
              {/* ─ Node on timeline ─ */}
              <div className="absolute left-[30px] md:left-1/2 -translate-x-1/2 top-1 z-10">
                {isCurrent ? (
                  /* Current month: animated pulsing node */
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient}`}
                    />
                    <div className={`relative w-5 h-5 rounded-full bg-gradient-to-br ${gradient} shadow-md ring-3 ring-white dark:ring-charcoal-800 flex items-center justify-center`}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  </div>
                ) : hasEvent ? (
                  /* Month with content: filled node */
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} shadow-sm ring-2 ring-white dark:ring-charcoal-800`} />
                ) : (
                  /* Empty month: hollow node */
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    isFuture
                      ? "border-warm-200/40 dark:border-charcoal-600/40"
                      : "border-warm-300 dark:border-charcoal-500"
                  } bg-white dark:bg-charcoal-800 ring-2 ring-white dark:ring-charcoal-800`} />
                )}
              </div>

              {/* ─ Mobile layout (single column, line on left) ─ */}
              <div className="md:hidden pl-[54px] pr-1">
                {/* Month label */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-display font-semibold ${
                    isCurrent ? "text-burnt-400" : hasEvent ? "text-charcoal-600 dark:text-warm-300" : isFuture ? "text-warm-300 dark:text-charcoal-600" : "text-charcoal-400 dark:text-warm-500"
                  }`}>
                    {tm.shortLabel}
                  </span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-[9px] font-bold rounded-full uppercase tracking-wide">
                      {t("timeline.now")}
                    </span>
                  )}
                </div>
                <TimelineCard
                  page={displayPage}
                  hasEvent={hasEvent}
                  faded={!hasEvent && isFuture}
                  gradient={gradient}
                  onSelect={setSelectedPage}
                  deleteRequest={getDeleteRequest(displayPage.id)}
                  currentUserId={user?.id}
                  onDeleteAction={loadPages}
                />
              </div>

              {/* ─ Desktop layout (alternating sides) ─ */}
              <div className="hidden md:block">
                <div className={`flex items-start ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
                  <div className={`w-[calc(50%-24px)] ${isLeft ? "pr-8 text-right" : "pl-8 text-left"}`}>
                    {/* Month label */}
                    <div className={`mb-2.5 flex items-center gap-2 ${isLeft ? "justify-end" : "justify-start"}`}>
                      <span className={`text-sm font-display font-semibold ${
                        isCurrent ? "text-burnt-400" : hasEvent ? "text-charcoal-600 dark:text-warm-300" : isFuture ? "text-warm-300 dark:text-charcoal-600" : "text-charcoal-400 dark:text-warm-500"
                      }`}>
                        {tm.label}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white text-[9px] font-bold rounded-full uppercase tracking-wide">
                          {t("timeline.now")}
                        </span>
                      )}
                    </div>
                    <TimelineCard
                      page={displayPage}
                      hasEvent={hasEvent}
                      faded={!hasEvent && isFuture}
                      gradient={gradient}
                      onSelect={setSelectedPage}
                      deleteRequest={getDeleteRequest(displayPage.id)}
                      currentUserId={user?.id}
                      onDeleteAction={loadPages}
                    />
                  </div>
                  <div className="w-12 shrink-0" />
                  <div className="w-[calc(50%-24px)]" />
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* ─ 未完待续 ─ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative py-6"
        >
          <div className="absolute left-[30px] md:left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-burnt-200/60 dark:bg-burnt-600/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-burnt-200/40 dark:bg-burnt-600/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-burnt-200/20 dark:bg-burnt-600/20" />
          </div>
          <div className="pl-[54px] md:pl-0 md:text-center">
            <div className="inline-block bg-warm-50/80 dark:bg-charcoal-700/50 border border-warm-200/30 dark:border-charcoal-600/30 rounded-2xl px-5 py-3">
              <p className="font-handwriting text-base text-charcoal-400 dark:text-warm-500">
                {t("timeline.continue")}
              </p>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles size={14} className="mx-auto mt-1.5 text-burnt-200/60 dark:text-burnt-600/40" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ─ End node ─ */}
        {endPage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative pt-2 pb-4"
          >
            <div className="absolute left-[30px] md:left-1/2 -translate-x-1/2 z-10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-burnt-300 to-sandy-300 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-charcoal-800">
                <Heart size={15} className="text-white fill-white" />
              </div>
            </div>
            <div className="pl-[54px] md:pl-0 md:text-center md:pt-14 pt-1">
              <p className="font-handwriting text-lg text-charcoal-400 dark:text-warm-500">{endPage.text}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── Story Modal ─── */}
      <AnimatePresence>
        {selectedPage && (
          <StoryModal
            page={selectedPage}
            onClose={() => setSelectedPage(null)}
            onPageCreated={(newPage) => {
              setPages((prev) => {
                const withoutPlaceholder = prev.filter((p) => p.id !== selectedPage!.id);
                return [...withoutPlaceholder, newPage];
              });
              setSelectedPage(newPage);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/* ============================================================
   TIMELINE CARD
   ============================================================ */
function TimelineCard({ page, hasEvent, faded, gradient, onSelect, deleteRequest, currentUserId, onDeleteAction }: {
  page: BookPageType;
  hasEvent: boolean;
  faded?: boolean;
  gradient: string;
  onSelect: (p: BookPageType) => void;
  deleteRequest?: DeletionRequest;
  currentUserId?: number;
  onDeleteAction?: () => void;
}) {
  return (
    <div
      onClick={() => onSelect(page)}
      className={`group cursor-pointer transition-all duration-300 ${faded ? "opacity-40" : ""}`}
    >
      <div className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-soft hover:shadow-elevated border border-warm-200/20 dark:border-charcoal-600/20 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]">

        {/* Photo or gradient placeholder */}
        {page.photo_url ? (
          <div className="h-32 md:h-36 overflow-hidden relative">
            <img
              src={page.photo_url}
              alt={page.title || ""}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        ) : (
          <div className={`h-20 md:h-24 bg-gradient-to-br ${gradient} opacity-[0.08] dark:opacity-[0.12] relative`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <ImagePlus size={20} className="text-charcoal-300 dark:text-charcoal-500" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-3.5 md:p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-semibold text-charcoal-700 dark:text-warm-300 text-sm md:text-base group-hover:text-burnt-400 transition-colors leading-tight">
              {page.title || "无标题"}
            </h3>
            {page.id > 0 && onDeleteAction && (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <DeleteButton
                  entityType="book_page"
                  entityId={page.id}
                  pendingRequest={deleteRequest}
                  currentUserId={currentUserId ?? 0}
                  onAction={onDeleteAction}
                  size="sm"
                />
              </div>
            )}
          </div>

          {page.text && (
            <p className="text-xs text-charcoal-400 dark:text-warm-500 line-clamp-2 leading-relaxed mt-1">
              {page.text}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-warm-100 dark:border-charcoal-700">
            <span className="text-[10px] text-charcoal-300 dark:text-charcoal-500 flex items-center gap-1">
              <Clock size={9} /> {formatDate(page.created_at)}
            </span>
            {page.likes_count > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-burnt-300">
                <Heart size={9} className="fill-burnt-300" /> {page.likes_count}
              </span>
            )}
            {page.comments_count > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-charcoal-300 dark:text-charcoal-500">
                <MessageCircle size={9} /> {page.comments_count}
              </span>
            )}
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-burnt-300/50 group-hover:text-burnt-400 transition-colors font-medium">
              <ChevronRight size={10} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   FLOATING PHOTO FRAMES (desktop only, inside StoryModal)
   ============================================================ */
const SCATTERED_FRAMES = [
  { top: "6%", left: "10%", rotate: "-7deg", w: "clamp(170px,18vw,260px)", vertical: false },
  { top: "1%", left: "30%", rotate: "3.5deg", w: "clamp(155px,16vw,230px)", vertical: false },
  { top: "2%", right: "28%", rotate: "-2deg", w: "clamp(140px,15vw,210px)", vertical: true },
  { top: "3%", right: "10%", rotate: "2deg", w: "clamp(140px,15vw,210px)", vertical: true },
  { top: "34%", left: "5%", rotate: "4.5deg", w: "clamp(180px,19vw,270px)", vertical: false },
  { top: "28%", right: "6%", rotate: "-3deg", w: "clamp(155px,16vw,230px)", vertical: true },
  { bottom: "8%", left: "12%", rotate: "-5.5deg", w: "clamp(160px,17vw,240px)", vertical: true },
  { bottom: "1%", left: "28%", rotate: "-2.5deg", w: "clamp(160px,17vw,240px)", vertical: false },
  { bottom: "3%", right: "30%", rotate: "4deg", w: "clamp(145px,15vw,215px)", vertical: true },
  { bottom: "5%", right: "8%", rotate: "6deg", w: "clamp(175px,18vw,260px)", vertical: false },
];

function FloatingFrame({ index, url, meta, onUpload, onClick, style }: {
  index: number;
  url?: string;
  meta?: FramePhotoData;
  onUpload: (file: File) => void;
  onClick?: () => void;
  style: typeof SCATTERED_FRAMES[0];
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: style.w,
    zIndex: 40,
    ...(style.top ? { top: style.top } : {}),
    ...(style.bottom ? { bottom: style.bottom } : {}),
    ...(style.left ? { left: style.left } : {}),
    ...(style.right ? { right: style.right } : {}),
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
      animate={{ opacity: 1, scale: 1, rotate: parseFloat(style.rotate) }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.08, type: "spring", damping: 20 }}
      style={posStyle}
      className="pointer-events-auto hidden md:block"
    >
      <div className="bg-white p-2 shadow-lg rounded-sm hover:shadow-xl transition-shadow relative group">
        {url ? (
          <div
            className={`overflow-hidden rounded-sm cursor-pointer ${style.vertical ? "aspect-[3/4]" : "aspect-[4/3]"}`}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          >
            <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            {meta?.caption && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
                <p className="text-white text-[9px] font-medium truncate">{meta.caption}</p>
              </div>
            )}
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center bg-warm-50/80 border-2 border-dashed border-warm-200/50 rounded-sm cursor-pointer hover:border-burnt-200 hover:bg-burnt-50/30 transition-colors ${
            style.vertical ? "aspect-[3/4]" : "aspect-[4/3]"
          }`}>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <Camera size={20} className="text-warm-300/70 mb-1" />
            <span className="text-[9px] text-warm-300/70 font-medium">照片</span>
          </label>
        )}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3.5 bg-sandy-100/70 rounded-sm" style={{ clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)" }} />
      </div>
    </motion.div>
  );
}


/* ============================================================
   PHOTO DETAIL MODAL
   ============================================================ */
function PhotoDetailModal({ photo, pageId, onClose, onSave }: {
  photo: FramePhotoData;
  pageId: number;
  onClose: () => void;
  onSave: (updated: FramePhotoData) => void;
}) {
  const { t } = useTranslation();
  const [caption, setCaption] = useState(photo.caption || "");
  const [takenDate, setTakenDate] = useState(photo.taken_date || "");
  const [placeName, setPlaceName] = useState(photo.place_name || "");
  const [latitude, setLatitude] = useState<number | null>(photo.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(photo.longitude ?? null);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!photo.id || pageId < 1) return;
    setSaving(true);
    try {
      const res = await api.put(`/book/pages/${pageId}/frame-photos/${photo.id}`, {
        caption: caption || null,
        taken_date: takenDate || null,
        place_name: placeName || null,
        latitude,
        longitude,
      });
      onSave(res.data);
      onClose();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="relative">
          <div className="h-56 bg-warm-100 dark:bg-charcoal-700 overflow-hidden rounded-t-2xl">
            <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-charcoal-800/80 backdrop-blur-sm flex items-center justify-center text-charcoal-500 hover:bg-white transition-colors shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-charcoal-500 dark:text-warm-400 mb-1.5">
              <FileText size={12} /> {t("timeline.photo.story")}
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("timeline.photo.story.placeholder")}
              rows={3}
              className="w-full px-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm focus:ring-2 focus:ring-tuscan-200 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-charcoal-500 dark:text-warm-400 mb-1.5">
              <Clock size={12} /> {t("timeline.photo.when")}
            </label>
            <DatePickerShared value={takenDate} onChange={setTakenDate} placeholder={t("timeline.photo.when")} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-charcoal-500 dark:text-warm-400 mb-1.5">
              <MapPin size={12} /> {t("timeline.photo.where")}
            </label>
            {latitude && longitude && !showMap ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-charcoal-600 dark:text-warm-300 flex-1 truncate">{placeName || t("timeline.photo.location.selected")}</span>
                  <button onClick={() => setShowMap(true)} className="text-xs text-burnt-400 hover:text-burnt-500 font-medium">
                    {t("timeline.photo.change")}
                  </button>
                </div>
                <Suspense fallback={<div className="h-24 bg-warm-50 dark:bg-charcoal-700 rounded-xl animate-pulse" />}>
                  <MiniMap latitude={latitude} longitude={longitude} className="h-24" />
                </Suspense>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="w-full px-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm text-charcoal-400 hover:border-burnt-200 transition-colors text-left flex items-center gap-2"
                >
                  <MapPin size={14} className="text-warm-400" />
                  {placeName || t("timeline.photo.select.location")}
                </button>
                {showMap && (
                  <div className="mt-2">
                    <Suspense fallback={<div className="h-48 bg-warm-50 dark:bg-charcoal-700 rounded-xl animate-pulse" />}>
                      <LocationPicker
                        placeName={placeName || ""}
                        latitude={latitude}
                        longitude={longitude}
                        onLocationChange={(lat, lng, name) => {
                          setPlaceName(name);
                          setLatitude(lat);
                          setLongitude(lng);
                          setShowMap(false);
                        }}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-burnt-300 to-sandy-300 text-white rounded-xl font-medium hover:from-burnt-400 hover:to-sandy-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-burnt-200/30"
          >
            {saving ? t("saving") : t("save")}
            {!saving && <Check size={16} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


/* ============================================================
   STORY MODAL
   ============================================================ */
function StoryModal({ page: initialPage, onClose, onPageCreated }: {
  page: BookPageType;
  onClose: () => void;
  onPageCreated: (page: BookPageType) => void;
}) {
  const { t } = useTranslation();
  const [realPageId, setRealPageId] = useState<number>(initialPage.id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [photos, setPhotos] = useState<(string | null)[]>(Array(10).fill(null));
  const [photoMeta, setPhotoMeta] = useState<(FramePhotoData | null)[]>(Array(10).fill(null));
  const [detailPhoto, setDetailPhoto] = useState<FramePhotoData | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [title, setTitle] = useState(initialPage.title || "");
  const [text, setText] = useState(initialPage.text || "");
  const [savingField, setSavingField] = useState(false);

  const saveField = async (field: "title" | "text", value: string) => {
    const pid = realPageId > 0 ? realPageId : initialPage.id;
    if (pid < 0) return;
    setSavingField(true);
    try {
      await api.put(`/book/pages/${pid}`, { [field]: value });
      onPageCreated({ ...initialPage, id: pid, [field]: value });
    } catch { /* ignore */ } finally {
      setSavingField(false);
      if (field === "title") setEditingTitle(false);
      else setEditingText(false);
    }
  };

  const loadFramePhotos = (pid: number) => {
    api.get(`/book/pages/${pid}/frame-photos`).then((res) => {
      setPhotos((prev) => {
        const next = [...prev];
        for (const p of res.data as FramePhotoData[]) {
          if (p.frame_index >= 0 && p.frame_index < next.length) {
            next[p.frame_index] = p.photo_url;
          }
        }
        return next;
      });
      setPhotoMeta((prev) => {
        const next = [...prev];
        for (const p of res.data as FramePhotoData[]) {
          if (p.frame_index >= 0 && p.frame_index < next.length) {
            next[p.frame_index] = p;
          }
        }
        return next;
      });
    }).catch(() => {});
  };

  useEffect(() => {
    if (initialPage.id < 0) {
      api.post("/book/pages", {
        title: initialPage.title,
        text: initialPage.text,
        page_type: initialPage.page_type,
        order: initialPage.order,
        created_at: initialPage.created_at,
      }).then((res) => {
        const created: BookPageType = {
          ...initialPage,
          id: res.data.id,
          couple_id: res.data.couple_id,
          created_at: res.data.created_at,
        };
        setRealPageId(res.data.id);
        onPageCreated(created);
        api.get(`/book/pages/${res.data.id}/comments`).then((r) => setComments(r.data)).catch(() => {});
      }).catch(() => {});
    } else {
      setRealPageId(initialPage.id);
      loadFramePhotos(initialPage.id);
      api.get(`/book/pages/${initialPage.id}/comments`).then((res) => setComments(res.data)).catch(() => {});
    }
    if (initialPage.photo_url) {
      setPhotos((prev) => [initialPage.photo_url, ...prev.slice(1)]);
    }
  }, [initialPage.id, initialPage.photo_url]);

  const pageId = realPageId > 0 ? realPageId : initialPage.id;

  const submitComment = async () => {
    if (!newComment.trim() || pageId < 0) return;
    const res = await api.post(`/book/pages/${pageId}/comments`, { content: newComment });
    setComments((c) => [...c, res.data]);
    setNewComment("");
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = previewUrl;
      return next;
    });

    if (pageId > 0) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await api.post(`/book/pages/${pageId}/frame-photos?frame_index=${index}`, formData);
        setPhotos((prev) => {
          const next = [...prev];
          next[index] = res.data.photo_url;
          return next;
        });
        setPhotoMeta((prev) => {
          const next = [...prev];
          next[index] = { ...res.data, frame_index: index };
          return next;
        });
        if (index === 0) {
          const fd2 = new FormData();
          fd2.append("file", file);
          await api.post(`/book/pages/${pageId}/upload-photo`, fd2).catch(() => {});
        }
      } catch { /* preview stays */ }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      {/* Floating photo frames (desktop only) */}
      {SCATTERED_FRAMES.map((frameStyle, i) => (
        <FloatingFrame
          key={i}
          index={i}
          style={frameStyle}
          url={photos[i] || undefined}
          meta={photoMeta[i] || undefined}
          onUpload={(f) => handlePhotoUpload(i, f)}
          onClick={photoMeta[i] ? () => setDetailPhoto(photoMeta[i]) : undefined}
        />
      ))}

      {/* Photo detail modal */}
      <AnimatePresence>
        {detailPhoto && (
          <PhotoDetailModal
            photo={detailPhoto}
            pageId={pageId}
            onClose={() => setDetailPhoto(null)}
            onSave={(updated) => {
              setPhotoMeta((prev) => {
                const next = [...prev];
                next[updated.frame_index] = updated;
                return next;
              });
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-charcoal-800 rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative z-[45]"
      >
        {/* Header banner */}
        <div className="relative shrink-0">
          <div className="h-32 bg-gradient-to-br from-burnt-100/60 via-sandy-100/40 to-warm-100 dark:from-burnt-800/30 dark:via-sandy-800/20 dark:to-charcoal-700 flex items-end">
            <div className="p-6 pb-4 w-full">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="flex-1 font-display text-2xl md:text-3xl font-bold text-charcoal-700 dark:text-warm-200 bg-white/60 dark:bg-charcoal-700/60 backdrop-blur-sm rounded-lg px-2 py-1 outline-none ring-2 ring-burnt-200"
                    onKeyDown={(e) => { if (e.key === "Enter") saveField("title", title); if (e.key === "Escape") { setTitle(initialPage.title || ""); setEditingTitle(false); } }}
                  />
                  <button onClick={() => saveField("title", title)} disabled={savingField} className="w-8 h-8 rounded-lg bg-burnt-300 text-white flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingTitle(true)} className="group flex items-center gap-2 text-left w-full">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal-700 dark:text-warm-200 leading-tight">
                    {title || "无标题"}
                  </h2>
                  <Pencil size={14} className="text-charcoal-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
              <span className="text-charcoal-400 dark:text-warm-500 text-xs flex items-center gap-1.5 mt-1">
                <Clock size={11} />
                {formatDate(initialPage.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 dark:bg-charcoal-700/80 backdrop-blur-sm flex items-center justify-center text-charcoal-500 hover:bg-white transition-colors shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Story text */}
          <div className="px-6 pt-5 pb-4">
            <div className="relative">
              <Quote size={18} className="text-burnt-100 dark:text-burnt-700/30 mb-2" />
              {editingText ? (
                <div className="space-y-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                    rows={4}
                    className="w-full font-handwriting text-xl md:text-2xl text-charcoal-500 dark:text-warm-400 leading-relaxed bg-white/60 dark:bg-charcoal-700/60 backdrop-blur-sm rounded-lg px-3 py-2 outline-none ring-2 ring-burnt-200 resize-none"
                    onKeyDown={(e) => { if (e.key === "Escape") { setText(initialPage.text || ""); setEditingText(false); } }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setText(initialPage.text || ""); setEditingText(false); }} className="px-3 py-1.5 text-xs text-charcoal-400 bg-warm-50 dark:bg-charcoal-700 rounded-lg">{t("cancel")}</button>
                    <button onClick={() => saveField("text", text)} disabled={savingField} className="px-3 py-1.5 text-xs text-white bg-burnt-300 rounded-lg flex items-center gap-1">
                      <Check size={12} /> {t("save")}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingText(true)} className="group text-left w-full">
                  <p className="font-handwriting text-xl md:text-2xl text-charcoal-500 dark:text-warm-400 leading-relaxed">
                    {text || <span className="text-warm-300 dark:text-charcoal-500 italic">{t("timeline.write.placeholder")}</span>}
                  </p>
                  <Pencil size={12} className="text-charcoal-300 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                </button>
              )}
            </div>
          </div>

          {/* Photo gallery (mobile — desktop uses floating frames) */}
          <div className="md:hidden px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Camera size={13} className="text-burnt-300/60" />
              <span className="text-[10px] font-semibold text-charcoal-400 dark:text-warm-500 uppercase tracking-wider">{t("timeline.photos")}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative">
                  {url ? (
                    <div
                      className="aspect-square overflow-hidden rounded-lg cursor-pointer"
                      onClick={() => photoMeta[i] && setDetailPhoto(photoMeta[i])}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {photoMeta[i]?.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5">
                          <p className="text-white text-[8px] truncate">{photoMeta[i]!.caption}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="aspect-square flex flex-col items-center justify-center bg-warm-50 dark:bg-charcoal-700 border border-dashed border-warm-200/50 dark:border-charcoal-600/50 rounded-lg cursor-pointer">
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(i, f); }} className="hidden" />
                      <Plus size={14} className="text-warm-300 dark:text-charcoal-500" />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reactions & Likes */}
          <div className="px-5 pb-4 space-y-3">
            <div className="flex items-center gap-4 py-2 border-t border-b border-warm-100 dark:border-charcoal-700">
              <LikeButton pageId={pageId} initialCount={initialPage.likes_count} />
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1.5 text-warm-400 hover:text-sandy-400 transition-colors"
              >
                <MessageCircle size={16} />
                <span className="text-xs font-medium">{comments.length || initialPage.comments_count}</span>
              </button>
            </div>
            <ReactionBar pageId={pageId} />
          </div>

          {/* Comments section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2.5">
                  <h4 className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">{t("book.comments")}</h4>

                  {comments.length === 0 && (
                    <p className="text-xs text-warm-400 py-3 text-center">{t("book.comments.empty")}</p>
                  )}

                  {comments.map((c) => (
                    <div key={c.id} className="bg-warm-50 dark:bg-charcoal-700 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-burnt-300 to-verdigris-400 flex items-center justify-center text-white text-[9px] font-bold">
                          {c.user_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[11px] text-charcoal-600 dark:text-warm-300">{c.user_name}</span>
                        <span className="text-[9px] text-warm-400 dark:text-charcoal-500 ml-auto">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-500 dark:text-warm-400 pl-7">{c.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comment input */}
        <div className="shrink-0 p-4 border-t border-warm-100 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
            placeholder={t("book.comments.placeholder")}
            className="flex-1 px-4 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200 dark:border-charcoal-600 rounded-xl text-sm focus:ring-2 focus:ring-tuscan-200 outline-none"
          />
          <button
            onClick={submitComment}
            disabled={!newComment.trim()}
            className="w-10 h-10 bg-burnt-300 text-white rounded-xl flex items-center justify-center hover:bg-burnt-400 transition-colors disabled:opacity-30"
          >
            <Send size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
