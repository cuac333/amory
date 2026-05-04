import { forwardRef } from "react";
import type { BookPage } from "../../types";
import { Heart } from "lucide-react";

interface Props {
  page: BookPage;
}

const BackCover = forwardRef<HTMLDivElement, Props>(({ page }, ref) => {
  return (
    <div ref={ref} className="w-full h-full">
      <div
        className="w-full h-full rounded-l-lg flex flex-col items-center justify-center p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1a0f1e 0%, #2c1320 40%, #4a1942 70%, #2c1320 100%)",
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.5)",
        }}
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(212,163,115,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Frame */}
        <div className="absolute inset-6 border border-sandy-400/15 rounded-lg" />

        {/* Content */}
        <div className="text-center z-10 space-y-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-sandy-300/8 rounded-full blur-xl scale-[2]" />
            <Heart size={36} className="relative text-sandy-300/50 fill-sandy-300/10" />
          </div>

          <p className="font-handwriting text-2xl text-sandy-100/80 leading-relaxed max-w-[80%] mx-auto">
            {page.text || "Y esta es solo el comienzo de nuestra historia..."}
          </p>

          <div className="w-20 h-px bg-gradient-to-r from-transparent via-sandy-400/25 to-transparent mx-auto" />

          <p className="text-[10px] text-sandy-300/25 tracking-[0.4em] uppercase font-medium">
            Hecho con amor
          </p>
        </div>

        {/* Spine shadow */}
        <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/40 to-transparent" />
      </div>
    </div>
  );
});

BackCover.displayName = "BackCover";
export default BackCover;
