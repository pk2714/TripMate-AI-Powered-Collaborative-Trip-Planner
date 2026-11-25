const express = require("express");
const router = express.Router();

const { getMessages } = require("../controllers/chatController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../controllers/uploadController");
const { requireAuth } = require("../middleware/auth");
const { requireTripMember } = require("../middleware/tripMember");

// GET messages — trip members only
router.get("/:tripId/messages", requireAuth, requireTripMember, getMessages);

// Upload a chat image (validated in middleware/upload.js)
router.post("/upload", requireAuth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller." : err.message;
      return res.status(400).json({ message });
    }
    next();
  });
}, uploadImage);

module.exports = router;
