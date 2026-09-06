const mongoose = require("mongoose");

// Join table between User and Trip — tracks membership + join-request state.
const tripMemberSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["requested", "accepted", "rejected", "left"],
      default: "requested",
    },
    role: { type: String, enum: ["organizer", "member"], default: "member" },
  },
  { timestamps: true }
);

// A user can only have one active membership record per trip
tripMemberSchema.index({ trip: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("TripMember", tripMemberSchema);
