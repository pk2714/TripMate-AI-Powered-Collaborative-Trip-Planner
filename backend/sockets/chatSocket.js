const Message = require("../models/Message");
const TripMember = require("../models/TripMember");
const User = require("../models/User");

// In-memory store of the latest live location per trip:
//   tripId -> Map(userId -> { userId, userName, userPhoto, lat, lng, accuracy,
//                             timestamp, offline, socketId })
// Live locations are intentionally NOT persisted to the database.
const liveLocations = new Map();

// When a sharer's connection drops (phone screen off, network blip) we keep
// their marker as "last seen" for a while instead of removing it instantly.
// If they reconnect and keep sharing, the marker simply turns live again.
const OFFLINE_GRACE_MS = 10 * 60 * 1000;
const graceTimers = new Map(); // `${tripId}:${userId}` -> timeout

function getTripLocations(tripId) {
  if (!liveLocations.has(tripId)) liveLocations.set(tripId, new Map());
  return liveLocations.get(tripId);
}

function isValidCoord(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

const publicLocation = ({ socketId, ...loc }) => loc;

// Validates + saves a chat message and broadcasts it to the trip room.
// Shared by the socket handler and the REST endpoint used for messages
// that were queued while offline (see routes/chatRoutes.js).
async function createChatMessage(io, { tripId, userId, text, mediaUrl }) {
  const cleanText = typeof text === "string" ? text.trim().slice(0, 2000) : "";
  const cleanMedia =
    typeof mediaUrl === "string" && mediaUrl.startsWith("https://res.cloudinary.com/") ? mediaUrl : "";
  if (!cleanText && !cleanMedia) return null;

  const message = await Message.create({
    trip: tripId,
    sender: userId,
    text: cleanText,
    type: cleanMedia ? "image" : "text",
    mediaUrl: cleanMedia,
  });

  const populated = await message.populate("sender", "name profilePhoto");
  // Broadcast to everyone in the trip's room, including the sender —
  // simplest way to keep every client's message list in sync.
  io.to(`trip:${tripId}`).emit("newMessage", populated);
  return populated;
}

// Wires up real-time group chat + live location, one Socket.IO "room" per trip.
// Requires the express session middleware to be attached via
// io.engine.use(...) so socket.request.session.userId identifies the user.
function registerChatHandlers(io) {
  const timerKey = (tripId, userId) => `${tripId}:${userId}`;

  function clearGrace(tripId, userId) {
    const key = timerKey(tripId, userId);
    clearTimeout(graceTimers.get(key));
    graceTimers.delete(key);
  }

  // Remove a sharer's marker for everyone.
  function removeLocation(tripId, userId) {
    clearGrace(tripId, userId);
    const tripLocs = liveLocations.get(tripId);
    if (!tripLocs?.has(userId)) return;
    tripLocs.delete(userId);
    if (tripLocs.size === 0) liveLocations.delete(tripId);
    io.to(`trip:${tripId}`).emit("locationStopped", { userId });
  }

  // The sharing connection went away without an explicit "stop": show the
  // marker as offline / last seen, and remove it after the grace period.
  function markOffline(socket, tripId) {
    const userId = socket.data.userId;
    const entry = liveLocations.get(tripId)?.get(userId);
    // Only if this socket owns the entry (another tab may still be sharing).
    if (!entry || entry.socketId !== socket.id || entry.offline) return;

    entry.offline = true;
    io.to(`trip:${tripId}`).emit("locationUpdate", publicLocation(entry));

    clearGrace(tripId, userId);
    graceTimers.set(
      timerKey(tripId, userId),
      setTimeout(() => removeLocation(tripId, userId), OFFLINE_GRACE_MS)
    );
  }

  io.on("connection", (socket) => {
    const userId = socket.request.session?.userId;
    if (!userId) {
      socket.emit("errorMessage", "You must be logged in to use trip chat.");
      socket.disconnect(true);
      return;
    }

    socket.data.userId = userId;
    socket.data.trips = new Set();

    // Client emits joinTrip after opening a trip (and after every reconnect,
    // since rooms are lost on disconnect).
    socket.on("joinTrip", async (data) => {
      const tripId = typeof data === "object" ? data?.tripId : data;
      if (!tripId) return;

      try {
        const member = await TripMember.findOne({ trip: tripId, user: userId, status: "accepted" });
        if (!member) {
          socket.emit("errorMessage", "You are not a member of this trip.");
          return;
        }

        socket.join(`trip:${tripId}`);
        socket.data.trips.add(tripId);

        // Everyone currently sharing (incl. "last seen"), so late joiners see them.
        const current = [...(liveLocations.get(tripId)?.values() || [])].map(publicLocation);
        socket.emit("locationSnapshot", current);
      } catch (err) {
        console.error("joinTrip failed:", err);
      }
    });

    socket.on("leaveTrip", (data) => {
      const tripId = typeof data === "object" ? data?.tripId : data;
      if (!tripId) return;
      markOffline(socket, tripId);
      socket.leave(`trip:${tripId}`);
      socket.data.trips.delete(tripId);
    });

    // payload: { tripId, text, mediaUrl }
    socket.on("sendMessage", async (payload) => {
      try {
        if (!payload?.tripId || !socket.data.trips.has(payload.tripId)) {
          socket.emit("errorMessage", "You are not allowed to chat in this trip.");
          return;
        }
        await createChatMessage(io, { ...payload, userId });
      } catch (err) {
        console.error("sendMessage failed:", err);
      }
    });

    // Live location — broadcast to the trip room, kept in memory only.
    // Clients also re-send their last position periodically as a heartbeat,
    // so stationary users stay "live".   payload: { tripId, lat, lng, accuracy? }
    socket.on("shareLocation", async (payload) => {
      const tripId = payload?.tripId;
      const lat = Number(payload?.lat);
      const lng = Number(payload?.lng);

      if (!tripId || !socket.data.trips.has(tripId)) return;
      if (!isValidCoord(lat, lng)) return;

      try {
        // Cache the user's display info on the socket after the first lookup.
        if (!socket.data.profile) {
          const user = await User.findById(userId).select("name profilePhoto");
          socket.data.profile = {
            userName: user?.name || "Trip Member",
            userPhoto: user?.profilePhoto || "",
          };
        }

        clearGrace(tripId, userId);
        const location = {
          userId,
          ...socket.data.profile,
          lat,
          lng,
          accuracy: Number.isFinite(Number(payload.accuracy)) ? Math.round(Number(payload.accuracy)) : null,
          timestamp: new Date().toISOString(),
          offline: false,
        };

        getTripLocations(tripId).set(userId, { ...location, socketId: socket.id });
        io.to(`trip:${tripId}`).emit("locationUpdate", location);
      } catch (err) {
        console.error("shareLocation failed:", err);
      }
    });

    // Explicit "Stop sharing" — remove immediately (from any of the user's tabs).
    socket.on("stopSharingLocation", (payload, ack) => {
      const tripId = payload?.tripId;
      if (tripId && socket.data.trips.has(tripId)) removeLocation(tripId, userId);
      if (typeof ack === "function") ack(); // client waits for this before disconnecting
    });

    socket.on("disconnect", () => {
      for (const tripId of socket.data.trips) markOffline(socket, tripId);
    });
  });
}

module.exports = { registerChatHandlers, createChatMessage };
