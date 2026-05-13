import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  value: string;           // "HH:MM" or ""
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function TimePicker({ value, onChange, placeholder = "选择时间" }: Props) {
  const [open, setOpen] = useState(false);

  const parsed = value ? value.split(":").map(Number) : [12, 0];
  const [selHour, selMin] = parsed;
  const isPM = selHour >= 12;
  const display12 = selHour === 0 ? 12 : selHour > 12 ? selHour - 12 : selHour;

  const displayText = value
    ? `${display12}:${String(selMin).padStart(2, "0")} ${isPM ? "p.m." : "a.m."}`
    : "";

  const update = (h: number, m: number) => {
    const hh = String(Math.max(0, Math.min(23, h))).padStart(2, "0");
    const mm = String(Math.max(0, Math.min(59, m))).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const incHour = (dir: 1 | -1) => {
    let h = selHour + dir;
    if (h < 0) h = 23;
    if (h > 23) h = 0;
    update(h, selMin);
  };

  const incMin = (dir: 1 | -1) => {
    let m = selMin + dir * 5;
    if (m < 0) m = 55;
    if (m > 59) m = 0;
    update(selHour, m);
  };

  const togglePeriod = () => {
    update(isPM ? selHour - 12 : selHour + 12, selMin);
  };

  const setQuick = (h: number, m: number) => {
    update(h, m);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!value) update(12, 0);
          setOpen(!open);
        }}
        className={`w-full px-4 py-2.5 bg-warm-50 border rounded-xl text-sm outline-none text-left flex items-center gap-2.5 transition-all ${
          open ? "ring-2 ring-tuscan-200 border-tuscan-300" : "border-warm-200"
        }`}
      >
        <Clock size={15} className="text-burnt-300/70 shrink-0" />
        {displayText ? (
          <span className="text-charcoal-600">{displayText}</span>
        ) : (
          <span className="text-warm-400">{placeholder}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[260px] bg-white rounded-2xl shadow-elevated border border-warm-100 p-4"
            style={{ zIndex: 10000 }}
          >
            {/* Spinners */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* Hour */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => incHour(1)}
                  className="p-1.5 rounded-lg hover:bg-warm-50 text-charcoal-400 transition-colors"
                >
                  <ChevronUp size={18} />
                </button>
                <div className="w-14 h-12 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-center text-xl font-bold text-charcoal-700">
                  {display12}
                </div>
                <button
                  type="button"
                  onClick={() => incHour(-1)}
                  className="p-1.5 rounded-lg hover:bg-warm-50 text-charcoal-400 transition-colors"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              <span className="text-xl font-bold text-charcoal-300 mt-[-2px]">:</span>

              {/* Minute */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => incMin(1)}
                  className="p-1.5 rounded-lg hover:bg-warm-50 text-charcoal-400 transition-colors"
                >
                  <ChevronUp size={18} />
                </button>
                <div className="w-14 h-12 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-center text-xl font-bold text-charcoal-700">
                  {String(selMin).padStart(2, "0")}
                </div>
                <button
                  type="button"
                  onClick={() => incMin(-1)}
                  className="p-1.5 rounded-lg hover:bg-warm-50 text-charcoal-400 transition-colors"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* AM/PM */}
              <div className="flex flex-col gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => { if (isPM) togglePeriod(); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    !isPM
                      ? "bg-gradient-to-br from-burnt-300 to-sandy-300 text-white shadow-sm"
                      : "bg-warm-50 text-charcoal-400 hover:bg-warm-100"
                  }`}
                >
                  a.m.
                </button>
                <button
                  type="button"
                  onClick={() => { if (!isPM) togglePeriod(); }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isPM
                      ? "bg-gradient-to-br from-burnt-300 to-sandy-300 text-white shadow-sm"
                      : "bg-warm-50 text-charcoal-400 hover:bg-warm-100"
                  }`}
                >
                  p.m.
                </button>
              </div>
            </div>

            {/* Quick options */}
            <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-warm-100">
              {[
                { label: "8:00 am", h: 8, m: 0 },
                { label: "12:00 pm", h: 12, m: 0 },
                { label: "2:00 pm", h: 14, m: 0 },
                { label: "6:00 pm", h: 18, m: 0 },
                { label: "7:00 pm", h: 19, m: 0 },
                { label: "8:00 pm", h: 20, m: 0 },
                { label: "9:00 pm", h: 21, m: 0 },
                { label: "10:00 pm", h: 22, m: 0 },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setQuick(q.h, q.m)}
                  className="py-1.5 text-[10px] font-medium text-charcoal-400 bg-warm-50 rounded-lg hover:bg-warm-100 transition-colors text-center"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex-1 py-1.5 text-[11px] font-medium text-charcoal-400 bg-warm-50 rounded-lg hover:bg-warm-100 transition-colors"
              >
                不设时间
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-1.5 text-[11px] font-medium text-burnt-400 bg-burnt-50/50 rounded-lg hover:bg-burnt-50 transition-colors"
              >
                确认
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
