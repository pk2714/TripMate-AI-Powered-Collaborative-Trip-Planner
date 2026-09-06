const EmergencyResource = require("../models/EmergencyResource");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/emergency/nearby?lat=..&lng=..&type=hospital&radiusKm=10
// Powers the SOS screen: nearest hospitals, police stations, mechanics, blood banks.
const getNearbyResources = asyncHandler(async (req, res) => {
  const { lat, lng, type, radiusKm = 10 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: "lat and lng query params are required." });
  }

  const filter = {
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radiusKm) * 1000,
      },
    },
  };
  if (type) filter.type = type;

  const resources = await EmergencyResource.find(filter).limit(50);
  res.json({ resources });
});

// GET /api/emergency/region/:region
// Used to pre-fetch a bundle of emergency data for offline caching (see Offline Support).
const getResourcesForRegion = asyncHandler(async (req, res) => {
  const resources = await EmergencyResource.find({ region: req.params.region });
  res.json({ resources });
});

module.exports = { getNearbyResources, getResourcesForRegion };
