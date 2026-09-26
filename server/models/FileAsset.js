const mongoose = require('mongoose');

const fileAssetSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storagePath: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visibility: { type: String, enum: ['workspace', 'private'], default: 'workspace' },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fileAssetSchema.index({ workspaceId: 1, folderId: 1, createdAt: -1 });

module.exports = mongoose.model('FileAsset', fileAssetSchema);
