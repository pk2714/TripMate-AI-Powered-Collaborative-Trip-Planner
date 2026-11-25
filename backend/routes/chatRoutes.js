const express = require("express");
const router = express.Router();

const { getMessages } = require("../controllers/chatController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../controllers/uploadController");
const { requireAuth } = require("../middleware/auth");
const { requireTripMember } = require("../middleware/tripMember");
const { createChatMessage } = require("../sockets/chatSocket");

// GET messages — trip members only
router.get("/:tripId/messages", requireAuth, requireTripMember, getMessages);

// POST a message over HTTP — used to deliver messages that were written
// while offline (the live chat itself goes over Socket.IO).
router.post("/:tripId/messages", requireAuth, requireTripMember, async (req, res, next) => {
  try {
    const message = await createChatMessage(req.app.get("io"), {
      tripId: req.params.tripId,
      userId: req.session.userId,
      text: req.body?.text,
      mediaUrl: req.body?.mediaUrl,
    });
    if (!message) return res.status(400).json({ message: "Message can't be empty." });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

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
