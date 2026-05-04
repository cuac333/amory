import { motion, AnimatePresence } from "framer-motion";
import { useSpotify } from "../../context/SpotifyContext";
import { ChevronUp, ChevronDown, X } from "lucide-react";

export default function SpotifyMiniPlayer() {
  const { embedUrl, label, visible, expanded, toggle, stop } = useSpotify();

  if (!visible || !embedUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40"
      >
        {/* Backdrop blur bar */}
        <div className="mx-2 md:mx-auto md:max-w-5xl rounded-t-2xl overflow-hidden shadow-elevated border border-warm-200/40 bg-white/95 backdrop-blur-xl">
          {/* Mini bar (always visible) */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            {/* Spotify icon */}
            <div className="w-9 h-9 rounded-xl bg-[#1DB954] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.64 5.801 15.54 6.001 20.1 8.82c.541.3.719 1.02.42 1.56-.299.421-1.02.599-1.439.3z" />
              </svg>
            </div>

            {/* Label */}
            <button onClick={toggle} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-charcoal-600 truncate">{label}</p>
              <p className="text-[10px] text-charcoal-300">
                {expanded ? "Toca para minimizar" : "Toca para expandir"}
              </p>
            </button>

            {/* Controls */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-charcoal-400 hover:bg-warm-100 transition-colors"
            >
              {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            <button
              onClick={stop}
              className="p-2 rounded-xl text-charcoal-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Expanded embed */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 352, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-none"
                  title="Spotify Player"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
