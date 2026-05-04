import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import api from "../../services/api";

interface Props {
  pageId: number;
  initialLiked?: boolean;
  initialCount?: number;
}

export default function LikeButton({ pageId, initialLiked = false, initialCount = 0 }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  // Fetch real like state from backend
  useEffect(() => {
    if (pageId > 0) {
      api.get(`/book/pages/${pageId}/likes`).then((res) => {
        setLiked(res.data.user_liked);
        setCount(res.data.count);
      }).catch(() => {});
    }
  }, [pageId]);

  const toggle = async () => {
    if (pageId < 0) {
      const newLiked = !liked;
      setLiked(newLiked);
      setCount((c) => (newLiked ? c + 1 : c - 1));
      if (newLiked) {
        const id = Date.now();
        setFloatingHearts((h) => [...h, id]);
        setTimeout(() => setFloatingHearts((h) => h.filter((x) => x !== id)), 1500);
      }
      return;
    }
    try {
      const res = await api.post(`/book/pages/${pageId}/like`);
      setLiked(res.data.liked);
      setCount((c) => (res.data.liked ? c + 1 : c - 1));
      if (res.data.liked) {
        const id = Date.now();
        setFloatingHearts((h) => [...h, id]);
        setTimeout(() => setFloatingHearts((h) => h.filter((x) => x !== id)), 1500);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button onClick={toggle} className="relative group">
        <motion.div whileTap={{ scale: 1.3 }} transition={{ type: "spring", stiffness: 500 }}>
          <Heart
            size={18}
            className={`transition-colors ${
              liked ? "text-burnt-300 fill-burnt-300" : "text-warm-400 group-hover:text-sandy-200"
            }`}
          />
        </motion.div>
      </button>
      <span className="text-xs text-charcoal-400 font-medium">{count}</span>

      <AnimatePresence>
        {floatingHearts.map((id) => (
          <motion.span
            key={id}
            className="absolute -top-2 left-1/2 text-burnt-300 pointer-events-none"
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -30, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <Heart size={14} className="fill-burnt-300" />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
