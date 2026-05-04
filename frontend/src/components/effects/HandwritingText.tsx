import { motion } from "framer-motion";

interface Props {
  text: string;
  className?: string;
  speed?: number;
}

export default function HandwritingText({ text, className = "", speed = 0.05 }: Props) {
  const letters = text.split("");

  return (
    <span className={`font-handwriting ${className}`}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * speed, duration: 0.1 }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  );
}
