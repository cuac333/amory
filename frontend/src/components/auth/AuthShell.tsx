import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import AmoryLogo from "../shared/AmoryLogo";

const serifStyle: React.CSSProperties = {
  fontFamily: '"Playfair Display", "Inter", serif',
  fontFeatureSettings: '"liga", "kern"',
};

function HeartPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-burnt-300/25 dark:text-burnt-400/10 pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="amory-hearts"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-12)"
        >
          <path
            d="M12 20 C12 20 4 14 4 9 C4 6.5 6 5 8 5 C10 5 11.2 6.2 12 7.5 C12.8 6.2 14 5 16 5 C18 5 20 6.5 20 9 C20 14 12 20 12 20 Z"
            fill="currentColor"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#amory-hearts)" />
    </svg>
  );
}

export interface AuthShellProps {
  /** Form content on the right panel */
  children: ReactNode;
  /** Small uppercase eyebrow text above the hero headline (desktop only) */
  heroEyebrow?: string;
  /** Two-part headline; the second line is italic coral */
  heroHeadline?: { lead: string; accent: string };
  /** Subtitle shown under the headline */
  heroSubtitle?: string;
}

export default function AuthShell({
  children,
  heroEyebrow = "Para dos corazones",
  heroHeadline = { lead: "Tu historia,", accent: "escrita juntos." },
  heroSubtitle,
}: AuthShellProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-warm-50 dark:bg-charcoal-900">
      {/* ── Left: romantic brand hero (desktop only) ── */}
      <aside
        aria-hidden="true"
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-charcoal-600 dark:text-warm-100"
        style={{
          background:
            "linear-gradient(135deg, #fff5f4 0%, #fef5fb 45%, #fff8f2 100%)",
        }}
      >
        {/* Ambient glows */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-[90px] opacity-60 dark:opacity-20"
          style={{
            background: "radial-gradient(closest-side, #ff9f9b, transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-20 w-[460px] h-[460px] rounded-full blur-[90px] opacity-50 dark:opacity-20"
          style={{
            background: "radial-gradient(closest-side, #fab0e4, transparent 70%)",
          }}
        />
        {/* Dark-mode wash */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden dark:block pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, #141819 0%, #1e2425 60%, #262e30 100%)",
          }}
        />

        <HeartPattern />

        {/* Logo row */}
        <div className="relative z-10 flex items-center gap-3">
          <AmoryLogo size={44} />
          <span
            className="text-2xl font-medium tracking-tight text-charcoal-600 dark:text-warm-100"
            style={serifStyle}
          >
            Amory
          </span>
        </div>

        {/* Editorial headline */}
        <div className="relative z-10 max-w-md">
          <div className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-burnt-500 dark:text-burnt-300">
            <span className="h-px w-8 bg-burnt-300/70 dark:bg-burnt-400/60" />
            {heroEyebrow}
          </div>
          <h2
            className="text-5xl xl:text-6xl leading-[1.05] font-medium tracking-tight text-charcoal-600 dark:text-warm-100"
            style={serifStyle}
          >
            {heroHeadline.lead}
            <br />
            <em className="text-burnt-400 dark:text-burnt-300 italic">
              {heroHeadline.accent}
            </em>
          </h2>
          {heroSubtitle && (
            <p className="mt-6 text-base leading-relaxed text-charcoal-400 dark:text-charcoal-200 max-w-sm">
              {heroSubtitle}
            </p>
          )}
        </div>

        {/* Footer ornament */}
        <div className="relative z-10 flex items-center gap-3 text-xs text-charcoal-400 dark:text-charcoal-300">
          <Heart
            size={12}
            className="text-burnt-400 dark:text-burnt-300"
            fill="currentColor"
          />
          <span className="tracking-wide">
            Hecho con amor, para los que se aman
          </span>
        </div>
      </aside>

      {/* ── Right: form panel ── */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        {/* Mobile-only ambient blush */}
        <div
          aria-hidden="true"
          className="lg:hidden absolute -top-20 -right-16 w-[340px] h-[340px] rounded-full blur-[80px] opacity-60 dark:opacity-15 pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, #ff9f9b, transparent 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="lg:hidden absolute -bottom-24 -left-16 w-[320px] h-[320px] rounded-full blur-[80px] opacity-50 dark:opacity-15 pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, #fab0e4, transparent 70%)",
          }}
        />

        <div className="w-full max-w-sm relative">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <AmoryLogo size={40} />
            <span
              className="text-2xl font-medium tracking-tight text-charcoal-600 dark:text-warm-100"
              style={serifStyle}
            >
              Amory
            </span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

export { serifStyle };
