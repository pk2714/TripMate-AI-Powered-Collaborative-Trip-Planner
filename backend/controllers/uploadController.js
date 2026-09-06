const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "tripmate-chat",
      },
      (error, result) => {
        if (error) {
          return res.status(500).json({
            message: "Upload failed",
          });
        }

        res.json({
          imageUrl: result.secure_url,
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  uploadImage,
};