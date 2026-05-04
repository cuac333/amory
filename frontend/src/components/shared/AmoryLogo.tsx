import { useId } from "react";

interface AmoryLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

export default function AmoryLogo({
  size = 48,
  className,
  title = "Amory",
}: AmoryLogoProps) {
  const uid = useId();
  const gradL = `amory-grad-l-${uid}`;
  const gradR = `amory-grad-r-${uid}`;
  const gradSeam = `amory-seam-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={gradL} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F07E7A" />
          <stop offset="55%" stopColor="#FF9F9B" />
          <stop offset="100%" stopColor="#FFB482" />
        </linearGradient>
        <linearGradient id={gradR} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E890D0" />
          <stop offset="55%" stopColor="#FAB0E4" />
          <stop offset="100%" stopColor="#FBD0ED" />
        </linearGradient>
        <linearGradient id={gradSeam} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Left half of the heart */}
      <path
        d="M24 41 C24 41 4 27 4 14.5 C4 8.7 8.8 4 14.6 4 C19 4 22.3 6.8 24 10.5 L24 41 Z"
        fill={`url(#${gradL})`}
      />
      {/* Right half of the heart */}
      <path
        d="M24 41 L24 10.5 C25.7 6.8 29 4 33.4 4 C39.2 4 44 8.7 44 14.5 C44 27 24 41 24 41 Z"
        fill={`url(#${gradR})`}
      />
      {/* Subtle seam highlight where the two halves meet */}
      <line
        x1="24"
        y1="7"
        x2="24"
        y2="40"
        stroke={`url(#${gradSeam})`}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Wordmark + mark combination. Use when you want logo + "Amory" together.
 */
export function AmoryLogotype({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <AmoryLogo size={size} />
      <span
        className="font-medium tracking-tight"
        style={{
          fontFamily: '"Playfair Display", "Inter", serif',
          fontSize: size * 0.62,
          lineHeight: 1,
        }}
      >
        Amory
      </span>
    </span>
  );
}
