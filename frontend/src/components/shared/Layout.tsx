import { type ReactNode, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import SpotifyMiniPlayer from "./SpotifyMiniPlayer";
import PageTransition from "./PageTransition";

const NAV_PATHS = ["/", "/book", "/monthly", "/outings", "/wishlist", "/diary", "/minigames", "/more"];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number; t: number; el: EventTarget } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), el: e.target };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const start = touchRef.current;
    touchRef.current = null;

    // Skip if swipe started inside an element that handles its own swipe
    if (start.el instanceof HTMLElement && start.el.closest("[data-no-page-swipe]")) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dt = Date.now() - start.t;

    // Require: fast, far enough horizontally, mostly horizontal
    if (dt > 350 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.6) return;

    // Block swipe if user has an active form with content
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) {
      const val = (active as HTMLInputElement | HTMLTextAreaElement).value;
      if (val && val.trim().length > 0) return;
    }
    // Block swipe if any open form has unsaved data
    if (document.querySelector("[data-unsaved-form]")) return;

    const idx = NAV_PATHS.indexOf(location.pathname);
    if (idx === -1) return;

    if (dx < 0 && idx < NAV_PATHS.length - 1) {
      navigate(NAV_PATHS[idx + 1], { state: { navDir: 1 } });
    } else if (dx > 0 && idx > 0) {
      navigate(NAV_PATHS[idx - 1], { state: { navDir: -1 } });
    }
  }, [location.pathname, navigate]);

  return (
    <div
      className="min-h-screen bg-warm-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Navbar />
      <main className="pt-2 md:pt-[72px] pb-20 md:pb-10 px-3 md:px-8 max-w-5xl mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
      <SpotifyMiniPlayer />
    </div>
  );
}
