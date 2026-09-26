const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['p0', 'p1', 'p2', 'p3', 'p4'],
      default: 'p1',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'blocked', 'on_hold'],
      default: 'not_started',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: '' },
    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ workspaceId: 1, status: 1, endDate: 1 });
taskSchema.index({ workspaceId: 1, assigneeId: 1, endDate: 1 });
taskSchema.index({ workspaceId: 1, isArchived: 1 });

module.exports = mongoose.model('Task', taskSchema);
