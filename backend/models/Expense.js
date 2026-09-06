const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["fuel", "food", "stay", "activities", "misc"],
      default: "misc",
    },
    // Even split by default across these members; can be customized later
    splitBetween: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    expenseType: {
  type: String,
  enum: ["common", "custom"],
  default: "common",
},
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
