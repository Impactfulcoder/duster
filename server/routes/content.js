const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Folder = require('../models/Folder');
const FileAsset = require('../models/FileAsset');
const ActivityEvent = require('../models/ActivityEvent');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');
const { upload, uploadDir } = require('../storage/localStorage');

// GET /api/content/folders — List folders
router.get('/folders', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { parentId } = req.query;
    const query = {
      workspaceId: req.workspace._id,
      parentId: parentId || null,
    };

    const folders = await Folder.find(query).sort({ name: 1 });
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// POST /api/content/folders — Create folder
router.post('/folders', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    const folder = await Folder.create({
      workspaceId: req.workspace._id,
      parentId: parentId || null,
      name: name.trim(),
      createdBy: req.user._id,
    });

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'folder_created',
      entityType: 'folder',
      entityId: folder._id,
      title: `created folder "${folder.name}"`,
    });

    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/content/folders/:id — Rename folder
router.patch('/folders/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'New folder name is required.' });
    }

    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspace._id },
      { name: name.trim() },
      { new: true }
    );

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    res.json(folder);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/content/folders/:id — Delete folder
router.delete('/folders/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, workspaceId: req.workspace._id });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    // Move files inside to root (folderId: null)
    await FileAsset.updateMany({ folderId: folder._id }, { folderId: null });
    await Folder.deleteOne({ _id: folder._id });

    res.json({ message: 'Folder deleted, files moved to root.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/files — List files
router.get('/files', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { folderId, search, type } = req.query;

    const query = {
      workspaceId: req.workspace._id,
      isArchived: false,
    };

    if (folderId !== undefined) {
      query.folderId = folderId === '' || folderId === 'root' ? null : folderId;
    }

    if (search && search.trim()) {
      query.originalName = { $regex: search.trim(), $options: 'i' };
    }

    if (type === 'pdf') {
      query.mimeType = 'application/pdf';
    } else if (type === 'image') {
      query.mimeType = { $regex: '^image/' };
    }

    const files = await FileAsset.find(query)
      .populate('uploadedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 });

    res.json(files);
  } catch (err) {
    next(err);
  }
});

// POST /api/content/upload — Upload file
router.post('/upload', requireAuth, requireWorkspace, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided or invalid file format.' });
    }

    const { folderId, visibility = 'workspace' } = req.body;

    const fileAsset = await FileAsset.create({
      workspaceId: req.workspace._id,
      folderId: folderId && folderId !== 'root' ? folderId : null,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath: req.file.path,
      uploadedBy: req.user._id,
      visibility,
    });

    const populated = await FileAsset.findById(fileAsset._id).populate('uploadedBy', 'name email avatarUrl');

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'content_uploaded',
      entityType: 'file',
      entityId: fileAsset._id,
      title: `uploaded file "${fileAsset.originalName}"`,
      metadata: { size: fileAsset.size, mimeType: fileAsset.mimeType },
    });

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// GET /api/content/files/:id/download — Authenticated download / preview
router.get('/files/:id/download', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const file = await FileAsset.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const filePath = path.resolve(file.storagePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File data missing on storage server.' });
    }

    const isInline = req.query.inline === 'true';
    res.setHeader('Content-Type', file.mimeType);
    if (!isInline) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/content/files/:id — Rename or move file
router.patch('/files/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { originalName, folderId } = req.body;
    const file = await FileAsset.findOne({ _id: req.params.id, workspaceId: req.workspace._id });

    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    if (originalName) file.originalName = originalName.trim();
    if (folderId !== undefined) file.folderId = folderId === 'root' ? null : folderId;

    await file.save();
    res.json(file);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/content/files/:id — Delete file
router.delete('/files/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const file = await FileAsset.findOne({ _id: req.params.id, workspaceId: req.workspace._id });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    try {
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }
    } catch (fsErr) {
      console.warn('Could not remove physical file:', fsErr.message);
    }

    await FileAsset.deleteOne({ _id: file._id });
    res.json({ message: 'File deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
