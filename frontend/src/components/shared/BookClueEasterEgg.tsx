import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Search } from "lucide-react";
import api from "../../services/api";

interface Props {
  section: string;
}

export default function BookClueEasterEgg({ section }: Props) {
  const [clue, setClue] = useState<{ hint_text: string; order: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [found, setFound] = useState(false);

  useEffect(() => {
    const foundClues = JSON.parse(sessionStorage.getItem("found_clues") || "[]");
    if (foundClues.includes(section)) {
      setFound(true);
    }
    api.get("/book-clues/for-section", { params: { section } })
      .then((res) => {
        if (res.data.found) {
          setClue({ hint_text: res.data.hint_text, order: res.data.order });
        }
      })
      .catch(() => {});
  }, [section]);

  if (!clue) return null;

  const handleClick = () => {
    setRevealed(true);
    if (!found) {
      setFound(true);
      const foundClues = JSON.parse(sessionStorage.getItem("found_clues") || "[]");
      if (!foundClues.includes(section)) {
        foundClues.push(section);
        sessionStorage.setItem("found_clues", JSON.stringify(foundClues));
      }
    }
  };

  return (
    <>
      {/* Banner — clickeable, shows hint status */}
      {!found ? (
        <motion.button
          onClick={handleClick}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="w-full flex items-center gap-2 px-3 py-2 bg-burnt-50/50 rounded-xl border border-burnt-100/30 mt-2 text-left"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Search size={12} className="text-burnt-300 shrink-0" />
          </motion.div>
          <p className="text-[11px] text-burnt-400/80 italic">Hay un secreto escondido en esta pagina...</p>
        </motion.button>
      ) : (
        <motion.button
          onClick={handleClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full flex items-center gap-2 px-3 py-2 bg-green-50/50 rounded-xl border border-green-100/30 mt-2 text-left"
        >
          <KeyRound size={12} className="text-green-500 shrink-0" />
          <p className="text-[11px] text-green-600/80 font-medium">Pista #{clue.order + 1} encontrada — toca para ver</p>
        </motion.button>
      )}

      {/* Revealed clue modal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setRevealed(false)}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 max-w-xs w-full text-center border border-burnt-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-burnt-100 to-sandy-100 flex items-center justify-center">
                <KeyRound size={22} className="text-burnt-400" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-charcoal-300 font-semibold mb-1">
                Pista #{clue.order + 1}
              </p>
              <p className="text-sm text-charcoal-600 font-medium leading-relaxed">
                {clue.hint_text}
              </p>
              <div className="mt-4 pt-3 border-t border-warm-100">
                <p className="text-[10px] text-charcoal-300 italic">
                  Recuerda esta pista para el libro...
                </p>
              </div>
              <button
                onClick={() => setRevealed(false)}
                className="mt-3 text-xs text-burnt-400 font-medium hover:text-burnt-500"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
