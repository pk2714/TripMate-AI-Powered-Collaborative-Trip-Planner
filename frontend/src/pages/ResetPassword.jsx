import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setMessage("Passwords do not match.");
    }

    setLoading(true);

    try {
      const res = await axios.post("/api/auth/reset-password", {
        token,
        password,
      });

      setMessage(res.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        "Password reset failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">
        Reset Password
      </h1>

      {message && (
        <p className="mb-4 text-center text-green-600">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-brand-600 text-white"
        >
          {loading ? "Updating..." : "Update Password"}
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