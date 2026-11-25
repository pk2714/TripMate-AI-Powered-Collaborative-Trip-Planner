const Message = require("../models/Message");
const TripMember = require("../models/TripMember");
const User = require("../models/User");

// In-memory store of the latest live location per trip:
//   tripId -> Map(userId -> { userId, userName, userPhoto, lat, lng, accuracy, timestamp, socketId })
// Live locations are intentionally NOT persisted — they disappear when the
// user stops sharing, leaves the trip page, or disconnects.
const liveLocations = new Map();

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

// Wires up real-time group chat + live location, one Socket.IO "room" per trip.
// Call this once from server.js with the io instance. Requires the express
// session middleware to be attached via io.engine.use(...) so that
// socket.request.session.userId identifies the logged-in user.
function registerChatHandlers(io) {
  function stopSharing(socket, tripId) {
    const userId = socket.data.userId;
    const tripLocs = liveLocations.get(tripId);
    // Only remove the entry if it belongs to this socket (the same user may
    // have the trip open in another tab that is still sharing).
    if (!tripLocs || tripLocs.get(userId)?.socketId !== socket.id) return;
    tripLocs.delete(userId);
    if (tripLocs.size === 0) liveLocations.delete(tripId);
    io.to(`trip:${tripId}`).emit("locationStopped", { userId });
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

    // Client calls socket.emit("joinTrip", { tripId }) after opening a trip page
    // (and again after every reconnect, since rooms are lost on disconnect).
    socket.on("joinTrip", async (data) => {
      const tripId = typeof data === "object" ? data?.tripId : data;
      if (!tripId) return;

      try {
        const member = await TripMember.findOne({
          trip: tripId,
          user: userId,
          status: "accepted",
        });

        if (!member) {
          socket.emit("errorMessage", "You are not a member of this trip.");
          return;
        }

        socket.join(`trip:${tripId}`);
        socket.data.trips.add(tripId);

        // Send everyone currently sharing so late joiners see them immediately.
        const current = [...(liveLocations.get(tripId)?.values() || [])].map(
          ({ socketId, ...loc }) => loc
        );
        socket.emit("locationSnapshot", current);
      } catch (err) {
        console.error("joinTrip failed:", err);
      }
    });

    socket.on("leaveTrip", (data) => {
      const tripId = typeof data === "object" ? data?.tripId : data;
      if (!tripId) return;
      stopSharing(socket, tripId);
      socket.leave(`trip:${tripId}`);
      socket.data.trips.delete(tripId);
    });

    // payload: { tripId, text, type, mediaUrl, location }
    socket.on("sendMessage", async (payload) => {
      try {
        if (!payload?.tripId || !socket.data.trips.has(payload.tripId)) {
          socket.emit("errorMessage", "You are not allowed to chat in this trip.");
          return;
        }

        const message = await Message.create({
          trip: payload.tripId,
          sender: userId,
          text: payload.text,
          type: payload.type || "text",
          mediaUrl: payload.mediaUrl,
          location: payload.location,
        });

        const populated = await message.populate("sender", "name profilePhoto");
        // Broadcast to everyone in the trip's room, including the sender —
        // simplest way to keep every client's message list in sync.
        io.to(`trip:${payload.tripId}`).emit("newMessage", populated);
      } catch (err) {
        console.error("sendMessage failed:", err);
      }
    });

    // Live location sharing — broadcast to the trip room, kept in memory only.
    // payload: { tripId, lat, lng, accuracy? }
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

        const location = {
          userId,
          ...socket.data.profile,
          lat,
          lng,
          accuracy: Number.isFinite(Number(payload.accuracy)) ? Number(payload.accuracy) : null,
          timestamp: new Date().toISOString(),
        };

        getTripLocations(tripId).set(userId, { ...location, socketId: socket.id });
        io.to(`trip:${tripId}`).emit("locationUpdate", location);
      } catch (err) {
        console.error("shareLocation failed:", err);
      }
    });

    socket.on("stopSharingLocation", (payload) => {
      const tripId = payload?.tripId;
      if (tripId) stopSharing(socket, tripId);
    });

    socket.on("disconnect", () => {
      for (const tripId of socket.data.trips) {
        stopSharing(socket, tripId);
      }
    });
  });
}

module.exports = { registerChatHandlers };
