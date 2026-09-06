const mongoose = require("mongoose");

// Static/curated data (hospitals, police stations, mechanics, blood banks) tied to
// a region so it can be cached on the device for offline access.
const emergencyResourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["hospital", "police", "ambulance", "mechanic", "blood_bank"],
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    location: {
      lat: Number,
      lng: Number,
    },
    region: { type: String, index: true }, // e.g. city or district, used to scope offline caching
  },
  { timestamps: true }
);

emergencyResourceSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("EmergencyResource", emergencyResourceSchema);
