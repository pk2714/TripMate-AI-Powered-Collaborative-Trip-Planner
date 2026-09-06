import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("/api/auth/forgot-password", {
        email,
      });

      setMessage(res.data.message);
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">
        Forgot Password
      </h1>

      {message && (
        <p className="mb-4 text-green-600">
          {message}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="email"
          placeholder="Enter your email"
          required
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full px-3 py-2 border rounded-md"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-brand-600 text-white"
        >
          {loading
            ? "Sending..."
            : "Send Reset Link"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          to="/login"
          className="text-brand-600 hover:underline"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}