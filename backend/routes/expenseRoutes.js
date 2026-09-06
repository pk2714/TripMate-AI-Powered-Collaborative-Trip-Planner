const express = require("express");
const { addExpense, getExpenses, getExpenseSummary } = require("../controllers/expenseController");
const { requireAuth } = require("../middleware/auth");

// mergeParams lets us read :tripId from the parent router (see server.js mounting)
const router = express.Router({ mergeParams: true });

router.get("/", getExpenses);
router.post("/", requireAuth, addExpense);
router.get("/summary", getExpenseSummary);

module.exports = router;
