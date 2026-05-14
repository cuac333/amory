import { forwardRef } from "react";
import type { BookPage } from "../../types";
import LikeButton from "./LikeButton";
import CommentSection from "./CommentSection";
import ReactionBar from "./ReactionBar";
import { ImageIcon, Quote } from "lucide-react";
import { ClickableImage } from "../shared/ImageViewer";

interface Props {
  page: BookPage;
  pageNumber: number;
}

const Page = forwardRef<HTMLDivElement, Props>(({ page, pageNumber }, ref) => {
  const isEven = pageNumber % 2 === 0;

  return (
    <div ref={ref} className="w-full h-full">
      <div className="w-full h-full bg-[#fdf9f3] p-5 flex flex-col relative overflow-hidden">
        {/* Aged paper texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, #8b7355 1px, transparent 1px),
                           radial-gradient(circle at 80% 20%, #8b7355 0.5px, transparent 0.5px)`,
          backgroundSize: "30px 30px, 20px 20px",
        }} />

        {/* Top ornament */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burnt-200/30 to-transparent" />
          <div className="w-1 h-1 rounded-full bg-burnt-200/40" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-burnt-200/30 to-transparent" />
        </div>

        {/* Title */}
        {page.title && (
          <h2 className="font-display text-lg font-semibold text-charcoal-600 text-center mb-3 tracking-wide shrink-0">
            {page.title}
          </h2>
        )}

        {/* Photo area */}
        {page.photo_url ? (
          <div className="shrink-0 flex justify-center mb-3">
            <div
              className="bg-white p-1.5 shadow-md rounded-sm relative"
              style={{ transform: `rotate(${(isEven ? -1 : 1) * 1}deg)` }}
            >
              <ClickableImage
                src={page.photo_url}
                alt={page.title || "回忆"}
                className="w-full max-h-[180px] object-cover rounded-sm"
              />
              {/* Photo tape effect */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-sandy-100/70 rotate-1" style={{ clipPath: "polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)" }} />
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex justify-center mb-3">
            <div
              className="w-[80%] h-[160px] bg-gradient-to-br from-warm-50 to-warm-100 border border-dashed border-warm-200/60 rounded-lg flex flex-col items-center justify-center gap-2"
              style={{ transform: `rotate(${(isEven ? -0.5 : 0.5)}deg)` }}
            >
              <ImageIcon size={28} className="text-warm-300" />
              <span className="text-[11px] text-warm-300 font-medium">回忆照片</span>
            </div>
          </div>
        )}

        {/* Text */}
        <div className="flex-1 overflow-y-auto mb-3 relative">
          <Quote size={14} className="text-burnt-100/40 mb-1" />
          <p className="font-handwriting text-base md:text-lg text-charcoal-500/90 leading-relaxed pl-1">
            {page.text || "在这里写下一段特别的回忆..."}
          </p>
        </div>

        {/* Bottom separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-warm-200/30 to-transparent mb-2 shrink-0" />

        {/* Interactions */}
        <div className="mt-auto space-y-1.5 shrink-0">
          <div className="flex items-center gap-4">
            <LikeButton pageId={page.id} initialCount={page.likes_count} />
            <CommentSection pageId={page.id} commentsCount={page.comments_count} />
          </div>
          <ReactionBar pageId={page.id} />
        </div>

        {/* Page number */}
        <span className={`absolute bottom-3 ${isEven ? "right-4" : "left-4"} text-[10px] text-warm-300/70 font-medium tracking-wider`}>
          {pageNumber}
        </span>

        {/* Page edge shadow */}
        <div className={`absolute top-0 bottom-0 w-2 ${isEven ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"} from-black/[0.04] to-transparent`} />
      </div>
    </div>
  );
});

Page.displayName = "Page";
export default Page;
