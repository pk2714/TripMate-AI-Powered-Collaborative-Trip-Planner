const express = require("express");
const {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  requestToJoin,
  respondToJoinRequest,
  leaveTrip,
} = require("../controllers/tripController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", getTrips);
router.post("/", requireAuth, createTrip);
router.get("/:id", getTripById);
router.put("/:id", requireAuth, updateTrip);
router.delete("/:id", requireAuth, deleteTrip);

router.post("/:id/join", requireAuth, requestToJoin);
router.patch("/:id/members/:memberId", requireAuth, respondToJoinRequest);
router.post("/:id/leave", requireAuth, leaveTrip);

module.exports = router;
