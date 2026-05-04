import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAY_NAMES_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, placeholder = "Selecciona una fecha" }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const selected = value ? new Date(value + "T12:00:00") : null;
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const isToday = (day: number) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  const isSelected = (day: number) => selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;

  const displayText = selected
    ? `${selected.getDate()} de ${MONTH_NAMES_ES[selected.getMonth()]} ${selected.getFullYear()}`
    : "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-2.5 bg-warm-50 border rounded-xl text-sm outline-none text-left flex items-center gap-2.5 transition-all ${
          open ? "ring-2 ring-tuscan-200 border-tuscan-300" : !value ? "border-warm-200" : "border-warm-200"
        }`}
      >
        <Calendar size={15} className="text-burnt-300/70 shrink-0" />
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
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[280px] bg-white rounded-2xl shadow-elevated border border-warm-100 p-3" style={{ zIndex: 10000 }}
          >
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-warm-50 text-charcoal-400 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="font-semibold text-charcoal-700 text-sm">
                {MONTH_NAMES_ES[viewMonth]} {viewYear}
              </span>
              <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-warm-50 text-charcoal-400 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-0.5">
              {DAY_NAMES_ES.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-warm-400 py-0.5">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 place-items-center">
              {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${
                    isSelected(day)
                      ? "bg-gradient-to-br from-burnt-300 to-sandy-300 text-white shadow-md shadow-burnt-200/30"
                      : isToday(day)
                        ? "bg-burnt-50 text-burnt-400 font-bold ring-1 ring-burnt-200"
                        : "text-charcoal-600 hover:bg-warm-50"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 mt-2 pt-2 border-t border-warm-100">
              <button
                type="button"
                onClick={() => { const t = today; setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); selectDay(t.getDate()); }}
                className="flex-1 py-1.5 text-[11px] font-medium text-burnt-400 bg-burnt-50/50 rounded-lg hover:bg-burnt-50 transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => { const t = new Date(today.getTime() + 7 * 86400000); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); selectDay(t.getDate()); }}
                className="flex-1 py-1.5 text-[11px] font-medium text-charcoal-400 bg-warm-50 rounded-lg hover:bg-warm-100 transition-colors"
              >
                En 1 semana
              </button>
              <button
                type="button"
                onClick={() => { const t = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()); setViewMonth(t.getMonth()); setViewYear(t.getFullYear()); selectDay(t.getDate()); }}
                className="flex-1 py-1.5 text-[11px] font-medium text-charcoal-400 bg-warm-50 rounded-lg hover:bg-warm-100 transition-colors"
              >
                En 1 mes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
