const Expense = require("../models/Expense");
const TripMember = require("../models/TripMember");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/trips/:tripId/expenses
const addExpense = asyncHandler(async (req, res) => {
  const { description, amount, category, splitBetween,expenseType } = req.body;
  if (!description || !amount) {
    return res.status(400).json({ message: "description and amount are required." });
  }

  // Default split: every accepted member of the trip
  let split = splitBetween;
  if (!split || split.length === 0) {
    const members = await TripMember.find({ trip: req.params.tripId, status: "accepted" });
    split = members.map((m) => m.user);
  }

  const expense = await Expense.create({
    trip: req.params.tripId,
    paidBy: req.session.userId,
    description,
    amount,
    category,
    splitBetween: split,
    expenseType: expenseType || "common",
  });

  res.status(201).json({ expense });
});

// GET /api/trips/:tripId/expenses
const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({
  trip: req.params.tripId,
   expenseType: req.query.expenseType || "common",
})
    .populate("paidBy", "name")
    .populate("splitBetween", "name")
    .sort({ date: -1 });

  res.json({ expenses });
});

// GET /api/trips/:tripId/expenses/summary
// Computes, per member, how much they paid vs. their fair share, so the group
// can see who owes whom at a glance.
const getExpenseSummary = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({
  trip: req.params.tripId,
  expenseType: req.query.expenseType || "common",
}).populate("splitBetween", "name");

  const balances = {}; // userId -> { name, paid, owes }

  for (const exp of expenses) {
    const perPerson = exp.amount / (exp.splitBetween.length || 1);

    const payerId = exp.paidBy.toString();
    balances[payerId] = balances[payerId] || { paid: 0, owes: 0 };
    balances[payerId].paid += exp.amount;

    for (const member of exp.splitBetween) {
      const id = member._id.toString();
      balances[id] = balances[id] || { name: member.name, paid: 0, owes: 0 };
      balances[id].name = member.name;
      balances[id].owes += perPerson;
    }
  }

  const summary = Object.entries(balances).map(([userId, b]) => ({
    userId,
    name: b.name,
    paid: Math.round(b.paid * 100) / 100,
    owes: Math.round(b.owes * 100) / 100,
    netBalance: Math.round((b.paid - b.owes) * 100) / 100, // positive = owed money
  }));

  res.json({ summary });
});

module.exports = { addExpense, getExpenses, getExpenseSummary };
