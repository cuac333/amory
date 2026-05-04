import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Search, Plus, Trash2, RefreshCw, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Clock, MapPin, Calendar, X,
} from "lucide-react";
import api from "../services/api";

interface TicketSearchResult {
  event_id: string;
  event_name: string;
  event_url: string | null;
  image_url: string | null;
  venue: string | null;
  city: string | null;
  event_date: string | null;
  status: string;
}

interface TicketWatch extends TicketSearchResult {
  id: number;
  last_checked: string | null;
  last_notified_status: string | null;
  check_count: number;
  last_error: string | null;
  active: boolean;
  created_at: string;
}

interface ConfigInfo {
  api_key_configured: boolean;
  poll_seconds: number;
}

const STATUS_META: Record<string, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  onsale: { label: "Disponibles", tone: "bg-mint-100 text-mint-700 border-mint-200 dark:bg-mint-500/15 dark:text-mint-300 dark:border-mint-500/30", Icon: CheckCircle2 },
  offsale: { label: "Agotadas", tone: "bg-warm-100 text-charcoal-500 border-warm-200 dark:bg-[#2e3638] dark:text-charcoal-200 dark:border-[#3a4244]", Icon: XCircle },
  cancelled: { label: "Cancelado", tone: "bg-burnt-50 text-burnt-600 border-burnt-200 dark:bg-burnt-500/15 dark:text-burnt-300 dark:border-burnt-500/30", Icon: XCircle },
  rescheduled: { label: "Reprogramado", tone: "bg-sandy-50 text-sandy-700 border-sandy-200 dark:bg-sandy-500/15 dark:text-sandy-300 dark:border-sandy-500/30", Icon: AlertTriangle },
  postponed: { label: "Pospuesto", tone: "bg-sandy-50 text-sandy-700 border-sandy-200 dark:bg-sandy-500/15 dark:text-sandy-300 dark:border-sandy-500/30", Icon: AlertTriangle },
  unknown: { label: "Desconocido", tone: "bg-warm-100 text-charcoal-400 border-warm-200 dark:bg-[#2e3638] dark:text-charcoal-300", Icon: Clock },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "nunca";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString("es");
}

