import { useEffect, useState, useSyncExternalStore } from "react";
import api from "../api/axios";
import {
  addToOutbox,
  getCached,
  getOutbox,
  pruneCache,
  putCached,
  removeFromOutbox,
} from "./db";

// How long data saved for offline use stays available.
export const OFFLINE_TTL_MS = 24 * 60 * 60 * 1000;

const cacheKey = (path, params) =>
  params && Object.keys(params).length ? `${path}?${new URLSearchParams(params).toString()}` : path;

// A request failed because we couldn't reach the server (offline, DNS, server
// asleep) — as opposed to the server answering with an error.
export const isNetworkError = (err) => !err?.response;

/**
 * GET with an offline fallback.
 * Online: fetches from the API and saves a copy on the device.
 * Offline: returns the saved copy if it's less than 24 hours old.
 * Resolves to { data, fromCache, savedAt }.
 */
export async function cachedGet(path, params) {
  const key = cacheKey(path, params);
  try {
    const res = await api.get(path, { params });
    putCached(key, res.data).catch(() => {});
    return { data: res.data, fromCache: false, savedAt: Date.now() };
  } catch (err) {
    if (!isNetworkError(err)) throw err; // real server error (404, 403…)
    const hit = await getCached(key).catch(() => null);
    if (hit && Date.now() - hit.savedAt <= OFFLINE_TTL_MS) {
      return { data: hit.data, fromCache: true, savedAt: hit.savedAt };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Background sync: keep the user's own trips (details, chat, expenses)
// saved on the device so they're available offline.
// ---------------------------------------------------------------------------
let syncState = { syncing: false, lastSync: Number(localStorage.getItem("tripmate-last-sync")) || null };
const syncListeners = new Set();
const setSync = (patch) => {
  syncState = { ...syncState, ...patch };
  syncListeners.forEach((l) => l());
};

export function useOfflineSync() {
  return useSyncExternalStore(
    (cb) => (syncListeners.add(cb), () => syncListeners.delete(cb)),
    () => syncState
  );
}

export async function syncForOffline() {
  if (syncState.syncing || !navigator.onLine) return;
  setSync({ syncing: true });
  try {
    await pruneCache(OFFLINE_TTL_MS).catch(() => {});
    await cachedGet("/auth/me");
    await cachedGet("/trips");
    const { data } = await cachedGet("/trips/mine");

    // Details for each trip; chat + expenses only where we're a member.
    for (const trip of data.trips || []) {
      const tasks = [cachedGet(`/trips/${trip._id}`)];
      if (trip.myStatus === "accepted") {
        tasks.push(
          cachedGet(`/chat/${trip._id}/messages`),
          cachedGet(`/trips/${trip._id}/expenses`, { expenseType: "common" }),
          cachedGet(`/trips/${trip._id}/expenses/summary`, { expenseType: "common" }),
          cachedGet(`/trips/${trip._id}/expenses`, { expenseType: "custom" }),
          cachedGet(`/trips/${trip._id}/expenses/summary`, { expenseType: "custom" })
        );
      }
      await Promise.allSettled(tasks);
    }
    const now = Date.now();
    localStorage.setItem("tripmate-last-sync", String(now));
    setSync({ lastSync: now });
  } catch (err) {
    console.warn("Offline sync failed:", err?.message || err);
  } finally {
    setSync({ syncing: false });
  }
}

// ---------------------------------------------------------------------------
// Outbox: chat messages and expenses created while offline are queued on the
// device and sent automatically when the connection returns.
// ---------------------------------------------------------------------------
const outboxListeners = new Set();
let outboxVersion = 0;
const notifyOutbox = () => {
  outboxVersion += 1;
  outboxListeners.forEach((l) => l());
};

export async function queueOffline(kind, tripId, payload) {
  await addToOutbox({ kind, tripId, payload });
  notifyOutbox();
}

// Pending outbox items for a trip (re-reads whenever the outbox changes).
export function usePendingOutbox(tripId) {
  const version = useSyncExternalStore(
    (cb) => (outboxListeners.add(cb), () => outboxListeners.delete(cb)),
    () => outboxVersion
  );
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    getOutbox()
      .then((all) => alive && setItems(all.filter((i) => i.tripId === tripId)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [tripId, version]);
  return items;
}

let flushing = false;
export async function flushOutbox() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const items = await getOutbox();
    for (const item of items) {
      try {
        if (item.kind === "message") {
          await api.post(`/chat/${item.tripId}/messages`, item.payload);
        } else if (item.kind === "expense") {
          await api.post(`/trips/${item.tripId}/expenses`, item.payload);
        }
        await removeFromOutbox(item.id);
      } catch (err) {
        if (isNetworkError(err)) break; // still offline — try again later
        // The server rejected it (e.g. no longer a member): drop it.
        console.warn("Dropping queued item:", err.response?.data?.message);
        await removeFromOutbox(item.id);
      }
    }
  } finally {
    flushing = false;
    notifyOutbox();
  }
}

export function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} hour${h > 1 ? "s" : ""} ago`;
}
