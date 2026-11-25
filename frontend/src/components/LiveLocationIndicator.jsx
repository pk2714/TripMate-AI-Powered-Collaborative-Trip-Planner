import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveLocation } from "../context/LiveLocationContext.jsx";

// Shown on every page while live location is being shared, so it's always
// clear that it's running — and easy to stop.
export default function LiveLocationIndicator() {
  const { sharing, status, error, lastSentAt, keepAwake, canKeepAwake, stop, toggleKeepAwake, clearError } =
    useLiveLocation();
  const [, tick] = useState(0);

  // Refresh the "updated Xs ago" text.
  useEffect(() => {
    if (!sharing) return;
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [sharing]);

  if (!sharing && !error) return null;

  if (!sharing && error) {
    return (
      <div className="fixed left-1/2 top-20 z-[1550] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2">
        <div className="alert-error shadow-lg">
          <span>📍</span>
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="font-bold" aria-label="Dismiss">
            ×
          </button>
        </div>
      </div>
    );
  }

  const live = status === "live";
  const ago = lastSentAt ? Math.round((Date.now() - lastSentAt) / 1000) : null;

  return (
    <div className="fixed left-1/2 top-[4.75rem] z-[1550] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2">
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-2.5 text-sm text-white shadow-xl ${
          live ? "bg-emerald-600" : "bg-amber-500"
        }`}
        role="status"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <span className="min-w-0 flex-1">
          <strong>{live ? "Live location ON" : status === "reconnecting" ? "Reconnecting…" : "Starting live location…"}</strong>
          <span className="opacity-90">
            {" · "}
            <Link to={`/trips/${sharing.tripId}`} className="underline decoration-white/50 hover:decoration-white">
              {sharing.tripTitle}
            </Link>
            {ago !== null && live && <> · updated {ago < 10 ? "just now" : `${ago}s ago`}</>}
            {ago === null && live && <> · waiting for GPS…</>}
          </span>
          {error && <span className="block text-xs font-medium text-white/90">⚠️ {error}</span>}
        </span>
        {canKeepAwake && (
          <button
            onClick={toggleKeepAwake}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${keepAwake ? "bg-white text-emerald-700" : "bg-white/20 hover:bg-white/30"}`}
            title="Keep the screen on so sharing doesn't pause"
          >
            {keepAwake ? "☀ Screen on" : "☀ Keep screen on"}
          </button>
        )}
        <button onClick={stop} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
          Stop
        </button>
      </div>
    </div>
  );
}
