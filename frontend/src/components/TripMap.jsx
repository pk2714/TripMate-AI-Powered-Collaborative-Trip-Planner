import { Fragment, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";

// Fix Leaflet marker issue in React/Vite
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORY_LABELS = {
  hospital: "🏥 Hospitals",
  fuel: "⛽ Petrol Pumps",
  police: "🚓 Police",
  restaurant: "🍴 Restaurants",
  hotel: "🏨 Hotels",
};

const GEO_TYPES = {
  hospital: "healthcare.hospital",
  fuel: "service.vehicle.fuel",
  police: "service.police",
  restaurant: "catering.restaurant",
  hotel: "accommodation.hotel",
};

// A location is "stale" when the sharer's connection dropped (server marks it
// offline) or no update arrived for 2 minutes (heartbeat is every 20s).
const STALE_MS = 2 * 60 * 1000;
const isStale = (loc) => loc.offline || Date.now() - new Date(loc.timestamp).getTime() > STALE_MS;
const lastSeen = (loc) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(loc.timestamp).getTime()) / 1000));
  if (s < 30) return "just now";
  if (s < 90) return "1 min ago";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
};

// Smooth map panning helper
function MapViewHandler({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function TripMap({
  destination,
  liveLocations = {},
  isSharingLocation = false,
  toggleLocationSharing = () => {},
  currentUser = null,
  isMember = false,
  locationError = "",
}) {
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(11);
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!destination) return;

    const fetchLocation = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            destination
          )}`
        );

        const data = await response.json();

        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setPosition([lat, lon]);
          setMapCenter([lat, lon]);
        } else {
          setErrorMsg(`"${destination}" location not found`);
        }
      } catch (error) {
        console.error("Geocoding Error:", error);
        setErrorMsg("Failed to fetch location coordinates. Check internet.");
      }
    };

    fetchLocation();
  }, [destination]);

  async function loadNearby(type) {
    if (!position) return;

    setLoadingPlaces(true);
    setErrorMsg(null);
    setActiveType(type);
    setPlaces([]);

    try {
      const [lat, lng] = position;

      const res = await api.get("/maps/nearby", {
        params: {
          lat,
          lng,
          type: GEO_TYPES[type],
        },
      });

      setPlaces(res.data.places || []);

      if (!res.data.places?.length) {
        setErrorMsg(`Can't find ${CATEGORY_LABELS[type]} nearby`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Can't fetch nearby places, try again later");
    } finally {
      setLoadingPlaces(false);
    }
  }

  const activeMembers = Object.entries(liveLocations || {});

  // Re-render every 15s so "last seen" labels and stale colours stay current.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeMembers.length) return;
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [activeMembers.length]);

  const locateUser = (lat, lng) => {
    setMapCenter([lat, lng]);
    setMapZoom(15);
  };

  const recenterDestination = () => {
    if (position) {
      setMapCenter(position);
      setMapZoom(11);
    }
  };

  if (!position) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 text-center">
          <div className="animate-pulse text-3xl mb-3">🗺️</div>
          <p className="text-gray-500">
            {errorMsg || `Fetching map for ${destination}...`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-5 py-4 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            🗺️ Trip Map & Live Location
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Destination: {destination}</p>
        </div>

        {/* Live Location Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {isMember && (
            <button
              onClick={toggleLocationSharing}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 ${
                isSharingLocation
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSharingLocation ? "bg-white animate-ping" : "bg-white/80"
                }`}
              />
              {isSharingLocation ? "Stop Live Sharing" : "📍 Share My Live Location"}
            </button>
          )}

          <button
            onClick={recenterDestination}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 font-medium transition"
            title="Center destination"
          >
            🎯 Recenter
          </button>
        </div>
      </div>

      {locationError && (
        <div className="px-5 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/40">
          ⚠️ {locationError}
        </div>
      )}

      {/* Active Live Location Trackers Bar */}
      {activeMembers.length > 0 && (
        <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Live Members ({activeMembers.length}):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {activeMembers.map(([userId, loc]) => {
              const isMe = currentUser && currentUser._id === userId;
              const stale = isStale(loc);
              return (
                <button
                  key={userId}
                  onClick={() => locateUser(loc.lat, loc.lng)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition border ${
                    isMe
                      ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-emerald-100 dark:hover:bg-gray-700 border-emerald-200 dark:border-gray-600 shadow-sm"
                  }`}
                  title="Click to locate on map"
                >
                  <span className={`h-2 w-2 rounded-full ${stale ? "bg-slate-400" : "bg-emerald-400"}`} />
                  <span>{isMe ? "📍 You" : `👤 ${loc.userName || "Member"}`}</span>
                  {stale && <span className="text-[10px] opacity-75">· {lastSeen(loc)}</span>}
                  <span className="text-[10px] opacity-75">🔍</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nearby Places Categories */}
      <div className="flex flex-wrap gap-2 p-4 border-b dark:border-gray-700">
        <button
          onClick={() => loadNearby("hospital")}
          disabled={loadingPlaces}
          className={`px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition ${
            activeType === "hospital" ? "ring-2 ring-offset-2 ring-red-500" : ""
          }`}
        >
          🏥 Hospitals
        </button>

        <button
          onClick={() => loadNearby("fuel")}
          disabled={loadingPlaces}
          className={`px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition ${
            activeType === "fuel" ? "ring-2 ring-offset-2 ring-green-600" : ""
          }`}
        >
          ⛽ Petrol Pumps
        </button>

        <button
          onClick={() => loadNearby("police")}
          disabled={loadingPlaces}
          className={`px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition ${
            activeType === "police" ? "ring-2 ring-offset-2 ring-blue-600" : ""
          }`}
        >
          🚓 Police
        </button>

        <button
          onClick={() => loadNearby("restaurant")}
          disabled={loadingPlaces}
          className={`px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition ${
            activeType === "restaurant" ? "ring-2 ring-offset-2 ring-orange-500" : ""
          }`}
        >
          🍴 Restaurants
        </button>

        <button
          onClick={() => loadNearby("hotel")}
          disabled={loadingPlaces}
          className={`px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition ${
            activeType === "hotel" ? "ring-2 ring-offset-2 ring-purple-600" : ""
          }`}
        >
          🏨 Hotels
        </button>
      </div>

      {/* Status Bar */}
      {(loadingPlaces || errorMsg || places.length > 0) && (
        <div className="px-4 py-2 text-xs border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {loadingPlaces && (
            <span className="text-gray-500">⏳ Searching nearby {CATEGORY_LABELS[activeType]}...</span>
          )}
          {!loadingPlaces && errorMsg && (
            <span className="text-red-500">{errorMsg}</span>
          )}
          {!loadingPlaces && !errorMsg && places.length > 0 && (
            <span className="text-green-600 font-medium">
              ✅ Found {places.length} {CATEGORY_LABELS[activeType] || activeType}
            </span>
          )}
        </div>
      )}

      {/* Map View */}
      <MapContainer
        center={position}
        zoom={11}
        style={{
          height: "560px",
          width: "100%",
        }}
      >
        <MapViewHandler center={mapCenter} zoom={mapZoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Destination Marker */}
        <Marker position={position}>
          <Popup>
            <div className="text-center p-1">
              <h3 className="font-bold text-sm">📍 {destination}</h3>
              <p className="text-xs text-gray-500">Trip Destination</p>
            </div>
          </Popup>
        </Marker>

        {/* Real-Time Live Location Markers */}
        {activeMembers.map(([userId, loc]) => {
          const isMe = currentUser && currentUser._id === userId;
          const stale = isStale(loc);
          // Live: blue (you) / green (others). No recent update: gray.
          const markerColor = stale ? "#94A3B8" : isMe ? "#2563EB" : "#10B981";

          return (
            <Fragment key={userId}>
              {/* Accuracy / pulse ring */}
              <CircleMarker
                center={[loc.lat, loc.lng]}
                radius={18}
                pathOptions={{
                  color: markerColor,
                  fillColor: markerColor,
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              />

              {/* Inner Solid Marker */}
              <CircleMarker
                center={[loc.lat, loc.lng]}
                radius={8}
                pathOptions={{
                  color: "#FFFFFF",
                  fillColor: markerColor,
                  fillOpacity: 0.95,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[150px]">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 mb-1">
                      <span className={`w-2 h-2 rounded-full ${stale ? "bg-slate-400" : "bg-emerald-500 animate-ping"}`} />
                      <span>
                        {isMe ? "📍 You" : `👤 ${loc.userName || "Trip Member"}`}
                        {stale ? " · offline" : " · live"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-1">
                      {stale ? `Last seen ${lastSeen(loc)}` : `Updated ${lastSeen(loc)}`} ·{" "}
                      {new Date(loc.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {loc.accuracy ? ` · ±${loc.accuracy} m` : ""}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          );
        })}

        {/* Nearby Places Markers */}
        {places.map((place) => {
          const lat = place.lat;
          const lon = place.lon;
          if (!lat || !lon) return null;

          return (
            <Marker key={place.id} position={[Number(lat), Number(lon)]}>
              <Popup>
                <div className="p-1">
                  <strong className="text-xs block mb-1 text-gray-900">
                    {place.name || "Unnamed Place"}
                  </strong>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[activeType] || "Nearby Place"}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
