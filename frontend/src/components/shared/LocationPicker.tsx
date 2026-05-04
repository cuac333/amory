import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Search, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Custom heart marker icon
const heartIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#c4826d,#d4a373);border-radius:50%;
    box-shadow:0 3px 12px rgba(196,130,109,0.4);border:2.5px solid white;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  placeName: string;
  onLocationChange: (lat: number, lng: number, name: string) => void;
}

export default function LocationPicker({ latitude, longitude, placeName, onLocationChange }: LocationPickerProps) {
  const [search, setSearch] = useState(placeName);
  const [_searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const defaultLat = latitude ?? 4.711;
  const defaultLng = longitude ?? -74.0721;

  const handleMapClick = async (lat: number, lng: number) => {
    // Reverse geocode
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`
      );
      const data = await res.json();
      const name = data.display_name?.split(",").slice(0, 3).join(",") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setSearch(name);
      onLocationChange(lat, lng, name);
    } catch {
      const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setSearch(name);
      onLocationChange(lat, lng, name);
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=es`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch { setSuggestions([]); }
    setSearching(false);
  };

  const handleSearchInput = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(value), 400);
  };

  const selectSuggestion = (s: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    const name = s.display_name.split(",").slice(0, 3).join(",");
    setSearch(name);
    setSuggestions([]);
    onLocationChange(lat, lng, name);
  };

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-warm-50 border border-warm-200 rounded-xl">
          <Search size={14} className="text-warm-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Buscar lugar..."
            className="flex-1 bg-transparent text-sm outline-none text-charcoal-600 placeholder:text-warm-400"
          />
          {search && (
            <button onClick={() => { setSearch(""); setSuggestions([]); }} className="text-warm-400 hover:text-charcoal-500">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-[1000] top-full mt-1 w-full bg-white rounded-xl shadow-elevated border border-warm-100 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion(s)}
                className="w-full px-3 py-2.5 text-left text-sm text-charcoal-600 hover:bg-warm-50 flex items-start gap-2 transition-colors border-b border-warm-50 last:border-0"
              >
                <MapPin size={13} className="text-burnt-300 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-warm-200 shadow-soft" style={{ height: 200 }}>
        <MapContainer
          center={[defaultLat, defaultLng]}
          zoom={latitude ? 15 : 12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <ClickHandler onLocationSelect={handleMapClick} />
          {latitude && longitude && (
            <>
              <Marker position={[latitude, longitude]} icon={heartIcon} />
              <FlyTo lat={latitude} lng={longitude} />
            </>
          )}
        </MapContainer>
      </div>

      {latitude && (
        <p className="text-[10px] text-warm-400 flex items-center gap-1">
          <MapPin size={10} className="text-burnt-300" />
          Toca el mapa para cambiar la ubicación
        </p>
      )}
      {!latitude && (
        <p className="text-[10px] text-warm-400 flex items-center gap-1">
          <MapPin size={10} />
          Busca o toca el mapa para seleccionar ubicación
        </p>
      )}
    </div>
  );
}
