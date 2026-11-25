const TripMember = require("../models/TripMember");
const { isObjectId } = require("../utils/validate");

// Allows the request only if the logged-in user is an accepted member of the
// trip in req.params.tripId (or req.params.id). Must run after requireAuth.
async function requireTripMember(req, res, next) {
  try {
    const tripId = req.params.tripId || req.params.id;
    if (!isObjectId(tripId)) {
      return res.status(400).json({ message: "Invalid trip id." });
    }

    const member = await TripMember.findOne({
      trip: tripId,
      user: req.session.userId,
      status: "accepted",
    });

    if (!member) {
      return res.status(403).json({ message: "Only members of this trip can do that." });
    }

    req.tripMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireTripMember };
