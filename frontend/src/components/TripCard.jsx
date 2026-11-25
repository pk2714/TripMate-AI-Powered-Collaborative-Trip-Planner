import { Link } from "react-router-dom";
import TripStatusBadge from "./TripStatusBadge.jsx";
import { formatDateRange, formatINR, getTripPhase, tripDays } from "../utils/trip.js";

const DIFFICULTY = {
  easy: { label: "Easy", cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
  moderate: { label: "Moderate", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  hard: { label: "Hard", cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
};

export default function TripCard({ trip }) {
  const phase = getTripPhase(trip);
  const days = tripDays(trip);
  const difficulty = DIFFICULTY[trip.difficultyLevel] || DIFFICULTY.easy;
  const memberCount = trip.memberCount ?? null;
  const isFull = memberCount !== null && memberCount >= trip.maxMembers;
  const isOver = !phase.isActive;

  return (
    <Link
      to={`/trips/${trip._id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition
        hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900
        ${
          phase.key === "completed"
            ? "border-red-300 dark:border-red-900/70"
            : phase.key === "cancelled"
            ? "border-slate-300 dark:border-slate-700"
            : "border-emerald-200 dark:border-emerald-900/60"
        }`}
    >
      {/* Status stripe */}
      <div
        className={`h-1.5 w-full ${
          phase.key === "completed"
            ? "bg-red-500"
            : phase.key === "cancelled"
            ? "bg-slate-400"
            : phase.key === "ongoing"
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : "bg-gradient-to-r from-emerald-400 to-brand-500"
        }`}
      />

      <div className={`flex flex-1 flex-col p-5 ${isOver ? "opacity-90" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
            {trip.title}
          </h3>
          <TripStatusBadge phase={phase} />
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
          <span aria-hidden>📍</span>
          <span className="truncate">{trip.destination}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Dates</p>
            <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
            <p className="text-xs text-slate-500">
              {days} day{days > 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Budget</p>
            <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{formatINR(trip.budget)}</p>
            <p className="text-xs text-slate-500">per trip</p>
          </div>
        </div>

        <p
          className={`mt-3 text-xs font-semibold ${
            phase.key === "completed"
              ? "text-red-600 dark:text-red-400"
              : phase.key === "cancelled"
              ? "text-slate-500"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {phase.detail}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              {(trip.organizer?.name || "?").charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              by <span className="font-medium text-slate-700 dark:text-slate-200">{trip.organizer?.name || "Unknown"}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`badge px-2 py-0.5 ${difficulty.cls}`}>{difficulty.label}</span>
            {memberCount !== null && (
              <span
                className={`badge px-2 py-0.5 ${
                  isFull
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
                title="Members"
              >
                👥 {memberCount}/{trip.maxMembers}
                {isFull && " · Full"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
