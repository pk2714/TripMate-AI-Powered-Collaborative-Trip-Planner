const crypto = require("crypto");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendEmail } = require("../utils/sendEmail");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account with that email already exists." });
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });

  // Fire-and-forget style is fine here, but we still await so failures are logged.
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log("\n========== EMAIL VERIFICATION ==========");
  console.log("Verification URL:");
  console.log(verifyUrl);
  console.log("========================================\n");
}
  await sendEmail({
    to: user.email,
    subject: "Welcome to TripMate — verify your email",
    text: `Hi ${user.name}, please verify your email: ${verifyUrl}`,
  }).catch((err) => console.error("Failed to send verification email:", err.message));

  res.status(201).json({
    message: "Account created. Check your email to verify your address.",
    user,
  });
});

// GET /api/auth/verify-email?token=...
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired verification link." });
  }

  user.isEmailVerified = true;
  user.verificationStatus = "verified";
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: "Email verified. You can now log in." });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
  return res.status(401).json({ message: "Invalid email or password." });
}

if (!user.isEmailVerified) {
  return res.status(403).json({
    message: "Please verify your email before logging in.",
  });
}

req.session.userId = user._id.toString();
  req.session.role = user.role;

  res.json({ message: "Login successful.", user });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Could not log out, try again." });
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out." });
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  // Always respond the same way whether or not the email exists, to avoid
  // leaking which addresses are registered.
  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1h
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("\n========== PASSWORD RESET ==========");
    console.log("Reset URL:");
    console.log(resetUrl);
    console.log("====================================\n");
 }
    await sendEmail({
      to: user.email,
      subject: "Reset your TripMate password",
      text: `Reset your password here: ${resetUrl} (expires in 1 hour)`,
    }).catch((err) => console.error("Failed to send reset email:", err.message));
  }

  res.json({ message: "If that email is registered, a reset link has been sent." });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset link." });
  }

  user.password = password; // pre-save hook re-hashes it
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: "Password updated. You can now log in." });
});

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};
