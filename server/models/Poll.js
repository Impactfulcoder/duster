const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true, trim: true },
});

const pollSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    question: { type: String, required: true, trim: true },
    options: [pollOptionSchema],
    type: { type: String, enum: ['single', 'multiple'], default: 'single' },
    anonymous: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closesAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pollSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Poll', pollSchema);
