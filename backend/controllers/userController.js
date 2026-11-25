const fs = require("fs");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const cloudinary = require("../config/cloudinary");
const VerificationDocument = require("../models/VerificationDocument");
const { checkString, checkNumber, BLOOD_GROUPS, PHONE_RE } = require("../utils/validate");

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

  // Empty optional fields mean "clear this value"
  if (updates.gender === "") delete updates.gender;
  for (const f of ["age", "bloodGroup", "phoneNumber"]) {
    if (updates[f] === "") updates[f] = undefined;
  }

  const errors = [];
  if (updates.name !== undefined) {
    const e = checkString(updates.name, "Name", { min: 2, max: 50 });
    if (e) errors.push(e);
    else updates.name = updates.name.trim();
  }
  if (updates.age !== undefined) {
    const e = checkNumber(updates.age, "Age", { min: 13, max: 100, integer: true });
    if (e) errors.push(e);
    else updates.age = Number(updates.age);
  }
  if (updates.bloodGroup !== undefined && !BLOOD_GROUPS.includes(updates.bloodGroup)) {
    errors.push(`Blood group must be one of ${BLOOD_GROUPS.join(", ")}.`);
  }
  if (updates.phoneNumber !== undefined && !PHONE_RE.test(String(updates.phoneNumber).trim())) {
    errors.push("Please enter a valid phone number (10–15 digits).");
  }
  if (updates.medicalConditions !== undefined) {
    const e = checkString(updates.medicalConditions, "Medical conditions", { max: 500, required: false });
    if (e) errors.push(e);
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  // undefined values => unset the field
  const unset = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) {
      unset[k] = "";
      delete updates[k];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.session.userId,
    { $set: updates, ...(Object.keys(unset).length && { $unset: unset }) },
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
  if (!["aadhaar", "passport", "driving_license"].includes(req.body.documentType)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: "Please choose a valid document type." });
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