import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
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

export default function TripMap({ destination , liveLocations }) {
  const [position, setPosition] = useState(null);
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
          setPosition([
            parseFloat(data[0].lat),
            parseFloat(data[0].lon),
          ]);
        } else {
          setErrorMsg(`"${destination}" location nahi mili`);
        }
      } catch (error) {
        console.error("Geocoding Error:", error);
        setErrorMsg("Location fetch fail ho gayi, internet check karo");
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
        type:GEO_TYPES[type],
      },
    });

    setPlaces(res.data.places || []);

    if (!res.data.places?.length) {
      setErrorMsg(`can't find ${CATEGORY_LABELS[type]} nearby`);
    }
  } catch (err) {
    console.error(err);
    setErrorMsg("can't fetch nearby places, try again later");
  } finally {
    setLoadingPlaces(false);
  }
}

  if (!position) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10 text-center">
          <div className="animate-pulse text-3xl mb-3">🗺️</div>
          <p className="text-gray-500">
            {errorMsg || "Fetching destination..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="px-5 py-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-bold">🗺️ Trip Location</h2>
        <p className="text-sm text-gray-500 mt-1">{destination}</p>
      </div>

      <div className="flex flex-wrap gap-2 p-4 border-b dark:border-gray-700">
        <button
          onClick={() => loadNearby("hospital")}
          disabled={loadingPlaces}
          className={`px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 ${
            activeType === "hospital" ? "ring-2 ring-offset-2 ring-red-500" : ""
          }`}
        >
          🏥 Hospitals
        </button>

        <button
          onClick={() => loadNearby("fuel")}
          disabled={loadingPlaces}
          className={`px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 ${
            activeType === "fuel" ? "ring-2 ring-offset-2 ring-green-600" : ""
          }`}
        >
          ⛽ Petrol Pumps
        </button>

        <button
          onClick={() => loadNearby("police")}
          disabled={loadingPlaces}
          className={`px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 ${
            activeType === "police" ? "ring-2 ring-offset-2 ring-blue-600" : ""
          }`}
        >
          🚓 Police
        </button>

        <button
          onClick={() => loadNearby("restaurant")}
          disabled={loadingPlaces}
          className={`px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 ${
            activeType === "restaurant" ? "ring-2 ring-offset-2 ring-orange-500" : ""
          }`}
        >
          🍴 Restaurants
        </button>

        <button
          onClick={() => loadNearby("hotel")}
          disabled={loadingPlaces}
          className={`px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 ${
            activeType === "hotel" ? "ring-2 ring-offset-2 ring-purple-600" : ""
          }`}
        >
          🏨 Hotels
        </button>
      </div>

      {/* Status bar: loading / error / results count */}
      {(loadingPlaces || errorMsg || places.length > 0) && (
        <div className="px-4 py-2 text-sm border-b dark:border-gray-700">
          {loadingPlaces && (
            <span className="text-gray-500">⏳ Loading nearby places...</span>
          )}
          {!loadingPlaces && errorMsg && (
            <span className="text-red-500">{errorMsg}</span>
          )}
          {!loadingPlaces && !errorMsg && places.length > 0 && (
            <span className="text-green-600">
              ✅ {places.length} {CATEGORY_LABELS[activeType] || activeType} found
            </span>
          )}
        </div>
      )}

      <MapContainer
        center={position}
        zoom={11}
        style={{
          height: "600px",
          width: "100%",
        }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold text-base">📍 {destination}</h3>
              <p className="text-sm text-gray-600">Trip Destination</p>
            </div>
          </Popup>
        </Marker>
         
         {Object.entries(liveLocations || {}).map(
  ([userId, location]) => (
    <CircleMarker
      key={userId}
      center={[location.lat, location.lng]}
      radius={10}
      pathOptions={{
        color: "blue",
        fillColor: "blue",
        fillOpacity: 0.8,
      }}
    >
      <Popup>
        📍 Live Location
      </Popup>
    </CircleMarker>
  )
)}
         

        {places.map((place) => {
          const lat = place.lat;
          const lon = place.lon;

          if (!lat || !lon) return null;

          return (
            <Marker
              key={place.id}
              position={[Number(lat), Number(lon)]}
            >
              <Popup>
                <strong>{place.name || "Unnamed Place"}</strong>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
