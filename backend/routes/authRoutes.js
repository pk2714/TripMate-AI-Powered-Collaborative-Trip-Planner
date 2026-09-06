const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  verifyEmail,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Slow down brute-force attempts on login specifically.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
