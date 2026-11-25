import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { isIos, isStandalone, useOnlineStatus } from "../pwa/pwa.js";

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // check for a new deploy hourly
const IOS_HINT_KEY = "tripmate-ios-install-hint-dismissed";

// Registers the service worker and renders PWA-related UI:
//  - an offline banner (in page flow, above the navbar)
//  - "new version available" / "ready to work offline" toasts (bottom-left,
//    so they don't collide with the AI assistant button bottom-right)
//  - a one-time "Add to Home Screen" hint for iOS Safari
export default function PwaManager() {
  const online = useOnlineStatus();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        if (navigator.onLine) registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(err) {
      console.error("Service worker registration failed:", err);
    },
  });

  const [showIosHint, setShowIosHint] = useState(
    () => isIos() && !isStandalone() && !localStorage.getItem(IOS_HINT_KEY)
  );

  // "Ready to work offline" is informational — hide it after a few seconds.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  const dismissIosHint = () => {
    localStorage.setItem(IOS_HINT_KEY, "1");
    setShowIosHint(false);
  };

  return (
    <>
      {!online && (
        <div
          role="status"
          className="bg-amber-500 text-white text-sm text-center px-4 py-1.5 font-medium"
        >
          📴 You're offline — showing saved trips and data. Chat, live location and AI need a
          connection.
        </div>
      )}

      <div className="fixed bottom-6 left-4 right-4 sm:right-auto z-50 flex flex-col gap-2 sm:max-w-sm">
        {needRefresh && (
          <Toast>
            <span className="flex-1">✨ A new version of TripMate is available.</span>
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
            >
              Reload
            </button>
            <CloseButton onClick={() => setNeedRefresh(false)} />
          </Toast>
        )}

        {offlineReady && (
          <Toast>
            <span className="flex-1">✅ TripMate is ready to work offline.</span>
            <CloseButton onClick={() => setOfflineReady(false)} />
          </Toast>
        )}

        {showIosHint && (
          <Toast>
            <span className="flex-1">
              📲 Install TripMate: tap <strong>Share</strong>{" "}
              <span aria-hidden="true">⎋</span> then <strong>Add to Home Screen</strong>.
            </span>
            <CloseButton onClick={dismissIosHint} />
          </Toast>
        )}
      </div>
    </>
  );
}

function Toast({ children }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100"
    >
      {children}
    </div>
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Dismiss"
      className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    >
      ✕
    </button>
  );
}
