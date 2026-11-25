const Trip = require("../models/Trip");
const TripMember = require("../models/TripMember");
const Notification = require("../models/Notification");
const Expense = require("../models/Expense");
const Message = require("../models/Message");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  DAY_MS,
  isObjectId,
  checkString,
  checkNumber,
  parseDate,
  startOfUtcDay,
  getTripPhase,
} = require("../utils/validate");

const DIFFICULTIES = ["easy", "moderate", "hard"];
const MAX_TRIP_DAYS = 90;
const MAX_BUDGET = 10_000_000; // ₹1 crore

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Validates trip fields. For updates (`existing` given), missing fields fall
// back to the current values so cross-field rules (end >= start) still hold.
// Returns { errors: string[], values }.
function validateTripInput(body, existing = null) {
  const errors = [];
  const pick = (k) => (body[k] !== undefined ? body[k] : existing?.[k]);
  const isNew = !existing;
  const push = (msg) => msg && errors.push(msg);

  if (isNew || body.title !== undefined) push(checkString(body.title, "Title", { min: 3, max: 100 }));
  if (isNew || body.destination !== undefined)
    push(checkString(body.destination, "Destination", { min: 2, max: 100 }));
  if (isNew || body.budget !== undefined)
    push(checkNumber(body.budget, "Budget", { min: 1, max: MAX_BUDGET }));
  if (body.maxMembers !== undefined && body.maxMembers !== "")
    push(checkNumber(body.maxMembers, "Max members", { min: 2, max: 50, integer: true }));
  if (body.vehicle !== undefined) push(checkString(body.vehicle, "Vehicle", { max: 50, required: false }));
  if (body.difficultyLevel !== undefined && !DIFFICULTIES.includes(body.difficultyLevel))
    errors.push("Difficulty must be easy, moderate or hard.");

  const start = parseDate(pick("startDate"));
  const end = parseDate(pick("endDate"));
  if (!start) errors.push("A valid start date is required.");
  if (!end) errors.push("A valid end date is required.");

  if (start && end) {
    if (end < start) errors.push("End date cannot be before the start date.");
    else if ((end - start) / DAY_MS + 1 > MAX_TRIP_DAYS)
      errors.push(`A trip can be at most ${MAX_TRIP_DAYS} days long.`);

    // New trips (or changed start dates) can't begin in the past. Allow one
    // day of slack for users in time zones ahead of UTC.
    const startChanged = isNew || (body.startDate !== undefined && +start !== +new Date(existing.startDate));
    if (startChanged && start.getTime() < startOfUtcDay() - DAY_MS) {
      errors.push("Start date cannot be in the past.");
    }
  }

  const values = {};
  for (const k of ["title", "destination", "vehicle"]) {
    if (body[k] !== undefined) values[k] = String(body[k]).trim();
  }
  if (body.budget !== undefined) values.budget = Number(body.budget);
  if (body.maxMembers !== undefined && body.maxMembers !== "") values.maxMembers = Number(body.maxMembers);
  if (body.difficultyLevel !== undefined) values.difficultyLevel = body.difficultyLevel;
  if (body.startDate !== undefined) values.startDate = start;
  if (body.endDate !== undefined) values.endDate = end;
  if (start && end) values.duration = Math.round((end - start) / DAY_MS) + 1; // inclusive days

  return { errors, values };
}

async function findTripOr404(id, res) {
  if (!isObjectId(id)) {
    res.status(400).json({ message: "Invalid trip id." });
    return null;
  }
  const trip = await Trip.findById(id);
  if (!trip) res.status(404).json({ message: "Trip not found." });
  return trip;
}

// POST /api/trips
const createTrip = asyncHandler(async (req, res) => {
  const { errors, values } = validateTripInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const trip = await Trip.create({ ...values, organizer: req.session.userId });

  // Organizer automatically becomes a member
  await TripMember.create({
    trip: trip._id,
    user: req.session.userId,
    role: "organizer",
    status: "accepted",
  });

  res.status(201).json({ trip });
});

// GET /api/trips?destination=goa&status=planning
const getTrips = asyncHandler(async (req, res) => {
  const { destination, status } = req.query;
  const filter = {};

  if (typeof destination === "string" && destination.trim()) {
    filter.destination = new RegExp(escapeRegex(destination.trim().slice(0, 100)), "i");
  }
  if (typeof status === "string" && status) {
    filter.status = status;
  }

  const trips = await Trip.find(filter)
    .populate("organizer", "name profilePhoto verificationStatus")
    .sort({ startDate: 1 });

  // Accepted-member counts, so cards can show "3/4 members"
  const counts = await TripMember.aggregate([
    { $match: { trip: { $in: trips.map((t) => t._id) }, status: "accepted" } },
    { $group: { _id: "$trip", count: { $sum: 1 } } },
  ]);
  const countByTrip = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

  res.json({
    trips: trips.map((t) => ({ ...t.toJSON(), memberCount: countByTrip[t._id.toString()] || 0 })),
  });
});

