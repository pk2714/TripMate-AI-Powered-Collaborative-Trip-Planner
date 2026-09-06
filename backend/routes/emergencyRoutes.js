const express = require("express");
const { getNearbyResources, getResourcesForRegion } = require("../controllers/emergencyController");

const router = express.Router();

router.get("/nearby", getNearbyResources);
router.get("/region/:region", getResourcesForRegion);

module.exports = router;
