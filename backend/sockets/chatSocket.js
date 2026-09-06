const Message = require("../models/Message");
const TripMember = require("../models/TripMember");

// Wires up real-time group chat, one Socket.IO "room" per trip.
// Call this once from server.js with the io instance.
function registerChatHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.onAny((event, ...args) => {
  console.log("EVENT:", event, args);
});

    // Client calls socket.emit("joinTrip", tripId) after opening a trip's chat screen
      
  socket.on("joinTrip", async ({ tripId, userId }) => {
  try {
    const member = await TripMember.findOne({
      trip: tripId,
      user: userId,
      status: "accepted",
    });

 console.log("Trip ID:", tripId);
console.log("User ID:", userId);
console.log("Member Found:", member);

    if (!member) {
      socket.emit("errorMessage", "You are not a member of this trip.");
      return;
    }

    socket.join(`trip:${tripId}`);
    console.log(`${userId} joined trip ${tripId}`);

  } catch (err) {
    console.error(err);
  }
});

    socket.on("leaveTrip", (tripId) => {
      socket.leave(`trip:${tripId}`);
    });

    // payload: { tripId, senderId, text, type, mediaUrl, location }
    socket.on("sendMessage", async (payload) => {
         console.log("Sending message:", payload);
   try {

    const member = await TripMember.findOne({
      trip: payload.tripId,
      user: payload.senderId,
      status: "accepted",
    });

    if (!member) {
      socket.emit("errorMessage", "You are not allowed to chat in this trip.");
      return;
    }

        console.log("Creating message:", payload);
        const message = await Message.create({
          trip: payload.tripId,
          sender: payload.senderId,
          text: payload.text,
          type: payload.type || "text",
          mediaUrl: payload.mediaUrl,
          location: payload.location,
        });

            console.log("✅ Saved:", message);

        const populated = await message.populate("sender", "name profilePhoto");
        // Broadcast to everyone in the trip's room, including the sender —
        // simplest way to keep every client's message list in sync.
        console.log("📤 Broadcasting:", populated);
        io.to(`trip:${payload.tripId}`).emit("newMessage", populated);
      } catch (err) {
        console.error(err);
      }
    });

    // Live location sharing — broadcast-only, not persisted.
 socket.on("shareLocation", ({ tripId, userId, lat, lng }) => {
  console.log("Broadcasting Location");

  io.to(`trip:${tripId}`).emit("locationUpdate", {
    userId,
    lat,
    lng,
  });
});

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { registerChatHandlers };
