import { Link } from "react-router-dom";

export default function TripCard({ trip }) {
  const start = new Date(trip.startDate).toLocaleDateString();
  const end = new Date(trip.endDate).toLocaleDateString();

  return (
    <Link
      to={`/trips/${trip._id}`}
      className="block p-5 rounded-xl bg-white dark:bg-gray-800 shadow hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">{trip.title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">
          {trip.status}
        </span>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mt-1">📍 {trip.destination}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {start} – {end} · Budget ₹{trip.budget}
      </p>
      <p className="text-sm text-gray-400 mt-2">
        Organized by {trip.organizer?.name || "Unknown"}
      </p>
    </Link>
  );
}
