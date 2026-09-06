const Trip = require("../models/Trip");
const TripMember = require("../models/TripMember");
const Notification = require("../models/Notification");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/trips
const createTrip = asyncHandler(async (req, res) => {
  const {
    title,
    destination,
    budget,
    startDate,
    endDate,
    vehicle,
    maxMembers,
    difficultyLevel,
  } = req.body;

  if (!title || !destination || !budget || !startDate || !endDate) {
    return res.status(400).json({
      message:
        "title, destination, budget, startDate and endDate are required.",
    });
  }

  const duration = Math.ceil(
    (new Date(endDate) - new Date(startDate)) /
      (1000 * 60 * 60 * 24)
  );

  const trip = await Trip.create({
    organizer: req.session.userId,
    title,
    destination,
    budget,
    startDate,
    endDate,
    duration,
    vehicle,
    maxMembers,
    difficultyLevel,
  });

  // Organizer automatically becomes a member
  await TripMember.create({
    trip: trip._id,
    user: req.session.userId,
    role: "organizer",
    status: "accepted",
  });

  res.status(201).json({ trip });
});

// GET /api/trips
const getTrips = asyncHandler(async (req, res) => {
  const { destination, status } = req.query;

  const filter = {};

  if (destination) {
    filter.destination = new RegExp(destination, "i");
  }

  if (status) {
    filter.status = status;
  }

  const trips = await Trip.find(filter)
    .populate(
      "organizer",
      "name profilePhoto verificationStatus"
    )
    .sort({ createdAt: -1 });

  res.json({ trips });
});

// GET /api/trips/:id
const getTripById = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate(
    "organizer",
    "name profilePhoto verificationStatus"
  );

  if (!trip) {
    return res.status(404).json({
      message: "Trip not found.",
    });
  }

  let members;

  // Organizer can see accepted + requested members
  if (trip.organizer._id.toString() === req.session.userId) {
    members = await TripMember.find({
      trip: trip._id,
      status: {
        $in: ["accepted", "requested"],
      },
    }).populate(
      "user",
      "name profilePhoto verificationStatus"
    );
  } else {
    // Other users can only see accepted members
    members = await TripMember.find({
      trip: trip._id,
      status: "accepted",
    }).populate(
      "user",
      "name profilePhoto verificationStatus"
    );
  }
    
  const myMembership = await TripMember.findOne({
    trip: trip._id,
    user: req.session.userId,
});

  res.json({
    trip,
    members,
    myMembership,
  });
});

// PUT /api/trips/:id
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return res.status(404).json({
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== req.session.userId) {
    return res.status(403).json({
      message: "Only the organizer can edit this trip.",
    });
  }

  Object.assign(trip, req.body);

  await trip.save();

  res.json({ trip });
});

// DELETE /api/trips/:id
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return res.status(404).json({
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== req.session.userId) {
    return res.status(403).json({
      message: "Only the organizer can delete this trip.",
    });
  }

  await trip.deleteOne();

  await TripMember.deleteMany({
    trip: trip._id,
  });

  res.json({
    message: "Trip deleted.",
  });
});

// POST /api/trips/:id/join
const requestToJoin = asyncHandler(async (req, res) => {
   console.log("Session User:", req.session.userId);
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return res.status(404).json({
      message: "Trip not found.",
    });
  }

  const existing = await TripMember.findOne({
    trip: trip._id,
    user: req.session.userId,
  });
  
    console.log("Existing Member:", existing);
  
  if (existing) {
    return res.status(409).json({
      message: `You already have a ${existing.status} request for this trip.`,
    });
  }

  const acceptedCount = await TripMember.countDocuments({
    trip: trip._id,
    status: "accepted",
  });

  if (acceptedCount >= trip.maxMembers) {
    return res.status(400).json({
      message: "This trip is already full.",
    });
  }

  const member = await TripMember.create({
    trip: trip._id,
    user: req.session.userId,
    status: "requested",
  });

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
    return res.status(400).json({
      message: "status must be 'accepted' or 'rejected'.",
    });
  }

  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return res.status(404).json({
      message: "Trip not found.",
    });
  }

  if (trip.organizer.toString() !== req.session.userId) {
    return res.status(403).json({
      message: "Only the organizer can respond to join requests.",
    });
  }

  const member = await TripMember.findById(req.params.memberId);

  if (!member || member.trip.toString() !== trip._id.toString()) {
    return res.status(404).json({
      message: "Join request not found.",
    });
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
  const member = await TripMember.findOne({
    trip: req.params.id,
    user: req.session.userId,
  });

  if (!member) {
    return res.status(404).json({
      message: "You are not part of this trip.",
    });
  }

  if (member.role === "organizer") {
    return res.status(400).json({
      message:
        "The organizer cannot leave — cancel or delete the trip instead.",
    });
  }

  member.status = "left";

  await member.save();

  res.json({
    message: "You have left the trip.",
  });
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