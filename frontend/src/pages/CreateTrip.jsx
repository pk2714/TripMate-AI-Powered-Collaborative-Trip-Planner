import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { formatDateRange, formatINR, todayKey } from "../utils/trip.js";

const MAX_TRIP_DAYS = 90;
const MAX_BUDGET = 10_000_000;

const VEHICLES = ["Car", "Bike", "Bus", "Train", "Flight", "Mixed"];
const DIFFICULTIES = [
  { value: "easy", label: "Easy", desc: "Relaxed, family friendly", icon: "🌴" },
  { value: "moderate", label: "Moderate", desc: "Some long days & walks", icon: "🥾" },
  { value: "hard", label: "Hard", desc: "Treks, high altitude", icon: "🏔️" },
];

// Mirrors the server rules in backend/controllers/tripController.js
function validate(form) {
  const e = {};
  const title = form.title.trim();
  const destination = form.destination.trim();
  const today = todayKey();

  if (!title) e.title = "Give your trip a name.";
  else if (title.length < 3) e.title = "Title must be at least 3 characters.";
  else if (title.length > 100) e.title = "Title must be at most 100 characters.";

  if (!destination) e.destination = "Where are you going?";
  else if (destination.length < 2) e.destination = "Destination must be at least 2 characters.";

  if (!form.startDate) e.startDate = "Pick a start date.";
  else if (form.startDate < today) e.startDate = "Start date can't be in the past.";

  if (!form.endDate) e.endDate = "Pick an end date.";
  else if (form.startDate && form.endDate < form.startDate) e.endDate = "End date must be on or after the start date.";
  else if (form.startDate && tripLength(form) > MAX_TRIP_DAYS) e.endDate = `A trip can be at most ${MAX_TRIP_DAYS} days.`;

  const budget = Number(form.budget);
  if (form.budget === "") e.budget = "Enter a budget.";
  else if (!Number.isFinite(budget) || budget < 1) e.budget = "Budget must be more than ₹0.";
  else if (budget > MAX_BUDGET) e.budget = "Budget looks too large.";

  const members = Number(form.maxMembers);
  if (!Number.isInteger(members) || members < 2 || members > 50) e.maxMembers = "Between 2 and 50 members.";

  return e;
}

function tripLength(form) {
  if (!form.startDate || !form.endDate) return 0;
  return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1;
}

export default function CreateTrip() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    destination: "",
    budget: "",
    startDate: "",
    endDate: "",
    vehicle: "",
    maxMembers: 4,
    difficultyLevel: "easy",
  });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(form);
  const showError = (name) => (touched[name] || touched._submit) && errors[name];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Keep the end date valid when the start date moves past it.
      if (name === "startDate" && next.endDate && next.endDate < value) next.endDate = value;
      return next;
    });
  };
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched((t) => ({ ...t, _submit: true }));
    setServerError("");
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const res = await api.post("/trips", {
        ...form,
        title: form.title.trim(),
        destination: form.destination.trim(),
        budget: Number(form.budget),
        maxMembers: Number(form.maxMembers),
      });
      navigate(`/trips/${res.data.trip._id}`);
    } catch (err) {
      setServerError(err.response?.data?.message || "Could not create the trip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const days = tripLength(form);
  const perPerson = form.budget && form.maxMembers ? Number(form.budget) / Number(form.maxMembers) : 0;
  const inputCls = (name) => `input ${showError(name) ? "input-error" : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-brand-600">
        ← Back to trips
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Plan a new trip</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Fill in the basics — you can generate an AI itinerary and invite travellers next.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} noValidate className="card card-pad space-y-6">
          {serverError && <div className="alert-error">⚠️ {serverError}</div>}

          <div>
            <label htmlFor="title" className="label">Trip title</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={100}
              placeholder="e.g. Monsoon road trip to Meghalaya"
              className={inputCls("title")}
            />
            {showError("title") && <p className="field-error">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="destination" className="label">Destination</label>
            <input
              id="destination"
              name="destination"
              value={form.destination}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={100}
              placeholder="e.g. Shillong, Meghalaya"
              className={inputCls("destination")}
            />
            {showError("destination") && <p className="field-error">{errors.destination}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="label">Start date</label>
              <input
                id="startDate"
                type="date"
                name="startDate"
                min={todayKey()}
                value={form.startDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls("startDate")}
              />
              {showError("startDate") && <p className="field-error">{errors.startDate}</p>}
            </div>
            <div>
              <label htmlFor="endDate" className="label">End date</label>
              <input
                id="endDate"
                type="date"
                name="endDate"
                min={form.startDate || todayKey()}
                value={form.endDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls("endDate")}
              />
              {showError("endDate") ? (
                <p className="field-error">{errors.endDate}</p>
              ) : (
                days > 0 && <p className="hint">{days} day{days > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="budget" className="label">Total budget (₹)</label>
              <input
                id="budget"
                type="number"
                name="budget"
                inputMode="numeric"
                min={1}
                max={MAX_BUDGET}
                value={form.budget}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="15000"
                className={inputCls("budget")}
              />
              {showError("budget") && <p className="field-error">{errors.budget}</p>}
            </div>
            <div>
              <label htmlFor="maxMembers" className="label">Max members</label>
              <input
                id="maxMembers"
                type="number"
                name="maxMembers"
                min={2}
                max={50}
                value={form.maxMembers}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls("maxMembers")}
              />
              {showError("maxMembers") ? (
                <p className="field-error">{errors.maxMembers}</p>
              ) : (
                <p className="hint">Including you</p>
              )}
            </div>
            <div>
              <label htmlFor="vehicle" className="label">
                Travelling by <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <select id="vehicle" name="vehicle" value={form.vehicle} onChange={handleChange} className="input">
                <option value="">Not decided</option>
                {VEHICLES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="label">Difficulty</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => (
                <label
                  key={d.value}
                  className={`cursor-pointer rounded-xl border p-3 transition ${
                    form.difficultyLevel === d.value
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-900/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="difficultyLevel"
                    value={d.value}
                    checked={form.difficultyLevel === d.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="text-xl">{d.icon}</span>
                  <p className="mt-1 text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</p>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
            {submitting ? "Creating trip…" : "Create trip"}
          </button>
        </form>

        {/* Live preview */}
        <aside className="card card-pad h-fit lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Preview</p>
          <h2 className="mt-2 text-xl font-bold">{form.title.trim() || "Your trip"}</h2>
          <p className="mt-1 text-sm text-slate-500">📍 {form.destination.trim() || "Destination"}</p>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Dates</dt>
              <dd className="font-medium">
                {form.startDate && form.endDate && !errors.endDate ? formatDateRange(form.startDate, form.endDate) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Duration</dt>
              <dd className="font-medium">{days > 0 && !errors.endDate ? `${days} day${days > 1 ? "s" : ""}` : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Budget</dt>
              <dd className="font-medium">{form.budget && !errors.budget ? formatINR(form.budget) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Per person (approx.)</dt>
              <dd className="font-medium">{perPerson > 0 && !errors.budget && !errors.maxMembers ? formatINR(Math.round(perPerson)) : "—"}</dd>
            </div>
          </dl>

          <div className="alert-info mt-6 text-xs">
            <span>💡</span>
            <span>
              After creating the trip, open the <strong>AI Plan</strong> tab to generate a day-by-day itinerary.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
