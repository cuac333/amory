import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  partnerName: string;
  onEnter: () => void;
}

export default function WelcomeScreen({ partnerName, onEnter }: Props) {
  const [phase, setPhase] = useState(0);

  const handleStart = () => {
    setPhase(1);
    setTimeout(() => setPhase(2), 2000);
    setTimeout(() => setPhase(3), 4000);
    setTimeout(onEnter, 5500);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-tuscan-400"
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Floating hearts */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-white/20 select-none"
          style={{
            left: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 20 + 10}px`,
          }}
          animate={{
            y: [window.innerHeight, -50],
            rotate: [0, 360],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        >
          &#10084;
        </motion.span>
      ))}

      <AnimatePresence mode="wait">
        {phase === 0 && (
          <motion.div
            key="start"
            className="text-center z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -30 }}
          >
            <h1 className="text-5xl md:text-7xl font-display text-white mb-6 drop-shadow-lg">
              Amory
            </h1>
            <p className="text-white/80 text-lg mb-8">给你的特别礼物</p>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-white text-primary rounded-full font-medium text-lg hover:scale-105 transition-transform shadow-xl"
            >
              打开礼物
            </button>
          </motion.div>
        )}

        {phase === 1 && (
          <motion.p
            key="p1"
            className="text-3xl md:text-5xl font-handwriting text-white text-center z-10 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            给 {partnerName}...
          </motion.p>
        )}

        {phase === 2 && (
          <motion.p
            key="p2"
            className="text-3xl md:text-5xl font-handwriting text-white text-center z-10 drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            献上我全部的爱
          </motion.p>
        )}

        {phase === 3 && (
          <motion.div
            key="p3"
            className="text-center z-10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="text-8xl">&#10084;&#65039;</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
