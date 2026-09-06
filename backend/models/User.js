const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    profilePhoto: { type: String, default: "" },
    age: { type: Number },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    bloodGroup: { type: String },
    phoneNumber: { type: String },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    medicalConditions: { type: String },
    vehicleInformation: {
      type: { type: String },
      registrationNumber: String,
    },

    // 3.2 Identity Verification
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified"],
      default: "unverified",
    },
    trustedTraveler: { type: Boolean, default: false },

    // Auth support
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// Hash password before saving, only if it changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never leak the password hash, even by accident
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
