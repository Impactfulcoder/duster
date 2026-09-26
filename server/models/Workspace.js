const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: 'My Workspace' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    avatarUrl: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workspace', workspaceSchema);
