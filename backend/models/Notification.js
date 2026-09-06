const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "registration_confirmation",
        "trip_invitation",
        "join_approval",
        "trip_cancellation",
        "trip_reminder",
        "weather_alert",
      ],
      required: true,
    },
    message: { type: String, required: true },
    relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
