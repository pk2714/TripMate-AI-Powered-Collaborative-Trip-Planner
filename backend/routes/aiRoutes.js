const express = require("express");
const rateLimit = require("express-rate-limit");
const { generateItinerary, chatWithAI } = require("../controllers/aiController");
const { requireAuth } = require("../middleware/auth");
const { requireTripMember } = require("../middleware/tripMember");

const router = express.Router();

// Keep the chatbot from burning through the Gemini quota.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.session?.userId || req.ip,
  message: { message: "You're sending messages too quickly. Please wait a moment." },
});

router.post("/trips/:id/itinerary", requireAuth, requireTripMember, generateItinerary);
router.post("/chat", requireAuth, chatLimiter, chatWithAI);

module.exports = router;
