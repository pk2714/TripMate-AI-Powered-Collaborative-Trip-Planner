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
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!/^image\//.test(file.mimetype) && file.mimetype !== "application/pdf") {
      return cb(new Error("Upload an image or PDF of your document."));
    }
    cb(null, true);
  },
});

// Turns multer errors (size/type) into a 400 with a readable message.
const handleUpload = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Document must be 5 MB or smaller." : err.message;
      return res.status(400).json({ message });
    }
    next();
  });

router.put("/me", requireAuth, updateProfile);

router.post(
  "/me/verification-documents",
  requireAuth,
  handleUpload("document"),
  uploadVerificationDocument
);

router.patch(
  "/verification-documents/:id",
  requireAuth,
  requireAdmin,
  verifyDocument
);

module.exports = router;