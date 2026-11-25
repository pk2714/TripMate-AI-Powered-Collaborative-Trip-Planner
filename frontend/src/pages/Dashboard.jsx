import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import TripCard from "../components/TripCard.jsx";
import InstallBanner from "../components/InstallBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getTripPhase, sortTrips } from "../utils/trip.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ongoing", label: "Ongoing", dot: "bg-emerald-500" },
  { key: "upcoming", label: "Upcoming", dot: "bg-emerald-400" },
  { key: "completed", label: "Completed", dot: "bg-red-500" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get("/trips", { params: debouncedSearch ? { destination: debouncedSearch } : {} })
      .then((res) => !cancelled && setTrips(res.data?.trips || []))
      .catch((err) => {
        if (cancelled) return;
        console.error("Error fetching trips:", err);
        setError(
          err.response?.data?.message ||
            "Unable to connect to the server. On Render's free tier the backend can take ~45s to wake up."
        );
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, reloadKey]);

  const { sorted, counts } = useMemo(() => {
    const counts = { all: trips.length, ongoing: 0, upcoming: 0, completed: 0 };
    for (const t of trips) {
      const k = getTripPhase(t).key;
      if (counts[k] !== undefined) counts[k] += 1;
    }
    return { sorted: sortTrips(trips), counts };
  }, [trips]);

  const visible = filter === "all" ? sorted : sorted.filter((t) => getTripPhase(t).key === filter);

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">
                {user ? `Welcome back, ${user.name.split(" ")[0]} 👋` : "Travel together"}
              </p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Discover your next adventure</h1>
              <p className="mt-3 text-lg text-brand-50/90">
                Join group trips, plan itineraries with AI, split expenses and stay connected on the road.
              </p>
            </div>

            <Link to="/trips/new" className="btn bg-white px-6 py-3 text-base text-brand-700 shadow-lg hover:bg-brand-50">
              <span className="text-xl leading-none">＋</span> Plan a Trip
            </Link>
          </div>

          {/* Search */}
          <div className="relative mt-8 max-w-2xl">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">🔍</span>
            <input
              type="search"
              placeholder="Search by destination — e.g. Goa, Manali, Shillong…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-4 text-base text-slate-900 shadow-xl outline-none ring-4 ring-white/20 placeholder:text-slate-400 focus:ring-white/50 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <InstallBanner />

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {debouncedSearch ? `Trips to “${debouncedSearch}”` : "Available trips"}
          </h2>

          <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} />}
                {f.label}
                {!loading && (
                  <span className={`text-xs ${filter === f.key ? "opacity-70" : "text-slate-400"}`}>{counts[f.key]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Upcoming & ongoing trips
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Completed — dates have passed
          </span>
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-64 animate-pulse p-5">
                  <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-3 h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="card card-pad mx-auto max-w-lg text-center">
              <div className="text-4xl">⚠️</div>
              <h3 className="mt-3 text-xl font-bold">Couldn't load trips</h3>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="btn-primary mt-6">
                🔄 Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="card card-pad mx-auto max-w-lg py-14 text-center">
              <div className="text-5xl">🌍</div>
              <h3 className="mt-4 text-2xl font-bold">
                {trips.length === 0 ? "No trips found" : `No ${filter} trips`}
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                {trips.length === 0
                  ? debouncedSearch
                    ? "Try a different destination, or start this trip yourself!"
                    : "Be the first to plan an amazing trip!"
                  : "Try another filter."}
              </p>
              {trips.length === 0 ? (
                <Link to="/trips/new" className="btn-primary mt-6">
                  Plan a trip
                </Link>
              ) : (
                <button onClick={() => setFilter("all")} className="btn-secondary mt-6">
                  Show all trips
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((trip) => (
                <TripCard key={trip._id} trip={trip} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
