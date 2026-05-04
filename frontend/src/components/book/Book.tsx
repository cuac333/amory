import { useState, useEffect, useRef, useMemo } from "react";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../services/api";
import { useTranslation } from "../../context/I18nContext";
import type { BookPage as BookPageType } from "../../types";
import Cover from "./Cover";
import Page from "./Page";
import BackCover from "./BackCover";
import MusicPlayer from "./MusicPlayer";

interface PlaceholderPageDef {
  id: number;
  couple_id: number;
  titleKey: string | null;
  textKey: string;
  photo_url: null;
  audio_url: null;
  page_type: string;
  order: number;
  particle_type: null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

const PLACEHOLDER_PAGE_DEFS: PlaceholderPageDef[] = [
  {
    id: -1, couple_id: 0, titleKey: "book.placeholder.title", textKey: "book.placeholder.subtitle",
    photo_url: null, audio_url: null, page_type: "cover", order: 0,
    particle_type: null, created_at: "", likes_count: 0, comments_count: 0,
  },
  {
    id: -2, couple_id: 0, titleKey: "book.placeholder.1.title", textKey: "book.placeholder.1.text",
    photo_url: null, audio_url: null, page_type: "inner", order: 1,
    particle_type: null, created_at: "", likes_count: 3, comments_count: 1,
  },
  {
    id: -3, couple_id: 0, titleKey: "book.placeholder.2.title", textKey: "book.placeholder.2.text",
    photo_url: null, audio_url: null, page_type: "inner", order: 2,
    particle_type: null, created_at: "", likes_count: 5, comments_count: 2,
  },
  {
    id: -4, couple_id: 0, titleKey: "book.placeholder.3.title", textKey: "book.placeholder.3.text",
    photo_url: null, audio_url: null, page_type: "inner", order: 3,
    particle_type: null, created_at: "", likes_count: 2, comments_count: 0,
  },
  {
    id: -5, couple_id: 0, titleKey: "book.placeholder.4.title", textKey: "book.placeholder.4.text",
    photo_url: null, audio_url: null, page_type: "inner", order: 4,
    particle_type: null, created_at: "", likes_count: 4, comments_count: 1,
  },
  {
    id: -6, couple_id: 0, titleKey: "book.placeholder.5.title", textKey: "book.placeholder.5.text",
    photo_url: null, audio_url: null, page_type: "inner", order: 5,
    particle_type: null, created_at: "", likes_count: 8, comments_count: 3,
  },
  {
    id: -7, couple_id: 0, titleKey: null, textKey: "book.placeholder.end",
    photo_url: null, audio_url: null, page_type: "back_cover", order: 6,
    particle_type: null, created_at: "", likes_count: 0, comments_count: 0,
  },
];

export default function Book() {
  const { t } = useTranslation();
  const [pages, setPages] = useState<BookPageType[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const bookRef = useRef<any>(null);

  const placeholderPages = useMemo<BookPageType[]>(
    () =>
      PLACEHOLDER_PAGE_DEFS.map((def) => ({
        ...def,
        title: def.titleKey ? t(def.titleKey) : null,
        text: t(def.textKey),
      })),
    [t],
  );

  useEffect(() => {
    api.get("/book/pages").then((res) => {
      if (res.data.length > 0) {
        setPages(res.data);
      } else {
        setPages(placeholderPages);
      }
    }).catch(() => setPages(placeholderPages));
  }, [placeholderPages]);

  const currentAudio = pages[currentPage]?.audio_url || null;
  const totalPages = pages.length;

  const handleFlip = (e: any) => {
    setCurrentPage(e.data);
  };

  const flipPrev = () => bookRef.current?.pageFlip()?.flipPrev();
  const flipNext = () => bookRef.current?.pageFlip()?.flipNext();

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-warm-400" />
        </div>
        <p className="text-charcoal-400 text-lg font-medium">{t("book.empty")}</p>
        <p className="text-warm-400 text-sm mt-1">{t("book.empty.hint")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center relative">
      {/* Book container */}
      <div className="relative group">
        {/* Ambient shadow */}
        <div className="absolute -inset-4 bg-gradient-to-b from-burnt-100/20 via-sandy-100/15 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          width={400}
          height={550}
          minWidth={300}
          maxWidth={500}
          minHeight={420}
          maxHeight={600}
          size="stretch"
          showCover={true}
          onFlip={handleFlip}
          className="relative z-10"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.35}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {pages.map((page, idx) => {
            if (page.page_type === "cover") return <Cover key={page.id} page={page} />;
            if (page.page_type === "back_cover") return <BackCover key={page.id} page={page} />;
            return <Page key={page.id} page={page} pageNumber={idx} />;
          })}
        </HTMLFlipBook>

        {/* Navigation arrows */}
        <button
          onClick={flipPrev}
          disabled={currentPage === 0}
          className="absolute left-[-52px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center text-charcoal-400 hover:text-burnt-300 transition-all disabled:opacity-0 disabled:pointer-events-none hidden md:flex z-20"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={flipNext}
          disabled={currentPage >= totalPages - 1}
          className="absolute right-[-52px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center text-charcoal-400 hover:text-burnt-300 transition-all disabled:opacity-0 disabled:pointer-events-none hidden md:flex z-20"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-full max-w-[400px] space-y-2">
        <div className="relative h-1 bg-warm-200/50 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-burnt-300 to-sandy-300 rounded-full"
            animate={{ width: `${totalPages > 1 ? (currentPage / (totalPages - 1)) * 100 : 0}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-warm-400">
          <span>
            {currentPage === 0
              ? t("book.cover")
              : currentPage >= totalPages - 1
                ? t("book.back.cover")
                : t("book.page", { number: String(currentPage) })}
          </span>
          <span>{t("book.of", { current: String(currentPage + 1), total: String(totalPages) })}</span>
        </div>
      </div>

      <MusicPlayer audioUrl={currentAudio} />
    </div>
  );
}
