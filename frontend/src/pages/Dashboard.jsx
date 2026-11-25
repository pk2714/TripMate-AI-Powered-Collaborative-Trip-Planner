import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import TripCard from "../components/TripCard.jsx";

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const fetchTrips = (searchTerm = search) => {
    setLoading(true);
    setError(null);

    api
      .get("/trips", { params: searchTerm ? { destination: searchTerm } : {} })
      .then((res) => {
        setTrips(res.data?.trips || []);
      })
      .catch((err) => {
        console.error("Error fetching trips:", err);
        setError(
          err.response?.data?.message ||
            "Unable to connect to server. If on Render free tier, the backend may take ~45s to wake up."
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrips(search);
  }, [search]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-10">

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              Discover Trips
            </h1>

            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
              Explore amazing trips and find your next adventure.
            </p>
          </div>

          <Link
            to="/trips/new"
            className="inline-flex items-center justify-center gap-2
                       px-6 py-3 rounded-xl
                       bg-blue-600 hover:bg-blue-700
                       text-white text-lg font-semibold
                       shadow-md hover:shadow-lg
                       transition-all duration-200"
          >
            <span className="text-2xl leading-none">+</span>
            Plan a Trip
          </Link>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">

        {/* Search Box */}
        <div className="mb-8">
          <label className="block mb-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
            Find your destination
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search by destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full
                px-12 py-4
                text-lg
                rounded-xl
                border border-gray-300
                bg-white
                text-gray-900
                placeholder-gray-400
                shadow-sm
                outline-none
                transition
                focus:ring-2 focus:ring-blue-500
                focus:border-blue-500
                dark:bg-gray-800
                dark:border-gray-700
                dark:text-white
                dark:placeholder-gray-500
              "
            />
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Available Trips
          </h2>

          {!loading && (
            <span className="text-base text-gray-500 dark:text-gray-400">
              {trips.length} {trips.length === 1 ? "trip" : "trips"}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Loading trips...
            </div>
            <p className="text-xs text-gray-400 mt-2 max-w-sm text-center">
              Connecting to database. If loading on Render, free instances can take up to 45s to wake up from sleep.
            </p>
          </div>
        ) : error ? (
          /* Error State with Retry */
          <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Could not load trips
            </h3>
            <p className="text-sm text-red-500 mb-6 max-w-md mx-auto">
              {error}
            </p>
            <button
              onClick={() => fetchTrips()}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              🔄 Retry Connection
            </button>
          </div>
        ) : trips.length === 0 ? (

          /* Empty State */
          <div className="
            text-center
            py-16 px-6
            bg-white dark:bg-gray-800
            rounded-2xl
            border border-gray-200 dark:border-gray-700
            shadow-sm
          ">
            <div className="text-5xl mb-4">🌍</div>

            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              No trips found
            </h3>

            <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
              Be the first to plan an amazing trip!
            </p>

            <Link
              to="/trips/new"
              className="
                inline-block
                px-6 py-3
                rounded-xl
                bg-blue-600
                hover:bg-blue-700
                text-white
                text-lg
                font-semibold
                transition
              "
            >
              Plan Your Trip
            </Link>
          </div>

        ) : (

          /* Trips */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip._id} trip={trip} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}