import { useEffect, useState } from "react";
import { INSTALL_HELP_EVENT, detectPlatform } from "../pwa/pwa.js";

const STEPS = {
  "android-chrome": {
    browser: "Chrome on Android",
    steps: ["Tap the ⋮ menu at the top-right.", "Tap “Install app” (or “Add to Home screen”).", "Tap “Install” to confirm."],
  },
  "android-samsung": {
    browser: "Samsung Internet",
    steps: ["Tap the ☰ menu at the bottom.", "Tap “Add page to” → “Home screen”.", "Tap “Add”."],
  },
  "android-firefox": {
    browser: "Firefox on Android",
    steps: ["Tap the ⋮ menu.", "Tap “Install” (or “Add to Home screen”).", "Confirm with “Add”."],
  },
  "ios-safari": {
    browser: "Safari on iPhone / iPad",
    steps: ["Tap the Share button ⎋ in the toolbar.", "Scroll down and tap “Add to Home Screen”.", "Tap “Add” at the top-right."],
  },
  "ios-other": {
    browser: "iPhone / iPad",
    steps: [
      "Tap the Share button ⎋ (in Chrome it's at the top-right of the address bar).",
      "Tap “Add to Home Screen”.",
      "Tap “Add”. If you don't see it, open this site in Safari.",
    ],
  },
  "desktop-chrome": {
    browser: "Chrome on computer",
    steps: [
      "Click the install icon ⊕ at the right end of the address bar,",
      "or open the ⋮ menu → “Cast, save and share” → “Install page as app”.",
      "Click “Install”.",
    ],
  },
  "desktop-edge": {
    browser: "Microsoft Edge",
    steps: ["Click the ⋯ menu at the top-right.", "Choose “Apps” → “Install this site as an app”.", "Click “Install”."],
  },
  "desktop-safari": {
    browser: "Safari on Mac",
    steps: ["Open the File menu (or Share ⎋).", "Choose “Add to Dock”.", "Click “Add”."],
  },
  "desktop-firefox": {
    browser: "Firefox on computer",
    steps: [
      "Desktop Firefox can't install web apps yet.",
      "Open TripMate in Chrome, Edge or Safari and use “Install app” there.",
      "You can still bookmark this page (Ctrl/⌘ + D) for quick access.",
    ],
  },
};

const BENEFITS = [
  ["⚡", "Opens instantly from your home screen, like a normal app"],
  ["📴", "Saved trips, maps and emergency info work offline"],
  ["🖥️", "Full-screen — no browser address bar"],
];

export default function InstallAppDialog() {
  const [open, setOpen] = useState(false);
  const platform = typeof navigator !== "undefined" ? detectPlatform() : "desktop-chrome";
  const info = STEPS[platform];

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(INSTALL_HELP_EVENT, show);
    return () => window.removeEventListener(INSTALL_HELP_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="card w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4 bg-gradient-to-r from-brand-600 to-teal-500 p-5 text-white">
          <img src="/pwa-192x192.png" alt="" className="h-14 w-14 rounded-2xl bg-white shadow" />
          <div className="flex-1">
            <h2 id="install-title" className="text-xl font-bold">Install TripMate</h2>
            <p className="text-sm text-white/90">Add the app to your phone or computer</p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-2xl leading-none text-white/80 hover:text-white" aria-label="Close">
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <ul className="space-y-2">
            {BENEFITS.map(([icon, text]) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-lg leading-none">{icon}</span>
                {text}
              </li>
            ))}
          </ul>

          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">How to install · {info.browser}</p>
            <ol className="mt-3 space-y-2.5">
              {info.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already installed? Open <strong>TripMate</strong> from your home screen or app list.
          </p>

          <button onClick={() => setOpen(false)} className="btn-primary w-full">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
