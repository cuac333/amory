import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ClickableImage({ src, alt = "", className = "", children }: ImageViewerProps) {
  const [open, setOpen] = useState(false);

  if (!src) return children ? <>{children}</> : null;

  return (
    <>
      <div className="cursor-pointer" onClick={() => setOpen(true)}>
        {children ?? <img src={src} alt={alt} className={className} />}
      </div>
      <ImageViewer src={src} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

interface ImageViewerModalProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

export function ImageViewer({ src, alt = "", open, onClose }: ImageViewerModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={24} />
          </button>
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
