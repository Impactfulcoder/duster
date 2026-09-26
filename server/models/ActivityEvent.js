const mongoose = require('mongoose');

const activityEventSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'task_created',
        'task_updated',
        'task_completed',
        'task_deleted',
        'content_uploaded',
        'folder_created',
        'poll_created',
        'poll_voted',
        'poll_closed',
        'member_invited',
        'member_joined',
        'member_role_changed',
        'member_removed',
      ],
    },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityEventSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
