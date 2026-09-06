const express = require("express");
const router = express.Router();

const { getNearbyPlaces } = require("../controllers/mapController");

// GET /api/maps/nearby
router.get("/nearby", getNearbyPlaces);

module.exports = router;