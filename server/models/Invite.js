const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    tokenHash: { type: String, required: true, unique: true, index: true },
    rawToken: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

inviteSchema.index({ tokenHash: 1, expiresAt: 1 });

module.exports = mongoose.model('Invite', inviteSchema);
