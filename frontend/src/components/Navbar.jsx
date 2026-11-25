import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useInstallApp } from "../pwa/pwa.js";

const linkCls = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showInstall, install } = useInstallApp();
  const [open, setOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const links = user
    ? [
        { to: "/dashboard", label: "Trips" },
        { to: "/trips/new", label: "Plan a Trip" },
        { to: "/emergency", label: "🚨 Emergency" },
      ]
    : [{ to: "/emergency", label: "🚨 Emergency" }];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/pwa-192x192.png" alt="" className="h-9 w-9 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700" />
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Trip<span className="text-brand-600">Mate</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls} end>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {showInstall && (
            <button
              onClick={install}
              className="btn border border-brand-600 bg-brand-50 py-2 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-200"
              title="Install TripMate as an app"
            >
              📲 Install App
            </button>
          )}
          {user ? (
            <>
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-400 text-sm font-bold text-white">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate text-sm font-medium">{user.name}</span>
              </NavLink>
              <button onClick={handleLogout} className="btn-ghost py-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkCls}>
                Log in
              </NavLink>
              <Link to="/register" className="btn-primary py-2">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile: install + menu toggle */}
        <div className="flex items-center gap-1 md:hidden">
        {showInstall && (
          <button
            onClick={install}
            className="btn border border-brand-600 bg-brand-50 px-3 py-1.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
          >
            📲 Install
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkCls} end>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/profile" className={linkCls}>
                  👤 {user.name}
                </NavLink>
                <button onClick={handleLogout} className="btn-secondary mt-2 w-full">
                  Log out
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-secondary">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign up
                </Link>
              </div>
            )}
            {showInstall && (
              <button onClick={install} className="btn-secondary mt-1 w-full">
                📲 Install App
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
