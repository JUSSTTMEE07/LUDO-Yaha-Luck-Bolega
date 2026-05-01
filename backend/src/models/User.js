const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User model.
 * Auth is username-based. PIN is optional (stored as bcrypt hash).
 * Username-only login works if no PIN was set.
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    pinHash: {
      type: String,
      default: null, // null = no PIN set (username-only login)
    },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon:    { type: Number, default: 0 },
      totalCuts:   { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
    lastSeen:  { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Hash PIN before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('pinHash') && this.pinHash) {
    this.pinHash = await bcrypt.hash(this.pinHash, 10);
  }
  next();
});

userSchema.methods.verifyPin = function (pin) {
  if (!this.pinHash) return true; // no PIN set = always valid
  return bcrypt.compare(pin, this.pinHash);
};

module.exports = mongoose.model('User', userSchema);
