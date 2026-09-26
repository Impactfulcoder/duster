const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Invite = require('../models/Invite');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const ActivityEvent = require('../models/ActivityEvent');
const requireAuth = require('../middleware/auth');

// GET /api/invites/:token — Get invite preview information
router.get('/:token', async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invite = await Invite.findOne({ tokenHash })
      .populate('workspaceId', 'name avatarUrl')
      .populate('createdBy', 'name email');

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found or invalid.' });
    }

    if (invite.acceptedAt) {
      return res.status(400).json({ error: 'This invitation has already been accepted.' });
    }

    if (invite.revokedAt) {
      return res.status(400).json({ error: 'This invitation has been revoked.' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    res.json({
      workspaceName: invite.workspaceId?.name || 'Workspace',
      workspaceId: invite.workspaceId?._id,
      inviterName: invite.createdBy?.name || 'Someone',
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/:token/accept — Accept invitation
router.post('/:token/accept', requireAuth, async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invite = await Invite.findOne({ tokenHash });
    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    if (invite.acceptedAt) {
      return res.status(400).json({ error: 'This invitation has already been used.' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This invitation link has expired.' });
    }

    // Check if already a member
    let member = await WorkspaceMember.findOne({
      workspaceId: invite.workspaceId,
      userId: req.user._id,
    });

    if (!member) {
      member = await WorkspaceMember.create({
        workspaceId: invite.workspaceId,
        userId: req.user._id,
        role: invite.role,
      });
    }

    invite.acceptedAt = new Date();
    await invite.save();

    await ActivityEvent.create({
      workspaceId: invite.workspaceId,
      actorId: req.user._id,
      type: 'member_joined',
      entityType: 'member',
      entityId: member._id,
      title: `${req.user.name} joined the workspace`,
    });

    res.json({
      message: 'Invitation accepted successfully.',
      workspaceId: invite.workspaceId,
      role: member.role,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
