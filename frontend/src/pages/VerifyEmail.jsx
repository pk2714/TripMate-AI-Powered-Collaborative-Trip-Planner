import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import AuthLayout from "../components/AuthLayout.jsx";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", message: "Verifying your email…" });
  const requested = useRef(false);

  useEffect(() => {
    // The token is single-use: guard against React StrictMode running this twice.
    if (requested.current) return;
    requested.current = true;

    const token = params.get("token");
    if (!token) {
      setState({ status: "error", message: "This verification link is invalid." });
      return;
    }

    api
      .get("/auth/verify-email", { params: { token } })
      .then((res) => {
        setState({ status: "success", message: res.data.message });
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) =>
        setState({ status: "error", message: err.response?.data?.message || "Verification failed." })
      );
  }, [params, navigate]);

  return (
    <AuthLayout title="Email verification">
      <div className="py-4 text-center">
        <div className="text-5xl">
          {state.status === "loading" ? "⏳" : state.status === "success" ? "✅" : "⚠️"}
        </div>
        <p
          className={`mt-4 font-medium ${
            state.status === "error" ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {state.message}
        </p>
        {state.status === "success" && <p className="hint mt-2">Redirecting you to log in…</p>}
        {state.status !== "loading" && (
          <Link to="/login" className="btn-primary mt-6 w-full">
            Go to log in
          </Link>
        )}
      </div>
    </AuthLayout>
  );
}
