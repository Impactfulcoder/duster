const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const Invite = require('../models/Invite');
const Task = require('../models/Task');
const User = require('../models/User');
const ActivityEvent = require('../models/ActivityEvent');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');
const { requireAdmin } = require('../middleware/permissions');

// GET /api/workspaces — Get all workspaces for current user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const memberships = await WorkspaceMember.find({ userId: req.user._id })
      .populate('workspaceId')
      .sort({ createdAt: 1 });

    const workspaces = memberships
      .filter((m) => m.workspaceId != null)
      .map((m) => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        avatarUrl: m.workspaceId.avatarUrl,
        ownerId: m.workspaceId.ownerId,
        role: m.role,
        isDefault: m.workspaceId.isDefault,
        createdAt: m.workspaceId.createdAt,
      }));

    res.json(workspaces);
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces — Create a new workspace
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      ownerId: req.user._id,
      isDefault: false,
    });

    const member = await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: 'admin',
    });

    res.status(201).json({
      id: workspace._id,
      name: workspace.name,
      avatarUrl: workspace.avatarUrl,
      ownerId: workspace.ownerId,
      role: member.role,
      isDefault: workspace.isDefault,
      createdAt: workspace.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id — Get specific workspace details
router.get('/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const membersCount = await WorkspaceMember.countDocuments({ workspaceId: req.workspace._id });
    res.json({
      id: req.workspace._id,
      name: req.workspace.name,
      avatarUrl: req.workspace.avatarUrl,
      ownerId: req.workspace.ownerId,
      role: req.workspaceMember.role,
      membersCount,
      createdAt: req.workspace.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/workspaces/:id — Update workspace (Admin only)
router.patch('/:id', requireAuth, requireWorkspace, requireAdmin, async (req, res, next) => {
  try {
    const { name, avatarUrl } = req.body;
    if (name) req.workspace.name = name.trim();
    if (avatarUrl !== undefined) req.workspace.avatarUrl = avatarUrl;
    await req.workspace.save();

    res.json({
      id: req.workspace._id,
      name: req.workspace.name,
      avatarUrl: req.workspace.avatarUrl,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workspaces/:id — Delete workspace (Owner only)
router.delete('/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    if (req.workspace.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the workspace owner can delete the workspace.' });
    }

    if (req.workspace.isDefault) {
      return res.status(400).json({ error: 'This is your base workspace — it cannot be deleted.' });
    }

    await Workspace.deleteOne({ _id: req.workspace._id });
    await WorkspaceMember.deleteMany({ workspaceId: req.workspace._id });
    await Task.deleteMany({ workspaceId: req.workspace._id });

    res.json({ message: 'Workspace successfully deleted.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id/members — List members
router.get('/:id/members', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const members = await WorkspaceMember.find({ workspaceId: req.workspace._id })
      .populate('userId', 'name email avatarUrl')
      .sort({ joinedAt: 1 });

    const formatted = members.map((m) => ({
      id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name || 'Unknown',
      email: m.userId?.email || '',
      avatarUrl: m.userId?.avatarUrl || '',
      role: m.role,
      isOwner: m.userId?._id?.toString() === req.workspace.ownerId.toString(),
      joinedAt: m.joinedAt,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/invites — Create workspace invitation (Admin only)
router.post('/:id/invites', requireAuth, requireWorkspace, requireAdmin, async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid invitee email required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if already a member
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      const alreadyMember = await WorkspaceMember.findOne({
        workspaceId: req.workspace._id,
        userId: existingUser._id,
      });
      if (alreadyMember) {
        return res.status(400).json({ error: 'This user is already a member of the workspace.' });
      }
    }

    // Generate random 24-byte hex token
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await Invite.create({
      workspaceId: req.workspace._id,
      email: cleanEmail,
      role: role === 'admin' ? 'admin' : 'member',
      rawToken,
      tokenHash,
      createdBy: req.user._id,
      expiresAt,
    });

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'member_invited',
      entityType: 'invite',
      entityId: invite._id,
      title: `Invited ${cleanEmail} as ${role}`,
    });

    res.status(201).json({
      id: invite._id,
      email: invite.email,
      role: invite.role,
      rawToken,
      expiresAt: invite.expiresAt,
      inviteUrl: `/invite/${rawToken}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id/invites — List pending invites
router.get('/:id/invites', requireAuth, requireWorkspace, requireAdmin, async (req, res, next) => {
  try {
    const invites = await Invite.find({
      workspaceId: req.workspace._id,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json(
      invites.map((i) => ({
        id: i._id,
        email: i.email,
        role: i.role,
        rawToken: i.rawToken,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// PATCH /api/workspaces/:id/members/:memberId — Update member role (Admin only)
router.patch('/:id/members/:memberId', requireAuth, requireWorkspace, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or member.' });
    }

    const member = await WorkspaceMember.findById(req.params.memberId);
    if (!member || member.workspaceId.toString() !== req.workspace._id.toString()) {
      return res.status(404).json({ error: 'Member not found in workspace.' });
    }

    // Cannot demote owner
    if (member.userId.toString() === req.workspace.ownerId.toString()) {
      return res.status(400).json({ error: 'Workspace owner role cannot be changed.' });
    }

    member.role = role;
    await member.save();

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'member_role_changed',
      entityType: 'member',
      entityId: member._id,
      title: `Changed role to ${role}`,
    });

    res.json({ id: member._id, role: member.role });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workspaces/:id/members/:memberId — Remove member (Admin only)
router.delete('/:id/members/:memberId', requireAuth, requireWorkspace, requireAdmin, async (req, res, next) => {
  try {
    const member = await WorkspaceMember.findById(req.params.memberId);
    if (!member || member.workspaceId.toString() !== req.workspace._id.toString()) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    if (member.userId.toString() === req.workspace.ownerId.toString()) {
      return res.status(400).json({ error: 'Cannot remove the workspace owner.' });
    }

    await WorkspaceMember.deleteOne({ _id: member._id });

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'member_removed',
      entityType: 'member',
      entityId: member._id,
      title: `Removed member from workspace`,
    });

    res.json({ message: 'Member removed successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/sample-tasks — Load sample tasks (as shown in reference screenshot)
router.post('/:id/sample-tasks', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const now = new Date();
    const sampleList = [
      { title: 'Write the launch announcement', priority: 'p1', status: 'not_started', tags: ['writing', 'marketing'], endDate: new Date(now.getTime() + 4 * 86400000) },
      { title: 'Review the project proposal', priority: 'p0', status: 'not_started', tags: ['review'], endDate: new Date(now.getTime() + 1 * 86400000) },
      { title: 'Interview three candidates', priority: 'p2', status: 'not_started', tags: ['hiring'], endDate: new Date(now.getTime() + 2 * 86400000) },
      { title: 'Refresh the component library', priority: 'p2', status: 'not_started', tags: ['design'], endDate: null },
      { title: 'Clean up the task backlog', priority: 'p4', status: 'not_started', tags: ['admin'], endDate: null },
      { title: 'Design the landing page', priority: 'p1', status: 'in_progress', tags: ['design'], endDate: new Date(now.getTime() + 3 * 86400000) },
      { title: 'Prepare the quarterly report', priority: 'p2', status: 'in_progress', tags: ['reporting'], endDate: new Date(now.getTime() + 6 * 86400000) },
      { title: 'dsa everyday', priority: 'p0', status: 'completed', tags: ['study'], completedAt: now },
      { title: 'Ship the weekly newsletter', priority: 'p3', status: 'completed', tags: ['marketing'], completedAt: now },
      { title: 'Set up automated backups', priority: 'p1', status: 'completed', tags: ['infra'], completedAt: now },
      { title: 'Plan weekly goals', priority: 'p2', status: 'completed', tags: ['planning'], completedAt: now },
      { title: 'Fix the sign-up form validation', priority: 'p0', status: 'blocked', tags: ['bug'], endDate: new Date(now.getTime() - 86400000) },
      { title: 'Refresh the onboarding emails', priority: 'p3', status: 'on_hold', tags: ['marketing'], endDate: null },
    ];

    const tasksToInsert = sampleList.map((t) => ({
      ...t,
      workspaceId: req.workspace._id,
      createdBy: req.user._id,
      assigneeId: req.user._id,
    }));

    await Task.insertMany(tasksToInsert);

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'task_created',
      entityType: 'task',
      title: 'Loaded sample tasks into board',
    });

    res.json({ message: 'Sample tasks successfully created.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/clear-tasks — Danger zone: Clear all tasks
router.post('/:id/clear-tasks', requireAuth, requireWorkspace, requireAdmin, async (req, res, next) => {
  try {
    await Task.deleteMany({ workspaceId: req.workspace._id });
    res.json({ message: 'All tasks cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
