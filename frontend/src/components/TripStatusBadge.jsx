import { getTripPhase } from "../utils/trip.js";

// Green for upcoming / ongoing, red for completed (outdated), gray for cancelled.
export default function TripStatusBadge({ trip, phase: phaseProp, size = "sm", showDetail = false }) {
  const phase = phaseProp || getTripPhase(trip);
  const sizeCls = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span className={`badge ${sizeCls} ${phase.badge}`} title={phase.detail}>
      <span className="relative flex h-2 w-2">
        {phase.key === "ongoing" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            phase.key === "ongoing" || phase.key === "completed" || phase.key === "cancelled"
              ? "bg-white"
              : phase.dot
          }`}
        />
      </span>
      {phase.label}
      {showDetail && phase.detail && <span className="font-medium opacity-80">· {phase.detail}</span>}
    </span>
  );
}
