const fs = require("fs");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const cloudinary = require("../config/cloudinary");
const VerificationDocument = require("../models/VerificationDocument");

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "age",
    "gender",
    "bloodGroup",
    "phoneNumber",
    "emergencyContact",
    "medicalConditions",
    "vehicleInformation",
  ];

  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Remove empty gender value
if (updates.gender === "") {
  delete updates.gender;
}

  const user = await User.findByIdAndUpdate(
    req.session.userId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    message: "Profile updated successfully.",
    user,
  });
});

const uploadVerificationDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please upload a document.",
    });
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "tripmate/verification-documents",
  });

  // Clean up the temporary file from disk
  fs.unlink(req.file.path, () => {});

  const document = await VerificationDocument.create({
    user: req.session.userId,
    documentType: req.body.documentType,
    documentUrl: result.secure_url,
    cloudinaryPublicId: result.public_id,
    status: "pending",
  });

  await User.findByIdAndUpdate(req.session.userId, {
  verificationStatus: "pending",
});

  res.status(201).json({
    message: "Verification document uploaded successfully.",
    document,
  });
});

const verifyDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({
      message: "Status must be verified or rejected.",
    });
  }

  const document = await VerificationDocument.findById(id);

  if (!document) {
    return res.status(404).json({
      message: "Verification document not found.",
    });
  }

  document.status = status;
  document.reviewedBy = req.session.userId;
  document.user = document.user;

  if (status === "rejected") {
    document.rejectionReason = rejectionReason || "";
  }

  await document.save();

  if (status === "verified") {
    await User.findByIdAndUpdate(document.user, {
      verificationStatus: "verified",
      trustedTraveler: true,
    });
  } else {
    await User.findByIdAndUpdate(document.user, {
      verificationStatus: "unverified",
      trustedTraveler: false,
    });
  }

  res.json({
    message: `Document ${status} successfully.`,
    document,
  });
});

module.exports = {
  updateProfile,
  uploadVerificationDocument,
  verifyDocument,
};