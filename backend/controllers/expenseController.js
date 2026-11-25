const Expense = require("../models/Expense");
const TripMember = require("../models/TripMember");
const { asyncHandler } = require("../middleware/errorHandler");
const { checkString, checkNumber, isObjectId } = require("../utils/validate");

const CATEGORIES = ["fuel", "food", "stay", "activities", "misc"];
const EXPENSE_TYPES = ["common", "custom"];
const MAX_EXPENSE = 10_000_000;

const expenseTypeFrom = (q) => (EXPENSE_TYPES.includes(q) ? q : "common");

// POST /api/trips/:tripId/expenses  (accepted members only — see routes)
const addExpense = asyncHandler(async (req, res) => {
  const { description, amount, category, splitBetween, expenseType = "common" } = req.body;

  const error =
    checkString(description, "Description", { min: 2, max: 120 }) ||
    checkNumber(amount, "Amount", { min: 1, max: MAX_EXPENSE }) ||
    (!EXPENSE_TYPES.includes(expenseType) ? "Invalid expense type." : null) ||
    (category !== undefined && !CATEGORIES.includes(category) ? "Invalid category." : null);
  if (error) return res.status(400).json({ message: error });

  const members = await TripMember.find({ trip: req.params.tripId, status: "accepted" });
  const memberIds = new Set(members.map((m) => m.user.toString()));

  let split;
  if (expenseType === "custom") {
    if (!Array.isArray(splitBetween) || splitBetween.length === 0) {
      return res.status(400).json({ message: "Select at least one member to split with." });
    }
    split = [...new Set(splitBetween.map(String))];
    if (split.some((id) => !isObjectId(id) || !memberIds.has(id))) {
      return res.status(400).json({ message: "You can only split with members of this trip." });
    }
  } else {
    // Common expenses are split evenly between every accepted member.
    split = [...memberIds];
  }

  const expense = await Expense.create({
    trip: req.params.tripId,
    paidBy: req.session.userId,
    description: description.trim(),
    amount: Math.round(Number(amount) * 100) / 100,
    category,
    splitBetween: split,
    expenseType,
  });

  res.status(201).json({ expense });
});

// GET /api/trips/:tripId/expenses?expenseType=common|custom
const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({
    trip: req.params.tripId,
    expenseType: expenseTypeFrom(req.query.expenseType),
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
    expenseType: expenseTypeFrom(req.query.expenseType),
  })
    .populate("paidBy", "name")
    .populate("splitBetween", "name");

  const balances = {}; // userId -> { name, paid, owes }
  const entry = (id, name) => (balances[id] = balances[id] || { name, paid: 0, owes: 0 });

  for (const exp of expenses) {
    const perPerson = exp.amount / (exp.splitBetween.length || 1);

    if (exp.paidBy) {
      const payer = entry(exp.paidBy._id.toString(), exp.paidBy.name);
      payer.name = payer.name || exp.paidBy.name;
      payer.paid += exp.amount;
    }

    for (const member of exp.splitBetween) {
      if (!member) continue; // user was deleted
      const m = entry(member._id.toString(), member.name);
      m.name = m.name || member.name;
      m.owes += perPerson;
    }
  }

  const round = (n) => Math.round(n * 100) / 100;
  const summary = Object.entries(balances).map(([userId, b]) => ({
    userId,
    name: b.name || "Former member",
    paid: round(b.paid),
    owes: round(b.owes),
    netBalance: round(b.paid - b.owes), // positive = is owed money
  }));

  res.json({ summary });
});

module.exports = { addExpense, getExpenses, getExpenseSummary };
