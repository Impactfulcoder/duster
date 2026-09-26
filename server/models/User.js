const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    avatarUrl: { type: String, default: '' },
    authProvider: { type: String, enum: ['google', 'otp', 'email'], default: 'otp' },
    googleSub: { type: String, sparse: true, index: true },
    themePreference: { type: String, enum: ['terminal', 'dark', 'light'], default: 'terminal' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
