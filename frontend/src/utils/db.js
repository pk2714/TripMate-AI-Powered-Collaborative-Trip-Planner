import { openDB } from "idb";

// IndexedDB for offline use.
//   trips             – legacy per-trip snapshot (kept for compatibility)
//   emergencyContacts – emergency contacts
//   apiCache          – { key, data, savedAt } copies of API responses (24h)
//   outbox            – { id, kind, tripId, payload, createdAt } actions made offline
const dbPromise = openDB("tripmate-db", 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("trips")) {
      db.createObjectStore("trips", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("emergencyContacts")) {
      db.createObjectStore("emergencyContacts", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("apiCache")) {
      db.createObjectStore("apiCache", { keyPath: "key" });
    }
    if (!db.objectStoreNames.contains("outbox")) {
      db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
    }
  },
});

// ==================== TRIPS (legacy) ====================

export async function saveTrip(trip) {
  const db = await dbPromise;
  await db.put("trips", trip);
}

export async function saveTrips(trips) {
  const db = await dbPromise;
  const tx = db.transaction("trips", "readwrite");
  for (const trip of trips) await tx.store.put(trip);
  await tx.done;
}

export async function getTrip(id) {
  const db = await dbPromise;
  return db.get("trips", id);
}

export async function getAllTrips() {
  const db = await dbPromise;
  return db.getAll("trips");
}

// ==================== EMERGENCY CONTACTS ====================

export async function saveEmergencyContacts(contacts) {
  const db = await dbPromise;
  const tx = db.transaction("emergencyContacts", "readwrite");
  for (const contact of contacts) await tx.store.put(contact);
  await tx.done;
}

export async function getEmergencyContacts() {
  const db = await dbPromise;
  return db.getAll("emergencyContacts");
}

// ==================== API CACHE ====================

export async function putCached(key, data) {
  const db = await dbPromise;
  await db.put("apiCache", { key, data, savedAt: Date.now() });
}

export async function getCached(key) {
  const db = await dbPromise;
  return db.get("apiCache", key);
}

export async function pruneCache(maxAgeMs) {
  const db = await dbPromise;
  const tx = db.transaction("apiCache", "readwrite");
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (Date.now() - cursor.value.savedAt > maxAgeMs) await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ==================== OUTBOX ====================

export async function addToOutbox(item) {
  const db = await dbPromise;
  return db.add("outbox", { ...item, createdAt: Date.now() });
}

export async function getOutbox() {
  const db = await dbPromise;
  return db.getAll("outbox");
}

export async function removeFromOutbox(id) {
  const db = await dbPromise;
  await db.delete("outbox", id);
}

// ==================== LOGOUT ====================

export async function clearOfflineData() {
  const db = await dbPromise;
  await Promise.all(["trips", "apiCache", "outbox"].map((s) => db.clear(s)));
}
