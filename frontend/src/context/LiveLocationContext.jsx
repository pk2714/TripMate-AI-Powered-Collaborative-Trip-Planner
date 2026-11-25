import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { SOCKET_URL } from "../api/socket.js";

// App-wide live location sharing.
//
// Sharing used to live inside the trip page, so it stopped as soon as you
// navigated elsewhere. This provider sits at the top of the app and keeps
// running across pages:
//  - its own Socket.IO connection, re-joining the trip after reconnects
//  - GPS updates (throttled) + a heartbeat so stationary users stay "live"
//  - resumes after a page reload (the choice is remembered on this device)
//  - optional screen wake lock so phones don't sleep mid-trip
//  - stops automatically on logout or once the trip has ended

const STORAGE_KEY = "tripmate-live-sharing";
const MIN_SEND_INTERVAL_MS = 4000;
const HEARTBEAT_MS = 20000;
const DAY_MS = 24 * 60 * 60 * 1000;

const LiveLocationContext = createContext(null);

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
};

const tripHasEnded = (endDate) => endDate && Date.now() > new Date(endDate).getTime() + DAY_MS;

export function LiveLocationProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;
  const [sharing, setSharing] = useState(loadSaved); // { tripId, tripTitle, endDate } | null
  const [status, setStatus] = useState("idle"); // idle | starting | live | reconnecting
  const [error, setError] = useState("");
  const [lastSentAt, setLastSentAt] = useState(null);
  const [keepAwake, setKeepAwake] = useState(() => localStorage.getItem("tripmate-keep-awake") === "1");

  const socketRef = useRef(null);
  const lastPosRef = useRef(null);

  // ---- public API -------------------------------------------------------
  const start = useCallback((trip) => {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Location isn't supported by this browser.");
      return;
    }
    if (tripHasEnded(trip.endDate)) {
      setError("This trip has ended — live location is turned off.");
      return;
    }
    const next = { tripId: trip._id, tripTitle: trip.title, endDate: trip.endDate };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    lastPosRef.current = null;
    setLastSentAt(null);
    setSharing(next);
  }, []);

  const stop = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const s = socketRef.current;
    const tripId = sharing?.tripId;
    const finish = () => setSharing(null);
    if (s?.connected && tripId) {
      // Wait for the server to remove the marker before the socket closes,
      // otherwise it would show as "last seen" for a while.
      s.timeout(2000).emit("stopSharingLocation", { tripId }, finish);
    } else {
      finish();
    }
  }, [sharing?.tripId]);

  const toggleKeepAwake = useCallback(() => {
    setKeepAwake((k) => {
      localStorage.setItem("tripmate-keep-awake", k ? "0" : "1");
      return !k;
    });
  }, []);

  // ---- stop on logout -------------------------------------------------------
  useEffect(() => {
    const onLogout = () => {
      localStorage.removeItem(STORAGE_KEY);
      setSharing(null);
    };
    window.addEventListener("tripmate:logout", onLogout);
    return () => window.removeEventListener("tripmate:logout", onLogout);
  }, []);

  // ---- the sharing session --------------------------------------------------
  useEffect(() => {
    if (!userId || !sharing) {
      setStatus("idle");
      return;
    }
    if (tripHasEnded(sharing.endDate)) {
      localStorage.removeItem(STORAGE_KEY);
      setSharing(null);
      return;
    }

    const { tripId } = sharing;
    let joined = false;
    let lastSent = 0;
    setStatus("starting");

    const s = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = s;

    const send = (force = false) => {
      const pos = lastPosRef.current;
      if (!joined || !pos || !s.connected) return;
      const now = Date.now();
      if (!force && now - lastSent < MIN_SEND_INTERVAL_MS) return;
      lastSent = now;
      s.emit("shareLocation", { tripId, ...pos });
      setLastSentAt(now);
    };

    s.on("connect", () => s.emit("joinTrip", { tripId }));
    // The snapshot arrives once joinTrip succeeded → we can share.
    s.on("locationSnapshot", () => {
      joined = true;
      setStatus("live");
      send(true);
    });
    s.on("disconnect", () => {
      joined = false;
      setStatus("reconnecting");
    });
    s.on("errorMessage", (msg) => {
      if (/not a member/i.test(msg)) {
        setError("You're no longer a member of this trip — live location stopped.");
        localStorage.removeItem(STORAGE_KEY);
        setSharing(null);
      }
    });

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        lastPosRef.current = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        setError("");
        send();
      },
      (err) => {
        if (err.code === err.TIMEOUT) return; // weak GPS — keep trying
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is blocked. Allow location for this site in your browser settings."
            : `Couldn't get your location: ${err.message}`
        );
        if (err.code === err.PERMISSION_DENIED) {
          localStorage.removeItem(STORAGE_KEY);
          setSharing(null);
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    // Heartbeat: re-send the last position even if we haven't moved.
    const heartbeat = setInterval(() => send(true), HEARTBEAT_MS);

    // Coming back to the app (phone unlocked / tab focused) → update at once.
    const onVisible = () => document.visibilityState === "visible" && send(true);
    document.addEventListener("visibilitychange", onVisible);

    // Auto-stop when the trip ends while sharing.
    const endCheck = setInterval(() => {
      if (tripHasEnded(sharing.endDate)) {
        localStorage.removeItem(STORAGE_KEY);
        s.emit("stopSharingLocation", { tripId });
        setSharing(null);
      }
    }, 60 * 1000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
      clearInterval(endCheck);
      document.removeEventListener("visibilitychange", onVisible);
      s.disconnect();
      socketRef.current = null;
    };
  }, [userId, sharing]);

  // ---- keep the screen awake while sharing (optional) ------------------------
  useEffect(() => {
    if (!sharing || !keepAwake || !("wakeLock" in navigator)) return;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible" && !cancelled) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* battery saver / not allowed — ignore */
      }
    };
    acquire();
    // Wake locks are released when the page is hidden; re-acquire on return.
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [sharing, keepAwake]);

  const value = {
    sharing,
    status,
    error,
    lastSentAt,
    keepAwake,
    canKeepAwake: typeof navigator !== "undefined" && "wakeLock" in navigator,
    isSharingTrip: (tripId) => sharing?.tripId === tripId,
    start,
    stop,
    toggleKeepAwake,
    clearError: () => setError(""),
  };

  return <LiveLocationContext.Provider value={value}>{children}</LiveLocationContext.Provider>;
}

export function useLiveLocation() {
  const ctx = useContext(LiveLocationContext);
  if (!ctx) throw new Error("useLiveLocation must be used within a LiveLocationProvider");
  return ctx;
}
