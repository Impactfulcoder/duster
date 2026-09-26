const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    type: { type: String, enum: ['direct', 'workspace'], default: 'direct' },
    name: { type: String, default: '' },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ workspaceId: 1, type: 1 });
conversationSchema.index({ participantIds: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
