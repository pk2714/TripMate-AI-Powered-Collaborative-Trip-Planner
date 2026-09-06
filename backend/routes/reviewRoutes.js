const express = require("express");
const { createReview, getReviewsForUser } = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/auth");

const tripScopedRouter = express.Router({ mergeParams: true });
tripScopedRouter.post("/", requireAuth, createReview);

const userScopedRouter = express.Router();
userScopedRouter.get("/:userId/reviews", getReviewsForUser);

module.exports = { tripScopedRouter, userScopedRouter };
