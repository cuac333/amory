import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Smile, Star, Flame, Sparkles, CloudRain } from "lucide-react";
import api from "../../services/api";
import type { ReactionCount } from "../../types";

const REACTIONS = [
  { key: "love", icon: Heart, label: "Amor", color: "text-burnt-300", bg: "bg-burnt-50" },
  { key: "happy", icon: Smile, label: "Feliz", color: "text-sandy-500", bg: "bg-sandy-50" },
  { key: "star", icon: Star, label: "Favorito", color: "text-tuscan-500", bg: "bg-tuscan-50" },
  { key: "fire", icon: Flame, label: "Fuego", color: "text-sandy-500", bg: "bg-sandy-50" },
  { key: "magic", icon: Sparkles, label: "Mágico", color: "text-charcoal-500", bg: "bg-charcoal-50" },
  { key: "emotional", icon: CloudRain, label: "Emotivo", color: "text-charcoal-500", bg: "bg-charcoal-50" },
];

interface Props {
  pageId: number;
}

export default function ReactionBar({ pageId }: Props) {
  const [reactions, setReactions] = useState<ReactionCount[]>([]);

  useEffect(() => {
    if (pageId > 0) {
      api.get(`/book/pages/${pageId}/reactions`).then((res) => setReactions(res.data)).catch(() => {});
    }
  }, [pageId]);

  const toggleReaction = async (key: string) => {
    if (pageId < 0) {
      // Local-only toggle for placeholder pages
      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === key);
        if (existing) {
          return existing.count <= 1
            ? prev.filter((r) => r.emoji !== key)
            : prev.map((r) => r.emoji === key ? { ...r, count: r.count - 1 } : r);
        }
        return [...prev, { emoji: key, count: 1 }];
      });
      return;
    }
    try {
      await api.post(`/book/pages/${pageId}/reactions`, { emoji: key });
      const res = await api.get(`/book/pages/${pageId}/reactions`);
      setReactions(res.data);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTIONS.map((r) => {
        const Icon = r.icon;
        const reaction = reactions.find((rx) => rx.emoji === r.key);
        const count = reaction?.count || 0;
        const active = count > 0;
        return (
          <motion.button
            key={r.key}
            whileTap={{ scale: 1.2 }}
            onClick={() => toggleReaction(r.key)}
            title={r.label}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
              active
                ? `${r.bg} ${r.color} border border-current/20`
                : "bg-warm-50 text-warm-400 hover:bg-warm-100"
            }`}
          >
            <Icon size={12} className={active ? "fill-current/20" : ""} />
            {count > 0 && <span className="font-medium">{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
