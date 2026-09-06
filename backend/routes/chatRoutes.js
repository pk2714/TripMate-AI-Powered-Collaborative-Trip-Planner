const express = require("express");
const router = express.Router();

const { getMessages } = require("../controllers/chatController");
const upload = require("../middleware/upload");
const { uploadImage } = require("../controllers/uploadController");

// GET messages
router.get("/:tripId/messages", getMessages);

// Upload image
router.post(
  "/upload",
  upload.single("image"),
  uploadImage
);

module.exports = router;