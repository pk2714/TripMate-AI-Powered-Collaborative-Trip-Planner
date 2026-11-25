// Trip date helpers. Trip dates are stored as UTC midnight of the chosen
// calendar day, so we always read/format them in UTC — otherwise users west
// of UTC would see the previous day.

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (value) => new Date(value).toISOString().slice(0, 10); // "YYYY-MM-DD"
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY_MS);

// The user's local calendar date as "YYYY-MM-DD" (also used for <input type="date" min>)
export function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

export function formatDateRange(start, end) {
  if (!start || !end) return "";
  const sameYear = dayKey(start).slice(0, 4) === dayKey(end).slice(0, 4);
  return `${formatDate(start, sameYear ? { year: undefined } : {})} – ${formatDate(end)}`;
}

export function tripDays(trip) {
  return daysBetween(dayKey(trip.startDate), dayKey(trip.endDate)) + 1;
}

export function formatINR(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// Visual styles per phase. Upcoming/ongoing are green, completed (the trip's
// end date has passed — it's outdated) is red, cancelled is gray.
export const PHASES = {
  ongoing: {
    key: "ongoing",
    label: "Ongoing",
    isActive: true,
    badge: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    accent: "border-emerald-500",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  upcoming: {
    key: "upcoming",
    label: "Upcoming",
    isActive: true,
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200",
    soft: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    accent: "border-emerald-400",
    ring: "ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  completed: {
    key: "completed",
    label: "Completed",
    isActive: false,
    badge: "bg-red-600 text-white",
    soft: "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900",
    accent: "border-red-500",
    ring: "ring-red-500/30",
    dot: "bg-red-500",
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    isActive: false,
    badge: "bg-slate-500 text-white",
    soft: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    accent: "border-slate-400",
    ring: "ring-slate-400/30",
    dot: "bg-slate-400",
  },
};

// Returns the trip's phase relative to the user's today, plus a short detail
// like "Starts in 5 days" / "2 days left" / "Ended 3 days ago".
export function getTripPhase(trip) {
  if (!trip?.startDate || !trip?.endDate) return { ...PHASES.upcoming, detail: "" };
  if (trip.status === "cancelled") return { ...PHASES.cancelled, detail: "Cancelled by organizer" };

  const today = todayKey();
  const start = dayKey(trip.startDate);
  const end = dayKey(trip.endDate);

  if (end < today) {
    const ago = daysBetween(end, today);
    return { ...PHASES.completed, detail: ago === 1 ? "Ended yesterday" : `Ended ${ago} days ago` };
  }
  if (start <= today) {
    const left = daysBetween(today, end);
    return {
      ...PHASES.ongoing,
      detail: left === 0 ? "Last day today" : `${left} day${left > 1 ? "s" : ""} left`,
    };
  }
  const until = daysBetween(today, start);
  return { ...PHASES.upcoming, detail: until === 1 ? "Starts tomorrow" : `Starts in ${until} days` };
}

// Ongoing first, then upcoming (soonest first), then completed/cancelled (most recent first).
export function sortTrips(trips) {
  const rank = { ongoing: 0, upcoming: 1, completed: 2, cancelled: 3 };
  return [...trips].sort((a, b) => {
    const pa = getTripPhase(a).key;
    const pb = getTripPhase(b).key;
    if (pa !== pb) return rank[pa] - rank[pb];
    const diff = new Date(a.startDate) - new Date(b.startDate);
    return rank[pa] >= 2 ? -diff : diff;
  });
}
