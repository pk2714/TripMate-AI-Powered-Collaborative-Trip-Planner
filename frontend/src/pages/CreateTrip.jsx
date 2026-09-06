import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/trips", form);
      navigate(`/trips/${res.data.trip._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create trip.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white dark:bg-gray-800 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">Plan a new trip</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Trip title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Destination</label>
          <input
            name="destination"
            value={form.destination}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Start date</label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">End date</label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Budget (₹)</label>
            <input
              type="number"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Max members</label>
            <input
              type="number"
              name="maxMembers"
              value={form.maxMembers}
              onChange={handleChange}
              min={1}
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Difficulty</label>
          <select
            name="difficultyLevel"
            value={form.difficultyLevel}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create trip"}
        </button>
      </form>
    </div>
  );
}
