import { useState } from "react";
import { useInstallApp } from "../pwa/pwa.js";

const DISMISS_KEY = "tripmate-install-banner-dismissed";

// Prominent "Install the app" card for the dashboard. Hidden once installed
// or after the user dismisses it.
export default function InstallBanner() {
  const { showInstall, install } = useInstallApp();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  if (!showInstall || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="card mt-8 flex flex-col gap-4 border-brand-200 bg-gradient-to-r from-brand-50 to-teal-50 p-5 sm:flex-row sm:items-center dark:border-brand-900 dark:from-brand-900/30 dark:to-teal-900/20">
      <img src="/pwa-192x192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white shadow ring-1 ring-slate-200" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Get the TripMate app</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Install it on your phone or computer — opens like a normal app, works offline with your saved trips, maps
          and emergency info.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={install} className="btn-primary">
          📲 Install App
        </button>
        <button onClick={dismiss} className="btn-ghost" aria-label="Dismiss">
          Not now
        </button>
      </div>
    </div>
  );
}
