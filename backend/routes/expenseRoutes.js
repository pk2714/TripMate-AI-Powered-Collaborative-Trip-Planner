const express = require("express");
const { addExpense, getExpenses, getExpenseSummary } = require("../controllers/expenseController");
const { requireAuth } = require("../middleware/auth");
const { requireTripMember } = require("../middleware/tripMember");

// mergeParams lets us read :tripId from the parent router (see server.js mounting)
const router = express.Router({ mergeParams: true });

// Expenses are private to the trip's accepted members.
router.use(requireAuth, requireTripMember);

router.get("/", getExpenses);
router.post("/", addExpense);
router.get("/summary", getExpenseSummary);

module.exports = router;
