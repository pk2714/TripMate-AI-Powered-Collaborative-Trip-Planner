const multer = require("multer");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// In-memory uploads for chat images (streamed to Cloudinary).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files can be uploaded."));
    }
    cb(null, true);
  },
});

module.exports = upload;
