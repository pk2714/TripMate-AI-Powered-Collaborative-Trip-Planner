const Review = require("../models/Review");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/trips/:tripId/reviews
const createReview = asyncHandler(async (req, res) => {
  const { revieweeId, rating, comment, isReport } = req.body;
  if (!revieweeId || !rating) {
    return res.status(400).json({ message: "revieweeId and rating are required." });
  }
  if (revieweeId === req.session.userId) {
    return res.status(400).json({ message: "You can't review yourself." });
  }

  const review = await Review.create({
    trip: req.params.tripId,
    reviewer: req.session.userId,
    reviewee: revieweeId,
    rating,
    comment,
    isReport: !!isReport,
  });

  res.status(201).json({ review });
});

// GET /api/users/:userId/reviews
const getReviewsForUser = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ reviewee: req.params.userId, isReport: false })
    .populate("reviewer", "name profilePhoto")
    .sort({ createdAt: -1 });

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  res.json({ reviews, avgRating });
});

module.exports = { createReview, getReviewsForUser };
