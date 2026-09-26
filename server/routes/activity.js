const express = require('express');
const router = express.Router();
const ActivityEvent = require('../models/ActivityEvent');
const WorkspaceMember = require('../models/WorkspaceMember');
const requireAuth = require('../middleware/auth');
const requireWorkspace = require('../middleware/workspace');

// GET /api/activity — Workspace activity timeline
router.get('/', requireAuth, requireWorkspace, async (req, res, next) => {
  try {
    const { type, actorId } = req.query;
    const query = { workspaceId: req.workspace._id };

    if (type && type !== 'all') {
      if (type === 'created') {
        query.type = { $in: ['task_created', 'content_uploaded', 'poll_created'] };
      } else if (type === 'completed') {
        query.type = { $in: ['task_completed', 'poll_closed'] };
      } else {
        query.type = type;
      }
    }

    if (actorId) {
      query.actorId = actorId;
    }

    const events = await ActivityEvent.find(query)
      .populate('actorId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(100);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalEvents = await ActivityEvent.countDocuments({ workspaceId: req.workspace._id });
    const todayEvents = await ActivityEvent.countDocuments({
      workspaceId: req.workspace._id,
      createdAt: { $gte: startOfToday },
    });
    const peopleCount = await WorkspaceMember.countDocuments({ workspaceId: req.workspace._id });

    // Format events
    const formattedEvents = events.map((e) => ({
      id: e._id,
      type: e.type,
      entityType: e.entityType,
      entityId: e.entityId,
      title: e.title,
      actor: {
        id: e.actorId?._id,
        name: e.actorId?.name || 'Someone',
        avatarUrl: e.actorId?.avatarUrl || '',
      },
      createdAt: e.createdAt,
    }));

    res.json({
      summary: {
        totalEvents,
        todayEvents,
        peopleCount,
      },
      events: formattedEvents,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
