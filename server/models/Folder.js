const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

folderSchema.index({ workspaceId: 1, parentId: 1 });

module.exports = mongoose.model('Folder', folderSchema);
