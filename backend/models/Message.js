const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true },
    mediaUrl: { type: String },
    type: { type: String, enum: ["text", "image", "location", "announcement"], default: "text" },
    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
