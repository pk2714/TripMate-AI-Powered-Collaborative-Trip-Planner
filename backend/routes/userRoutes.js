const express = require("express");
const router = express.Router();

const os = require("os");
const multer = require("multer");

const { requireAuth,requireAdmin } = require("../middleware/auth");

const {
  updateProfile,
  uploadVerificationDocument,
  verifyDocument,
} = require("../controllers/userController");

// Use the OS temp directory so uploads work on Render (ephemeral filesystem).
// Files are uploaded to Cloudinary then cleaned up.
const upload = multer({
  dest: os.tmpdir(),
});

router.put("/me", requireAuth, updateProfile);

router.post(
  "/me/verification-documents",
  requireAuth,
  upload.single("document"),
  uploadVerificationDocument
);

router.patch(
  "/verification-documents/:id",
  requireAuth,
  requireAdmin,
  verifyDocument
);

module.exports = router;