import { useEffect, useRef } from "react";

type ParticleType = "hearts" | "petals" | "stars" | "snow";

const EMOJIS: Record<ParticleType, string[]> = {
  hearts: ["\u2764", "\u{1F497}", "\u{1F495}", "\u{1F49E}"],
  petals: ["\u{1F33A}", "\u{1F338}", "\u{1F33C}", "\u{1F337}"],
  stars: ["\u2B50", "\u{1F31F}", "\u2728", "\u{1F4AB}"],
  snow: ["\u2744", "\u{1F328}", "\u2746", "\u2745"],
};

interface Props {
  type: ParticleType;
  count?: number;
}

export default function ParticleEffect({ type, count = 15 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const emojis = EMOJIS[type];
    const particles: HTMLSpanElement[] = [];

    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      span.className = "absolute pointer-events-none select-none opacity-60";
      span.style.left = `${Math.random() * 100}%`;
      span.style.fontSize = `${Math.random() * 16 + 10}px`;
      span.style.animationDuration = `${Math.random() * 6 + 4}s`;
      span.style.animationDelay = `${Math.random() * 5}s`;
      span.style.animation = `particleFall ${Math.random() * 6 + 4}s linear ${Math.random() * 5}s infinite`;
      container.appendChild(span);
      particles.push(span);
    }

    return () => {
      particles.forEach((p) => p.remove());
    };
  }, [type, count]);

  return (
    <>
      <style>{`
        @keyframes particleFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(calc(100vh)) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden pointer-events-none z-10"
      />
    </>
  );
}
