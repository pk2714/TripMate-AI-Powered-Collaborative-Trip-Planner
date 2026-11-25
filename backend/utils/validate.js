// Small validation helpers shared by controllers. Each `check*` returns an
// error message string, or null when the value is valid.

const DAY_MS = 24 * 60 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{8,14}[0-9]$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const isObjectId = (v) => typeof v === "string" && OBJECT_ID_RE.test(v);

function checkString(value, label, { min = 1, max = 200, required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    return required ? `${label} is required.` : null;
  }
  if (typeof value !== "string") return `${label} must be text.`;
  const len = value.trim().length;
  if (required && len === 0) return `${label} is required.`;
  if (len < min) return `${label} must be at least ${min} characters.`;
  if (len > max) return `${label} must be at most ${max} characters.`;
  return null;
}

function checkNumber(value, label, { min, max, integer = false, required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    return required ? `${label} is required.` : null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
  if (min !== undefined && n < min) return `${label} must be at least ${min}.`;
  if (max !== undefined && n > max) return `${label} must be at most ${max}.`;
  return null;
}

function checkPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

function checkEmail(email) {
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

// Parses a "YYYY-MM-DD" (or ISO) date. Returns a Date or null.
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Dates are stored as UTC midnight of the chosen calendar day, so compare by
// UTC day. A small grace window keeps users ahead of UTC (e.g. India) from
// being told "today" is in the past.
function startOfUtcDay(d = new Date()) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// "upcoming" | "ongoing" | "completed" | "cancelled"
function getTripPhase(trip, now = new Date()) {
  if (trip.status === "cancelled") return "cancelled";
  const start = new Date(trip.startDate).getTime();
  const endOfLastDay = new Date(trip.endDate).getTime() + DAY_MS;
  if (now.getTime() >= endOfLastDay) return "completed";
  if (now.getTime() >= start) return "ongoing";
  return "upcoming";
}

module.exports = {
  DAY_MS,
  BLOOD_GROUPS,
  PHONE_RE,
  isObjectId,
  checkString,
  checkNumber,
  checkPassword,
  checkEmail,
  parseDate,
  startOfUtcDay,
  getTripPhase,
};
