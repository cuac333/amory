import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -100 : 100,
    opacity: 0,
  }),
};

const fadeVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.98 },
};

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navDir = (location.state as { navDir?: number } | null)?.navDir ?? 0;
  const useSlide = navDir !== 0;

  if (useSlide) {
    return (
      <AnimatePresence mode="wait" custom={navDir} initial={false}>
        <motion.div
          key={location.pathname}
          custom={navDir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.7 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={fadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
