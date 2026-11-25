import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import AuthLayout, { PasswordInput, PasswordStrength, passwordError } from "../components/AuthLayout.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const pwError = passwordError(password);
    if (pwError) return setError(pwError);
    if (password !== confirm) return setError("Passwords don't match.");

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      setSuccess(res.data.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      footer={
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          ← Back to log in
        </Link>
      }
    >
      {!token ? (
        <div className="alert-error">
          <span>⚠️</span>
          <span>
            This reset link is invalid.{" "}
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new one
            </Link>
            .
          </span>
        </div>
      ) : success ? (
        <div className="alert-success">✅ {success} Redirecting to log in…</div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && <div className="alert-error">⚠️ {error}</div>}
          <div>
            <label htmlFor="password" className="label">New password</label>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="hint">At least 8 characters with a letter and a number.</p>
            <PasswordStrength password={password} />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm new password</label>
            <PasswordInput
              id="confirm"
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
