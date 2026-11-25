import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { flushOutbox, syncForOffline } from "../utils/offline.js";

const SYNC_EVERY_MS = 30 * 60 * 1000;

// Keeps the logged-in user's trips, chat and expenses saved on the device
// (for 24h offline access) and sends anything queued while offline.
export default function OfflineSync() {
  const { user } = useAuth();
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;

    const run = async () => {
      if (!navigator.onLine) return;
      await flushOutbox();
      await syncForOffline();
    };

    // Let the current page load first.
    const first = setTimeout(run, 3000);
    const interval = setInterval(run, SYNC_EVERY_MS);
    window.addEventListener("online", run);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      window.removeEventListener("online", run);
    };
  }, [userId]);

  return null;
}
