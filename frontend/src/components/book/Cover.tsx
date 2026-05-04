import { forwardRef } from "react";
import type { BookPage } from "../../types";
import { Heart } from "lucide-react";

interface Props {
  page: BookPage;
}

const Cover = forwardRef<HTMLDivElement, Props>(({ page }, ref) => {
  return (
    <div ref={ref} className="w-full h-full">
      <div
        className="w-full h-full rounded-r-lg flex flex-col items-center justify-center p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #2c1320 0%, #4a1942 30%, #2c1320 60%, #1a0f1e 100%)",
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.5)",
        }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, rgba(212,163,115,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Linen texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Elegant border frame */}
        <div className="absolute inset-6 border border-sandy-400/20 rounded-lg" />
        <div className="absolute inset-8 border border-sandy-400/10 rounded-md" />

        {/* Corner ornaments */}
        {[
          "top-5 left-5",
          "top-5 right-5 -scale-x-100",
          "bottom-5 left-5 -scale-y-100",
          "bottom-5 right-5 scale-[-1]",
        ].map((pos, i) => (
          <svg key={i} className={`absolute ${pos} w-10 h-10 text-sandy-400/25`} viewBox="0 0 40 40">
            <path d="M4 36 C4 16 16 4 36 4" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M4 28 C4 16 16 8 28 4" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="4" cy="36" r="1.5" fill="currentColor" opacity="0.5" />
          </svg>
        ))}

        {/* Content */}
        <div className="text-center z-10 space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-sandy-300/10 rounded-full blur-xl scale-150" />
            <Heart size={32} className="relative text-sandy-300/60 fill-sandy-300/15" />
          </div>

          <div className="w-16 h-px bg-gradient-to-r from-transparent via-sandy-400/30 to-transparent mx-auto" />

          <h1 className="font-display text-3xl md:text-4xl text-sandy-50/95 leading-tight tracking-wide">
            {page.title || "Nuestro Primer Año"}
          </h1>

          {page.text && (
            <p className="font-handwriting text-xl text-sandy-200/50">
              {page.text}
            </p>
          )}

          <div className="w-16 h-px bg-gradient-to-r from-transparent via-sandy-400/30 to-transparent mx-auto" />

          <p className="text-[10px] text-sandy-300/30 tracking-[0.4em] uppercase font-medium">
            con amor
          </p>
        </div>

        {/* Spine shadow */}
        <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/40 to-transparent" />
      </div>
    </div>
  );
});

Cover.displayName = "Cover";
export default Cover;
