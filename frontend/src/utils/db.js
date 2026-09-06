import { openDB } from "idb";

const dbPromise = openDB("tripmate-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("trips")) {
      db.createObjectStore("trips", {
        keyPath: "id",
      });
    }

    if (!db.objectStoreNames.contains("emergencyContacts")) {
      db.createObjectStore("emergencyContacts", {
        keyPath: "id",
      });
    }
  },
});

// ==================== TRIPS ====================

export async function saveTrip(trip) {
  const db = await dbPromise;
  await db.put("trips", trip);
}

export async function saveTrips(trips) {
  const db = await dbPromise;

  const tx = db.transaction("trips", "readwrite");

  for (const trip of trips) {
    await tx.store.put(trip);
  }

  await tx.done;
}

export async function getTrip(id) {
  const db = await dbPromise;
  return await db.get("trips", id);
}

export async function getAllTrips() {
  const db = await dbPromise;
  return await db.getAll("trips");
}

// ==================== EMERGENCY CONTACTS ====================

export async function saveEmergencyContacts(contacts) {
  const db = await dbPromise;

  const tx = db.transaction("emergencyContacts", "readwrite");

  for (const contact of contacts) {
    await tx.store.put(contact);
  }

  await tx.done;
}

export async function getEmergencyContacts() {
  const db = await dbPromise;
  return await db.getAll("emergencyContacts");
}