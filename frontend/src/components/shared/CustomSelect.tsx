import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "../../context/I18nContext";

export interface SelectOption {
  key: string;
  label: string;
  icon?: LucideIcon;
  color?: string; // Tailwind text color class for the icon when selected
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  /** Compact style for forms (smaller padding, no icon backgrounds) */
  compact?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  compact = false,
}: CustomSelectProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t("select");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick as EventListener);
    };
  }, []);

  const selected = options.find((o) => o.key === value);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between rounded-xl border transition-all text-left ${
          compact ? "px-3 py-2" : "px-4 py-3"
        } ${
          selected
            ? "border-burnt-200/60 bg-burnt-50/30"
            : "border-warm-200 bg-warm-50 hover:bg-warm-100/80"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selected ? (
            <>
              {selected.icon && (
                compact ? (
                  <selected.icon
                    size={compact ? 14 : 16}
                    className={selected.color || "text-burnt-400"}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-burnt-50 to-sandy-50 flex items-center justify-center shrink-0">
                    <selected.icon size={16} className={selected.color || "text-burnt-400"} />
                  </div>
                )
              )}
              <span className={`font-medium text-charcoal-600 truncate ${compact ? "text-xs" : "text-sm"}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className={`text-charcoal-300 ${compact ? "text-xs" : "text-sm"}`}>
              {resolvedPlaceholder}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 ml-2"
        >
          <ChevronDown size={compact ? 14 : 18} className="text-charcoal-300" />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-elevated border border-warm-200/40 overflow-hidden z-50 max-h-60 overflow-y-auto ${
              compact ? "" : "rounded-2xl"
            }`}
          >
            {options.map((opt) => {
              const isActive = value === opt.key;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 text-left transition-colors ${
                    compact ? "px-3 py-2" : "px-4 py-3"
                  } ${
                    isActive
                      ? "bg-burnt-50/60 text-burnt-500"
                      : "text-charcoal-600 hover:bg-warm-50 active:bg-warm-100"
                  }`}
                >
                  {Icon && (
                    compact ? (
                      <Icon
                        size={compact ? 14 : 16}
                        className={isActive ? (opt.color || "text-burnt-400") : "text-warm-400"}
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-burnt-300 text-white shadow-sm"
                            : "bg-warm-50 text-charcoal-400"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                    )
                  )}
                  <span className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>
                    {opt.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-burnt-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
