import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout, {
  PasswordInput,
  PasswordStrength,
  isValidEmail,
  passwordError,
} from "../components/AuthLayout.jsx";

function validate(form) {
  const e = {};
  const name = form.name.trim();
  if (name.length < 2) e.name = "Name must be at least 2 characters.";
  else if (name.length > 50) e.name = "Name must be at most 50 characters.";
  if (!isValidEmail(form.email)) e.email = "Enter a valid email address.";
  const pw = passwordError(form.password);
  if (pw) e.password = pw;
  if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
  return e;
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(form);
  const show = (k) => (touched[k] || touched._submit) && errors[k];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ _submit: true });
    setServerError("");
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate("/login", { state: { justRegistered: true } });
    } catch (err) {
      setServerError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join TripMate to plan trips with friends and fellow travellers."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {serverError && <div className="alert-error mb-5">⚠️ {serverError}</div>}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={50}
            placeholder="Your name"
            className={`input ${show("name") ? "input-error" : ""}`}
          />
          {show("name") && <p className="field-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="you@example.com"
            className={`input ${show("email") ? "input-error" : ""}`}
          />
          {show("email") && <p className="field-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordInput
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
            invalid={!!show("password")}
          />
          {show("password") ? (
            <p className="field-error">{errors.password}</p>
          ) : (
            <p className="hint">At least 8 characters with a letter and a number.</p>
          )}
          <PasswordStrength password={form.password} />
        </div>

        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <PasswordInput
            id="confirm"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
            invalid={!!show("confirm")}
          />
          {show("confirm") && <p className="field-error">{errors.confirm}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
