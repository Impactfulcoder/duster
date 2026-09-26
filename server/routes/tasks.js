const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const ActivityEvent = require('../models/ActivityEvent');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');
const { getIo } = require('../socket/socket');

// GET /api/tasks — List tasks for the workspace
router.get('/', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { status, priority, search, tag, isArchived = 'false' } = req.query;

    const query = {
      workspaceId: req.workspace._id,
      isArchived: isArchived === 'true',
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority.toLowerCase();
    }

    if (tag) {
      query.tags = tag;
    }

    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const tasks = await Task.find(query)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks — Create a new task
router.post('/', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const {
      title,
      description,
      priority = 'p1',
      status = 'not_started',
      startDate,
      endDate,
      assigneeId,
      tags = [],
      notes = '',
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const task = await Task.create({
      workspaceId: req.workspace._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority.toLowerCase(),
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      assigneeId: assigneeId || req.user._id,
      tags: Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: notes || '',
      createdBy: req.user._id,
      completedAt: status === 'completed' ? new Date() : null,
    });

    const populated = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdBy', 'name email');

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'task_created',
      entityType: 'task',
      entityId: task._id,
      title: `created "${task.title}"`,
      metadata: { priority: task.priority, status: task.status },
    });

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('task:created', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id — Get task by ID
router.get('/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    })
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdBy', 'name email');

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id — Update task
router.patch('/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const {
      title,
      description,
      priority,
      status,
      startDate,
      endDate,
      assigneeId,
      tags,
      notes,
      isArchived,
    } = req.body;

    const previousStatus = task.status;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority.toLowerCase();
    if (startDate !== undefined) task.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) task.endDate = endDate ? new Date(endDate) : null;
    if (assigneeId !== undefined) task.assigneeId = assigneeId || null;
    if (notes !== undefined) task.notes = notes;
    if (isArchived !== undefined) task.isArchived = Boolean(isArchived);

    if (tags !== undefined) {
      task.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    if (status !== undefined && status !== previousStatus) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatarUrl')
      .populate('createdBy', 'name email');

    // Activity log
    const eventType = task.status === 'completed' && previousStatus !== 'completed' ? 'task_completed' : 'task_updated';
    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: eventType,
      entityType: 'task',
      entityId: task._id,
      title: eventType === 'task_completed' ? `completed "${task.title}"` : `updated "${task.title}"`,
      metadata: { status: task.status, priority: task.priority },
    });

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('task:updated', populated);
    }

    res.json(populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id — Delete task
router.delete('/:id', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      workspaceId: req.workspace._id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await Task.deleteOne({ _id: task._id });

    await ActivityEvent.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      type: 'task_deleted',
      entityType: 'task',
      title: `deleted task "${task.title}"`,
    });

    const io = getIo();
    if (io) {
      io.to(`workspace:${req.workspace._id}`).emit('task:deleted', { taskId: task._id });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
