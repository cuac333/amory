import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import type { MemoryPin, DeletionRequest } from "../types";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/I18nContext";
import {
  Plus, X, MapPin, Camera, Save, Navigation, Heart,
  ChevronUp, ChevronDown, Crosshair, List, ImageIcon,
  Calendar, Trash2, Globe, Search,
} from "lucide-react";
import DeleteButton from "../components/shared/DeleteButton";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createPinIcon(hasPhoto: boolean) {
  return new L.DivIcon({
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:linear-gradient(135deg,#c98a61,#d4a574);
      border:3px solid white;
      box-shadow:0 3px 12px rgba(201,138,97,0.4);
      transition:transform 0.2s;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </div>
    ${hasPhoto ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;">
      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
    </div>` : ""}`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

const NEW_PIN_ICON = new L.DivIcon({
  html: `<div style="
    width:40px;height:40px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#c98a61,#e8b78a);
    border:3px solid white;
    box-shadow:0 0 0 4px rgba(201,138,97,0.25), 0 4px 16px rgba(201,138,97,0.4);
    animation:pulse 1.5s infinite;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

function RecenterButton() {
  const map = useMap();
  const { t } = useTranslation();
  return (
    <button
      onClick={() => map.locate({ setView: true, maxZoom: 14 })}
      title={t("map.my.location")}
      className="absolute top-3 right-3 z-[1000] w-10 h-10 bg-white dark:bg-charcoal-800 rounded-xl shadow-elevated border border-warm-200/30 dark:border-charcoal-700/50 flex items-center justify-center hover:bg-warm-50 dark:hover:bg-charcoal-700 transition-all active:scale-95"
    >
      <Crosshair size={16} className="text-charcoal-500 dark:text-warm-300" />
    </button>
  );
}

export default function MemoryMapPage() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const [pins, setPins] = useState<MemoryPin[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [showList, setShowList] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MemoryPin | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadPins = () => {
    Promise.all([
      api.get("/map/pins"),
      api.get("/deletion-requests/", { params: { entity_type: "memory_pin", status: "pending" } }),
    ]).then(([pinRes, delRes]) => {
      setPins(pinRes.data);
      setDeletionRequests(delRes.data);
    }).catch(() => {});
  };

  useEffect(() => { loadPins(); }, []);

  const handleMapClick = (lat: number, lng: number) => {
    if (!adding) return;
    setNewLat(lat);
    setNewLng(lng);
  };

  const savePin = async () => {
    if (!title.trim() || newLat === null || newLng === null) return;
    setSaving(true);
    try {
      await api.post("/map/pins", {
        title: title.trim(),
        description: description.trim() || null,
        latitude: newLat,
        longitude: newLng,
      });
      loadPins();
      setAdding(false);
      setNewLat(null);
      setNewLng(null);
      setTitle("");
      setDescription("");
    } catch {}
    setSaving(false);
  };

  const uploadPinPhoto = async (pinId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(`/map/pins/${pinId}/upload-photo`, fd);
      setPins((prev) =>
        prev.map((p) => (p.id === pinId ? { ...p, photo_url: res.data.photo_url } : p))
      );
      if (selectedPin?.id === pinId) {
        setSelectedPin((prev) => prev ? { ...prev, photo_url: res.data.photo_url } : null);
      }
    } catch {}
  };

  const cancelAdd = () => {
    setAdding(false);
    setNewLat(null);
    setNewLng(null);
    setTitle("");
    setDescription("");
  };

  const searchAddress = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=${locale}`
      );
      setSuggestions(await res.json());
    } catch { setSuggestions([]); }
    setSearching(false);
  };

  const handleAddressInput = (value: string) => {
    setAddressSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(value), 400);
  };

  const selectSuggestion = (s: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setNewLat(lat);
    setNewLng(lng);
    setFlyTarget({ lat, lng });
    const name = s.display_name.split(",").slice(0, 3).join(",").trim();
    if (!title.trim()) setTitle(name);
    setAddressSearch(name);
    setSuggestions([]);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setNewLat(lat);
        setNewLng(lng);
        setFlyTarget({ lat, lng });
        // Reverse geocode to get address name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${locale}`
          );
          const data = await res.json();
          const name = data.display_name?.split(",").slice(0, 3).join(",").trim() || "";
          if (name) {
            setAddressSearch(name);
            if (!title.trim()) setTitle(name);
          }
        } catch {}
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getPendingRequest = (id: number) =>
    deletionRequests.find((r) => r.entity_id === id) ?? null;

  const center: [number, number] = pins.length > 0
    ? [pins[0].latitude, pins[0].longitude]
    : [4.711, -74.0721];

  const withPhotos = pins.filter((p) => p.photo_url).length;

  return (
    <div className="relative h-[calc(100vh-88px)] md:h-[calc(100vh-92px)] -mb-20 md:-mb-10">
      {/* Map */}
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full z-0"
        style={{ background: "#f5f0eb" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {adding && <ClickHandler onClick={handleMapClick} />}
        {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}
        <RecenterButton />

        {/* Existing pins */}
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={createPinIcon(!!pin.photo_url)}
            eventHandlers={{
              click: () => setSelectedPin(pin),
            }}
          >
            <Popup maxWidth={300} className="memory-popup-modern">
              <div className="-m-[1px]">
                {pin.photo_url ? (
                  <div className="relative">
                    <img
                      src={pin.photo_url}
                      alt={pin.title}
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <h3 className="font-bold text-white text-sm drop-shadow-md">{pin.title}</h3>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 pt-4 pb-1">
                    <h3 className="font-bold text-charcoal-700 text-sm">{pin.title}</h3>
                  </div>
                )}
                <div className="px-4 py-3 space-y-2">
                  {pin.description && (
                    <p className="text-xs text-charcoal-500 leading-relaxed">{pin.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-charcoal-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={9} />
                      {new Date(pin.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {pin.visited_at && (
                      <span className="flex items-center gap-1">
                        <MapPin size={9} />
                        {new Date(pin.visited_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-burnt-50 to-sandy-50 dark:from-burnt-400/10 dark:to-sandy-400/10 rounded-xl text-[11px] font-medium text-burnt-500 cursor-pointer hover:from-burnt-100 hover:to-sandy-100 transition-all active:scale-95 border border-burnt-200/30">
                      <Camera size={12} />
                      {pin.photo_url ? t("map.change.photo") : t("map.add.photo")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadPinPhoto(pin.id, file);
                        }}
                      />
                    </label>
                    <DeleteButton
                      entityType="memory_pin"
                      entityId={pin.id}
                      pendingRequest={getPendingRequest(pin.id)}
                      currentUserId={user?.id ?? 0}
                      onAction={loadPins}
                    />
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* New pin marker */}
        {newLat !== null && newLng !== null && (
          <Marker position={[newLat, newLng]} icon={NEW_PIN_ICON} />
        )}
      </MapContainer>

      {/* ── Top bar overlay ── */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        {/* Pin count badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md rounded-2xl shadow-elevated border border-warm-200/20 dark:border-charcoal-700/40">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-burnt-400 to-sandy-300 flex items-center justify-center shadow-sm">
            <Heart size={14} className="text-white fill-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-charcoal-700 dark:text-warm-100">{t("map.title")}</p>
            <p className="text-[10px] text-charcoal-400 dark:text-charcoal-500">
              {pins.length} {t("map.places")} {withPhotos > 0 && `· ${withPhotos} ${t("map.with.photos")}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── List toggle button ── */}
      <button
        onClick={() => setShowList(!showList)}
        className={`absolute top-3 right-16 z-[1000] w-10 h-10 rounded-xl shadow-elevated border flex items-center justify-center transition-all active:scale-95 ${
          showList
            ? "bg-burnt-400 border-burnt-400 text-white"
            : "bg-white dark:bg-charcoal-800 border-warm-200/30 dark:border-charcoal-700/50 text-charcoal-500 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-charcoal-700"
        }`}
      >
        <List size={16} />
      </button>

      {/* ── Pin list panel ── */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-16 left-3 right-3 md:left-auto md:right-3 md:w-80 z-[1000] max-h-[55vh] bg-white/95 dark:bg-charcoal-800/95 backdrop-blur-md rounded-2xl shadow-elevated border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-warm-200/20 dark:border-charcoal-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-burnt-400" />
                <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("map.title")}</h3>
              </div>
              <button
                onClick={() => setShowList(false)}
                className="p-1 rounded-lg hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
              >
                <X size={14} className="text-charcoal-400" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(55vh-48px)]">
              {pins.map((pin, i) => (
                <motion.button
                  key={pin.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    setFlyTarget({ lat: pin.latitude, lng: pin.longitude });
                    setSelectedPin(pin);
                    setShowList(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-warm-50/60 dark:hover:bg-charcoal-700/60 transition-colors flex items-center gap-3 border-b border-warm-200/10 dark:border-charcoal-700/30 last:border-0"
                >
                  {pin.photo_url ? (
                    <img
                      src={pin.photo_url}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-burnt-100/50 to-sandy-100/50 dark:from-burnt-400/10 dark:to-sandy-400/10 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-burnt-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-charcoal-700 dark:text-warm-100 truncate">{pin.title}</p>
                    {pin.description ? (
                      <p className="text-[10px] text-charcoal-400 dark:text-charcoal-500 truncate mt-0.5">{pin.description}</p>
                    ) : (
                      <p className="text-[10px] text-charcoal-300 dark:text-charcoal-600 mt-0.5">
                        {new Date(pin.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  <Navigation size={12} className="text-charcoal-300 dark:text-charcoal-600 shrink-0" />
                </motion.button>
              ))}
              {pins.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-burnt-100/40 to-sandy-100/40 dark:from-burnt-400/10 dark:to-sandy-400/10 flex items-center justify-center">
                    <Globe size={24} className="text-burnt-300" />
                  </div>
                  <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{t("map.empty")}</p>
                  <p className="text-[10px] text-charcoal-300 dark:text-charcoal-600">{t("map.empty.hint")}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add pin button ── */}
      <AnimatePresence mode="wait">
        {!adding ? (
          <motion.button
            key="add-btn"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAdding(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] px-5 py-3 bg-gradient-to-r from-burnt-400 to-burnt-300 text-white rounded-2xl shadow-elevated text-sm font-semibold flex items-center gap-2.5 hover:shadow-lg transition-all"
          >
            <Plus size={18} strokeWidth={2.5} /> {t("map.add")}
          </motion.button>
        ) : (
          <motion.div
            key="add-form"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-4 left-3 right-3 z-[1000] bg-white/95 dark:bg-charcoal-800/95 backdrop-blur-md rounded-2xl shadow-elevated border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden"
          >
            {/* Form header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200/20 dark:border-charcoal-700/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-burnt-400 to-sandy-300 flex items-center justify-center">
                  <Navigation size={12} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-charcoal-700 dark:text-warm-100">{t("map.new")}</h3>
              </div>
              <button
                onClick={cancelAdd}
                className="p-1.5 rounded-xl hover:bg-warm-100 dark:hover:bg-charcoal-700 transition-colors"
              >
                <X size={16} className="text-charcoal-400" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Address search */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 rounded-xl">
                  <Search size={14} className="text-warm-400 dark:text-charcoal-500 shrink-0" />
                  <input
                    value={addressSearch}
                    onChange={(e) => handleAddressInput(e.target.value)}
                    placeholder={t("map.search.placeholder")}
                    className="flex-1 bg-transparent text-sm outline-none text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
                  />
                  {searching && (
                    <div className="w-4 h-4 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin shrink-0" />
                  )}
                  {addressSearch && !searching && (
                    <button onClick={() => { setAddressSearch(""); setSuggestions([]); }}>
                      <X size={14} className="text-charcoal-400" />
                    </button>
                  )}
                </div>
                {/* Suggestions dropdown */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-charcoal-800 rounded-xl shadow-elevated border border-warm-200/20 dark:border-charcoal-700/40 overflow-hidden max-h-44 overflow-y-auto"
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => selectSuggestion(s)}
                          className="w-full px-3 py-2.5 text-left text-xs text-charcoal-600 dark:text-warm-300 hover:bg-warm-50 dark:hover:bg-charcoal-700 flex items-start gap-2 transition-colors border-b border-warm-100/50 dark:border-charcoal-700/30 last:border-0"
                        >
                          <MapPin size={12} className="text-burnt-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-2 leading-relaxed">{s.display_name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Use my location button */}
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-burnt-50/60 dark:bg-burnt-400/5 text-burnt-500 dark:text-burnt-300 border border-burnt-200/30 dark:border-burnt-800/20 hover:bg-burnt-100/60 dark:hover:bg-burnt-400/10 transition-all active:scale-[0.98]"
              >
                {locating ? (
                  <div className="w-4 h-4 border-2 border-burnt-200 border-t-burnt-400 rounded-full animate-spin" />
                ) : (
                  <Crosshair size={14} />
                )}
                {locating ? t("map.locating") : t("map.use.my.location")}
              </button>

              {/* Location status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium ${
                newLat !== null
                  ? "bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border border-green-200/40 dark:border-green-800/30"
                  : "bg-burnt-50/50 dark:bg-burnt-400/5 text-burnt-500 dark:text-burnt-300 border border-burnt-200/30 dark:border-burnt-800/20"
              }`}>
                {newLat !== null ? (
                  <>
                    <MapPin size={11} />
                    <span>{newLat.toFixed(4)}, {newLng?.toFixed(4)}</span>
                  </>
                ) : (
                  <>
                    <Crosshair size={11} className="animate-pulse" />
                    <span>{t("map.tap.hint")}</span>
                  </>
                )}
              </div>

              {/* Inputs */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("map.name.placeholder")}
                className="w-full px-4 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("map.desc.placeholder")}
                className="w-full px-4 py-2.5 bg-warm-50 dark:bg-charcoal-700 border border-warm-200/30 dark:border-charcoal-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-burnt-200/50 dark:focus:ring-burnt-400/30 text-charcoal-700 dark:text-warm-200 placeholder:text-warm-400 dark:placeholder:text-charcoal-500"
              />

              {/* Save button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={savePin}
                disabled={saving || !title.trim() || newLat === null}
                className="w-full py-3 bg-gradient-to-r from-burnt-400 to-burnt-300 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {saving ? t("saving") : t("map.save")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Leaflet popup styles */}
      <style>{`
        .memory-popup-modern .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.06);
        }
        .memory-popup-modern .leaflet-popup-content {
          margin: 0;
          min-width: 240px;
        }
        .memory-popup-modern .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .memory-popup-modern .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          width: 24px;
          height: 24px;
          font-size: 16px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          z-index: 10;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(201,138,97,0.25), 0 4px 16px rgba(201,138,97,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(201,138,97,0.1), 0 4px 16px rgba(201,138,97,0.4); }
        }
      `}</style>
    </div>
  );
}
