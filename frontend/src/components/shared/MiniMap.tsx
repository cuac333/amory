import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const heartIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:26px;height:26px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#c4826d,#d4a373);border-radius:50%;
    box-shadow:0 2px 8px rgba(196,130,109,0.35);border:2px solid white;
  ">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface MiniMapProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export default function MiniMap({ latitude, longitude, className = "" }: MiniMapProps) {
  return (
    <div className={`rounded-xl overflow-hidden border border-warm-100 ${className}`} style={{ height: 120 }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <Marker position={[latitude, longitude]} icon={heartIcon} />
      </MapContainer>
    </div>
  );
}
