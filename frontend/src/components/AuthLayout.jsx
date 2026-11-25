import { useState } from "react";

// Shared shell for login / register / password pages.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-brand-50 via-white to-teal-50 px-4 py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/pwa-192x192.png" alt="TripMate" className="mx-auto h-16 w-16 rounded-2xl shadow-lg ring-1 ring-slate-200" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="card p-6 shadow-xl shadow-slate-200/50 sm:p-8 dark:shadow-none">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
      </div>
    </div>
  );
}

// Password input with show/hide toggle.
export function PasswordInput({ id, name, value, onChange, onBlur, invalid, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={128}
        className={`input pr-16 ${invalid ? "input-error" : ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-brand-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

// Same rule as backend/utils/validate.js → checkPassword
export function passwordError(pw) {
  if (!pw) return "Enter a password.";
  if (pw.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  return null;
}

export function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: "Very weak", cls: "bg-red-500" },
    { label: "Weak", cls: "bg-red-500" },
    { label: "Fair", cls: "bg-amber-500" },
    { label: "Good", cls: "bg-emerald-500" },
    { label: "Strong", cls: "bg-emerald-600" },
    { label: "Very strong", cls: "bg-emerald-700" },
  ];
  const level = levels[score];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? level.cls : "bg-slate-200 dark:bg-slate-700"}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">{level.label}</p>
    </div>
  );
}

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
