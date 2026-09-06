const Message = require("../models/Message");

const getMessages = async (req, res) => {
  try {
    const { tripId } = req.params;

    const messages = await Message.find({ trip: tripId })
      .populate("sender", "name profilePhoto")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

module.exports = { getMessages };