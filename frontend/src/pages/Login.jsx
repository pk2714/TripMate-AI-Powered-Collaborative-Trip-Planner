import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white dark:bg-gray-800 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
      {location.state?.justRegistered && (
        <p className="mb-4 text-sm text-brand-600">
          Account created! Check your email to verify, then log in.
        </p>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
         <div className="flex justify-between items-center mb-1">
          <label className="block text-sm">Password</label>

         <Link
         to="/forgot-password"
         className="text-sm text-brand-600 hover:underline"
      >
        Forgot Password?
        </Link>
     </div>

    <input
    type="password"
    name="password"
    value={form.password}
    onChange={handleChange}
    required
    className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
  />
</div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-center">
        No account yet?{" "}
        <Link to="/register" className="text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
