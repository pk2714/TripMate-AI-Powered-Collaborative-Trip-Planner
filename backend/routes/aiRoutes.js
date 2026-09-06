const express = require("express");
const { generateItinerary } = require("../controllers/aiController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/trips/:id/itinerary", requireAuth, generateItinerary);

module.exports = router;