export default function TicketsPage() {
  const [config, setConfig] = useState<ConfigInfo | null>(null);
  const [watches, setWatches] = useState<TicketWatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TicketSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [checking, setChecking] = useState<number | null>(null);

  const loadWatches = useCallback(async () => {
    try {
      const res = await api.get<TicketWatch[]>("/tickets/");
      setWatches(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [cfg] = await Promise.all([
          api.get<ConfigInfo>("/tickets/config"),
          loadWatches(),
        ]);
        setConfig(cfg.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadWatches]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearched(true);
    try {
      const params: Record<string, string> = { q: query.trim() };
      if (country.trim()) params.country = country.trim().toUpperCase();
      if (city.trim()) params.city = city.trim();
      const res = await api.get<{ results: TicketSearchResult[] }>("/tickets/search", { params });
      setResults(res.data.results);
    } catch (e: any) {
      setResults([]);
      setSearchError(e?.response?.data?.detail || "Error buscando eventos");
    } finally {
      setSearching(false);
    }
  };

  const addWatch = async (r: TicketSearchResult) => {
    try {
      await api.post("/tickets/", r);
      setShowSearch(false);
      setQuery("");
      setCountry("");
      setCity("");
      setResults([]);
      setSearched(false);
      await loadWatches();
    } catch {
      // ignore
    }
  };

  const checkNow = async (id: number) => {
    setChecking(id);
    try {
      const res = await api.post<TicketWatch>(`/tickets/${id}/check`);
      setWatches((prev) => prev.map((w) => (w.id === id ? res.data : w)));
    } catch {
      // ignore
    } finally {
      setChecking(null);
    }
  };

  const removeWatch = async (id: number) => {
    try {
      await api.delete(`/tickets/${id}`);
      setWatches((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-charcoal-500 dark:text-warm-100 flex items-center gap-2">
          <Ticket size={24} className="text-burnt-400" />
          Boletas
        </h1>
        <p className="text-sm text-charcoal-300 dark:text-warm-400 mt-0.5">
          Te avisamos cuando haya boletas disponibles para los eventos que sigas.
        </p>
      </div>

      {/* API key warning */}
      {config && !config.api_key_configured && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-sandy-200 bg-sandy-50 dark:bg-sandy-500/10 dark:border-sandy-500/30">
          <AlertTriangle size={18} className="text-sandy-600 dark:text-sandy-300 mt-0.5 shrink-0" />
          <div className="text-sm text-charcoal-600 dark:text-warm-200">
            <p className="font-medium">Falta configurar la API key de Ticketmaster.</p>
            <p className="text-xs text-charcoal-400 dark:text-warm-300 mt-1">
              Registra una app en{" "}
              <a className="text-burnt-500 underline" href="https://developer.ticketmaster.com/" target="_blank" rel="noreferrer">
                developer.ticketmaster.com
              </a>{" "}
              y exporta <code className="text-[11px] bg-warm-100 dark:bg-[#2e3638] px-1 py-0.5 rounded">TICKETMASTER_API_KEY</code>{" "}
              antes de arrancar el backend.
            </p>
          </div>
        </div>
      )}

      {/* Add button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowSearch((s) => !s)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-burnt-200/60 dark:border-burnt-500/30 text-burnt-500 dark:text-burnt-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-burnt-50/40 dark:hover:bg-burnt-500/10 transition-colors"
      >
        <Plus size={16} /> Seguir un evento
      </motion.button>

      {/* Search form */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#1e2425] rounded-3xl p-5 border border-warm-200/40 dark:border-[#2e3638] space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-charcoal-600 dark:text-warm-100">Buscar evento</p>
                <button
                  onClick={() => { setShowSearch(false); setQuery(""); setCountry(""); setCity(""); setResults([]); setSearchError(null); setSearched(false); }}
                  className="p-1 rounded-lg text-charcoal-300 hover:bg-warm-100 dark:hover:bg-[#2e3638] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder='Ej. "BTS", "Bad Bunny"…'
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-warm-50 dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm text-charcoal-600 dark:text-warm-100 outline-none focus:border-burnt-300 focus:ring-4 focus:ring-burnt-200/40"
                  />
                </div>
                <button
                  onClick={runSearch}
                  disabled={searching || !query.trim() || !config?.api_key_configured}
                  className="shrink-0 h-11 px-4 rounded-xl bg-gradient-to-r from-burnt-400 to-sandy-400 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {searching ? "Buscando…" : "Buscar"}
                </button>
              </div>

              {/* Filtros país + ciudad */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wide text-charcoal-400 dark:text-warm-400 mb-1.5">
                    País (ISO-2)
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.slice(0, 2))}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder="CO, US, MX, ES…"
                    maxLength={2}
                    className="w-full h-10 px-3 rounded-xl bg-warm-50 dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm uppercase text-charcoal-600 dark:text-warm-100 outline-none focus:border-burnt-300 focus:ring-4 focus:ring-burnt-200/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wide text-charcoal-400 dark:text-warm-400 mb-1.5">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder="Bogotá, Madrid…"
                    className="w-full h-10 px-3 rounded-xl bg-warm-50 dark:bg-dark-input border border-warm-200 dark:border-dark-border text-sm text-charcoal-600 dark:text-warm-100 outline-none focus:border-burnt-300 focus:ring-4 focus:ring-burnt-200/40"
                  />
                </div>
              </div>
              <p className="text-[10px] text-charcoal-300 dark:text-warm-500 -mt-2">
                Deja los filtros vacíos para buscar en todo el mundo.
              </p>

              {searchError && (
                <p className="text-xs text-burnt-500 dark:text-burnt-300">{searchError}</p>
              )}

              {searched && !searching && !searchError && results.length === 0 && (
                <p className="text-xs text-charcoal-400 dark:text-warm-400 italic">
                  Sin resultados. Prueba sin ciudad o cambia el país.
                </p>
              )}

              {results.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={r.event_id}
                      onClick={() => addWatch(r)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-warm-200/50 dark:border-[#2e3638] hover:border-burnt-300 dark:hover:border-burnt-400/40 text-left transition-colors"
                    >
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-warm-100 dark:bg-[#2e3638] flex items-center justify-center shrink-0">
                          <Ticket size={18} className="text-warm-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal-600 dark:text-warm-100 truncate">{r.event_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-charcoal-400 dark:text-warm-400">
                          {r.venue && <span className="truncate inline-flex items-center gap-1"><MapPin size={10} /> {r.venue}</span>}
                          {r.event_date && <span className="inline-flex items-center gap-1"><Calendar size={10} /> {formatDate(r.event_date)}</span>}
                        </div>
                      </div>
                      <Plus size={16} className="text-burnt-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watch list */}
      {watches.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-warm-100 to-warm-200 dark:from-[#1a2022] dark:to-[#262e30] flex items-center justify-center">
            <Ticket size={36} className="text-warm-400" />
          </div>
          <p className="text-charcoal-400 dark:text-warm-400 text-sm font-medium">
            Aún no sigues ningún evento.
          </p>
          <p className="text-xs text-charcoal-300 dark:text-warm-500 mt-1">
            Agrega uno y te avisaremos cuando sus boletas estén a la venta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {watches.map((w) => {
            const meta = STATUS_META[w.status] || STATUS_META.unknown;
            const Icon = meta.Icon;
            return (
              <div
                key={w.id}
                className="bg-white dark:bg-[#1e2425] rounded-3xl overflow-hidden border border-warm-200/40 dark:border-[#2e3638]"
              >
                <div className="flex gap-4 p-4">
                  {w.image_url ? (
                    <img src={w.image_url} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-warm-100 dark:bg-[#2e3638] flex items-center justify-center shrink-0">
                      <Ticket size={22} className="text-warm-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-charcoal-600 dark:text-warm-100 truncate">
                        {w.event_name}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${meta.tone}`}>
                        <Icon size={10} /> {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-[11px] text-charcoal-400 dark:text-warm-400">
                      {w.venue && (
                        <p className="inline-flex items-center gap-1">
                          <MapPin size={10} /> {w.venue}{w.city ? `, ${w.city}` : ""}
                        </p>
                      )}
                      {w.event_date && (
                        <p className="inline-flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(w.event_date)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2.5">
                      <button
                        onClick={() => checkNow(w.id)}
                        disabled={checking === w.id}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-burnt-500 hover:text-burnt-600 dark:text-burnt-300 disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={checking === w.id ? "animate-spin" : ""} />
                        {checking === w.id ? "Revisando…" : "Revisar ahora"}
                      </button>
                      {w.event_url && (
                        <a
                          href={w.event_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-verdigris-500 hover:text-verdigris-600"
                        >
                          <ExternalLink size={11} /> Ver en Ticketmaster
                        </a>
                      )}
                      <button
                        onClick={() => removeWatch(w.id)}
                        className="ml-auto p-1 rounded-lg text-charcoal-300 hover:text-burnt-500 hover:bg-burnt-50 dark:hover:bg-burnt-500/10 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {(w.last_checked || w.last_error) && (
                  <div className="px-4 py-2 bg-warm-50/60 dark:bg-[#1a2022] border-t border-warm-200/40 dark:border-[#2e3638] flex items-center justify-between text-[10px]">
                    <span className="text-charcoal-400 dark:text-warm-400">
                      Última revisión: {formatRelative(w.last_checked)}
                      {w.check_count > 0 && ` · ${w.check_count} chequeos`}
                    </span>
                    {w.last_error && (
                      <span className="text-burnt-500 dark:text-burnt-300 truncate max-w-[60%]" title={w.last_error}>
                        ⚠ {w.last_error}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      {config?.api_key_configured && (
        <p className="text-[11px] text-charcoal-300 dark:text-warm-500 text-center">
          Revisando cada {Math.round(config.poll_seconds / 60)} min en segundo plano.
        </p>
      )}
    </motion.div>
  );
}
