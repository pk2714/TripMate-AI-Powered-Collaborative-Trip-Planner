const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true },
    destination: { type: String, required: true },
    budget: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: Number }, // days, can be derived from start/end
    vehicle: { type: String },
    maxMembers: { type: Number, default: 4 },
    difficultyLevel: { type: String, enum: ["easy", "moderate", "hard"], default: "easy" },

    status: {
      type: String,
      enum: ["planning", "active", "completed", "cancelled"],
      default: "planning",
    },

    // Cached AI output — see aiController.generateItinerary
    aiItinerary: {
      itinerary: String,
      budgetEstimation: String,
      packingChecklist: [String],
      foodSuggestions: [String],
      hotelRecommendations: [String],
      travelTips: [String],
      safetyRecommendations: [String],
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
