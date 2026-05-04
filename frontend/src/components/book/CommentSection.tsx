import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import api from "../../services/api";
import { useTranslation } from "../../context/I18nContext";
import type { Comment } from "../../types";

interface Props {
  pageId: number;
  commentsCount: number;
}

export default function CommentSection({ pageId, commentsCount }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [count, setCount] = useState(commentsCount);

  useEffect(() => {
    if (isOpen && pageId > 0) {
      api.get(`/book/pages/${pageId}/comments`).then((res) => setComments(res.data));
    }
  }, [isOpen, pageId]);

  const submit = async () => {
    if (!newComment.trim() || pageId < 0) return;
    const res = await api.post(`/book/pages/${pageId}/comments`, { content: newComment });
    setComments((c) => [...c, res.data]);
    setNewComment("");
    setCount((c) => c + 1);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-warm-400 hover:text-sandy-300 transition-colors group"
      >
        <MessageCircle size={16} className="group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium">{count}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[70vh] flex flex-col shadow-elevated"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
                <h3 className="font-display text-lg font-semibold text-charcoal-700">{t("book.comments")}</h3>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-warm-50 flex items-center justify-center hover:bg-warm-100 transition-colors">
                  <X size={16} className="text-charcoal-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {comments.length === 0 && (
                  <div className="text-center py-10">
                    <MessageCircle size={32} className="mx-auto text-warm-300 mb-2" />
                    <p className="text-warm-400 text-sm">{t("book.comments.empty")}</p>
                  </div>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="bg-warm-50 rounded-2xl p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-burnt-300 to-verdigris-400 flex items-center justify-center text-white text-[10px] font-bold">
                        {c.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-xs text-charcoal-600">{c.user_name}</span>
                      <span className="text-[10px] text-warm-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal-500 pl-8">{c.content}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-warm-200 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={t("book.comments.placeholder")}
                  className="flex-1 px-4 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:ring-2 focus:ring-tuscan-200 outline-none"
                />
                <button
                  onClick={submit}
                  className="w-10 h-10 bg-burnt-300 text-white rounded-xl flex items-center justify-center hover:bg-burnt-400 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