// GET /api/trips/:id
const getTripById = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid trip id." });

  const trip = await Trip.findById(req.params.id).populate(
    "organizer",
    "name profilePhoto verificationStatus"
  );
  if (!trip) return res.status(404).json({ message: "Trip not found." });

  // Organizer sees accepted + pending requests; everyone else only accepted members.
  const isOrganizer = trip.organizer._id.toString() === req.session.userId;
  const members = await TripMember.find({
    trip: trip._id,
    status: isOrganizer ? { $in: ["accepted", "requested"] } : "accepted",
  }).populate("user", "name profilePhoto verificationStatus");

  const myMembership = req.session.userId
    ? await TripMember.findOne({ trip: trip._id, user: req.session.userId })
    : null;

  res.json({ trip, members, myMembership });
});

// PUT /api/trips/:id — organizer only, whitelisted fields
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await findTripOr404(req.params.id, res);
  if (!trip) return;

  if (trip.organizer.toString() !== req.session.userId) {
    return res.status(403).json({ message: "Only the organizer can edit this trip." });
  }

  const { errors, values } = validateTripInput(req.body, trip);

  if (req.body.status !== undefined) {
    if (!["planning", "active", "completed", "cancelled"].includes(req.body.status)) {
      errors.push("Invalid trip status.");
    } else {
      values.status = req.body.status;
    }
  }

  if (values.maxMembers !== undefined) {
    const accepted = await TripMember.countDocuments({ trip: trip._id, status: "accepted" });
    if (values.maxMembers < accepted) {
      errors.push(`Max members can't be lower than the current ${accepted} members.`);
    }
  }

  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  Object.assign(trip, values);
  await trip.save();

  res.json({ trip });
});

// DELETE /api/trips/:id
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await findTripOr404(req.params.id, res);
  if (!trip) return;

  if (trip.organizer.toString() !== req.session.userId) {
    return res.status(403).json({ message: "Only the organizer can delete this trip." });
  }

  await Promise.all([
    trip.deleteOne(),
    TripMember.deleteMany({ trip: trip._id }),
    Expense.deleteMany({ trip: trip._id }),
    Message.deleteMany({ trip: trip._id }),
  ]);

  res.json({ message: "Trip deleted." });
});

// POST /api/trips/:id/join
const requestToJoin = asyncHandler(async (req, res) => {
  const trip = await findTripOr404(req.params.id, res);
  if (!trip) return;

  const phase = getTripPhase(trip);
  if (phase === "completed") {
    return res.status(400).json({ message: "This trip has already ended." });
  }
  if (phase === "cancelled") {
    return res.status(400).json({ message: "This trip has been cancelled." });
  }

  const acceptedCount = await TripMember.countDocuments({ trip: trip._id, status: "accepted" });
  if (acceptedCount >= trip.maxMembers) {
    return res.status(400).json({ message: "This trip is already full." });
  }

  let member = await TripMember.findOne({ trip: trip._id, user: req.session.userId });

  if (member && member.status !== "left") {
    const msg = {
      accepted: "You are already a member of this trip.",
      requested: "Your join request is already pending.",
      rejected: "Your request to join this trip was declined.",
    }[member.status];
    return res.status(409).json({ message: msg });
  }

  if (member) {
    // People who left may ask to rejoin.
    member.status = "requested";
    await member.save();
  } else {
    member = await TripMember.create({
      trip: trip._id,
      user: req.session.userId,
      status: "requested",
    });
  }

  await Notification.create({
    user: trip.organizer,
    type: "trip_invitation",
    message: `Someone requested to join your trip "${trip.title}".`,
    relatedTrip: trip._id,
  });

  res.status(201).json({ member });
});

// PATCH /api/trips/:id/members/:memberId
const respondToJoinRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "status must be 'accepted' or 'rejected'." });
  }
  if (!isObjectId(req.params.memberId)) {
    return res.status(400).json({ message: "Invalid member id." });
  }

  const trip = await findTripOr404(req.params.id, res);
  if (!trip) return;

  if (trip.organizer.toString() !== req.session.userId) {
    return res.status(403).json({ message: "Only the organizer can respond to join requests." });
  }

  const member = await TripMember.findById(req.params.memberId);
  if (!member || member.trip.toString() !== trip._id.toString()) {
    return res.status(404).json({ message: "Join request not found." });
  }
  if (member.status !== "requested") {
    return res.status(400).json({ message: `This request was already ${member.status}.` });
  }

  if (status === "accepted") {
    const acceptedCount = await TripMember.countDocuments({ trip: trip._id, status: "accepted" });
    if (acceptedCount >= trip.maxMembers) {
      return res.status(400).json({
        message: `The trip is full (${trip.maxMembers} members). Increase max members to accept more.`,
      });
    }
  }

  member.status = status;
  await member.save();

  await Notification.create({
    user: member.user,
    type: "join_approval",
    message: `Your request to join "${trip.title}" was ${status}.`,
    relatedTrip: trip._id,
  });

  res.json({ member });
});

// POST /api/trips/:id/leave
const leaveTrip = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: "Invalid trip id." });

  const member = await TripMember.findOne({ trip: req.params.id, user: req.session.userId });
  if (!member || member.status === "left") {
    return res.status(404).json({ message: "You are not part of this trip." });
  }
  if (member.role === "organizer") {
    return res.status(400).json({
      message: "The organizer cannot leave — cancel or delete the trip instead.",
    });
  }

  member.status = "left";
  await member.save();

  res.json({ message: "You have left the trip." });
});

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  requestToJoin,
  respondToJoinRequest,
  leaveTrip,
};
