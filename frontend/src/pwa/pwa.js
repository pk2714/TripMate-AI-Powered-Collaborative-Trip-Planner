import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Install prompt
// Chrome/Edge/Android fire `beforeinstallprompt` once, possibly before React
// has mounted, so we capture it at module load (imported from main.jsx) and
// expose it through a tiny store.
// ---------------------------------------------------------------------------
let deferredPrompt = null;
const installListeners = new Set();
const notifyInstall = () => installListeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own Install button instead of the mini-infobar
    deferredPrompt = e;
    notifyInstall();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyInstall();
  });
}

function subscribeInstall(cb) {
  installListeners.add(cb);
  return () => installListeners.delete(cb);
}

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribeInstall, () => deferredPrompt !== null);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    deferredPrompt = null; // a prompt event can only be used once
    notifyInstall();
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === "accepted";
  };

  return { canInstall, promptInstall };
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// iOS Safari has no install prompt — users must use Share → Add to Home Screen.
export function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// ---------------------------------------------------------------------------
// Online / offline status
// ---------------------------------------------------------------------------
function subscribeOnline(cb) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine);
}

// ---------------------------------------------------------------------------
// Cached API data contains the logged-in user's trips/messages, so it must be
// wiped on logout (see AuthContext).
// ---------------------------------------------------------------------------
export async function clearUserCaches() {
  if (!("caches" in window)) return;
  try {
    await Promise.all(["api-data", "emergency-api"].map((name) => caches.delete(name)));
  } catch (err) {
    console.warn("Failed to clear cached API data:", err);
  }
}
