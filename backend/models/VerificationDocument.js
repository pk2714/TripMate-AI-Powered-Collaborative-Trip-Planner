const mongoose = require("mongoose");

const verificationDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    documentType: {
      type: String,
      enum: ["aadhaar", "passport", "driving_license"],
      required: true,
    },
    documentUrl: { type: String, required: true }, // Cloudinary URL of the uploaded doc image
    cloudinaryPublicId: {type: String, required: true,},
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationDocument", verificationDocumentSchema);
